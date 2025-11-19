// src/subscriptions/dto/cancel-subscription.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiProperty({
    description: 'Cancel immediately or at period end',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  cancelImmediately?: boolean;
}