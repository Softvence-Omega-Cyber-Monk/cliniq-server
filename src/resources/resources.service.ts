// src/resources/resources.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { UploadApiResponse } from 'cloudinary';

@Injectable()
export class ResourcesService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    dto: CreateResourceDto,
    file: Express.Multer.File,
    image: Express.Multer.File | undefined,
    userId: string,
  ) {
    // Validate file
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Upload main file to Cloudinary
    const fileUpload: UploadApiResponse = await this.cloudinaryService.uploadFile(
      file,
      'resources/files',
    );

    // Upload thumbnail image if provided
    let imageUpload: UploadApiResponse | null = null;
    if (image) {
      imageUpload = await this.cloudinaryService.uploadImage(
        image,
        'resources/thumbnails',
      );
    }

    // Create resource in database
    const resource = await this.prisma.resource.create({
      data: {
        title: dto.title,
        fileUrl: fileUpload.secure_url,
        filePublicId: fileUpload.public_id,
        fileType: fileUpload.format,
        fileSize: fileUpload.bytes,
        imageUrl: imageUpload?.secure_url || null,
        imagePublicId: imageUpload?.public_id || null,
        category: dto.category,
        shortDescription: dto.shortDescription,
        longDescription: dto.longDescription || null,
        isActive: dto.isActive ?? true,
        uploadedBy: userId,
      },
    });

    return resource;
  }

  async findAll(category?: string, isActive?: boolean) {
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const resources = await this.prisma.resource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return resources;
  }

  async findOne(id: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    return resource;
  }

  async update(
    id: string,
    dto: UpdateResourceDto,
    file?: Express.Multer.File,
    image?: Express.Multer.File,
  ) {
    const existingResource = await this.findOne(id);

    let fileUpload: UploadApiResponse | null = null;
    let imageUpload: UploadApiResponse | null = null;

    // If new file provided, upload and delete old one
    if (file) {
      fileUpload = await this.cloudinaryService.uploadFile(file, 'resources/files');

      // Delete old file from Cloudinary
      if (existingResource.filePublicId) {
        await this.cloudinaryService.deleteFile(existingResource.filePublicId);
      }
    }

    // If new image provided, upload and delete old one
    if (image) {
      imageUpload = await this.cloudinaryService.uploadImage(
        image,
        'resources/thumbnails',
      );

      // Delete old image from Cloudinary
      if (existingResource.imagePublicId) {
        await this.cloudinaryService.deleteFile(existingResource.imagePublicId);
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (dto.title) updateData.title = dto.title;
    if (dto.category) updateData.category = dto.category;
    if (dto.shortDescription) updateData.shortDescription = dto.shortDescription;
    if (dto.longDescription !== undefined) updateData.longDescription = dto.longDescription;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (fileUpload) {
      updateData.fileUrl = fileUpload.secure_url;
      updateData.filePublicId = fileUpload.public_id;
      updateData.fileType = fileUpload.format;
      updateData.fileSize = fileUpload.bytes;
    }

    if (imageUpload) {
      updateData.imageUrl = imageUpload.secure_url;
      updateData.imagePublicId = imageUpload.public_id;
    }

    // Update resource in database
    const updatedResource = await this.prisma.resource.update({
      where: { id },
      data: updateData,
    });

    return updatedResource;
  }

  async remove(id: string) {
    const resource = await this.findOne(id);

    // Delete files from Cloudinary
    if (resource.filePublicId) {
      try {
        await this.cloudinaryService.deleteFile(resource.filePublicId);
      } catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    if (resource.imagePublicId) {
      try {
        await this.cloudinaryService.deleteFile(resource.imagePublicId);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    await this.prisma.resource.delete({
      where: { id },
    });

    return { message: 'Resource deleted successfully' };
  }

  async toggleActive(id: string) {
    const resource = await this.findOne(id);

    const updatedResource = await this.prisma.resource.update({
      where: { id },
      data: { isActive: !resource.isActive },
    });

    return updatedResource;
  }

  async getStats() {
    const [total, active, byCategory] = await Promise.all([
      this.prisma.resource.count(),
      this.prisma.resource.count({ where: { isActive: true } }),
      this.prisma.resource.groupBy({
        by: ['category'],
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      byCategory: byCategory.map((item) => ({
        category: item.category,
        count: item._count,
      })),
    };
  }
}