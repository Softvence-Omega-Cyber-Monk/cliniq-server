import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty, Matches, IsOptional } from 'class-validator';
export class RegisterTherapistDto {
  @ApiProperty({
    description: 'Full name of the therapist',
    example: 'Dr. Jane Doe',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    description: 'Professional license number',
    example: 'PSY-12345',
    required: false,
  })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiProperty({
    description: 'Professional qualifications',
    example: 'PhD in Clinical Psychology',
    required: false,
  })
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiProperty({
    description: 'Email address for therapist account',
    example: 'jane.doe@therapy.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Area of specialization',
    example: 'Cognitive Behavioral Therapy',
    required: false,
  })
  @IsString()
  @IsOptional()
  speciality?: string;

  @ApiProperty({
    description: 'Default session duration in minutes',
    example: 60,
    required: false,
  })
  @IsOptional()
  defaultSessionDuration?: number;

  @ApiProperty({
    description: 'Therapist timezone',
    example: 'America/New_York',
    required: false,
  })
  @IsString()
  @IsOptional()
  timeZone?: string;

  @ApiProperty({
    description: 'Password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: '123456',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
//   @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
//     message: 'Password must contain uppercase, lowercase, number and special character',
//   })
  password: string;

  @ApiProperty({
    description: 'Clinic ID if registering under a clinic',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  clinicId?: string;
}