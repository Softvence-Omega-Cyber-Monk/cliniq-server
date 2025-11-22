// src/subscription-plans/subscription-plans.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(private readonly plansService: SubscriptionPlansService) {}

  /**
   * Create a new subscription plan (Admin only)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new subscription plan',
    description: 'Create a new subscription plan with Stripe integration. This endpoint should be protected with admin authentication.',
  })
  @ApiBody({
    type: CreateSubscriptionPlanDto,
    examples: {
      basicPlan: {
        summary: 'Basic Monthly Plan',
        value: {
          planName: 'Basic Plan',
          price: 29.99,
          duration: 30,
          features: 'Up to 10 clients, Email support, Basic analytics',
        },
      },
      professionalPlan: {
        summary: 'Professional Monthly Plan',
        value: {
          planName: 'Professional Plan',
          price: 49.99,
          duration: 30,
          features: 'Unlimited clients, Priority support, Advanced analytics, Custom branding',
        },
      },
      enterprisePlan: {
        summary: 'Enterprise Yearly Plan',
        value: {
          planName: 'Enterprise Plan',
          price: 499.99,
          duration: 365,
          features: 'Unlimited clients, 24/7 support, Advanced analytics, Custom branding, API access, Dedicated account manager',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription plan created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        planName: 'Professional Plan',
        price: 49.99,
        duration: 30,
        features: 'Unlimited clients, Priority support, Advanced analytics, Custom branding',
        stripePriceId: 'price_1234567890',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
        expiredAt: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or Stripe error',
  })
  async createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.plansService.createPlan(dto);
  }

  /**
   * Get all available subscription plans (Public)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all subscription plans',
    description: 'Retrieve all active subscription plans available for purchase',
  })
  @ApiResponse({
    status: 200,
    description: 'List of subscription plans retrieved successfully',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          planName: 'Basic Plan',
          price: 29.99,
          duration: 30,
          features: 'Up to 10 clients, Email support, Basic analytics',
          stripePriceId: 'price_1234567890',
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
          expiredAt: null,
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          planName: 'Professional Plan',
          price: 49.99,
          duration: 30,
          features: 'Unlimited clients, Priority support, Advanced analytics, Custom branding',
          stripePriceId: 'price_0987654321',
          createdAt: '2024-01-15T11:00:00.000Z',
          updatedAt: '2024-01-15T11:00:00.000Z',
          expiredAt: null,
        },
      ],
    },
  })
  async getAllPlans() {
    return this.plansService.getAllPlans();
  }

  /**
   * Get a specific subscription plan by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get subscription plan by ID',
    description: 'Retrieve detailed information about a specific subscription plan including subscriber count',
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
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        planName: 'Professional Plan',
        price: 49.99,
        duration: 30,
        features: 'Unlimited clients, Priority support, Advanced analytics, Custom branding',
        stripePriceId: 'price_1234567890',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
        expiredAt: null,
        _count: {
          clinics: 15,
          therapists: 42,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription plan not found',
  })
  async getPlanById(@Param('id') id: string) {
    return this.plansService.getPlanById(id);
  }

  /**
   * Update a subscription plan (Admin only)
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update subscription plan',
    description: 'Update an existing subscription plan. When updating price, a new Stripe price will be created and the old one will be archived. This endpoint should be protected with admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Subscription plan ID to update',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateSubscriptionPlanDto,
    examples: {
      updateName: {
        summary: 'Update Plan Name',
        value: {
          planName: 'Premium Professional Plan',
        },
      },
      updatePrice: {
        summary: 'Update Price',
        value: {
          price: 59.99,
        },
      },
      updateFeatures: {
        summary: 'Update Features',
        value: {
          features: 'Unlimited clients, 24/7 support, Advanced analytics, Custom branding, Priority onboarding',
        },
      },
      updateAll: {
        summary: 'Update Multiple Fields',
        value: {
          planName: 'Enterprise Pro Plan',
          price: 99.99,
          duration: 30,
          features: 'Unlimited everything, White-label solution, API access, Dedicated support',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan updated successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        planName: 'Premium Professional Plan',
        price: 59.99,
        duration: 30,
        features: 'Unlimited clients, 24/7 support, Advanced analytics, Custom branding, Priority onboarding',
        stripePriceId: 'price_new_1234567890',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-20T14:45:00.000Z',
        expiredAt: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription plan not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or Stripe error',
  })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.plansService.updatePlan(id, dto);
  }

  /**
   * Delete a subscription plan (Admin only)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete subscription plan',
    description: 'Soft delete a subscription plan by setting expiredAt date. Cannot delete plans with active subscriptions. The plan will be archived in Stripe. This endpoint should be protected with admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Subscription plan ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan deleted successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        planName: 'Old Basic Plan',
        price: 19.99,
        duration: 30,
        features: 'Limited features',
        stripePriceId: 'price_1234567890',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-20T16:00:00.000Z',
        expiredAt: '2024-01-20T16:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription plan not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete plan with active subscriptions',
    schema: {
      example: {
        statusCode: 400,
        message: 'Cannot delete plan with active subscriptions. Please expire it instead.',
        error: 'Bad Request',
      },
    },
  })
  async deletePlan(@Param('id') id: string) {
    return this.plansService.deletePlan(id);
  }

  /**
   * Restore a deleted subscription plan
   */
  @Put(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore a deleted subscription plan',
    description: 'Restore a soft-deleted subscription plan by removing the expiredAt date. The plan will be reactivated in Stripe.',
  })
  @ApiParam({
    name: 'id',
    description: 'Subscription plan ID to restore',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan restored successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        planName: 'Basic Plan',
        price: 29.99,
        duration: 30,
        features: 'Up to 10 clients, Email support',
        stripePriceId: 'price_1234567890',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-21T09:15:00.000Z',
        expiredAt: null,
        message: 'Subscription plan restored successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription plan not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Plan is not deleted',
  })
  async restorePlan(@Param('id') id: string) {
    return this.plansService.restorePlan(id);
  }
}