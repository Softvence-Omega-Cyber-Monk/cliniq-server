// src/subscriptions/subscriptions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PurchaseSubscriptionDto } from './dto/purchase-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { PaymentHistoryResponseDto } from './dto/payment-history-response.dto';
import { SubscriptionQueryParamsDto } from './dto/query-params.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('purchase')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Purchase a subscription plan',
    description:
      'Subscribe to a plan using Stripe. Payment will be charged immediately using the default payment method or specified payment method. Creates subscription record and payment history.',
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription purchased successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Missing Stripe customer ID or invalid payment method',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription plan or payment method not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User already has an active subscription',
  })
  async purchaseSubscription(
    @Request() req,
    @Body() dto: PurchaseSubscriptionDto,
  ) {
    return this.subscriptionsService.purchaseSubscription(
      req.user.sub,
      req.user.userType,
      dto,
    );
  }

  @Get('plans')
@ApiOperation({
  summary: 'Get all available subscription plans',
  description: 'Retrieve all active (non-expired) subscription plans available for purchase',
})
@ApiResponse({
  status: 200,
  description: 'Subscription plans retrieved successfully',
  schema: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        planName: { type: 'string', example: 'Professional Plan' },
        price: { type: 'number', example: 99.99 },
        duration: { type: 'number', example: 30 },
        features: { type: 'string', example: 'Unlimited sessions, Priority support' },
        stripePriceId: { type: 'string', example: 'price_1234567890' },
        createdAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  },
})
@ApiResponse({
  status: 401,
  description: 'Unauthorized',
})
async getSubscriptionPlans() {
  return this.subscriptionsService.getSubscriptionPlans();
}

@Get('plans/:id')
@ApiOperation({
  summary: 'Get subscription plan by ID',
  description: 'Retrieve details of a specific subscription plan',
})
@ApiParam({
  name: 'id',
  description: 'Subscription plan ID',
  example: '123e4567-e89b-12d3-a456-426614174000',
})
@ApiResponse({
  status: 200,
  description: 'Subscription plan retrieved successfully',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      planName: { type: 'string' },
      price: { type: 'number' },
      duration: { type: 'number' },
      features: { type: 'string' },
      stripePriceId: { type: 'string' },
    },
  },
})
@ApiResponse({
  status: 404,
  description: 'Subscription plan not found',
})
@ApiResponse({
  status: 401,
  description: 'Unauthorized',
})
async getSubscriptionPlanById(@Param('id') id: string) {
  return this.subscriptionsService.getSubscriptionPlanById(id);
}

@Post('preview-upgrade')
@HttpCode(HttpStatus.OK)
@ApiOperation({
  summary: 'Preview subscription upgrade/downgrade',
  description: 'Calculate prorated amount and details for changing subscription plan before actual change',
})
@ApiResponse({
  status: 200,
  description: 'Preview calculated successfully',
  schema: {
    properties: {
      currentPlan: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          planName: { type: 'string' },
          price: { type: 'number' },
        },
      },
      newPlan: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          planName: { type: 'string' },
          price: { type: 'number' },
        },
      },
      prorationAmount: { type: 'number', example: 25.50 },
      immediateCharge: { type: 'number', example: 25.50 },
      nextBillingDate: { type: 'string', example: '2024-02-01T00:00:00.000Z' },
      currentPeriodEnd: { type: 'string' },
      daysRemaining: { type: 'number', example: 15 },
      percentRemaining: { type: 'number', example: 50.00 },
      currency: { type: 'string', example: 'usd' },
      isUpgrade: { type: 'boolean' },
      isDowngrade: { type: 'boolean' },
      message: { type: 'string' },
    },
  },
})
@ApiResponse({
  status: 400,
  description: 'Bad request - Already subscribed to this plan',
})
@ApiResponse({
  status: 404,
  description: 'No active subscription or plan not found',
})
@ApiResponse({
  status: 401,
  description: 'Unauthorized',
})
async previewUpgrade(
  @Request() req,
  @Body() dto: { newSubscriptionPlanId: string },
) {
  return this.subscriptionsService.previewUpgrade(
    req.user.sub,
    req.user.userType,
    dto.newSubscriptionPlanId,
  );
}

