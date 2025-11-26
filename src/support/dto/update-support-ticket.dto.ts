import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateSupportTicketDto {
  @ApiProperty({
    description: 'Updated subject',
    example: 'Billing issue - subscription charged twice',
    required: false,
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(200)
  subject?: string;

  @ApiProperty({
    description: 'Updated message',
    example: 'Additional info: The double charge appeared on my credit card statement.',
    required: false,
    minLength: 10,
  })
  @IsString()
  @IsOptional()
  @MinLength(10)
  message?: string;
}