import { ApiProperty } from '@nestjs/swagger';

export class AppointmentDetailDto {
  @ApiProperty({
    description: 'Appointment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  clientId: string;

  @ApiProperty({
    description: 'Therapist ID',
    example: '789e0123-e89b-12d3-a456-426614174000',
  })
  therapistId: string;

  @ApiProperty({
    description: 'Scheduled date',
    example: '2024-01-15T00:00:00.000Z',
  })
  scheduledDate: Date;

  @ApiProperty({
    description: 'Scheduled time',
    example: '14:30',
  })
  scheduledTime: string;

  @ApiProperty({
    description: 'Duration in minutes',
    example: 60,
  })
  duration: number;

  @ApiProperty({
    description: 'Session type',
    example: 'virtual',
    enum: ['virtual', 'onsite'],
  })
  sessionType: string;

  @ApiProperty({
    description: 'Contact phone',
    example: '+1234567890',
  })
  phone: string;

  @ApiProperty({
    description: 'Contact email',
    example: 'client@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Appointment status',
    example: 'scheduled',
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show', 'rescheduled'],
  })
  status: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Client requested early morning session',
  })
  notes: string | null;

  @ApiProperty({
    description: 'Completion notes',
    example: 'Session went well. Client showed good progress.',
  })
  completionNotes: string | null;

  @ApiProperty({
    description: 'Client information',
  })
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    condition?: string;
  };

  @ApiProperty({
    description: 'Therapist information',
  })
  therapist: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    speciality: string | null;
  };

  @ApiProperty({
    description: 'Created at',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at',
  })
  updatedAt: Date;
}