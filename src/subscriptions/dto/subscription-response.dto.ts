import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'sub_1234567890' })
  stripeSubscriptionId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  subscriptionPlanId: string;

  @ApiProperty({
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      planName: 'Professional Plan',
      price: 99.99,
    },
  })
  subscriptionPlan: {
    id: string;
    planName: string;
    price: number;
  };

  @ApiProperty({ example: 'active', enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'] })
  status: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  currentPeriodStart: Date;

  @ApiProperty({ example: '2024-02-01T00:00:00.000Z' })
  currentPeriodEnd: Date;

  @ApiProperty({ example: false })
  cancelAtPeriodEnd: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}