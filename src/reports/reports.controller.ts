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
import { SessionDataReportDto } from './dto/session-data-report.dto';
import { CrisisAlertDto } from './dto/crisis-alert.dto';

@ApiTags('Reports & Analytics')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-stats')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Get overview statistics including sessions, therapists, clients, and crisis alerts with growth percentages.',
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
    description: 'Get therapist activity comparison between this week and last week.',
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

  @Get('session-data')
  @ApiOperation({
    summary: 'Get session data report',
    description: 'Get detailed session data by therapist including session count, average duration, and completion rate.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session data retrieved successfully',
    type: SessionDataReportDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessionDataReport(
    @Request() req,
    @Query() filters: ReportFiltersDto,
  ) {
    return this.reportsService.getSessionDataReport(
      req.user.sub,
      req.user.userType,
      filters,
    );
  }

  @Get('crisis-alerts')
  @ApiOperation({
    summary: 'Get recent crisis alerts',
    description: 'Get recent high-risk crisis alerts from clients.',
  })
  @ApiResponse({
    status: 200,
    description: 'Crisis alerts retrieved successfully',
    type: [CrisisAlertDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getRecentCrisisAlerts(
    @Request() req,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getRecentCrisisAlerts(
      req.user.sub,
      req.user.userType,
      limit || 10,
    );
  }
}