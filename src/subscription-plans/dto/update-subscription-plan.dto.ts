import { IsString, IsNumber, IsPositive, IsInt, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PlanRole {
  CLINIC = 'CLINIC',
  INDIVIDUAL_THERAPIST = 'INDIVIDUAL_THERAPIST',
}

export class UpdateSubscriptionPlanDto {
  @ApiProperty({
    description: 'Name of the subscription plan',
    example: 'Premium Plan',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  planName?: string;

  @ApiProperty({
    description: 'Price of the subscription plan in USD',
    example: 79.99,
    type: Number,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Duration of the subscription in days',
    example: 365,
    type: Number,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  duration?: number;

  @ApiProperty({
    description: 'Features included in the plan (comma-separated)',
    example: 'Unlimited clients, 24/7 support, Advanced analytics, Custom branding, API access',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  features?: string;

    @ApiProperty({
    description: 'Target user role for this plan - determines who can see and purchase it',
    example: 'INDIVIDUAL_THERAPIST',
    enum: PlanRole,
    required: false,
  })
  @IsEnum(PlanRole)
  @IsOptional()
  role?: PlanRole;
}