import { ApiProperty } from '@nestjs/swagger';

export class PaymentMethodResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  cardHolderName: string;

  @ApiProperty({ example: '4242' })
  cardLast4: string;

  @ApiProperty({ example: 'Visa' })
  cardBrand: string;

  @ApiProperty({ example: '12' })
  expiryMonth: string;

  @ApiProperty({ example: '2025' })
  expiryYear: string;

  @ApiProperty({ example: '123 Main St' })
  billingAddressLine1: string;

  @ApiProperty({ example: 'Apt 4B', nullable: true })
  billingAddressLine2?: string;

  @ApiProperty({ example: 'New York' })
  billingCity: string;

  @ApiProperty({ example: 'NY' })
  billingState: string;

  @ApiProperty({ example: '10001' })
  billingPostalCode: string;

  @ApiProperty({ example: 'US' })
  billingCountry: string;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}