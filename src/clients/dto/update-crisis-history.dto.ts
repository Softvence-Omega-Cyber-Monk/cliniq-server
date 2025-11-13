import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { CrisisSeverity } from './add-crisis-history.dto';

export class UpdateCrisisHistoryDto {
  @ApiProperty({
    description: 'Crisis ID from the array',
    example: 'crisis-123',
  })
  @IsString()
  @IsNotEmpty()
  crisisId: string;

  @ApiProperty({
    description: 'Crisis date',
    example: '2024-01-10T14:30:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  crisisDate?: string;

  @ApiProperty({
    description: 'Crisis description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Severity level',
    enum: CrisisSeverity,
    required: false,
  })
  @IsEnum(CrisisSeverity)
  @IsOptional()
  severity?: CrisisSeverity;

  @ApiProperty({
    description: 'Intervention taken',
    required: false,
  })
  @IsString()
  @IsOptional()
  intervention?: string;

  @ApiProperty({
    description: 'Outcome',
    required: false,
  })
  @IsString()
  @IsOptional()
  outcome?: string;
}