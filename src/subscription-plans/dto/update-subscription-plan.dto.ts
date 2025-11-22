import { IsString, IsNumber, IsPositive, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}