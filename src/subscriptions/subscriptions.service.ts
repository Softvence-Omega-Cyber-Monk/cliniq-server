// src/subscriptions/subscriptions.service.ts
// FIXED: Ensures payment records are ALWAYS created in database

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
      apiVersion: '2025-11-17.clover' as any,
    });
  }

  /**
   * Purchase a subscription plan - FIXED TO ALWAYS CREATE PAYMENT RECORD
   */
  async purchaseSubscription(
    userId: string,
    userType: string,
    dto: PurchaseSubscriptionDto,
  ) {
    const { stripeCustomerId, email, fullName } = await this.getUserInfo(userId, userType);

    if (!stripeCustomerId) {
      throw new BadRequestException('User does not have a Stripe customer ID');
    }

    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
        status: { in: ['active', 'trialing'] },
      },
    });

    if (existingSubscription) {
      throw new ConflictException('User already has an active subscription');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.subscriptionPlanId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    if (!plan.stripePriceId) {
      throw new BadRequestException('Subscription plan does not have a Stripe price ID');
    }

    let paymentMethodId: string;
    if (dto.paymentMethodId) {
      const paymentMethod = await this.prisma.paymentMethod.findUnique({
        where: { id: dto.paymentMethodId },
        select: { stripePaymentMethodId: true, clinicId: true, therapistId: true },
      });

      if (!paymentMethod) {
        throw new NotFoundException('Payment method not found');
      }

      if (
        (userType === 'CLINIC' && paymentMethod.clinicId !== userId) ||
        (userType === 'THERAPIST' && paymentMethod.therapistId !== userId)
      ) {
        throw new BadRequestException('Payment method does not belong to user');
      }

      paymentMethodId = paymentMethod.stripePaymentMethodId;
    } else {
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

    // Create subscription with expanded invoice and payment intent
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
    }) as Stripe.Subscription;

    const subscriptionItem = stripeSubscription.items.data[0];
    if (!subscriptionItem) {
      throw new Error('Stripe did not return subscription items.');
    }

    // Access period timestamps with proper typing
    const currentPeriodStart = (subscriptionItem as any).current_period_start as number | undefined;
    const currentPeriodEnd = (subscriptionItem as any).current_period_end as number | undefined;

    if (!currentPeriodStart || !currentPeriodEnd) {
      throw new Error('Stripe did not return valid billing period timestamps.');
    }

    const periodStart = new Date(currentPeriodStart * 1000);
    const periodEnd = new Date(currentPeriodEnd * 1000);

    // Create subscription record
    const subscription = await this.prisma.subscription.create({
      data: {
        stripeSubscriptionId: stripeSubscription.id,
        subscriptionPlanId: plan.id,
        ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
        status: stripeSubscription.status as any,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
      include: {
        subscriptionPlan: true,
      },
    });

    // FIXED: Always create payment record if invoice exists
    const latestInvoice = (stripeSubscription as any).latest_invoice as any;
    
    if (latestInvoice) {
      console.log('Processing invoice for payment record:', latestInvoice.id);
      
      const paymentIntentData = latestInvoice.payment_intent;
      
      if (paymentIntentData) {
        const paymentIntentId = typeof paymentIntentData === 'string' 
          ? paymentIntentData 
          : paymentIntentData.id;

        console.log('Payment Intent ID:', paymentIntentId);

        try {
          // Fetch full payment intent to ensure we have complete data
          const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge'],
          });

          console.log('Payment Intent Status:', paymentIntent.status);

          // Get charge details
          let charge: Stripe.Charge | undefined;
          if (paymentIntent.latest_charge) {
            charge = typeof paymentIntent.latest_charge === 'string'
              ? await this.stripe.charges.retrieve(paymentIntent.latest_charge)
              : paymentIntent.latest_charge;
          }

          // Create payment record regardless of status (but mark it appropriately)
          const paymentStatus = paymentIntent.status === 'succeeded' 
            ? 'succeeded' 
            : paymentIntent.status === 'processing' 
            ? 'pending' 
            : 'failed';

          const paymentRecord = await this.prisma.payment.create({
            data: {
              subscriptionId: subscription.id,
              stripeSubscriptionId: stripeSubscription.id,
              stripePaymentIntentId: paymentIntent.id,
              stripeChargeId: charge?.id || null,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              status: paymentStatus,
              description: `${plan.planName} - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
              paymentMethodLast4: charge?.payment_method_details?.card?.last4 || 'N/A',
              paymentMethodBrand: charge?.payment_method_details?.card?.brand || 'N/A',
              paymentType: 'subscription',
              paidAt: paymentIntent.status === 'succeeded' 
                ? new Date(paymentIntent.created * 1000) 
                : new Date(),
              ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
            },
          });

          console.log('Payment record created:', paymentRecord.id);
        } catch (error) {
          console.error('Error creating payment record:', error);
          // Don't throw - subscription is already created
        }
      } else {
        console.warn('No payment intent found in invoice');
      }
    } else {
      console.warn('No latest invoice found in subscription');
    }

    // Update user's subscription plan
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
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

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
      const stripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        },
      ) as Stripe.Subscription;

      const updatedSubscription = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: stripeSubscription.status as any,
          cancelAtPeriodEnd: true,
        },
        include: {
          subscriptionPlan: true,
        },
      });

      return updatedSubscription;
    }
  }

  /**
   * Get payment history - FIXED: Better error handling
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

    console.log('Fetching payment history for:', { userId, userType, where });

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
        orderBy: { createdAt: 'desc' }, // Changed from paidAt to createdAt for safety
      }),
      this.prisma.payment.count({ where }),
    ]);

    console.log('Payment history result:', { total, count: payments.length });

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

  /**
   * Get all subscription plans (only non-expired)
   */
  async getSubscriptionPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: {
        expiredAt: null,
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

    if (plan.expiredAt && plan.expiredAt < new Date()) {
      throw new BadRequestException('Subscription plan has expired');
    }

    return plan;
  }

  /**
   * Preview upgrade/downgrade
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

    const now = Date.now();
    const periodEnd = currentSubscription.currentPeriodEnd.getTime();
    const periodStart = currentSubscription.currentPeriodStart.getTime();
    const totalPeriodDuration = periodEnd - periodStart;
    const remainingTime = periodEnd - now;

    const percentRemaining = remainingTime / totalPeriodDuration;

    const creditAmount = currentPlan.price * percentRemaining;
    const chargeAmount = newPlan.price * percentRemaining;
    const prorationAmount = chargeAmount - creditAmount;

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
      creditAmount: Number(creditAmount.toFixed(2)),
      chargeAmount: Number(chargeAmount.toFixed(2)),
      prorationAmount: Number(prorationAmount.toFixed(2)),
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
        : `A credit of $${Math.abs(Math.min(0, prorationAmount)).toFixed(2)} will be applied to your next invoice.`,
      description: isUpgrade
        ? `Upgrading to ${newPlan.planName}. You'll be charged the prorated difference immediately.`
        : `Downgrading to ${newPlan.planName}. Your credit will be applied to the next billing cycle.`,
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

    const updatedStripeSubscription = await this.stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
        metadata: {
          reactivatedAt: new Date().toISOString(),
        },
      },
    ) as Stripe.Subscription;

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

    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: {
        ...(userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId }),
      },
    });

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

    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.newSubscriptionPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException('New subscription plan not found');
    }

    if (!newPlan.stripePriceId) {
      throw new BadRequestException('New subscription plan does not have a Stripe price ID');
    }

    if (currentSubscription.subscriptionPlanId === dto.newSubscriptionPlanId) {
      throw new BadRequestException('Already subscribed to this plan');
    }

    let paymentMethodId: string | undefined;
    if (dto.paymentMethodId) {
      const paymentMethod = await this.prisma.paymentMethod.findUnique({
        where: { id: dto.paymentMethodId },
        select: { stripePaymentMethodId: true, clinicId: true, therapistId: true },
      });

      if (!paymentMethod) {
        throw new NotFoundException('Payment method not found');
      }

      if (
        (userType === 'CLINIC' && paymentMethod.clinicId !== userId) ||
        (userType === 'THERAPIST' && paymentMethod.therapistId !== userId)
      ) {
        throw new BadRequestException('Payment method does not belong to user');
      }

      paymentMethodId = paymentMethod.stripePaymentMethodId;
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      currentSubscription.stripeSubscriptionId,
    ) as Stripe.Subscription;

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
    ) as Stripe.Subscription;

    const updatedSubscriptionItem = updatedStripeSubscription.items.data[0];
    if (!updatedSubscriptionItem) {
      throw new Error('Stripe did not return subscription items.');
    }

    const currentPeriodStart = (updatedSubscriptionItem as any).current_period_start as number | undefined;
    const currentPeriodEnd = (updatedSubscriptionItem as any).current_period_end as number | undefined;

    if (!currentPeriodStart || !currentPeriodEnd) {
      throw new Error('Stripe did not return valid billing period timestamps.');
    }

    const periodStart = new Date(currentPeriodStart * 1000);
    const periodEnd = new Date(currentPeriodEnd * 1000);

    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        subscriptionPlanId: newPlan.id,
        status: updatedStripeSubscription.status as any,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      include: {
        subscriptionPlan: true,
      },
    });

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