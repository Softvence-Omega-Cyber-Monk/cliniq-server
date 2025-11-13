import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsEmail,
  Min,
} from 'class-validator';

export enum SessionType {
  VIRTUAL = 'virtual',
  ONSITE = 'onsite',
}

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'Client ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({
    description: 'Therapist ID (Required for clinics, optional for therapists as it defaults to logged-in therapist)',
    example: '456e7890-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  therapistId?: string;

  @ApiProperty({
    description: 'Scheduled date',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiProperty({
    description: 'Scheduled time (HH:MM format)',
    example: '14:30',
  })
  @IsString()
  @IsNotEmpty()
  scheduledTime: string;

  @ApiProperty({
    description: 'Session duration in minutes',
    example: 60,
    default: 60,
    required: false,
  })
  @IsNumber()
  @Min(15)
  @IsOptional()
  duration?: number;

  @ApiProperty({
    description: 'Session type',
    enum: SessionType,
    example: 'virtual',
    default: 'virtual',
    required: false,
  })
  @IsEnum(SessionType)
  @IsOptional()
  sessionType?: SessionType;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Contact email',
    example: 'client@example.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Client requested early morning session',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}