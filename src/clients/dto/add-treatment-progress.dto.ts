import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class AddTreatmentProgressDto {
  @ApiProperty({
    description: 'Progress date',
    example: '2024-01-15T00:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  progressDate: string;

  @ApiProperty({
    description: 'Goal or metric name',
    example: 'Anxiety Level',
  })
  @IsString()
  @IsNotEmpty()
  goalName: string;

  @ApiProperty({
    description: 'Progress score (1-10)',
    example: 7,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  score: number;

  @ApiProperty({
    description: 'Progress notes',
    example: 'Client reports reduced anxiety this week',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}