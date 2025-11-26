import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ResourceCategory {
  WORKSHEET = 'WORKSHEET',
  PDF = 'PDF',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  GUIDE = 'GUIDE',
  EXERCISE = 'EXERCISE',
  OTHER = 'OTHER',
}

export class CreateResourceDto {
  @ApiProperty({
    description: 'Resource title',
    example: 'Cognitive Behavioral Therapy Worksheet',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Resource category',
    enum: ResourceCategory,
    example: ResourceCategory.WORKSHEET,
  })
  @IsEnum(ResourceCategory)
  @IsNotEmpty()
  category: ResourceCategory;

  @ApiProperty({
    description: 'Short description',
    example: 'A comprehensive CBT worksheet for anxiety management',
  })
  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @ApiProperty({
    description: 'Long description (optional)',
    example: 'This worksheet provides detailed exercises and guidance for managing anxiety through cognitive behavioral therapy techniques...',
    required: false,
  })
  @IsString()
  @IsOptional()
  longDescription?: string;

  @ApiProperty({
    description: 'Active status',
    example: true,
    default: true,
    required: false,
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}