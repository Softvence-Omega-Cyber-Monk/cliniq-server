// src/analytics/analytics.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('bearer')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ==================== OVERVIEW ENDPOINTS ====================

  @Get('overview/stats')
  @ApiOperation({
    summary: 'Get overview statistics',
    description: 'Get total therapists, upcoming sessions, and completed sessions',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getOverviewStats() {
    return this.analyticsService.getOverviewStats();
  }

  @Get('overview/session-completion')
  @ApiOperation({
    summary: 'Get session completion data',
    description: 'Get weekly/monthly session completion trends',
  })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month'] })
  @ApiQuery({ name: 'range', required: false, description: 'Number of periods (default: 4 for weeks, 6 for months)' })
  @ApiResponse({ status: 200, description: 'Session completion data retrieved' })
  async getSessionCompletion(
    @Query('period') period: 'week' | 'month' = 'week',
    @Query('range') range?: number,
  ) {
    return this.analyticsService.getSessionCompletionData(period, range);
  }

  @Get('overview/therapist-activity')
  @ApiOperation({
    summary: 'Get therapist activity comparison',
    description: 'Compare this week vs last week or this month vs last month',
  })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month'] })
  @ApiResponse({ status: 200, description: 'Therapist activity data retrieved' })
  async getTherapistActivity(@Query('period') period: 'week' | 'month' = 'week') {
    return this.analyticsService.getTherapistActivityData(period);
  }

  @Get('overview/recent-sessions')
  @ApiOperation({
    summary: 'Get recent sessions',
    description: 'Get the most recent therapy sessions',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of sessions to return (default: 5)' })
  @ApiResponse({ status: 200, description: 'Recent sessions retrieved' })
  async getRecentSessions(@Query('limit') limit: number = 5) {
    return this.analyticsService.getRecentSessions(limit);
  }

  // ==================== REPORTS & ANALYTICS ENDPOINTS ====================

  @Get('reports/stats')
  @ApiOperation({
    summary: 'Get report statistics',
    description: 'Get total sessions, completed sessions, crisis alerts, and average patient progress',
  })
  @ApiResponse({ status: 200, description: 'Report statistics retrieved' })
  async getReportStats() {
    return this.analyticsService.getReportStats();
  }

  @Get('reports/session-trends')
  @ApiOperation({
    summary: 'Get session trends over time',
    description: 'Get monthly/weekly session trends (completed, scheduled, cancelled)',
  })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year'] })
  @ApiQuery({ name: 'range', required: false, description: 'Number of periods (default: 12 for months)' })
  @ApiResponse({ status: 200, description: 'Session trends retrieved' })
  async getSessionTrends(
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
    @Query('range') range?: number,
  ) {
    return this.analyticsService.getSessionTrends(period, range);
  }

  @Get('reports/top-therapists')
  @ApiOperation({
    summary: 'Get top performing therapists',
    description: 'Get therapists ranked by number of completed sessions',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of therapists (default: 10)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for filtering (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for filtering (ISO format)' })
  @ApiResponse({ status: 200, description: 'Top therapists retrieved' })
  async getTopTherapists(
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getTopTherapists(limit, startDate, endDate);
  }

  @Get('reports/session-type-distribution')
  @ApiOperation({
    summary: 'Get session type distribution',
    description: 'Get distribution of different session/therapy types',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for filtering (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for filtering (ISO format)' })
  @ApiResponse({ status: 200, description: 'Session type distribution retrieved' })
  async getSessionTypeDistribution(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getSessionTypeDistribution(startDate, endDate);
  }

  @Get('reports/therapist-performance')
  @ApiOperation({
    summary: 'Get detailed therapist performance',
    description: 'Get comprehensive performance metrics for all therapists',
  })
  @ApiQuery({ name: 'therapistId', required: false, description: 'Filter by specific therapist' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for filtering (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for filtering (ISO format)' })
  @ApiResponse({ status: 200, description: 'Therapist performance data retrieved' })
  async getTherapistPerformance(
    @Query('therapistId') therapistId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getTherapistPerformance(therapistId, startDate, endDate);
  }

  @Get('reports/patient-progress')
  @ApiOperation({
    summary: 'Get patient progress analytics',
    description: 'Get overall patient progress metrics and trends',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for filtering (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for filtering (ISO format)' })
  @ApiResponse({ status: 200, description: 'Patient progress data retrieved' })
  async getPatientProgress(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getPatientProgress(startDate, endDate);
  }

  @Get('reports/revenue')
  @ApiOperation({
    summary: 'Get revenue analytics',
    description: 'Get revenue trends and payment statistics',
  })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year'] })
  @ApiQuery({ name: 'range', required: false, description: 'Number of periods' })
  @ApiResponse({ status: 200, description: 'Revenue data retrieved' })
  async getRevenueAnalytics(
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
    @Query('range') range?: number,
  ) {
    return this.analyticsService.getRevenueAnalytics(period, range);
  }

  @Get('reports/subscription-analytics')
  @ApiOperation({
    summary: 'Get subscription analytics',
    description: 'Get subscription plan distribution and trends',
  })
  @ApiResponse({ status: 200, description: 'Subscription analytics retrieved' })
  async getSubscriptionAnalytics() {
    return this.analyticsService.getSubscriptionAnalytics();
  }

  // ==================== EXPORT DATA ====================

  @Get('reports/export')
  @ApiOperation({
    summary: 'Export report data',
    description: 'Export analytics data in various formats',
  })
  @ApiQuery({ name: 'reportType', required: true, enum: ['sessions', 'therapists', 'revenue', 'patients'] })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Data exported successfully' })
  async exportData(
    @Query('reportType') reportType: string,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.exportData(reportType, format, startDate, endDate);
  }
}