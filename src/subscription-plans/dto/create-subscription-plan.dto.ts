import { IsString, IsNumber, IsPositive, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionPlanDto {
  @ApiProperty({
    description: 'Name of the subscription plan',
    example: 'Professional Plan',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  planName: string;

  @ApiProperty({
    description: 'Price of the subscription plan in USD',
    example: 49.99,
    type: Number,
  })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({
    description: 'Duration of the subscription in days',
    example: 30,
    type: Number,
  })
  @IsInt()
  @IsPositive()
  duration: number; // in days (e.g., 30 for monthly, 365 for yearly)

  @ApiProperty({
    description: 'Features included in the plan (comma-separated)',
    example: 'Unlimited clients, Priority support, Advanced analytics, Custom branding',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  features: string; // Comma-separated or JSON string of features
}