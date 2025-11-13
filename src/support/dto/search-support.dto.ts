import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SupportStatus } from './update-support-status.dto';

export class SearchSupportDto {
  @ApiProperty({
    description: 'Search term for subject or message',
    example: 'appointment',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by ticket status',
    enum: SupportStatus,
    example: 'open',
    required: false,
  })
  @IsOptional()
  @IsEnum(SupportStatus)
  status?: SupportStatus;

  @ApiProperty({
    description: 'Filter by owner type (THERAPIST or CLINIC) - Admin only',
    example: 'THERAPIST',
    required: false,
  })
  @IsOptional()
  @IsString()
  ownerType?: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}