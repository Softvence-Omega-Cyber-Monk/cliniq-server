// src/therapists/therapists.controller.ts
import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
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
import { TherapistsService } from './therapists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SearchTherapistDto } from './dto/search-therapist.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { TherapistStatsDto } from './dto/therapist-stats.dto';
import { TherapistProfileDto } from './dto/therapist-profile.dto';
import { ClientSummaryDto } from './dto/client-summary.dto';
import { ClientDetailDto } from './dto/client-detail.dto';
import { TherapistCardDto } from './dto/therapist-card.dto';
import { SearchClientDto } from '../clients/dto/search-client.dto'; // Import from clients module

@ApiTags('Therapists')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('therapists')
export class TherapistsController {
  constructor(private readonly therapistsService: TherapistsService) {}

  // ==================== THERAPIST CARDS & SEARCH ====================

  @Get('cards')
  @ApiOperation({
    summary: 'Get therapist cards',
    description: 'Retrieve therapist cards showing name, speciality, and patient count with pagination and search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Therapist cards retrieved successfully',
    type: TherapistCardDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'cognitive' })
  @ApiQuery({ name: 'speciality', required: false, type: String, example: 'CBT' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getTherapistCards(@Query() query: SearchTherapistDto) {
    return this.therapistsService.getTherapistCards(query);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search therapists',
    description: 'Search therapists by name, email, or speciality.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: TherapistCardDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Jane' })
  @ApiQuery({ name: 'speciality', required: false, type: String, example: 'CBT' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async searchTherapists(@Query() query: SearchTherapistDto) {
    return this.therapistsService.searchTherapists(query);
  }

  // ==================== THERAPIST STATISTICS ====================

  @Get('stats')
  @ApiOperation({
    summary: 'Get therapist statistics',
    description: 'Get total therapists count and breakdown by type.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: TherapistStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTherapistStats() {
    return this.therapistsService.getTherapistStats();
  }

  @Get('total-count')
  @ApiOperation({
    summary: 'Get total therapist count',
    description: 'Get the total number of therapists in the system.',
  })
  @ApiResponse({
    status: 200,
    description: 'Total count retrieved successfully',
    schema: {
      properties: {
        totalTherapists: { type: 'number', example: 25 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTotalCount() {
    return this.therapistsService.getTotalCount();
  }

  // ==================== THERAPIST PROFILE ====================

  @Get(':id/profile')
  @ApiOperation({
    summary: 'Get therapist profile details',
    description: 'Get detailed therapist profile including patient count, session count, and account status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: TherapistProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Therapist not found' })
  @ApiParam({
    name: 'id',
    description: 'Therapist ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getTherapistProfile(@Param('id') id: string) {
    return this.therapistsService.getTherapistProfile(id);
  }

  @Get(':id/overview')
  @ApiOperation({
    summary: 'Get therapist overview',
    description: 'Get therapist overview with total patients, sessions, and account status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Overview retrieved successfully',
    schema: {
      properties: {
        totalPatients: { type: 'number', example: 15 },
        totalSessions: { type: 'number', example: 120 },
        totalAppointments: { type: 'number', example: 100 },
        accountStatus: { type: 'string', example: 'active' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Therapist not found' })
  @ApiParam({
    name: 'id',
    description: 'Therapist ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getTherapistOverview(@Param('id') id: string) {
    return this.therapistsService.getTherapistOverview(id);
  }

  // ==================== ACCOUNT STATUS ====================

  @Put(':id/account-status')
  @UseGuards(RolesGuard)
  @Roles('THERAPIST', 'CLINIC')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update account status',
    description: 'Update therapist account status (active, inactive, suspended). Therapists can update their own status, clinics can update their therapists.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account status updated successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        fullName: { type: 'string' },
        email: { type: 'string' },
        accountStatus: { type: 'string', example: 'active' },
        message: { type: 'string', example: 'Account status updated to active' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Therapist not found' })
  @ApiParam({
    name: 'id',
    description: 'Therapist ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async updateAccountStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateAccountStatusDto,
  ) {
    return this.therapistsService.updateAccountStatus(
      req.user.sub,
      req.user.userType,
      id,
      dto,
    );
  }

  // ==================== CLIENT MANAGEMENT ====================

  @Get(':id/clients')
  @ApiOperation({
    summary: 'Get therapist clients table',
    description: 'Get all clients of a therapist with session count, overall progress, and status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Clients retrieved successfully',
    type: ClientSummaryDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Therapist not found' })
  @ApiParam({
    name: 'id',
    description: 'Therapist ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'John' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getTherapistClients(
    @Param('id') id: string,
    @Query() query: SearchClientDto, // Changed from SearchTherapistDto
  ) {
    return this.therapistsService.getTherapistClients(id, query);
  }

  @Get(':therapistId/clients/:clientId')
  @ApiOperation({
    summary: 'Get client details',
    description: 'Get detailed information about a specific client including health issues, crisis histories, treatment progress, and session history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client details retrieved successfully',
    type: ClientDetailDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiParam({
    name: 'therapistId',
    description: 'Therapist ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  async getClientDetail(
    @Param('therapistId') therapistId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.therapistsService.getClientDetail(therapistId, clientId);
  }
}