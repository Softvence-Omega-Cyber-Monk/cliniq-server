import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({
    description: 'Subject of the support ticket',
    example: 'Unable to schedule appointments',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @ApiProperty({
    description: 'Detailed message describing the issue',
    example: 'I am experiencing issues when trying to schedule appointments for my clients. The calendar is not loading properly.',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;
}