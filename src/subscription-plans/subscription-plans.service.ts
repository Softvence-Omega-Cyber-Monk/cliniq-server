// src/subscription-plans/subscription-plans.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2025-11-17.clover',
      }
    );
  }

  /**
   * Create a new subscription plan
   */
  async createPlan(dto: CreateSubscriptionPlanDto) {
    // Check if plan name already exists for the same role
    const existingPlan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        planName: dto.planName,
        role: dto.role,
        expiredAt: null,
      },
    });

    if (existingPlan) {
      throw new ConflictException(
        `A plan with this name already exists for ${dto.role}`
      );
    }

    try {
      // Create product in Stripe
      const stripeProduct = await this.stripe.products.create({
        name: dto.planName,
        description: dto.features,
        metadata: {
          duration: dto.duration.toString(),
          role: dto.role,
        },
      });

      // Create price in Stripe
      let interval: 'day' | 'week' | 'month' | 'year' = 'month';
      let intervalCount = 1;

      if (dto.duration === 365) {
        interval = 'year';
        intervalCount = 1;
      } else if (dto.duration === 30) {
        interval = 'month';
        intervalCount = 1;
      } else if (dto.duration === 7) {
        interval = 'week';
        intervalCount = 1;
      } else {
        interval = 'day';
        intervalCount = dto.duration;
      }

      const stripePrice = await this.stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(dto.price * 100),
        currency: 'usd',
        recurring: {
          interval,
          interval_count: intervalCount,
        },
        metadata: {
          duration: dto.duration.toString(),
          role: dto.role,
        },
      });

      // Save to database
      const plan = await this.prisma.subscriptionPlan.create({
        data: {
          planName: dto.planName,
          price: dto.price,
          duration: dto.duration,
          features: dto.features,
          role: dto.role,
          stripePriceId: stripePrice.id,
        },
      });

      return {
        ...plan,
        stripeProductId: stripeProduct.id,
        message: 'Subscription plan created successfully',
      };
    } catch (error) {
      console.error('Stripe error:', error);
      throw new BadRequestException(
        `Failed to create subscription plan: ${error.message}`
      );
    }
  }

  /**
   * Get all subscription plans (optionally filter by role)
   */
  async getAllPlans(role?: 'CLINIC' | 'INDIVIDUAL_THERAPIST') {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: {
        expiredAt: null,
        ...(role && { role }),
      },
      orderBy: {
        price: 'asc',
      },
      include: {
        _count: {
          select: {
            clinics: true,
            therapists: true,
            subscriptions: true,
          },
        },
      },
    });

    return plans;
  }

  /**
   * Get a specific subscription plan by ID
   */
  async getPlanById(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            clinics: true,
            therapists: true,
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  /**
   * Update a subscription plan
   */
  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto) {
    const existingPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      throw new NotFoundException('Subscription plan not found');
    }

    if (existingPlan.expiredAt) {
      throw new BadRequestException('Cannot update an expired plan');
    }

    // Check if new plan name conflicts with another plan of the same role
    if (dto.planName && dto.planName !== existingPlan.planName) {
      const duplicateName = await this.prisma.subscriptionPlan.findFirst({
        where: {
          planName: dto.planName,
          role: dto.role || existingPlan.role,
          expiredAt: null,
          id: { not: id },
        },
      });

      if (duplicateName) {
        throw new ConflictException(
          `A plan with this name already exists for this role`
        );
      }
    }

    try {
      let newStripePriceId = existingPlan.stripePriceId;

      if (existingPlan.stripePriceId) {
        const stripePrice = await this.stripe.prices.retrieve(
          existingPlan.stripePriceId
        );
        const productId = stripePrice.product as string;

        // Update product metadata in Stripe
        if (dto.planName || dto.features || dto.role) {
          await this.stripe.products.update(productId, {
            ...(dto.planName && { name: dto.planName }),
            ...(dto.features && { description: dto.features }),
            metadata: {
              duration: (dto.duration || existingPlan.duration).toString(),
              role: dto.role || existingPlan.role,
            },
          });
        }

        // If price or duration changed, create new Stripe price
        if (dto.price || dto.duration) {
          const newPrice = dto.price || existingPlan.price;
          const newDuration = dto.duration || existingPlan.duration;

          let interval: 'day' | 'week' | 'month' | 'year' = 'month';
          let intervalCount = 1;

          if (newDuration === 365) {
            interval = 'year';
            intervalCount = 1;
          } else if (newDuration === 30) {
            interval = 'month';
            intervalCount = 1;
          } else if (newDuration === 7) {
            interval = 'week';
            intervalCount = 1;
          } else {
            interval = 'day';
            intervalCount = newDuration;
          }

          const newStripePrice = await this.stripe.prices.create({
            product: productId,
            unit_amount: Math.round(newPrice * 100),
            currency: 'usd',
            recurring: {
              interval,
              interval_count: intervalCount,
            },
            metadata: {
              duration: newDuration.toString(),
              role: dto.role || existingPlan.role,
            },
          });

          await this.stripe.prices.update(existingPlan.stripePriceId, {
            active: false,
          });

          newStripePriceId = newStripePrice.id;
        }
      }

      // Update in database
      const updatedPlan = await this.prisma.subscriptionPlan.update({
        where: { id },
        data: {
          ...(dto.planName && { planName: dto.planName }),
          ...(dto.price && { price: dto.price }),
          ...(dto.duration && { duration: dto.duration }),
          ...(dto.features && { features: dto.features }),
          ...(dto.role && { role: dto.role }),
          stripePriceId: newStripePriceId,
        },
        include: {
          _count: {
            select: {
              clinics: true,
              therapists: true,
              subscriptions: true,
            },
          },
        },
      });

      return {
        ...updatedPlan,
        message: 'Subscription plan updated successfully',
        note: dto.price
          ? 'New price will apply to new subscriptions. Existing subscriptions will continue at their current price until renewal.'
          : undefined,
      };
    } catch (error) {
      console.error('Stripe error:', error);
      throw new BadRequestException(
        `Failed to update subscription plan: ${error.message}`
      );
    }
  }

  /**
   * Delete (soft delete) a subscription plan
   */
  async deletePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        subscriptions: {
          where: {
            status: { in: ['active', 'trialing'] },
          },
        },
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    if (plan.expiredAt) {
      throw new BadRequestException('Plan is already deleted');
    }

    if (plan.subscriptions.length > 0) {
      throw new BadRequestException(
        `Cannot delete plan with ${plan.subscriptions.length} active subscription(s). Please wait for subscriptions to expire or cancel them first.`
      );
    }

    try {
      if (plan.stripePriceId) {
        await this.stripe.prices.update(plan.stripePriceId, {
          active: false,
        });

        const stripePrice = await this.stripe.prices.retrieve(plan.stripePriceId);
        await this.stripe.products.update(stripePrice.product as string, {
          active: false,
        });
      }

      const deletedPlan = await this.prisma.subscriptionPlan.update({
        where: { id },
        data: {
          expiredAt: new Date(),
        },
      });

      return {
        ...deletedPlan,
        message: 'Subscription plan deleted successfully',
      };
    } catch (error) {
      console.error('Stripe error:', error);
      throw new BadRequestException(
        `Failed to delete subscription plan: ${error.message}`
      );
    }
  }

  /**
   * Restore a soft-deleted plan
   */
  async restorePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    if (!plan.expiredAt) {
      throw new BadRequestException('Plan is not deleted');
    }

    try {
      if (plan.stripePriceId) {
        await this.stripe.prices.update(plan.stripePriceId, {
          active: true,
        });

        const stripePrice = await this.stripe.prices.retrieve(plan.stripePriceId);
        await this.stripe.products.update(stripePrice.product as string, {
          active: true,
        });
      }

      const restoredPlan = await this.prisma.subscriptionPlan.update({
        where: { id },
        data: {
          expiredAt: null,
        },
      });

      return {
        ...restoredPlan,
        message: 'Subscription plan restored successfully',
      };
    } catch (error) {
      console.error('Stripe error:', error);
      throw new BadRequestException(
        `Failed to restore subscription plan: ${error.message}`
      );
    }
  }
}