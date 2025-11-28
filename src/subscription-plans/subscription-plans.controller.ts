// src/subscription-plans/subscription-plans.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

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
    description: 'Create a new subscription plan with Stripe integration. Admins can specify the target role (CLINIC or INDIVIDUAL_THERAPIST) to control who can see this plan. This endpoint should be protected with admin authentication.',
  })
  @ApiBody({
    type: CreateSubscriptionPlanDto,
    examples: {
      clinicPlan: {
        summary: 'Clinic Monthly Plan',
        value: {
          planName: 'Clinic Pro Plan',
          price: 99.99,
          duration: 30,
          features: 'Unlimited therapists, Unlimited clients, Priority support, Advanced analytics',
          role: 'CLINIC',
        },
      },
      therapistPlan: {
        summary: 'Individual Therapist Plan',
        value: {
          planName: 'Solo Practitioner Plan',
          price: 29.99,
          duration: 30,
          features: 'Up to 50 clients, Email support, Basic analytics, Calendar integration',
          role: 'INDIVIDUAL_THERAPIST',
        },
      },
      enterprisePlan: {
        summary: 'Enterprise Yearly Plan',
        value: {
          planName: 'Enterprise Plan',
          price: 999.99,
          duration: 365,
          features: 'Unlimited everything, 24/7 support, Advanced analytics, Custom branding, API access, Dedicated account manager',
          role: 'CLINIC',
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
        planName: 'Clinic Pro Plan',
        price: 99.99,
        duration: 30,
        features: 'Unlimited therapists, Unlimited clients, Priority support, Advanced analytics',
        role: 'CLINIC',
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
  @ApiResponse({
    status: 409,
    description: 'Conflict - A plan with this name already exists for the specified role',
  })
  async createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.plansService.createPlan(dto);
  }

  /**
   * Get all available subscription plans (Public/Authenticated)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all subscription plans',
    description: 'Retrieve all active subscription plans. Can be filtered by role to show only plans for clinics or individual therapists.',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['CLINIC', 'INDIVIDUAL_THERAPIST'],
    description: 'Filter plans by target role',
    example: 'CLINIC',
  })
  @ApiResponse({
    status: 200,
    description: 'List of subscription plans retrieved successfully',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          planName: 'Clinic Pro Plan',
          price: 99.99,
          duration: 30,
          features: 'Unlimited therapists, Unlimited clients, Priority support',
          role: 'CLINIC',
          stripePriceId: 'price_1234567890',
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
          expiredAt: null,
          _count: {
            clinics: 15,
            therapists: 0,
            subscriptions: 15,
          },
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          planName: 'Solo Practitioner Plan',
          price: 29.99,
          duration: 30,
          features: 'Up to 50 clients, Email support, Basic analytics',
          role: 'INDIVIDUAL_THERAPIST',
          stripePriceId: 'price_0987654321',
          createdAt: '2024-01-15T11:00:00.000Z',
          updatedAt: '2024-01-15T11:00:00.000Z',
          expiredAt: null,
          _count: {
            clinics: 0,
            therapists: 42,
            subscriptions: 42,
          },
        },
      ],
    },
  })
  async getAllPlans(
    @Query('role') role?: 'CLINIC' | 'INDIVIDUAL_THERAPIST',
  ) {
    return this.plansService.getAllPlans(role);
  }

  /**
   * Get a specific subscription plan by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get subscription plan by ID',
    description: 'Retrieve detailed information about a specific subscription plan including subscriber count and role',
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
        planName: 'Clinic Pro Plan',
        price: 99.99,
        duration: 30,
        features: 'Unlimited therapists, Unlimited clients, Priority support',
        role: 'CLINIC',
        stripePriceId: 'price_1234567890',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
        expiredAt: null,
        _count: {
          clinics: 15,
          therapists: 42,
          subscriptions: 57,
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
    description: 'Update an existing subscription plan including its role. When updating price, a new Stripe price will be created and the old one will be archived. This endpoint should be protected with admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Subscription plan ID to update',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateSubscriptionPlanDto,
    examples: {
      updateRole: {
        summary: 'Change Plan Role',
        value: {
          role: 'INDIVIDUAL_THERAPIST',
        },
      },
      updatePrice: {
        summary: 'Update Price',
        value: {
          price: 59.99,
        },
      },
      updateAll: {
        summary: 'Update Multiple Fields',
        value: {
          planName: 'Enterprise Pro Plan',
          price: 149.99,
          duration: 30,
          features: 'Unlimited everything, White-label solution, API access, Dedicated support',
          role: 'CLINIC',
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
        features: 'Unlimited clients, 24/7 support, Advanced analytics',
        role: 'INDIVIDUAL_THERAPIST',
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
        role: 'CLINIC',
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
        role: 'INDIVIDUAL_THERAPIST',
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