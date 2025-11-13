import { ApiProperty } from "@nestjs/swagger";

export class TherapistProfileDto {
  @ApiProperty({
    description: 'Therapist ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Therapist full name',
    example: 'Dr. Jane Doe',
  })
  fullName: string;

  @ApiProperty({
    description: 'License number',
    example: 'PSY-12345',
    required: false,
  })
  licenseNumber?: string;

  @ApiProperty({
    description: 'Professional qualification',
    example: 'PhD in Clinical Psychology',
    required: false,
  })
  qualification?: string;

  @ApiProperty({
    description: 'Email address',
    example: 'jane.doe@therapy.com',
  })
  email: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
  })
  phone: string;

  @ApiProperty({
    description: 'Speciality',
    example: 'Cognitive Behavioral Therapy',
    required: false,
  })
  speciality?: string;

  @ApiProperty({
    description: 'Default session duration in minutes',
    example: 60,
    required: false,
  })
  defaultSessionDuration?: number;

  @ApiProperty({
    description: 'Time zone',
    example: 'America/New_York',
    required: false,
  })
  timeZone?: string;

  @ApiProperty({
    description: 'Availability start time',
    required: false,
  })
  availabilityStartTime?: Date;

  @ApiProperty({
    description: 'Availability end time',
    required: false,
  })
  availabilityEndTime?: Date;

  @ApiProperty({
    description: 'Total patient count',
    example: 15,
  })
  totalPatients: number;

  @ApiProperty({
    description: 'Total session count',
    example: 120,
  })
  totalSessions: number;

  @ApiProperty({
    description: 'Account status',
    example: 'active',
  })
  accountStatus: string;

  @ApiProperty({
    description: 'Clinic information',
    required: false,
  })
  clinic?: {
    id: string;
    privatePracticeName: string;
  };

  @ApiProperty({
    description: 'Subscription plan',
    required: false,
  })
  subscriptionPlan?: {
    id: string;
    planName: string;
    price: number;
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