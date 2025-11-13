import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryParamsDto {
  @ApiProperty({
    description: 'Page number (starts from 1)',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)  // Add this to convert string to number
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)  // Add this to convert string to number
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({
    description: 'Search term for name or email',
    example: 'John',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;
}