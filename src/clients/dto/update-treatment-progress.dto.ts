import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateTreatmentProgressDto {
  @ApiProperty({
    description: 'Progress ID from the array',
    example: 'progress-123',
  })
  @IsString()
  @IsNotEmpty()
  progressId: string;

  @ApiProperty({
    description: 'Progress date',
    example: '2024-01-15T00:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  progressDate?: string;

  @ApiProperty({
    description: 'Goal or metric name',
    example: 'Anxiety Level',
    required: false,
  })
  @IsString()
  @IsOptional()
  goalName?: string;

  @ApiProperty({
    description: 'Progress score (1-10)',
    example: 7,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  score?: number;

  @ApiProperty({
    description: 'Progress notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}