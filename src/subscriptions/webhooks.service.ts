// ==========================================
// FILE 1: webhooks.service.ts (FIXED)
// ==========================================
// src/subscriptions/webhooks.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-11-17.clover' as any,
    });
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  async handleStripeWebhook(signature: string, rawBody: any) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Received webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error: any) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      throw error;
    }

    return { received: true };
  }

  /**
   * Handle successful payment - FIXED to avoid duplicates
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    this.logger.log(`Processing payment success for invoice: ${invoice.id}`);

    const subscriptionId = (invoice as any).subscription as string | null;
    
    if (!subscriptionId) {
      this.logger.log('Invoice has no subscription, skipping');
      return;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for Stripe ID: ${subscriptionId}`);
      return;
    }

    const paymentIntentId = (invoice as any).payment_intent as string | null;
    
    if (!paymentIntentId) {
      this.logger.warn(`Invoice ${invoice.id} has no payment_intent`);
      return;
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (existingPayment) {
      this.logger.log(`Payment already recorded: ${paymentIntentId}, updating status if needed`);
      
      // Update payment status if it was pending
      if (existingPayment.status !== 'succeeded') {
        await this.prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: 'succeeded',
            paidAt: new Date(),
          },
        });
        this.logger.log(`Payment status updated to succeeded: ${paymentIntentId}`);
      }
      return;
    }

    // Fetch full payment intent details
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });

    // Get charge details
    let charge: Stripe.Charge | undefined;
    if (paymentIntent.latest_charge) {
      charge = typeof paymentIntent.latest_charge === 'string'
        ? await this.stripe.charges.retrieve(paymentIntent.latest_charge)
        : paymentIntent.latest_charge;
    }

    // Get paid timestamp
    const statusTransitions = (invoice as any).status_transitions as { paid_at?: number } | undefined;
    const paidAt = statusTransitions?.paid_at 
      ? new Date(statusTransitions.paid_at * 1000)
      : new Date();

    // Create payment record
    await this.prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        stripeSubscriptionId: subscriptionId,
        stripePaymentIntentId: paymentIntentId,
        stripeChargeId: charge?.id || null,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'succeeded',
        description: invoice.description || `${subscription.subscriptionPlan.planName} - Payment`,
        paymentMethodLast4: charge?.payment_method_details?.card?.last4 || 'N/A',
        paymentMethodBrand: charge?.payment_method_details?.card?.brand || 'N/A',
        paymentType: 'subscription',
        paidAt: paidAt,
        ...(subscription.clinicId ? { clinicId: subscription.clinicId } : {}),
        ...(subscription.therapistId ? { therapistId: subscription.therapistId } : {}),
      },
    });

    this.logger.log(`Payment recorded successfully: ${paymentIntentId}`);
  }

  /**
   * Handle failed payment
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    this.logger.log(`Processing payment failure for invoice: ${invoice.id}`);

    const subscriptionId = (invoice as any).subscription as string | null;

    if (!subscriptionId) {
      this.logger.log('Invoice has no subscription, skipping');
      return;
    }

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'past_due' },
    });

    this.logger.log(`Subscription marked as past_due: ${subscriptionId}`);

    // Also update payment record if it exists
    const paymentIntentId = (invoice as any).payment_intent as string | null;
    
    if (paymentIntentId) {
      await this.prisma.payment.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { status: 'failed' },
      });
      this.logger.log(`Payment marked as failed: ${paymentIntentId}`);
    }
  }

  /**
   * Handle subscription update
   */
  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    this.logger.log(`Processing subscription update: ${stripeSubscription.id}`);

    const subscriptionItem = stripeSubscription.items.data[0];
    
    if (!subscriptionItem) {
      this.logger.error('No subscription items found');
      return;
    }

    const currentPeriodStart = (subscriptionItem as any).current_period_start as number | undefined;
    const currentPeriodEnd = (subscriptionItem as any).current_period_end as number | undefined;

    if (!currentPeriodStart || !currentPeriodEnd) {
      this.logger.error('Invalid subscription item period data');
      return;
    }

    const periodStart = new Date(currentPeriodStart * 1000);
    const periodEnd = new Date(currentPeriodEnd * 1000);

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSubscription.id },
      data: {
        status: stripeSubscription.status as any,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        ...(stripeSubscription.canceled_at && {
          canceledAt: new Date(stripeSubscription.canceled_at * 1000),
        }),
      },
    });

    this.logger.log(`Subscription updated: ${stripeSubscription.id}`);
  }

  /**
   * Handle subscription deletion
   */
  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    this.logger.log(`Processing subscription deletion: ${stripeSubscription.id}`);

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSubscription.id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
      },
    });

    this.logger.log(`Subscription canceled: ${stripeSubscription.id}`);
  }

  /**
   * Handle subscription creation
   */
  private async handleSubscriptionCreated(stripeSubscription: Stripe.Subscription) {
    this.logger.log(`Processing subscription creation: ${stripeSubscription.id}`);
    // Usually handled by purchaseSubscription endpoint
  }
}