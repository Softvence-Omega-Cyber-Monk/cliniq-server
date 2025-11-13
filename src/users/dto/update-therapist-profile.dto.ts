import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';
export class UpdateTherapistProfileDto {
  @ApiProperty({
    description: 'Full name of the therapist',
    example: 'Dr. Jane Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  fullName?: string;

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
    description: 'Email address',
    example: 'jane.doe@therapy.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

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
    description: 'Availability start time',
    example: '2025-11-12T09:00:00Z',
    required: false,
  })
  @IsOptional()
  availabilityStartTime?: Date;

  @ApiProperty({
    description: 'Availability end time',
    example: '2025-11-12T17:00:00Z',
    required: false,
  })
  @IsOptional()
  availabilityEndTime?: Date;
}