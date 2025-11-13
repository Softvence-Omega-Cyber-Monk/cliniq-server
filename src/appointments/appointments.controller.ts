// src/appointments/appointments.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { SearchAppointmentDto } from './dto/search-appointment.dto';
import { AppointmentDetailDto } from './dto/appointment-detail.dto';

@ApiTags('Appointments')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ==================== CREATE APPOINTMENT ====================

  @Post()
  @UseGuards(RolesGuard)
  @Roles('THERAPIST', 'CLINIC')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create appointment',
    description: 'Create a new appointment. Therapists can create for their clients, Clinics can create and assign therapists.',
  })
  @ApiResponse({
    status: 201,
    description: 'Appointment created successfully',
    type: AppointmentDetailDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Client or Therapist not found' })
  async createAppointment(
    @Request() req,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.createAppointment(
      req.user.sub,
      req.user.userType,
      dto,
    );
  }

  // ==================== GET APPOINTMENTS ====================

  @Get()
  @ApiOperation({
    summary: 'Get all appointments',
    description: 'Get appointments with filters and pagination. Therapists see their appointments, Clinics see all clinic appointments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointments retrieved successfully',
    type: AppointmentDetailDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'John' })
  @ApiQuery({ name: 'status', required: false, type: String, example: 'scheduled' })
  @ApiQuery({ name: 'sessionType', required: false, type: String, example: 'virtual' })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2024-01-15' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getAllAppointments(
    @Request() req,
    @Query() query: SearchAppointmentDto,
  ) {
    return this.appointmentsService.getAllAppointments(
      req.user.sub,
      req.user.userType,
      query,
    );
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Get upcoming appointments',
    description: 'Get upcoming appointments starting from today.',
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming appointments retrieved successfully',
    type: AppointmentDetailDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 7, description: 'Number of days to look ahead (default: 30)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getUpcomingAppointments(
    @Request() req,
    @Query('days') days?: number,
    @Query('limit') limit?: number,
  ) {
    return this.appointmentsService.getUpcomingAppointments(
      req.user.sub,
      req.user.userType,
      days,
      limit,
    );
  }

  @Get('today')
  @ApiOperation({
    summary: 'Get today\'s appointments',
    description: 'Get all appointments scheduled for today.',
  })
  @ApiResponse({
    status: 200,
    description: 'Today\'s appointments retrieved successfully',
    type: AppointmentDetailDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTodayAppointments(@Request() req) {
    return this.appointmentsService.getTodayAppointments(
      req.user.sub,
      req.user.userType,
    );
  }

  @Get('by-date/:date')
  @ApiOperation({
    summary: 'Get appointments by date',
    description: 'Get all appointments for a specific date.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointments retrieved successfully',
    type: AppointmentDetailDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({
    name: 'date',
    description: 'Date in YYYY-MM-DD format',
    example: '2024-01-15',
  })
  async getAppointmentsByDate(
    @Request() req,
    @Param('date') date: string,
  ) {
    return this.appointmentsService.getAppointmentsByDate(
      req.user.sub,
      req.user.userType,
      date,
    );
  }

  @Get('date-range')
  @ApiOperation({
    summary: 'Get appointments by date range',
    description: 'Get appointments between start and end dates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointments retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'startDate', required: true, type: String, example: '2024-01-15' })
  @ApiQuery({ name: 'endDate', required: true, type: String, example: '2024-01-30' })
  async getAppointmentsByDateRange(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.appointmentsService.getAppointmentsByDateRange(
      req.user.sub,
      req.user.userType,
      startDate,
      endDate,
    );
  }

  // ==================== GET SINGLE APPOINTMENT ====================

  @Get(':id')
  @ApiOperation({
    summary: 'Get appointment details',
    description: 'Get detailed information about a specific appointment.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment details retrieved successfully',
    type: AppointmentDetailDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getAppointmentById(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.appointmentsService.getAppointmentById(
      req.user.sub,
      req.user.userType,
      id,
    );
  }

  // ==================== UPDATE APPOINTMENT ====================

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('THERAPIST', 'CLINIC')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update appointment',
    description: 'Update appointment details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment updated successfully',
    type: AppointmentDetailDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async updateAppointment(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.updateAppointment(
      req.user.sub,
      req.user.userType,
      id,
      dto,
    );
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles('THERAPIST', 'CLINIC')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update appointment status',
    description: 'Update the status of an appointment (scheduled, completed, cancelled, no-show).',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment status updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async updateAppointmentStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateAppointmentStatus(
      req.user.sub,
      req.user.userType,
      id,
      dto,
    );
  }

  // ==================== DELETE APPOINTMENT ====================

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('THERAPIST', 'CLINIC')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete appointment',
    description: 'Delete an appointment.',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async deleteAppointment(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.appointmentsService.deleteAppointment(
      req.user.sub,
      req.user.userType,
      id,
    );
  }

  // ==================== THERAPIST SPECIFIC ====================

  @Get('therapist/:therapistId')
  @ApiOperation({
    summary: 'Get therapist appointments',
    description: 'Get all appointments for a specific therapist.',
  })
  @ApiResponse({
    status: 200,
    description: 'Therapist appointments retrieved successfully',
    type: AppointmentDetailDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Therapist not found' })
  @ApiParam({
    name: 'therapistId',
    description: 'Therapist ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({ name: 'status', required: false, type: String, example: 'scheduled' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getTherapistAppointments(
    @Param('therapistId') therapistId: string,
    @Query() query: SearchAppointmentDto,
  ) {
    return this.appointmentsService.getTherapistAppointments(therapistId, query);
  }

  // ==================== CLIENT SPECIFIC ====================

  @Get('client/:clientId')
  @ApiOperation({
    summary: 'Get client appointments',
    description: 'Get all appointments for a specific client.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client appointments retrieved successfully',
    type: AppointmentDetailDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({ name: 'status', required: false, type: String, example: 'scheduled' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getClientAppointments(
    @Param('clientId') clientId: string,
    @Query() query: SearchAppointmentDto,
  ) {
    return this.appointmentsService.getClientAppointments(clientId, query);
  }
}