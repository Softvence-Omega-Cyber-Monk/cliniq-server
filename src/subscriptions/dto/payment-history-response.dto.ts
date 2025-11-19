import { ApiProperty } from '@nestjs/swagger';

export class PaymentHistoryResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'sub_1234567890' })
  stripeSubscriptionId: string;

  @ApiProperty({ example: 'pi_1234567890' })
  stripePaymentIntentId: string;

  @ApiProperty({ example: 'ch_1234567890' })
  stripeChargeId: string;

  @ApiProperty({ example: 99.99 })
  amount: number;

  @ApiProperty({ example: 'usd' })
  currency: string;

  @ApiProperty({ example: 'succeeded', enum: ['succeeded', 'pending', 'failed', 'canceled'] })
  status: string;

  @ApiProperty({ example: 'Professional Plan - January 2024' })
  description: string;

  @ApiProperty({ example: '****4242' })
  paymentMethodLast4: string;

  @ApiProperty({ example: 'visa' })
  paymentMethodBrand: string;

  @ApiProperty({ example: 'subscription' })
  paymentType: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  paidAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}