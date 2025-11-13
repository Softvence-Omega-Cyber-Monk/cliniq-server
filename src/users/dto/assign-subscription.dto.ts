import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
export class AssignSubscriptionDto {
  @ApiProperty({
    description: 'Subscription plan ID to assign',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  subscriptionPlanId: string;
}