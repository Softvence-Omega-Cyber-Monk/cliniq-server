import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum } from 'class-validator';

export enum CrisisSeverity {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class AddCrisisHistoryDto {
  @ApiProperty({
    description: 'Crisis date',
    example: '2024-01-10T14:30:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  crisisDate: string;

  @ApiProperty({
    description: 'Crisis description',
    example: 'Client experienced severe panic attack at workplace',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Severity level',
    example: 'high',
    enum: CrisisSeverity,
  })
  @IsEnum(CrisisSeverity)
  @IsNotEmpty()
  severity: CrisisSeverity;

  @ApiProperty({
    description: 'Intervention taken',
    example: 'Emergency session scheduled, breathing exercises practiced',
    required: false,
  })
  @IsString()
  @IsOptional()
  intervention?: string;

  @ApiProperty({
    description: 'Outcome',
    example: 'Client stabilized after 30 minutes',
    required: false,
  })
  @IsString()
  @IsOptional()
  outcome?: string;
}