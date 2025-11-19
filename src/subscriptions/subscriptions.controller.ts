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