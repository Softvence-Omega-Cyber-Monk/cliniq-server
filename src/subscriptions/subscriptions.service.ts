// src/subscriptions/subscriptions.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PurchaseSubscriptionDto } from './dto/purchase-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { SubscriptionQueryParamsDto } from './dto/query-params.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-11-17.clover',
    });
  }

  /**
   * Purchase a subscription plan
   */
  async purchaseSubscription(
    userId: string,
    userType: string,
    dto: PurchaseSubscriptionDto,
  ) {
    // Get user's Stripe customer ID
    const { stripeCustomerId, email, fullName } = await this.getUserInfo(userId, userType);

    if (!stripeCustomerId) {
      throw new BadRequestException('User does not have a Stripe customer ID');
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
        status: { in: ['active', 'trialing'] },
      },
    });

    if (existingSubscription) {
      throw new ConflictException('User already has an active subscription');
    }

    // Get subscription plan
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.subscriptionPlanId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    if (!plan.stripePriceId) {
      throw new BadRequestException('Subscription plan does not have a Stripe price ID');
    }

    // Get payment method
    let paymentMethodId: string;
    if (dto.paymentMethodId) {
      const paymentMethod = await this.prisma.paymentMethod.findUnique({
        where: { id: dto.paymentMethodId },
        select: { stripePaymentMethodId: true, clinicId: true, therapistId: true },
      });

      if (!paymentMethod) {
        throw new NotFoundException('Payment method not found');
      }

      // Verify ownership
      if (
        (userType === 'CLINIC' && paymentMethod.clinicId !== userId) ||
        (userType === 'THERAPIST' && paymentMethod.therapistId !== userId)
      ) {
        throw new BadRequestException('Payment method does not belong to user');
      }

      paymentMethodId = paymentMethod.stripePaymentMethodId;
    } else {
      // Use default payment method
      const defaultPaymentMethod = await this.prisma.paymentMethod.findFirst({
        where: {
          ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
          isDefault: true,
        },
        select: { stripePaymentMethodId: true },
      });

      if (!defaultPaymentMethod) {
        throw new NotFoundException('No default payment method found');
      }

      paymentMethodId = defaultPaymentMethod.stripePaymentMethodId;
    }

    // Create subscription in Stripe
    const stripeSubscription = await this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: plan.stripePriceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId,
        userType,
        planId: plan.id,
      },
    });

    // Save subscription to database
    const subscription = await this.prisma.subscription.create({
      data: {
        stripeSubscriptionId: stripeSubscription.id,
        subscriptionPlanId: plan.id,
        ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
        status: stripeSubscription.status as any,
        currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
      },
      include: {
        subscriptionPlan: true,
      },
    });

    // Save payment record if payment was successful
    const invoice = (stripeSubscription as any).latest_invoice as any;
    if (invoice && invoice.payment_intent) {
      const paymentIntent = invoice.payment_intent as any;
      
      if (paymentIntent.status === 'succeeded') {
        const charge = paymentIntent.charges?.data?.[0];
        
        await this.prisma.payment.create({
          data: {
            subscriptionId: subscription.id,
            stripeSubscriptionId: stripeSubscription.id,
            stripePaymentIntentId: paymentIntent.id,
            stripeChargeId: charge?.id || null,
            amount: paymentIntent.amount / 100, // Convert from cents
            currency: paymentIntent.currency,
            status: 'succeeded',
            description: `${plan.planName} - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
            paymentMethodLast4: charge?.payment_method_details?.card?.last4 || 'N/A',
            paymentMethodBrand: charge?.payment_method_details?.card?.brand || 'N/A',
            paymentType: 'subscription',
            paidAt: new Date(paymentIntent.created * 1000),
            ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
          },
        });
      }
    }

    // Update user's subscription plan reference
    if (userType === 'CLINIC') {
      await this.prisma.privateClinic.update({
        where: { id: userId },
        data: { subscriptionPlanId: plan.id },
      });
    } else {
      await this.prisma.therapist.update({
        where: { id: userId },
        data: { subscriptionPlanId: plan.id },
      });
    }

    return subscription;
  }

  /**
   * Get current active subscription
   */
  async getCurrentSubscription(userId: string, userType: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
        status: { in: ['active', 'trialing'] },
      },
      include: {
        subscriptionPlan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    return subscription;
  }

  /**
   * Get all subscriptions for a user
   */
  async getAllSubscriptions(
    userId: string,
    userType: string,
    query: SubscriptionQueryParamsDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
    };

    if (query.status) {
      where.status = query.status;
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          subscriptionPlan: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data: subscriptions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    userId: string,
    userType: string,
    dto: CancelSubscriptionDto,
  ) {
    const subscription = await this.getCurrentSubscription(userId, userType);

    if (dto.cancelImmediately) {
      // For immediate cancellation, we need to use the cancel method instead
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      
      // Update in database
      const updatedSubscription = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'canceled',
          cancelAtPeriodEnd: false,
          canceledAt: new Date(),
        },
        include: {
          subscriptionPlan: true,
        },
      });

      return updatedSubscription;
    } else {
      // Schedule cancellation at period end
      const stripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        },
      );

      // Update in database
      const updatedSubscription = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: (stripeSubscription as any).status as any,
          cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
        },
        include: {
          subscriptionPlan: true,
        },
      });

      return updatedSubscription;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(
    userId: string,
    userType: string,
    query: SubscriptionQueryParamsDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where = userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          subscription: {
            include: {
              subscriptionPlan: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { paidAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a specific payment by ID
   */
  async getPaymentById(userId: string, userType: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: {
          include: {
            subscriptionPlan: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify ownership
    if (
      (userType === 'CLINIC' && payment.clinicId !== userId) ||
      (userType === 'THERAPIST' && payment.therapistId !== userId)
    ) {
      throw new BadRequestException('Payment does not belong to user');
    }

    return payment;
  }

  /**
   * Helper: Get user info
   */
  private async getUserInfo(userId: string, userType: string) {
    if (userType === 'CLINIC') {
      const clinic = await this.prisma.privateClinic.findUnique({
        where: { id: userId },
        select: {
          stripeCustomerId: true,
          email: true,
          fullName: true,
        },
      });

      if (!clinic) {
        throw new NotFoundException('Clinic not found');
      }

      return clinic;
    } else {
      const therapist = await this.prisma.therapist.findUnique({
        where: { id: userId },
        select: {
          stripeCustomerId: true,
          email: true,
          fullName: true,
        },
      });

      if (!therapist) {
        throw new NotFoundException('Therapist not found');
      }

      return therapist;
    }
  }

  // Add these methods to your subscriptions.service.ts

/**
 * Get all subscription plans (only non-expired)
 */
async getSubscriptionPlans() {
  return this.prisma.subscriptionPlan.findMany({
    where: { 
      expiredAt: null, // Based on your schema, use null to filter active plans
    },
    orderBy: { price: 'asc' },
    select: {
      id: true,
      planName: true,
      price: true,
      duration: true,
      features: true,
      stripePriceId: true,
      createdAt: true,
    },
  });
}

/**
 * Get subscription plan by ID
 */
async getSubscriptionPlanById(planId: string) {
  const plan = await this.prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new NotFoundException('Subscription plan not found');
  }

  // Check if plan is expired
  if (plan.expiredAt && plan.expiredAt < new Date()) {
    throw new BadRequestException('Subscription plan has expired');
  }

  return plan;
}

/**
 * Preview upgrade/downgrade with manual proration calculation
 */
async previewUpgrade(
  userId: string,
  userType: string,
  newPlanId: string,
) {
  const currentSubscription = await this.getCurrentSubscription(userId, userType);
  const newPlan = await this.getSubscriptionPlanById(newPlanId);

  if (currentSubscription.subscriptionPlanId === newPlanId) {
    throw new BadRequestException('Already subscribed to this plan');
  }

  const currentPlan = currentSubscription.subscriptionPlan;

  // Calculate proration manually
  const now = Date.now();
  const periodEnd = currentSubscription.currentPeriodEnd.getTime();
  const periodStart = currentSubscription.currentPeriodStart.getTime();
  const totalPeriodDuration = periodEnd - periodStart;
  const remainingTime = periodEnd - now;
  
  // Percentage of billing period remaining
  const percentRemaining = remainingTime / totalPeriodDuration;

  // Calculate amounts
  const unusedAmount = currentPlan.price * percentRemaining;
  const newProratedAmount = newPlan.price * percentRemaining;
  const prorationAmount = newProratedAmount - unusedAmount;

  // Determine if upgrade or downgrade
  const isUpgrade = newPlan.price > currentPlan.price;
  const isDowngrade = newPlan.price < currentPlan.price;

  return {
    currentPlan: {
      id: currentPlan.id,
      planName: currentPlan.planName,
      price: currentPlan.price,
    },
    newPlan: {
      id: newPlan.id,
      planName: newPlan.planName,
      price: newPlan.price,
    },
    prorationAmount: Number(Math.max(0, prorationAmount).toFixed(2)),
    immediateCharge: Number(Math.max(0, prorationAmount).toFixed(2)),
    nextBillingDate: currentSubscription.currentPeriodEnd,
    currentPeriodEnd: currentSubscription.currentPeriodEnd,
    daysRemaining: Math.ceil(remainingTime / (1000 * 60 * 60 * 24)),
    percentRemaining: Number((percentRemaining * 100).toFixed(2)),
    currency: 'usd',
    isUpgrade,
    isDowngrade,
    message: isUpgrade 
      ? `You will be charged $${Math.max(0, prorationAmount).toFixed(2)} immediately for the upgrade.`
      : isDowngrade
      ? `A credit of $${Math.abs(prorationAmount).toFixed(2)} will be applied to your next invoice.`
      : 'No change in pricing.',
  };
}

/**
 * Reactivate canceled subscription
 */
async reactivateSubscription(userId: string, userType: string) {
  const subscription = await this.prisma.subscription.findFirst({
    where: {
      ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
      status: { in: ['active', 'trialing'] },
    },
    include: {
      subscriptionPlan: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) {
    throw new NotFoundException('No active subscription found');
  }

  if (!subscription.cancelAtPeriodEnd) {
    throw new BadRequestException(
      'Subscription is not scheduled for cancellation. It is already active.',
    );
  }

  // Update in Stripe
  const updatedStripeSubscription = await this.stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { 
      cancel_at_period_end: false,
      metadata: {
        reactivatedAt: new Date().toISOString(),
      },
    },
  );

  // Update in database
  const updatedSubscription = await this.prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      cancelAtPeriodEnd: false,
      status: updatedStripeSubscription.status as any,
    },
    include: {
      subscriptionPlan: true,
    },
  });

  return {
    ...updatedSubscription,
    message: 'Subscription reactivated successfully. It will continue after the current period.',
  };
}

/**
 * Get subscription status and capabilities
 */
async getSubscriptionStatus(userId: string, userType: string) {
  // Check for active subscription
  const activeSubscription = await this.prisma.subscription.findFirst({
    where: {
      ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
      status: { in: ['active', 'trialing'] },
    },
    include: {
      subscriptionPlan: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Check for payment methods
  const paymentMethods = await this.prisma.paymentMethod.findMany({
    where: {
      ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
    },
  });

  // Check for default payment method
  const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault);

  return {
    hasActiveSubscription: !!activeSubscription,
    hasPaymentMethod: paymentMethods.length > 0,
    hasDefaultPaymentMethod: !!defaultPaymentMethod,
    paymentMethodsCount: paymentMethods.length,
    subscription: activeSubscription ? {
      id: activeSubscription.id,
      planId: activeSubscription.subscriptionPlanId,
      planName: activeSubscription.subscriptionPlan.planName,
      price: activeSubscription.subscriptionPlan.price,
      status: activeSubscription.status,
      currentPeriodStart: activeSubscription.currentPeriodStart,
      currentPeriodEnd: activeSubscription.currentPeriodEnd,
      cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
      daysUntilRenewal: Math.ceil(
        (activeSubscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    } : null,
    capabilities: {
      canPurchase: !activeSubscription && paymentMethods.length > 0,
      canUpgrade: !!activeSubscription && !activeSubscription.cancelAtPeriodEnd,
      canDowngrade: !!activeSubscription && !activeSubscription.cancelAtPeriodEnd,
      canReactivate: activeSubscription?.cancelAtPeriodEnd || false,
      canCancel: !!activeSubscription && !activeSubscription.cancelAtPeriodEnd,
      needsPaymentMethod: paymentMethods.length === 0,
    },
    warnings: this.generateWarnings(activeSubscription, paymentMethods),
  };
}

/**
 * Helper: Generate warnings for subscription status
 */
private generateWarnings(
  subscription: any,
  paymentMethods: any[],
): string[] {
  const warnings: string[] = [];

  if (!subscription) {
    warnings.push('No active subscription. Please subscribe to a plan.');
  }

  if (paymentMethods.length === 0) {
    warnings.push('No payment method on file. Add a payment method to continue.');
  }

  if (subscription?.cancelAtPeriodEnd) {
    const daysRemaining = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    warnings.push(
      `Subscription will be canceled in ${daysRemaining} days. Reactivate to continue service.`
    );
  }

  if (subscription?.status === 'past_due') {
    warnings.push('Payment failed. Please update your payment method to avoid service interruption.');
  }

  if (subscription?.status === 'unpaid') {
    warnings.push('Subscription is unpaid. Service may be interrupted.');
  }

  if (!paymentMethods.find(pm => pm.isDefault)) {
    warnings.push('No default payment method set. Please set a default payment method.');
  }

  return warnings;
}

/**
 * Upgrade or downgrade subscription plan
 */
async upgradeOrDowngradeSubscription(
  userId: string,
  userType: string,
  dto: UpgradeSubscriptionDto,
) {
  // Get current active subscription
  const currentSubscription = await this.prisma.subscription.findFirst({
    where: {
      ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
      status: { in: ['active', 'trialing'] },
    },
    include: {
      subscriptionPlan: true,
    },
  });

  if (!currentSubscription) {
    throw new NotFoundException('No active subscription found to upgrade/downgrade');
  }

  // Get new subscription plan
  const newPlan = await this.prisma.subscriptionPlan.findUnique({
    where: { id: dto.newSubscriptionPlanId },
  });

  if (!newPlan) {
    throw new NotFoundException('New subscription plan not found');
  }

  if (!newPlan.stripePriceId) {
    throw new BadRequestException('New subscription plan does not have a Stripe price ID');
  }

  // Check if trying to switch to the same plan
  if (currentSubscription.subscriptionPlanId === dto.newSubscriptionPlanId) {
    throw new BadRequestException('Already subscribed to this plan');
  }

  // Get payment method if specified
  let paymentMethodId: string | undefined;
  if (dto.paymentMethodId) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: dto.paymentMethodId },
      select: { stripePaymentMethodId: true, clinicId: true, therapistId: true },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Verify ownership
    if (
      (userType === 'CLINIC' && paymentMethod.clinicId !== userId) ||
      (userType === 'THERAPIST' && paymentMethod.therapistId !== userId)
    ) {
      throw new BadRequestException('Payment method does not belong to user');
    }

    paymentMethodId = paymentMethod.stripePaymentMethodId;
  }

  // Get the Stripe subscription
  const stripeSubscription = await this.stripe.subscriptions.retrieve(
    currentSubscription.stripeSubscriptionId,
  );

  // Update the subscription in Stripe
  const updatedStripeSubscription = await this.stripe.subscriptions.update(
    currentSubscription.stripeSubscriptionId,
    {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: newPlan.stripePriceId,
        },
      ],
      proration_behavior: dto.prorationBehavior || 'create_prorations',
      ...(paymentMethodId && { default_payment_method: paymentMethodId }),
      metadata: {
        userId,
        userType,
        planId: newPlan.id,
        previousPlanId: currentSubscription.subscriptionPlanId,
        upgradeDate: new Date().toISOString(),
      },
    },
  );

  // Update subscription in database
  const updatedSubscription = await this.prisma.subscription.update({
    where: { id: currentSubscription.id },
    data: {
      subscriptionPlanId: newPlan.id,
      status: updatedStripeSubscription.status as any,
      currentPeriodStart: new Date(
        (updatedStripeSubscription as any).current_period_start * 1000,
      ),
      currentPeriodEnd: new Date(
        (updatedStripeSubscription as any).current_period_end * 1000,
      ),
    },
    include: {
      subscriptionPlan: true,
    },
  });

  // Update user's subscription plan reference
  if (userType === 'CLINIC') {
    await this.prisma.privateClinic.update({
      where: { id: userId },
      data: { subscriptionPlanId: newPlan.id },
    });
  } else {
    await this.prisma.therapist.update({
      where: { id: userId },
      data: { subscriptionPlanId: newPlan.id },
    });
  }

  return {
    ...updatedSubscription,
    message: this.getUpgradeMessage(
      currentSubscription.subscriptionPlan.price,
      newPlan.price,
    ),
  };
}

/**
 * Helper method to generate upgrade/downgrade message
 */
private getUpgradeMessage(oldPrice: number, newPrice: number): string {
  if (newPrice > oldPrice) {
    return 'Subscription upgraded successfully. Prorated charges have been applied.';
  } else if (newPrice < oldPrice) {
    return 'Subscription downgraded successfully. Credit will be applied to your next invoice.';
  } else {
    return 'Subscription plan changed successfully.';
  }
}
}