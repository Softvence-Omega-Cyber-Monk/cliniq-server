import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class PurchaseSubscriptionDto {
  @ApiProperty({
    description: 'Subscription plan ID to purchase',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  subscriptionPlanId: string;

  @ApiProperty({
    description: 'Payment method ID to use (optional, uses default if not provided)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}
