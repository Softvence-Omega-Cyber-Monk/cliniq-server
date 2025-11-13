import { ApiProperty } from '@nestjs/swagger';

export class TherapistResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Dr. Jane Doe' })
  fullName: string;

  @ApiProperty({ example: 'PSY-12345', required: false })
  licenseNumber?: string;

  @ApiProperty({ example: 'PhD in Clinical Psychology', required: false })
  qualification?: string;

  @ApiProperty({ example: 'jane.doe@therapy.com' })
  email: string;

  @ApiProperty({ example: '+1234567890' })
  phone: string;

  @ApiProperty({ example: 'Cognitive Behavioral Therapy', required: false })
  speciality?: string;

  @ApiProperty({ example: 60, required: false })
  defaultSessionDuration?: number;

  @ApiProperty({ example: 'America/New_York', required: false })
  timeZone?: string;

  @ApiProperty({ required: false })
  availabilityStartTime?: Date;

  @ApiProperty({ required: false })
  availabilityEndTime?: Date;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  clinicId?: string;

  @ApiProperty({ required: false })
  clinic?: object;

  @ApiProperty({ required: false })
  subscriptionPlan?: object;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}