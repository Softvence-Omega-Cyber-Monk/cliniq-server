// src/subscriptions/webhooks.controller.ts
import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import express from 'express';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Hide from Swagger docs for security
  @ApiOperation({
    summary: 'Stripe webhook handler',
    description: 'Handles Stripe webhook events for subscription updates and payments',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature',
  })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: express.Request,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Get raw body for signature verification
    const rawBody = request.body;

    return this.webhooksService.handleStripeWebhook(signature, rawBody);
  }
}

