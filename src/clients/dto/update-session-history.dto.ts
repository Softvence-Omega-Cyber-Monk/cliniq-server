import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber } from 'class-validator';

export class UpdateSessionHistoryDto {
  @ApiProperty({
    description: 'Session ID from the array',
    example: 'session-123',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'Session date',
    example: '2024-01-15T10:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  sessionDate?: string;

  @ApiProperty({
    description: 'Session notes',
    example: 'Updated notes for this session.',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Session duration in minutes',
    example: 60,
    required: false,
  })
  @IsNumber()
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