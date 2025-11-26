// src/resources/dto/resource-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ResourceCategory } from './create-resource.dto';

export class ResourceResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Cognitive Behavioral Therapy Worksheet' })
  title: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/file.pdf' })
  fileUrl: string;

  @ApiProperty({ example: 'resources/file123' })
  filePublicId: string;

  @ApiProperty({ example: 'application/pdf' })
  fileType: string;

  @ApiProperty({ example: 1024000 })
  fileSize: number;

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/thumbnail.jpg' })
  imageUrl?: string;

  @ApiProperty({ example: 'resources/thumbnails/thumb123' })
  imagePublicId?: string;

  @ApiProperty({ enum: ResourceCategory, example: ResourceCategory.WORKSHEET })
  category: ResourceCategory;

  @ApiProperty({ example: 'A comprehensive CBT worksheet for anxiety management' })
  shortDescription: string;

  @ApiProperty({ example: 'This worksheet provides detailed exercises...' })
  longDescription?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  uploadedBy?: string;
}