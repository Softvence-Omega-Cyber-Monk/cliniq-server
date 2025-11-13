import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no-show',
  RESCHEDULED = 'rescheduled',
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({
    description: 'Appointment status',
    enum: AppointmentStatus,
    example: 'completed',
  })
  @IsEnum(AppointmentStatus)
  @IsNotEmpty()
  status: AppointmentStatus;

  @ApiProperty({
    description: 'Completion notes (optional, useful for completed/cancelled appointments)',
    example: 'Session went well. Client showed good progress.',
    required: false,
  })
  @IsString()
  @IsOptional()
  completionNotes?: string;
}