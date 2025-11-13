import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFiltersDto } from './dto/report-filters.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(userId: string, userType: string, filters: ReportFiltersDto) {
    const { startDate, endDate } = this.getDateRange(filters.dateRange!, filters.startDate, filters.endDate);
    const previousPeriod = this.getPreviousPeriod(startDate, endDate);

    // Build where clause based on user type
    const whereClause = await this.buildWhereClause(userId, userType, filters.therapistId);

    // Current period stats
    const [
      currentSessions,
      currentTherapists,
      currentClients,
      crisisAlerts,
    ] = await Promise.all([
      this.getSessionsCount(whereClause, startDate, endDate),
      this.getActiveTherapistsCount(whereClause, startDate, endDate),
      this.getActiveClientsCount(whereClause, startDate, endDate),
      this.getCrisisAlertsCount(whereClause, startDate, endDate),
    ]);

    // Previous period stats for growth calculation
    const [
      previousSessions,
      previousTherapists,
      previousClients,
    ] = await Promise.all([
      this.getSessionsCount(whereClause, previousPeriod.start, previousPeriod.end),
      this.getActiveTherapistsCount(whereClause, previousPeriod.start, previousPeriod.end),
      this.getActiveClientsCount(whereClause, previousPeriod.start, previousPeriod.end),
    ]);

    return {
      totalSessions: currentSessions,
      sessionsGrowth: this.calculateGrowth(currentSessions, previousSessions),
      activeTherapists: currentTherapists,
      therapistsGrowth: this.calculateGrowth(currentTherapists, previousTherapists),
      activeClients: currentClients,
      clientsGrowth: this.calculateGrowth(currentClients, previousClients),
      crisisAlerts,
    };
  }

  /**
   * Get session trends
   */
  async getSessionTrends(userId: string, userType: string, filters: ReportFiltersDto) {
    const { startDate, endDate } = this.getDateRange(filters.dateRange!, filters.startDate, filters.endDate);
    const whereClause = await this.buildWhereClause(userId, userType, filters.therapistId);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        ...whereClause,
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        scheduledDate: true,
        status: true,
      },
    });

    // Group by weeks
    const weeklyData = this.groupByWeeks(appointments, startDate, endDate);

    const totals = appointments.reduce(
      (acc, apt) => {
        if (apt.status === 'completed') acc.completed++;
        else if (apt.status === 'scheduled' || apt.status === 'confirmed') acc.scheduled++;
        else if (apt.status === 'cancelled') acc.cancelled++;
        return acc;
      },
      { completed: 0, scheduled: 0, cancelled: 0 }
    );

    return {
      weeklyData,
      totalCompleted: totals.completed,
      totalScheduled: totals.scheduled,
      totalCancelled: totals.cancelled,
    };
  }

  /**
   * Get therapist activity
   */
  async getTherapistActivity(userId: string, userType: string, filters: ReportFiltersDto) {
    // const whereClause = await this.buildWhereClause(userId, userType, null);

    const today = new Date();
    const thisWeekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);

    // Get therapists
    let therapists;
    if (userType === 'CLINIC') {
      therapists = await this.prisma.therapist.findMany({
        where: { clinicId: userId },
        select: { id: true, fullName: true },
        take: 10,
      });
    } else if (userType === 'THERAPIST') {
      therapists = await this.prisma.therapist.findMany({
        where: { id: userId },
        select: { id: true, fullName: true },
      });
    } else {
      therapists = await this.prisma.therapist.findMany({
        select: { id: true, fullName: true },
        take: 10,
      });
    }

    const activityData = await Promise.all(
      therapists.map(async (therapist) => {
        const [thisWeek, lastWeek] = await Promise.all([
          this.prisma.appointment.count({
            where: {
              therapistId: therapist.id,
              scheduledDate: { gte: thisWeekStart },
              status: 'completed',
            },
          }),
          this.prisma.appointment.count({
            where: {
              therapistId: therapist.id,
              scheduledDate: { gte: lastWeekStart, lt: lastWeekEnd },
              status: 'completed',
            },
          }),
        ]);

        return {
          therapistId: therapist.id,
          therapistName: therapist.fullName,
          thisWeek,
          lastWeek,
        };
      })
    );

    return { therapists: activityData };
  }

  /**
   * Get session data report
   */
  async getSessionDataReport(userId: string, userType: string, filters: ReportFiltersDto) {
    const { startDate, endDate } = this.getDateRange(filters.dateRange!, filters.startDate, filters.endDate);
    const whereClause = await this.buildWhereClause(userId, userType, filters.therapistId);

    // Get therapists with their appointment stats
    let therapists;
    if (userType === 'CLINIC') {
      therapists = await this.prisma.therapist.findMany({
        where: { clinicId: userId },
        select: { id: true, fullName: true },
      });
    } else if (userType === 'THERAPIST') {
      therapists = await this.prisma.therapist.findMany({
        where: { id: userId },
        select: { id: true, fullName: true },
      });
    } else {
      therapists = await this.prisma.therapist.findMany({
        select: { id: true, fullName: true },
        take: 20,
      });
    }

    const reportData = await Promise.all(
      therapists.map(async (therapist) => {
        const appointments = await this.prisma.appointment.findMany({
          where: {
            therapistId: therapist.id,
            scheduledDate: { gte: startDate, lte: endDate },
          },
          select: {
            duration: true,
            status: true,
          },
        });

        const totalSessions = appointments.length;
        const completedSessions = appointments.filter(a => a.status === 'completed').length;
        const avgDuration = totalSessions > 0
          ? Math.round(appointments.reduce((sum, a) => sum + a.duration, 0) / totalSessions)
          : 0;
        const completionRate = totalSessions > 0
          ? Math.round((completedSessions / totalSessions) * 100)
          : 0;

        // Determine status based on recent activity
        const recentAppointments = appointments.filter(a => {
          const aptDate = new Date(a.status);
          const daysDiff = (Date.now() - aptDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 7;
        });

        return {
          therapistId: therapist.id,
          therapistName: therapist.fullName,
          sessions: totalSessions,
          avgDuration,
          completionRate,
          status: recentAppointments.length > 0 ? 'active' : 'inactive',
        };
      })
    );

    return { data: reportData };
  }

  /**
   * Get recent crisis alerts
   */
  async getRecentCrisisAlerts(userId: string, userType: string, limit: number = 10) {
    const whereClause = await this.buildWhereClause(userId, userType, '');

    // Get clients with crisis histories
    const clients = await this.prisma.client.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        crisisHistories: true,
        updatedAt: true,
      },
    });

    // Extract and flatten crisis alerts
    const alerts: any[] = [];
    clients.forEach(client => {
      if (client.crisisHistories && Array.isArray(client.crisisHistories)) {
        const crises = client.crisisHistories as any[];
        crises.forEach(crisis => {
          if (crisis.severity === 'high' || crisis.severity === 'critical') {
            alerts.push({
              id: crisis.crisisId,
              title: 'High Risk Assessment',
              clientId: `#${client.id.substring(0, 4)}`,
              clientName: client.name,
              severity: crisis.severity,
              createdAt: new Date(crisis.crisisDate),
              timeAgo: this.getTimeAgo(new Date(crisis.crisisDate)),
            });
          }
        });
      }
    });

    // Sort by date and limit
    alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return alerts.slice(0, limit);
  }

  /**
   * Helper: Build where clause based on user type
   */
  private async buildWhereClause(userId: string, userType: string, therapistId?: string) {
    const where: any = {};

    if (therapistId) {
      where.therapistId = therapistId;
    } else if (userType === 'THERAPIST') {
      where.therapistId = userId;
    } else if (userType === 'CLINIC') {
      const therapists = await this.prisma.therapist.findMany({
        where: { clinicId: userId },
        select: { id: true },
      });
      where.therapistId = { in: therapists.map(t => t.id) };
    }

    return where;
  }

  /**
   * Helper: Get date range
   */
  private getDateRange(range: string, customStart?: string, customEnd?: string) {
    const today = new Date();
    let startDate: Date;
    let endDate = new Date(today);

    switch (range) {
      case 'last_7_days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'last_30_days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      case 'last_90_days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 90);
        break;
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'this_year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      case 'custom':
        startDate = customStart ? new Date(customStart) : new Date(today.setDate(today.getDate() - 30));
        endDate = customEnd ? new Date(customEnd) : new Date();
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
    }

    return { startDate, endDate };
  }

  /**
   * Helper: Get previous period
   */
  private getPreviousPeriod(startDate: Date, endDate: Date) {
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(startDate);
    previousStart.setDate(previousStart.getDate() - daysDiff);
    const previousEnd = new Date(startDate);

    return { start: previousStart, end: previousEnd };
  }

  /**
   * Helper: Calculate growth percentage
   */
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  /**
   * Helper: Get sessions count
   */
  private async getSessionsCount(where: any, startDate: Date, endDate: Date) {
    return this.prisma.appointment.count({
      where: {
        ...where,
        scheduledDate: { gte: startDate, lte: endDate },
      },
    });
  }

  /**
   * Helper: Get active therapists count
   */
  private async getActiveTherapistsCount(where: any, startDate: Date, endDate: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        ...where,
        scheduledDate: { gte: startDate, lte: endDate },
      },
      select: { therapistId: true },
      distinct: ['therapistId'],
    });
    return appointments.length;
  }

  /**
   * Helper: Get active clients count
   */
  private async getActiveClientsCount(where: any, startDate: Date, endDate: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        ...where,
        scheduledDate: { gte: startDate, lte: endDate },
      },
      select: { clientId: true },
      distinct: ['clientId'],
    });
    return appointments.length;
  }

  /**
   * Helper: Get crisis alerts count
   */
  private async getCrisisAlertsCount(where: any, startDate: Date, endDate: Date) {
    const clients = await this.prisma.client.findMany({
      where,
      select: { crisisHistories: true },
    });

    let count = 0;
    clients.forEach(client => {
      if (client.crisisHistories && Array.isArray(client.crisisHistories)) {
        const crises = client.crisisHistories as any[];
        count += crises.filter(c => {
          const crisisDate = new Date(c.crisisDate);
          return (c.severity === 'high' || c.severity === 'critical') &&
                 crisisDate >= startDate && crisisDate <= endDate;
        }).length;
      }
    });

    return count;
  }

  /**
   * Helper: Group appointments by weeks
   */
  private groupByWeeks(appointments: any[], startDate: Date, endDate: Date) {
    const weeks: any[] = [];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    let currentWeekStart = new Date(startDate);
    let weekNumber = 1;

    while (currentWeekStart <= endDate) {
      const weekEnd = new Date(currentWeekStart.getTime() + weekMs);
      
      const weekAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.scheduledDate);
        return aptDate >= currentWeekStart && aptDate < weekEnd;
      });

      const completed = weekAppointments.filter(a => a.status === 'completed').length;
      const scheduled = weekAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
      const cancelled = weekAppointments.filter(a => a.status === 'cancelled').length;

      weeks.push({
        week: `Week-${weekNumber}`,
        completed,
        scheduled,
        cancelled,
      });

      currentWeekStart = weekEnd;
      weekNumber++;
    }

    return weeks;
  }

  /**
   * Helper: Get time ago string
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
    return `${Math.floor(seconds / 31536000)}y ago`;
  }
}