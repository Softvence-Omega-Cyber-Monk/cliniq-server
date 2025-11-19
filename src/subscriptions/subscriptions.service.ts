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

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-11-20.acacia',
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
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
      include: {
        subscriptionPlan: true,
      },
    });

    // Save payment record if payment was successful
    const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    if (invoice && invoice.payment_intent) {
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
      
      if (paymentIntent.status === 'succeeded') {
        const charge = paymentIntent.charges.data[0];
        
        await this.prisma.payment.create({
          data: {
            subscriptionId: subscription.id,
            stripeSubscriptionId: stripeSubscription.id,
            stripePaymentIntentId: paymentIntent.id,
            stripeChargeId: charge?.id,
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

    // Cancel in Stripe
    const stripeSubscription = await this.stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: !dto.cancelImmediately,
        ...(dto.cancelImmediately && { cancel_at: 'now' as any }),
      },
    );

    // Update in database
    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: dto.cancelImmediately ? 'canceled' : stripeSubscription.status,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
      include: {
        subscriptionPlan: true,
      },
    });

    return updatedSubscription;
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
}