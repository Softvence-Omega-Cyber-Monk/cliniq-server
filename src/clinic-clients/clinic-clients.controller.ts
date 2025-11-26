import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
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
import { ClinicClientsService } from './clinic-clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateClinicClientDto } from './dto/create-clinic-client.dto';
import { UpdateOverallProgressDto } from 'src/clients/dto/update-overall-progress.dto';
import { UpdateTreatmentGoalsDto } from 'src/clients/dto/update-treatment-goals.dto';
import { AddSessionHistoryDto } from 'src/clients/dto/add-session-history.dto';
import { AddCrisisHistoryDto } from 'src/clients/dto/add-crisis-history.dto';
import { AddTreatmentProgressDto } from 'src/clients/dto/add-treatment-progress.dto';
import { UpdateSessionHistoryDto } from 'src/clients/dto/update-session-history.dto';
import { UpdateCrisisHistoryDto } from 'src/clients/dto/update-crisis-history.dto';
import { UpdateTreatmentProgressDto } from 'src/clients/dto/update-treatment-progress.dto';
import { SearchClientDto } from 'src/clients/dto/search-client.dto';
import { AssignTherapistDto } from './dto/assign-therapist.dto';


@ApiTags('Clinic Clients')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('clinics/:clinicId/clients')
export class ClinicClientsController {
  constructor(private readonly clinicClientsService: ClinicClientsService) {}

  // ==================== CLIENT MANAGEMENT ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new client under clinic',
    description: 'Add a new client to the clinic without assigning a therapist.',
  })
  @ApiResponse({
    status: 201,
    description: 'Client created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Client already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  @ApiParam({
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async createClient(
    @Param('clinicId') clinicId: string,
    @Body() dto: CreateClinicClientDto,
  ) {
    return this.clinicClientsService.createClient(clinicId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all clients under clinic (including nested clients)',
    description: 'Retrieve all clients belonging to the clinic and clients under therapists of this clinic.',
  })
  @ApiResponse({
    status: 200,
    description: 'Clients retrieved successfully with summary information',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  @ApiParam({
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getAllClinicClients(
    @Param('clinicId') clinicId: string,
    @Query() query: SearchClientDto,
  ) {
    return this.clinicClientsService.getAllClinicClients(clinicId, query);
  }

  @Get(':clientId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get client full details',
    description: 'Retrieve complete information about a specific client including all history and progress.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client details retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiParam({
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  async getClientFullDetails(
    @Param('clinicId') clinicId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.clinicClientsService.getClientFullDetails(clinicId, clientId);
  }

  @Put(':clientId/assign-therapist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign therapist to client',
    description: 'Assign or reassign a therapist to a clinic client.',
  })
  @ApiResponse({
    status: 200,
    description: 'Therapist assigned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Client or therapist not found' })
  @ApiParam({
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  async assignTherapist(
    @Param('clinicId') clinicId: string,
    @Param('clientId') clientId: string,
    @Body() dto: AssignTherapistDto,
  ) {
    return this.clinicClientsService.assignTherapist(clinicId, clientId, dto);
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
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  async updateOverallProgress(
    @Param('clinicId') clinicId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateOverallProgressDto,
  ) {
    return this.clinicClientsService.updateOverallProgress(clinicId, clientId, dto);
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
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  async updateTreatmentGoals(
    @Param('clinicId') clinicId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateTreatmentGoalsDto,
  ) {
    return this.clinicClientsService.updateTreatmentGoals(clinicId, clientId, dto);
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
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  async addSessionHistory(
    @Param('clinicId') clinicId: string,
    @Param('clientId') clientId: string,
    @Body() dto: AddSessionHistoryDto,
  ) {
    return this.clinicClientsService.addSessionHistory(clinicId, clientId, dto);
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
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  async updateSessionHistory(
    @Param('clinicId') clinicId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateSessionHistoryDto,
  ) {
    return this.clinicClientsService.updateSessionHistory(clinicId, clientId, dto);
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
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  async addCrisisHistory(
    @Param('clinicId') clinicId: string,
    @Param('clientId') clientId: string,
    @Body() dto: AddCrisisHistoryDto,
  ) {
    return this.clinicClientsService.addCrisisHistory(clinicId, clientId, dto);
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
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  async updateCrisisHistory(
    @Param('clinicId') clinicId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateCrisisHistoryDto,
  ) {
    return this.clinicClientsService.updateCrisisHistory(clinicId, clientId, dto);
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
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  async addTreatmentProgress(
    @Param('clinicId') clinicId: string,
    @Param('clientId') clientId: string,
    @Body() dto: AddTreatmentProgressDto,
  ) {
    return this.clinicClientsService.addTreatmentProgress(clinicId, clientId, dto);
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
    name: 'clinicId',
    description: 'Clinic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  async updateTreatmentProgress(
    @Param('clinicId') clinicId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateTreatmentProgressDto,
  ) {
    return this.clinicClientsService.updateTreatmentProgress(clinicId, clientId, dto);
  }
}