import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Matches, Length } from 'class-validator';

export class UpdatePaymentMethodDto {
  @ApiProperty({
    description: 'Cardholder name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  cardHolderName?: string; // Fixed: matches schema field name

  @ApiProperty({
    description: 'Card expiry month (MM)',
    example: '12',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'Expiry month must be in MM format (01-12)' })
  expiryMonth?: string;

  @ApiProperty({
    description: 'Card expiry year (YYYY)',
    example: '2025',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Expiry year must be in YYYY format' })
  expiryYear?: string;

  @ApiProperty({
    description: 'Billing address line 1',
    example: '123 Main St',
    required: false,
  })
  @IsOptional()
  @IsString()
  billingAddressLine1?: string;

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
    required: false,
  })
  @IsOptional()
  @IsString()
  billingCity?: string;

  @ApiProperty({
    description: 'Billing state/province',
    example: 'NY',
    required: false,
  })
  @IsOptional()
  @IsString()
  billingState?: string;

  @ApiProperty({
    description: 'Billing postal/zip code',
    example: '10001',
    required: false,
  })
  @IsOptional()
  @IsString()
  billingPostalCode?: string;

  @ApiProperty({
    description: 'Billing country code (ISO 3166-1 alpha-2)',
    example: 'US',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  billingCountry?: string;
}