@Post('upgrade')
@HttpCode(HttpStatus.OK)
@ApiOperation({
  summary: 'Upgrade or downgrade subscription',
  description:
    'Change the current subscription plan. Upgrading will prorate and charge immediately. Downgrading will apply credit to the next billing cycle.',
})
@ApiResponse({
  status: 200,
  description: 'Subscription upgraded/downgraded successfully',
  type: SubscriptionResponseDto,
})
@ApiResponse({
  status: 400,
  description: 'Bad request - Invalid plan or already subscribed to this plan',
})
@ApiResponse({
  status: 401,
  description: 'Unauthorized',
})
@ApiResponse({
  status: 404,
  description: 'No active subscription or plan not found',
})
async upgradeSubscription(
  @Request() req,
  @Body() dto: UpgradeSubscriptionDto,
) {
  return this.subscriptionsService.upgradeOrDowngradeSubscription(
    req.user.sub,
    req.user.userType,
    dto,
  );
}

@Post('reactivate')
@HttpCode(HttpStatus.OK)
@ApiOperation({
  summary: 'Reactivate canceled subscription',
  description: 'Resume a subscription that was scheduled for cancellation at period end',
})
@ApiResponse({
  status: 200,
  description: 'Subscription reactivated successfully',
  type: SubscriptionResponseDto,
})
@ApiResponse({
  status: 400,
  description: 'Subscription is not scheduled for cancellation',
})
@ApiResponse({
  status: 404,
  description: 'No active subscription found',
})
@ApiResponse({
  status: 401,
  description: 'Unauthorized',
})
async reactivateSubscription(@Request() req) {
  return this.subscriptionsService.reactivateSubscription(
    req.user.sub,
    req.user.userType,
  );
}

@Get('status')
@ApiOperation({
  summary: 'Check subscription status and capabilities',
  description: 'Get comprehensive subscription status, payment methods, and user capabilities',
})
@ApiResponse({
  status: 200,
  description: 'Status retrieved successfully',
  schema: {
    properties: {
      hasActiveSubscription: { type: 'boolean' },
      hasPaymentMethod: { type: 'boolean' },
      hasDefaultPaymentMethod: { type: 'boolean' },
      paymentMethodsCount: { type: 'number' },
      subscription: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string' },
          planId: { type: 'string' },
          planName: { type: 'string' },
          price: { type: 'number' },
          status: { type: 'string' },
          currentPeriodStart: { type: 'string' },
          currentPeriodEnd: { type: 'string' },
          cancelAtPeriodEnd: { type: 'boolean' },
          daysUntilRenewal: { type: 'number' },
        },
      },
      capabilities: {
        type: 'object',
        properties: {
          canPurchase: { type: 'boolean' },
          canUpgrade: { type: 'boolean' },
          canDowngrade: { type: 'boolean' },
          canReactivate: { type: 'boolean' },
          canCancel: { type: 'boolean' },
          needsPaymentMethod: { type: 'boolean' },
        },
      },
      warnings: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
})
@ApiResponse({
  status: 401,
  description: 'Unauthorized',
})
async getSubscriptionStatus(@Request() req) {
  return this.subscriptionsService.getSubscriptionStatus(
    req.user.sub,
    req.user.userType,
  );
}

  @Get('current')
  @ApiOperation({
    summary: 'Get current active subscription',
    description: 'Retrieve the current active subscription for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current subscription retrieved successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription found',
  })
  async getCurrentSubscription(@Request() req) {
    return this.subscriptionsService.getCurrentSubscription(
      req.user.sub,
      req.user.userType,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all subscriptions',
    description: 'Retrieve all subscriptions (active, canceled, past) for the authenticated user with pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions retrieved successfully',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/SubscriptionResponseDto' } },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'],
    example: 'active',
  })
  async getAllSubscriptions(
    @Request() req,
    @Query() query: SubscriptionQueryParamsDto,
  ) {
    return this.subscriptionsService.getAllSubscriptions(
      req.user.sub,
      req.user.userType,
      query,
    );
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel subscription',
    description:
      'Cancel the current active subscription. By default, cancels at period end. Set cancelImmediately to true for immediate cancellation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription canceled successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription found',
  })
  async cancelSubscription(@Request() req, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionsService.cancelSubscription(
      req.user.sub,
      req.user.userType,
      dto,
    );
  }

  @Get('payments')
  @ApiOperation({
    summary: 'Get payment history',
    description: 'Retrieve all payment transactions for subscriptions with pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/PaymentHistoryResponseDto' } },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getPaymentHistory(
    @Request() req,
    @Query() query: SubscriptionQueryParamsDto,
  ) {
    return this.subscriptionsService.getPaymentHistory(
      req.user.sub,
      req.user.userType,
      query,
    );
  }

  @Get('payments/:id')
  @ApiOperation({
    summary: 'Get payment by ID',
    description: 'Retrieve a specific payment transaction by its ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved successfully',
    type: PaymentHistoryResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getPaymentById(@Request() req, @Param('id') id: string) {
    return this.subscriptionsService.getPaymentById(
      req.user.sub,
      req.user.userType,
      id,
    );
  }
}