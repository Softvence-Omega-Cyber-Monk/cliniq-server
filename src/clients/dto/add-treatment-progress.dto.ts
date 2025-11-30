import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GoalScoreDto {
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
}

export class AddTreatmentProgressDto {
  @ApiProperty({
    description: 'Progress date',
    example: '2024-01-15T00:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  progressDate: string;

  @ApiProperty({
    description: 'Array of goals with scores',
    type: [GoalScoreDto],
    example: [
      { goalName: 'Anxiety Level', score: 7 },
      { goalName: 'Sleep Quality', score: 8 }
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalScoreDto)
  @IsNotEmpty()
  goals: GoalScoreDto[];

  @ApiProperty({
    description: 'Progress notes',
    example: 'Client reports reduced anxiety this week',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}