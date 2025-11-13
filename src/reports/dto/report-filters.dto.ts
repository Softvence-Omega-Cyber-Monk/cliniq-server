import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum DateRangeEnum {
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_YEAR = 'this_year',
  CUSTOM = 'custom',
}

export enum ReportTypeEnum {
  PERFORMANCE_OVERVIEW = 'performance_overview',
  SESSION_ANALYSIS = 'session_analysis',
  THERAPIST_ACTIVITY = 'therapist_activity',
  CLIENT_PROGRESS = 'client_progress',
  FINANCIAL_SUMMARY = 'financial_summary',
}

export class ReportFiltersDto {
  @ApiProperty({
    description: 'Date range filter',
    enum: DateRangeEnum,
    example: DateRangeEnum.LAST_30_DAYS,
    required: false,
  })
  @IsOptional()
  @IsEnum(DateRangeEnum)
  dateRange?: DateRangeEnum = DateRangeEnum.LAST_30_DAYS;

  @ApiProperty({
    description: 'Custom start date (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'Custom end date (YYYY-MM-DD)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({
    description: 'Filter by therapist ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  therapistId?: string;

  @ApiProperty({
    description: 'Session status filter',
    example: 'completed',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Report type',
    enum: ReportTypeEnum,
    example: ReportTypeEnum.PERFORMANCE_OVERVIEW,
    required: false,
  })
  @IsOptional()
  @IsEnum(ReportTypeEnum)
  reportType?: ReportTypeEnum = ReportTypeEnum.PERFORMANCE_OVERVIEW;
}
