import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches, Length } from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({
    description: 'Stripe payment method ID',
    example: 'pm_1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  stripePaymentMethodId: string;

  @ApiProperty({
    description: 'Cardholder name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  cardHolderName: string;

  @ApiProperty({
    description: 'Last 4 digits of card number',
    example: '4242',
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  cardLast4: string;

  @ApiProperty({
    description: 'Card brand (Visa, Mastercard, Amex, etc.)',
    example: 'Visa',
  })
  @IsString()
  @IsNotEmpty()
  cardBrand: string;

  @ApiProperty({
    description: 'Card expiry month (MM)',
    example: '12',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'Expiry month must be in MM format (01-12)' })
  expiryMonth: string;

  @ApiProperty({
    description: 'Card expiry year (YYYY)',
    example: '2025',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/, { message: 'Expiry year must be in YYYY format' })
  expiryYear: string;

  @ApiProperty({
    description: 'Billing address line 1',
    example: '123 Main St',
  })
  @IsString()
  @IsNotEmpty()
  billingAddressLine1: string;

  @ApiProperty({
    description: 'Billing address line 2',
    example: 'Apt 4B',
    required: false,
  })
  @IsOptional()
  @IsString()
  billingAddressLine2?: string;

  @ApiProperty({
    description: 'Billing city',
    example: 'New York',
  })
  @IsString()
  @IsNotEmpty()
  billingCity: string;

  @ApiProperty({
    description: 'Billing state/province',
    example: 'NY',
  })
  @IsString()
  @IsNotEmpty()
  billingState: string;

  @ApiProperty({
    description: 'Billing postal/zip code',
    example: '10001',
  })
  @IsString()
  @IsNotEmpty()
  billingPostalCode: string;

  @ApiProperty({
    description: 'Billing country code (ISO 3166-1 alpha-2)',
    example: 'US',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  billingCountry: string;
}