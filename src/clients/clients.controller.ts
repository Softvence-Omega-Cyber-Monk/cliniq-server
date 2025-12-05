import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateOverallProgressDto } from './dto/update-overall-progress.dto';
import { UpdateTreatmentGoalsDto } from './dto/update-treatment-goals.dto';
import { AddSessionHistoryDto } from './dto/add-session-history.dto';
import { AddCrisisHistoryDto } from './dto/add-crisis-history.dto';
import { AddTreatmentProgressDto } from './dto/add-treatment-progress.dto';
import { ClientCardDto } from './dto/client-card.dto';
import { SearchClientDto } from './dto/search-client.dto';
import { UpdateSessionHistoryDto } from './dto/update-session-history.dto';
import { UpdateCrisisHistoryDto } from './dto/update-crisis-history.dto';
import { UpdateTreatmentProgressDto } from './dto/update-treatment-progress.dto';
import { SuspendClientDto } from './dto/suspend-client.dto';

@ApiTags('Clients')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('therapists/:therapistId/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) { }

  // ==================== CLIENT MANAGEMENT ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new client',
    description: 'Add a new client to the therapist\'s client list.',
  })
  @ApiResponse({
    status: 201,
    description: 'Client created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Client already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Therapist not found' })
  @ApiParam({
    name: 'therapistId',
    description: 'Therapist ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async createClient(
    @Param('therapistId') therapistId: string,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.createClient(therapistId, dto);
  }

  //======================SUSPEND CLIENT=======================
  @Patch(':clientId/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspend a client',
    description: 'Change client status to suspended. This will pause active treatment.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client suspended successfully',
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
  async suspendClient(
    @Param('therapistId') therapistId: string,
    @Param('clientId') clientId: string,
    @Body() dto: SuspendClientDto,
  ) {
    return this.clientsService.suspendClient(therapistId, clientId, dto);
  }

  // ==================== OVERALL PROGRESS ====================

  @Put(':clientId/overall-progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update overall progress',
    description: 'Update or add the overall progress description for a client.',
  })
  @ApiResponse({
    status: 200,
    description: 'Overall progress updated successfully',
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
  async updateOverallProgress(
    @Param('therapistId') therapistId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateOverallProgressDto,
  ) {
    return this.clientsService.updateOverallProgress(therapistId, clientId, dto);
  }

  // ==================== TREATMENT GOALS ====================

  @Put(':clientId/treatment-goals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update treatment goals',
    description: 'Update or add treatment goals for a client.',
  })
  @ApiResponse({
    status: 200,
    description: 'Treatment goals updated successfully',
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
  async updateTreatmentGoals(
    @Param('therapistId') therapistId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateTreatmentGoalsDto,
  ) {
    return this.clientsService.updateTreatmentGoals(therapistId, clientId, dto);
  }

  // ==================== SESSION HISTORY ====================

  @Post(':clientId/session-history')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add session history',
    description: 'Add a new session record to the client\'s session history.',
  })
  @ApiResponse({
    status: 201,
    description: 'Session added successfully',
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
  async addSessionHistory(
    @Param('therapistId') therapistId: string,
    @Param('clientId') clientId: string,
    @Body() dto: AddSessionHistoryDto,
  ) {
    return this.clientsService.addSessionHistory(therapistId, clientId, dto);
  }

  @Put(':clientId/session-history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update session history',
    description: 'Update an existing session record in the client\'s session history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Client or session not found' })
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
  async updateSessionHistory(
    @Param('therapistId') therapistId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateSessionHistoryDto,
  ) {
    return this.clientsService.updateSessionHistory(therapistId, clientId, dto);
  }

  // ==================== CRISIS HISTORY ====================

  @Post(':clientId/crisis-history')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add crisis history',
    description: 'Add a new crisis record to the client\'s crisis history.',
  })
  @ApiResponse({
    status: 201,
    description: 'Crisis record added successfully',
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
  async addCrisisHistory(
    @Param('therapistId') therapistId: string,
    @Param('clientId') clientId: string,
    @Body() dto: AddCrisisHistoryDto,
  ) {
    return this.clientsService.addCrisisHistory(therapistId, clientId, dto);
  }

  @Put(':clientId/crisis-history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update crisis history',
    description: 'Update an existing crisis record in the client\'s crisis history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Crisis record updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Client or crisis record not found' })
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
  async updateCrisisHistory(
    @Param('therapistId') therapistId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateCrisisHistoryDto,
  ) {
    return this.clientsService.updateCrisisHistory(therapistId, clientId, dto);
  }

  // ==================== TREATMENT PROGRESS ====================

  @Post(':clientId/treatment-progress')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add treatment progress',
    description: 'Add a new progress record to track treatment outcomes.',
  })
  @ApiResponse({
    status: 201,
    description: 'Progress record added successfully',
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
  async addTreatmentProgress(
    @Param('therapistId') therapistId: string,
    @Param('clientId') clientId: string,
    @Body() dto: AddTreatmentProgressDto,
  ) {
    return this.clientsService.addTreatmentProgress(therapistId, clientId, dto);
  }

  @Put(':clientId/treatment-progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update treatment progress',
    description: 'Update an existing progress record.',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress record updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Client or progress record not found' })
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
  async updateTreatmentProgress(
    @Param('therapistId') therapistId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateTreatmentProgressDto,
  ) {
    return this.clientsService.updateTreatmentProgress(therapistId, clientId, dto);
  }
}