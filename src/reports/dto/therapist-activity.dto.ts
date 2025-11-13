import { ApiProperty } from '@nestjs/swagger';

export class TherapistActivityItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  therapistId: string;

  @ApiProperty({ example: 'Dr. Williams' })
  therapistName: string;

  @ApiProperty({ example: 15 })
  thisWeek: number;

  @ApiProperty({ example: 18 })
  lastWeek: number;
}

export class TherapistActivityDto {
  @ApiProperty({
    description: 'Therapist activity data',
    type: [TherapistActivityItemDto],
  })
  therapists: TherapistActivityItemDto[];
}