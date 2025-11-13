import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class AddSessionHistoryDto {
  @ApiProperty({
    description: 'Session date',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  sessionDate: string;

  @ApiProperty({
    description: 'Session notes',
    example: 'Client discussed recent anxiety triggers. Practiced breathing exercises.',
  })
  @IsString()
  @IsNotEmpty()
  notes: string;

  @ApiProperty({
    description: 'Session duration in minutes',
    example: 60,
    required: false,
  })
  @IsOptional()
  duration?: number;

  @ApiProperty({
    description: 'Session type',
    example: 'Individual Therapy',
    required: false,
  })
  @IsString()
  @IsOptional()
  sessionType?: string;
}