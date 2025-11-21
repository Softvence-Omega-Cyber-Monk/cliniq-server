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
      apiVersion: '2025-11-17.clover',
    });
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  async handleStripeWebhook(signature: string, rawBody: any) {
    let event: Stripe.Event;

    try {
      // Verify webhook signature
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

    // Handle different event types
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
   * Handle successful payment
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    this.logger.log(`Processing payment success for invoice: ${invoice.id}`);

    const invoiceAny = invoice as any;

    if (!invoiceAny.subscription) {
      return;
    }

    const subscriptionId = invoiceAny.subscription as string;
    const paymentIntent = invoiceAny.payment_intent as any;

    // Get subscription from database
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for Stripe ID: ${subscriptionId}`);
      return;
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (existingPayment) {
      this.logger.log(`Payment already recorded: ${paymentIntent.id}`);
      return;
    }

    // Get payment method details
    const charge = invoiceAny.charge as any;
    const paymentMethodDetails = charge?.payment_method_details;

    // Get paid_at timestamp safely
    const paidAt = invoiceAny.status_transitions?.paid_at 
      ? new Date(invoiceAny.status_transitions.paid_at * 1000)
      : new Date();

    // Create payment record
    await this.prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        stripeSubscriptionId: subscriptionId,
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: charge?.id || null,
        amount: invoiceAny.amount_paid / 100, // Convert from cents
        currency: invoiceAny.currency,
        status: 'succeeded',
        description: invoiceAny.description || `${subscription.subscriptionPlan.planName} - Payment`,
        paymentMethodLast4: paymentMethodDetails?.card?.last4 || 'N/A',
        paymentMethodBrand: paymentMethodDetails?.card?.brand || 'N/A',
        paymentType: 'subscription',
        paidAt: paidAt,
        ...(subscription.clinicId ? { clinicId: subscription.clinicId } : {}),
        ...(subscription.therapistId ? { therapistId: subscription.therapistId } : {}),
      },
    });

    this.logger.log(`Payment recorded successfully: ${paymentIntent.id}`);
  }

  /**
   * Handle failed payment
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    this.logger.log(`Processing payment failure for invoice: ${invoice.id}`);

    const invoiceAny = invoice as any;

    if (!invoiceAny.subscription) {
      return;
    }

    const subscriptionId = invoiceAny.subscription as string;

    // Update subscription status
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'past_due' },
    });

    // TODO: Send notification email to user about failed payment

    this.logger.log(`Subscription marked as past_due: ${subscriptionId}`);
  }

  /**
   * Handle subscription update
   */
  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    this.logger.log(`Processing subscription update: ${stripeSubscription.id}`);

    const subscriptionAny = stripeSubscription as any;

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSubscription.id },
      data: {
        status: subscriptionAny.status as any,
        currentPeriodStart: new Date(subscriptionAny.current_period_start * 1000),
        currentPeriodEnd: new Date(subscriptionAny.current_period_end * 1000),
        cancelAtPeriodEnd: subscriptionAny.cancel_at_period_end,
        ...(subscriptionAny.canceled_at && {
          canceledAt: new Date(subscriptionAny.canceled_at * 1000),
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
    // But can be used for additional processing if needed
  }
}