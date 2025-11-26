// src/subscriptions/dto/upgrade-subscription.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum ProrationBehavior {
  CREATE_PRORATIONS = 'create_prorations',
  NONE = 'none',
  ALWAYS_INVOICE = 'always_invoice',
}

export class UpgradeSubscriptionDto {
  @ApiProperty({
    description: 'New subscription plan ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  newSubscriptionPlanId: string;

  @ApiProperty({
    description: 'Proration behavior for the upgrade/downgrade',
    example: 'create_prorations',
    enum: ProrationBehavior,
    required: false,
    default: 'create_prorations',
  })
  @IsOptional()
  @IsEnum(ProrationBehavior)
  prorationBehavior?: ProrationBehavior;

  @ApiProperty({
    description: 'Payment method ID to use (optional, uses default if not provided)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}