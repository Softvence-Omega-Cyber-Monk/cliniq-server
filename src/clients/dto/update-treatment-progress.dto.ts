import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GoalScoreDto } from './add-treatment-progress.dto';

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
    description: 'Array of goals with scores',
    type: [GoalScoreDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalScoreDto)
  @IsOptional()
  goals?: GoalScoreDto[];

  @ApiProperty({
    description: 'Progress notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}