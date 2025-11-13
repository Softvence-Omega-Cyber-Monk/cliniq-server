import { ApiProperty } from "@nestjs/swagger";

export class ClientDetailDto {
  @ApiProperty({
    description: 'Client ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Client name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
  })
  phone: string;

  @ApiProperty({
    description: 'Overall progress',
    example: 'Showing steady improvement',
  })
  overallProgress: string | null;

  @ApiProperty({
    description: 'Treatment goals',
    example: 'Reduce anxiety, improve sleep quality',
  })
  treatmentGoals: string | null;

  @ApiProperty({
    description: 'Client status',
    example: 'active',
  })
  status: string;

  @ApiProperty({
    description: 'Condition',
    example: 'Anxiety Disorder',
  })
  condition: string | null;

  @ApiProperty({
    description: 'Health issues array',
    example: ['Depression', 'Anxiety', 'Insomnia'],
    type: [String],
  })
  healthIssues: string[] | null;

  @ApiProperty({
    description: 'Crisis histories',
    type: 'array',
  })
  crisisHistories: any[] | null;

  @ApiProperty({
    description: 'Treatment progress',
    type: 'object',
    additionalProperties: true,
  })
  treatmentProgress: any | null;

  @ApiProperty({
    description: 'Session history',
    type: 'array',
  })
  sessionHistory: any[] | null;

  @ApiProperty({
    description: 'Total sessions',
    example: 8,
  })
  totalSessions: number;

  @ApiProperty({
    description: 'Therapist information',
  })
  therapist: {
    id: string;
    fullName: string;
    email: string;
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
