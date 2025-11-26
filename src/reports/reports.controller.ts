import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { SessionTrendsDto } from './dto/session-trends.dto';
import { TherapistActivityDto } from './dto/therapist-activity.dto';

@ApiTags('Reports & Analytics')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-stats')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Get role-specific dashboard statistics. Returns different metrics based on user role (ADMIN, CLINIC, THERAPIST).',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: DashboardStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboardStats(
    @Request() req,
    @Query() filters: ReportFiltersDto,
  ) {
    return this.reportsService.getDashboardStats(
      req.user.sub,
      req.user.userType,
      filters,
    );
  }

  @Get('session-trends')
  @ApiOperation({
    summary: 'Get session trends',
    description: 'Get weekly session trends showing completed, scheduled, and cancelled appointments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session trends retrieved successfully',
    type: SessionTrendsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessionTrends(
    @Request() req,
    @Query() filters: ReportFiltersDto,
  ) {
    return this.reportsService.getSessionTrends(
      req.user.sub,
      req.user.userType,
      filters,
    );
  }

  @Get('therapist-activity')
  @ApiOperation({
    summary: 'Get therapist activity',
    description: 'Get therapist activity comparison between this week and last week. Admin sees all, Clinic sees their therapists, Therapist sees own data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Therapist activity retrieved successfully',
    type: TherapistActivityDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTherapistActivity(
    @Request() req,
    @Query() filters: ReportFiltersDto,
  ) {
    return this.reportsService.getTherapistActivity(
      req.user.sub,
      req.user.userType,
      filters,
    );
  }

  @Get('recent-sessions')
  @ApiOperation({
    summary: 'Get recent sessions',
    description: 'Get recent session activity. Shows different data based on role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent sessions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  async getRecentSessions(
    @Request() req,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getRecentSessions(
      req.user.sub,
      req.user.userType,
      limit || 5,
    );
  }

  @Get('session-alerts')
  @ApiOperation({
    summary: 'Get session alerts',
    description: 'Get crisis alerts and important session notifications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session alerts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getSessionAlerts(
    @Request() req,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getSessionAlerts(
      req.user.sub,
      req.user.userType,
      limit || 10,
    );
  }

  @Get('upcoming-appointments')
  @ApiOperation({
    summary: 'Get upcoming appointments',
    description: 'Get upcoming appointments for therapist. Only accessible by therapists.',
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming appointments retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only therapists can access this endpoint' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  async getUpcomingAppointments(
    @Request() req,
    @Query('limit') limit?: number,
  ) {
    if (req.user.userType !== 'THERAPIST') {
      return { message: 'This endpoint is only for therapists', appointments: [] };
    }
    return this.reportsService.getUpcomingAppointments(
      req.user.sub,
      limit || 5,
    );
  }

  @Get('system-alerts')
  @ApiOperation({
    summary: 'Get system alerts',
    description: 'Get system-wide alerts and notifications. Accessible by Admin and Clinic roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'System alerts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  async getSystemAlerts(
    @Request() req,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getSystemAlerts(
      req.user.sub,
      req.user.userType,
      limit || 5,
    );
  }
}