// src/resources/resources.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceResponseDto } from './dto/resource-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Resources')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLINIC', 'THERAPIST')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ]),
  )
  @ApiOperation({
    summary: 'Create a new resource',
    description: 'Upload a resource file (PDF/Worksheet/Video) with optional thumbnail image',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'category', 'shortDescription', 'file'],
      properties: {
        title: { type: 'string', example: 'CBT Worksheet' },
        category: { 
          type: 'string', 
          enum: ['WORKSHEET', 'PDF', 'VIDEO', 'DOCUMENT', 'GUIDE', 'EXERCISE', 'OTHER'],
          example: 'WORKSHEET' 
        },
        shortDescription: { type: 'string', example: 'A comprehensive CBT worksheet' },
        longDescription: { type: 'string', example: 'Detailed description...'},
        isActive: { type: 'string', example: 'true', description: 'Send as string: "true" or "false"' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Resource file (PDF/DOC/Video)',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Thumbnail image (optional)'
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Resource created successfully',
    type: ResourceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file or data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() body: any,
    @UploadedFiles() files: { file?: Express.Multer.File[]; image?: Express.Multer.File[] },
    @Request() req,
  ) {
    if (!files?.file || files.file.length === 0) {
      throw new BadRequestException('File is required');
    }

    // Transform body data for DTO validation
    const createResourceDto: CreateResourceDto = {
      title: body.title,
      category: body.category,
      shortDescription: body.shortDescription,
      longDescription: body.longDescription,
      isActive: body.isActive === 'true' ? true : body.isActive === 'false' ? false : undefined,
    };

    return this.resourcesService.create(
      createResourceDto,
      files.file[0],
      files.image?.[0],
      req.user.sub,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all resources',
    description: 'Retrieve all resources with optional filters',
  })
  @ApiQuery({ name: 'category', required: false, enum: ['WORKSHEET', 'PDF', 'VIDEO', 'DOCUMENT', 'GUIDE', 'EXERCISE', 'OTHER'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Resources retrieved successfully',
    type: [ResourceResponseDto],
  })
  async findAll(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.resourcesService.findAll(category, isActiveBool);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLINIC')
  @ApiOperation({
    summary: 'Get resource statistics',
    description: 'Get statistics about resources (total, active, by category)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      properties: {
        total: { type: 'number', example: 45 },
        active: { type: 'number', example: 40 },
        inactive: { type: 'number', example: 5 },
        byCategory: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', example: 'WORKSHEET' },
              count: { type: 'number', example: 15 },
            },
          },
        },
      },
    },
  })
  async getStats() {
    return this.resourcesService.getStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a resource by ID',
    description: 'Retrieve detailed information about a specific resource',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource retrieved successfully',
    type: ResourceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async findOne(@Param('id') id: string) {
    return this.resourcesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLINIC', 'THERAPIST')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ]),
  )
  @ApiOperation({
    summary: 'Update a resource',
    description: 'Update resource details and optionally replace file or image',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Updated CBT Worksheet' },
        category: { 
          type: 'string', 
          enum: ['WORKSHEET', 'PDF', 'VIDEO', 'DOCUMENT', 'GUIDE', 'EXERCISE', 'OTHER'],
        },
        shortDescription: { type: 'string' },
        longDescription: { type: 'string' },
        isActive: { type: 'string', example: 'true', description: 'Send as string: "true" or "false"' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'New resource file (optional)',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'New thumbnail image (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Resource updated successfully',
    type: ResourceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files?: { file?: Express.Multer.File[]; image?: Express.Multer.File[] },
  ) {
    // Transform body data for DTO validation
    const updateResourceDto: UpdateResourceDto = {
      title: body.title,
      category: body.category,
      shortDescription: body.shortDescription,
      longDescription: body.longDescription,
      isActive: body.isActive === 'true' ? true : body.isActive === 'false' ? false : undefined,
    };

    return this.resourcesService.update(
      id,
      updateResourceDto,
      files?.file?.[0],
      files?.image?.[0],
    );
  }

  @Patch(':id/toggle-active')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLINIC')
  @ApiOperation({
    summary: 'Toggle resource active status',
    description: 'Enable or disable a resource',
  })
  @ApiResponse({
    status: 200,
    description: 'Active status toggled successfully',
    type: ResourceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async toggleActive(@Param('id') id: string) {
    return this.resourcesService.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CLINIC')
  @ApiOperation({
    summary: 'Delete a resource',
    description: 'Delete a resource and its associated files from Cloudinary',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource deleted successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Resource deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }
}