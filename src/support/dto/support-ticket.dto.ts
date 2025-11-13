import { ApiProperty } from '@nestjs/swagger';

export class SupportTicketDto {
  @ApiProperty({
    description: 'Support ticket ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Owner type (THERAPIST or CLINIC)',
    example: 'THERAPIST',
  })
  ownerType: string;

  @ApiProperty({
    description: 'Owner ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  ownerId: string;

  @ApiProperty({
    description: 'Clinic ID (if owner is clinic)',
    example: '789e0123-e89b-12d3-a456-426614174000',
    required: false,
  })
  clinicId: string | null;

  @ApiProperty({
    description: 'Therapist ID (if owner is therapist)',
    example: '012e3456-e89b-12d3-a456-426614174000',
    required: false,
  })
  therapistId: string | null;

  @ApiProperty({
    description: 'Ticket subject',
    example: 'Unable to schedule appointments',
  })
  subject: string;

  @ApiProperty({
    description: 'Ticket message',
    example: 'I am experiencing issues when trying to schedule appointments...',
  })
  message: string;

  @ApiProperty({
    description: 'Ticket status',
    example: 'open',
    enum: ['open', 'in-progress', 'resolved', 'closed'],
  })
  status: string;

  @ApiProperty({
    description: 'Admin reply',
    example: 'Thank you for reporting. We have fixed the issue.',
    required: false,
  })
  adminReply: string | null;

  @ApiProperty({
    description: 'When admin replied',
    example: '2024-01-15T14:30:00.000Z',
    required: false,
  })
  adminRepliedAt: Date | null;

  @ApiProperty({
    description: 'Admin email who replied',
    example: 'admin@therapy.com',
    required: false,
  })
  adminEmail: string | null;

  @ApiProperty({
    description: 'When ticket was resolved',
    example: '2024-01-16T10:00:00.000Z',
    required: false,
  })
  resolvedAt: Date | null;

  @ApiProperty({
    description: 'Resolution note',
    example: 'Issue resolved by updating the calendar component.',
    required: false,
  })
  resolutionNote: string | null;

  @ApiProperty({
    description: 'Therapist information (if owner is therapist)',
    required: false,
  })
  therapist?: {
    id: string;
    fullName: string;
    email: string;
  } | null;

  @ApiProperty({
    description: 'Clinic information (if owner is clinic)',
    required: false,
  })
  clinic?: {
    id: string;
    privatePracticeName: string;
    email: string;
  } | null;

  @ApiProperty({
    description: 'Created at',
    example: '2024-01-15T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at',
    example: '2024-01-15T14:30:00.000Z',
  })
  updatedAt: Date;
}