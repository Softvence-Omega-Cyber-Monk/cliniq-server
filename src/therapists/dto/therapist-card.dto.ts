import { ApiProperty } from '@nestjs/swagger';

export class TherapistCardDto {
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
    description: 'Therapy speciality',
    example: 'Cognitive Behavioral Therapy',
  })
  speciality: string | null;

  @ApiProperty({
    description: 'Number of patients',
    example: 15,
  })
  patientCount: number;

  @ApiProperty({
    description: 'Therapist email',
    example: 'jane.doe@therapy.com',
  })
  email: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
  })
  phone: string;

  @ApiProperty({
    description: 'License number',
    example: 'PSY-12345',
    required: false,
  })
  licenseNumber?: string;
}