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
    // Check if plan name already exists
    const existingPlan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        planName: dto.planName,
        expiredAt: null,
      },
    });

    if (existingPlan) {
      throw new ConflictException('A plan with this name already exists');
    }

    try {
      // Create product in Stripe
      const stripeProduct = await this.stripe.products.create({
        name: dto.planName,
        description: dto.features,
        metadata: {
          duration: dto.duration.toString(),
        },
      });

      // Create price in Stripe
      // Determine interval based on duration
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
        // For custom durations, use days
        interval = 'day';
        intervalCount = dto.duration;
      }

      const stripePrice = await this.stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(dto.price * 100), // Convert to cents
        currency: 'usd',
        recurring: {
          interval,
          interval_count: intervalCount,
        },
        metadata: {
          duration: dto.duration.toString(),
        },
      });

      // Save to database
      const plan = await this.prisma.subscriptionPlan.create({
        data: {
          planName: dto.planName,
          price: dto.price,
          duration: dto.duration,
          features: dto.features,
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
   * Get all subscription plans
   */
  async getAllPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: {
        expiredAt: null, // Only active plans
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
   * - Can update name, features, and duration
   * - If price is changed, creates a new Stripe price and archives the old one
   * - Existing subscriptions continue with old price until renewal
   */
  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto) {
    const existingPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Check if plan is expired
    if (existingPlan.expiredAt) {
      throw new BadRequestException('Cannot update an expired plan');
    }

    // Check if new plan name conflicts with another plan
    if (dto.planName && dto.planName !== existingPlan.planName) {
      const duplicateName = await this.prisma.subscriptionPlan.findFirst({
        where: {
          planName: dto.planName,
          expiredAt: null,
          id: { not: id },
        },
      });

      if (duplicateName) {
        throw new ConflictException('A plan with this name already exists');
      }
    }

    try {
      let newStripePriceId = existingPlan.stripePriceId;

      if (existingPlan.stripePriceId) {
        // Get the Stripe price to find the product
        const stripePrice = await this.stripe.prices.retrieve(
          existingPlan.stripePriceId
        );
        const productId = stripePrice.product as string;

        // Update product name/description in Stripe
        if (dto.planName || dto.features) {
          await this.stripe.products.update(productId, {
            ...(dto.planName && { name: dto.planName }),
            ...(dto.features && { description: dto.features }),
            ...(dto.duration && { 
              metadata: { duration: dto.duration.toString() } 
            }),
          });
        }

        // If price or duration changed, create new Stripe price
        if (dto.price || dto.duration) {
          const newPrice = dto.price || existingPlan.price;
          const newDuration = dto.duration || existingPlan.duration;

          // Determine interval based on duration
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
            },
          });

          // Archive old price (don't delete, as existing subscriptions might use it)
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
   * - Sets expiredAt date
   * - Cannot delete if there are active subscriptions
   * - Archives the plan in Stripe
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

    // Check if already expired
    if (plan.expiredAt) {
      throw new BadRequestException('Plan is already deleted');
    }

    // Check if there are active subscriptions
    if (plan.subscriptions.length > 0) {
      throw new BadRequestException(
        `Cannot delete plan with ${plan.subscriptions.length} active subscription(s). Please wait for subscriptions to expire or cancel them first.`
      );
    }

    try {
      // Archive price in Stripe
      if (plan.stripePriceId) {
        await this.stripe.prices.update(plan.stripePriceId, {
          active: false,
        });

        // Also archive the product
        const stripePrice = await this.stripe.prices.retrieve(plan.stripePriceId);
        await this.stripe.products.update(stripePrice.product as string, {
          active: false,
        });
      }

      // Soft delete by setting expiredAt
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
      // Reactivate price in Stripe
      if (plan.stripePriceId) {
        await this.stripe.prices.update(plan.stripePriceId, {
          active: true,
        });

        // Also reactivate the product
        const stripePrice = await this.stripe.prices.retrieve(plan.stripePriceId);
        await this.stripe.products.update(stripePrice.product as string, {
          active: true,
        });
      }

      // Remove expiredAt
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