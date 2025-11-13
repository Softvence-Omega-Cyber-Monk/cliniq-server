// src/users/users.controller.ts
import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateClinicProfileDto } from './dto/update-clinic-profile.dto';
import { UpdateTherapistProfileDto } from './dto/update-therapist-profile.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { QueryParamsDto } from './dto/query-params.dto';
import { ClinicResponseDto } from './dto/clinic-response.dto';
import { TherapistResponseDto } from './dto/therapist-response.dto';

@ApiTags('Users')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== CLINIC ENDPOINTS ====================

  @Get('clinics')
  @ApiOperation({
    summary: 'Get all clinics',
    description: 'Retrieve a paginated list of all private clinics with optional search functionality.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of clinics retrieved successfully',
    schema: {
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Smith' })
  async getAllClinics(@Query() query: QueryParamsDto) {
    return this.usersService.getAllClinics(query);
  }

  @Get('clinics/:id')
  @ApiOperation({
    summary: 'Get clinic by ID',
    description: 'Retrieve detailed information about a specific clinic.',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic retrieved successfully',
    type: ClinicResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  @ApiParam({ name: 'id', description: 'Clinic ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  async getClinicById(@Param('id') id: string) {
    return this.usersService.getClinicById(id);
  }

  @Put('clinics/:id')
  @UseGuards(RolesGuard)
  @Roles('CLINIC')
  @ApiOperation({
    summary: 'Update clinic profile',
    description: 'Update clinic profile information. Clinics can only update their own profile.',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic profile updated successfully',
    type: ClinicResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only update own profile' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiParam({ name: 'id', description: 'Clinic ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  async updateClinicProfile(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateClinicProfileDto,
  ) {
    return this.usersService.updateClinicProfile(
      req.user.sub,
      req.user.userType,
      id,
      dto,
    );
  }

  @Put('clinics/:id/notifications')
  @UseGuards(RolesGuard)
  @Roles('CLINIC')
  @ApiOperation({
    summary: 'Update clinic notification settings',
    description: 'Update notification preferences for payment reminders, confirmations, and plan changes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification settings updated successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        isPaymentReminderOn: { type: 'boolean' },
        isPaymentConfirmOn: { type: 'boolean' },
        isPlanChangedOn: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  @ApiParam({ name: 'id', description: 'Clinic ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  async updateClinicNotifications(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.usersService.updateClinicNotifications(
      req.user.sub,
      req.user.userType,
      id,
      dto,
    );
  }

  @Delete('clinics/:id')
  @UseGuards(RolesGuard)
  @Roles('CLINIC')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete clinic',
    description: 'Delete a clinic account. Cannot delete if clinic has therapists or clients.',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic deleted successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Clinic deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cannot delete clinic with existing therapists or clients' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  @ApiParam({ name: 'id', description: 'Clinic ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  async deleteClinic(@Request() req, @Param('id') id: string) {
    return this.usersService.deleteClinic(req.user.sub, req.user.userType, id);
  }

  @Post('clinics/:id/subscription')
  @UseGuards(RolesGuard)
  @Roles('CLINIC')
  @ApiOperation({
    summary: 'Assign subscription to clinic',
    description: 'Assign or update subscription plan for a clinic.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription assigned successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        fullName: { type: 'string' },
        privatePracticeName: { type: 'string' },
        subscriptionPlan: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Clinic or subscription plan not found' })
  @ApiParam({ name: 'id', description: 'Clinic ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  async assignClinicSubscription(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AssignSubscriptionDto,
  ) {
    return this.usersService.assignClinicSubscription(
      req.user.sub,
      req.user.userType,
      id,
      dto,
    );
  }

  @Delete('clinics/:id/subscription')
  @UseGuards(RolesGuard)
  @Roles('CLINIC')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove subscription from clinic',
    description: 'Remove the current subscription plan from a clinic.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription removed successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        fullName: { type: 'string' },
        privatePracticeName: { type: 'string' },
        subscriptionPlan: { type: 'object', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  @ApiParam({ name: 'id', description: 'Clinic ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  async removeClinicSubscription(@Request() req, @Param('id') id: string) {
    return this.usersService.removeClinicSubscription(
      req.user.sub,
      req.user.userType,
      id,
    );
  }

  // ==================== THERAPIST ENDPOINTS ====================

  @Get('therapists')
  @ApiOperation({
    summary: 'Get all therapists',
    description: 'Retrieve a paginated list of all therapists with optional search functionality.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of therapists retrieved successfully',
    schema: {
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Jane' })
  async getAllTherapists(@Query() query: QueryParamsDto) {
    return this.usersService.getAllTherapists(query);
  }

  @Get('therapists/:id')
  @ApiOperation({
    summary: 'Get therapist by ID',
    description: 'Retrieve detailed information about a specific therapist.',
  })
  @ApiResponse({
    status: 200,
    description: 'Therapist retrieved successfully',
    type: TherapistResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Therapist not found' })
  @ApiParam({ name: 'id', description: 'Therapist ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  async getTherapistById(@Param('id') id: string) {
    return this.usersService.getTherapistById(id);
  }

  @Get('clinics/:clinicId/therapists')
  @ApiOperation({
    summary: 'Get therapists by clinic',
    description: 'Retrieve all therapists associated with a specific clinic.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of therapists retrieved successfully',
    schema: {
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  @ApiParam({ name: 'clinicId', description: 'Clinic ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Jane' })
  async getTherapistsByClinic(
    @Param('clinicId') clinicId: string,
    @Query() query: QueryParamsDto,
  ) {
    return this.usersService.getTherapistsByClinic(clinicId, query);
  }

  @Put('therapists/:id')
  @UseGuards(RolesGuard)
  @Roles('THERAPIST', 'CLINIC')
  @ApiOperation({
    summary: 'Update therapist profile',
    description: 'Update therapist profile information. Therapists can update their own profile, and clinics can update their therapists.',
  })
  @ApiResponse({
    status: 200,
    description: 'Therapist profile updated successfully',
    type: TherapistResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Therapist not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiParam({ name: 'id', description: 'Therapist ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  async updateTherapistProfile(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateTherapistProfileDto,
  ) {
    return this.usersService.updateTherapistProfile(
      req.user.sub,
      req.user.userType,
      id,
      dto,
    );
  }

  @Delete('therapists/:id')
  @UseGuards(RolesGuard)
  @Roles('THERAPIST', 'CLINIC')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete therapist',
    description: 'Delete a therapist account. Therapists can delete their own account, and clinics can delete their therapists. Cannot delete if therapist has clients or appointments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Therapist deleted successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Therapist deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cannot delete therapist with existing clients or appointments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Therapist not found' })
  @ApiParam({ name: 'id', description: 'Therapist ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  async deleteTherapist(@Request() req, @Param('id') id: string) {
    return this.usersService.deleteTherapist(
      req.user.sub,
      req.user.userType,
      id,
    );
  }

  @Post('therapists/:id/subscription')
  @UseGuards(RolesGuard)
  @Roles('THERAPIST')
  @ApiOperation({
    summary: 'Assign subscription to therapist',
    description: 'Assign or update subscription plan for a therapist.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription assigned successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        fullName: { type: 'string' },
        email: { type: 'string' },
        subscriptionPlan: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Therapist or subscription plan not found' })
  @ApiParam({ name: 'id', description: 'Therapist ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  async assignTherapistSubscription(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AssignSubscriptionDto,
  ) {
    return this.usersService.assignTherapistSubscription(
      req.user.sub,
      req.user.userType,
      id,
      dto,
    );
  }

  @Delete('therapists/:id/subscription')
  @UseGuards(RolesGuard)
  @Roles('THERAPIST')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove subscription from therapist',
    description: 'Remove the current subscription plan from a therapist.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription removed successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        fullName: { type: 'string' },
        email: { type: 'string' },
        subscriptionPlan: { type: 'object', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Therapist not found' })
  @ApiParam({ name: 'id', description: 'Therapist ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  async removeTherapistSubscription(@Request() req, @Param('id') id: string) {
    return this.usersService.removeTherapistSubscription(
      req.user.sub,
      req.user.userType,
      id,
    );
  }
}