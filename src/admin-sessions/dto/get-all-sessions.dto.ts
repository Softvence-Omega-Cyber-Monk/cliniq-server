import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAllSessionsDto {
  @ApiProperty({
    description: 'Filter by session status',
    example: 'completed',
    required: false,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show', 'rescheduled'],
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: 'Filter by therapist ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  therapistId?: string;

  @ApiProperty({
    description: 'Filter by client ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty({
    description: 'Filter sessions from this date onwards',
    example: '2024-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Filter sessions up to this date',
    example: '2024-12-31',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}