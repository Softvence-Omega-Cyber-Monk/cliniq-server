import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsEmail,
  Min,
} from 'class-validator';
import { SessionType } from './create-appointment.dto';

export class UpdateAppointmentDto {
  @ApiProperty({
    description: 'Scheduled date',
    example: '2024-01-15',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiProperty({
    description: 'Scheduled time (HH:MM format)',
    example: '14:30',
    required: false,
  })
  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @ApiProperty({
    description: 'Session duration in minutes',
    example: 60,
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
    example: 'Rescheduled due to client request',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}