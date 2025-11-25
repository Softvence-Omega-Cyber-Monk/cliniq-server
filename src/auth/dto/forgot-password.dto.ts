import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User type (CLINIC or THERAPIST)',
    example: 'THERAPIST',
    enum: ['ADMIN', 'INDIVIDUAL_THERAPIST','CLINIC', 'THERAPIST'],
  })
  @IsString()
  @IsNotEmpty()
  userType: 'CLINIC' | 'THERAPIST'| 'ADMIN' | 'INDIVIDUAL_THERAPIST';
}