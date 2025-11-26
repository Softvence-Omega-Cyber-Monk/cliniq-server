import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFiltersDto } from './dto/report-filters.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard statistics based on user role
   */
  async getDashboardStats(userId: string, userType: string, filters: ReportFiltersDto) {
    const { startDate, endDate } = this.getDateRange(filters.dateRange!, filters.startDate, filters.endDate);
    const previousPeriod = this.getPreviousPeriod(startDate, endDate);

    if (userType === 'ADMIN') {
      return this.getAdminDashboardStats(startDate, endDate, previousPeriod);
    } else if (userType === 'CLINIC') {
      return this.getClinicDashboardStats(userId, startDate, endDate, previousPeriod);
    } else if (userType === 'THERAPIST') {
      return this.getTherapistDashboardStats(userId, startDate, endDate, previousPeriod);
    }

    throw new ForbiddenException('Invalid user type');
  }

  /**
   * Admin Dashboard Stats
   */
  private async getAdminDashboardStats(startDate: Date, endDate: Date, previousPeriod: any) {
    const [
      totalTherapists,
      previousTherapists,
      upcomingSessions,
      previousUpcoming,
      crisisAlerts,
      completedSessions,
      previousCompleted,
    ] = await Promise.all([
      this.prisma.therapist.count({
        where: { createdAt: { lte: endDate } }
      }),
      this.prisma.therapist.count({
        where: { createdAt: { lte: previousPeriod.end } }
      }),
      this.prisma.appointment.count({
        where: {
          scheduledDate: { gte: new Date(), lte: endDate },
          status: { in: ['scheduled', 'confirmed'] }
        }
      }),
      this.prisma.appointment.count({
        where: {
          scheduledDate: { gte: previousPeriod.start, lte: previousPeriod.end },
          status: { in: ['scheduled', 'confirmed'] }
        }
      }),
      this.getCrisisAlertsCount({}, startDate, endDate),
      this.prisma.appointment.count({
        where: {
          scheduledDate: { gte: startDate, lte: endDate },
          status: 'completed'
        }
      }),
      this.prisma.appointment.count({
        where: {
          scheduledDate: { gte: previousPeriod.start, lte: previousPeriod.end },
          status: 'completed'
        }
      }),
    ]);

    return {
      totalTherapists,
      therapistsGrowth: this.calculateGrowth(totalTherapists, previousTherapists),
      upcomingSessions,
      upcomingGrowth: this.calculateGrowth(upcomingSessions, previousUpcoming),
      crisisAlerts,
      completedSessions,
      completedGrowth: this.calculateGrowth(completedSessions, previousCompleted),
    };
  }

  /**
   * Clinic Dashboard Stats
   */
  private async getClinicDashboardStats(clinicId: string, startDate: Date, endDate: Date, previousPeriod: any) {
    // Get therapists under this clinic
    const therapists = await this.prisma.therapist.findMany({
      where: { clinicId },
      select: { id: true }
    });
    const therapistIds = therapists.map(t => t.id);

    const [
      totalTherapists,
      previousTherapists,
      totalClients,
      previousClients,
      upcomingSessions,
      previousUpcoming,
      crisisAlerts,
    ] = await Promise.all([
      this.prisma.therapist.count({
        where: { clinicId, createdAt: { lte: endDate } }
      }),
      this.prisma.therapist.count({
        where: { clinicId, createdAt: { lte: previousPeriod.end } }
      }),
      this.prisma.client.count({
        where: { 
          therapistId: { in: therapistIds },
          createdAt: { lte: endDate }
        }
      }),
      this.prisma.client.count({
        where: { 
          therapistId: { in: therapistIds },
          createdAt: { lte: previousPeriod.end }
        }
      }),
      this.prisma.appointment.count({
        where: {
          therapistId: { in: therapistIds },
          scheduledDate: { gte: new Date(), lte: endDate },
          status: { in: ['scheduled', 'confirmed'] }
        }
      }),
      this.prisma.appointment.count({
        where: {
          therapistId: { in: therapistIds },
          scheduledDate: { gte: previousPeriod.start, lte: previousPeriod.end },
          status: { in: ['scheduled', 'confirmed'] }
        }
      }),
      this.getCrisisAlertsCount({ therapistId: { in: therapistIds } }, startDate, endDate),
    ]);

    return {
      totalTherapists,
      therapistsGrowth: this.calculateGrowth(totalTherapists, previousTherapists),
      totalClients,
      clientsGrowth: this.calculateGrowth(totalClients, previousClients),
      upcomingSessions,
      upcomingGrowth: this.calculateGrowth(upcomingSessions, previousUpcoming),
      crisisAlerts,
    };
  }

  /**
   * Therapist Dashboard Stats
   */
  private async getTherapistDashboardStats(therapistId: string, startDate: Date, endDate: Date, previousPeriod: any) {
    const [
      totalClients,
      previousClients,
      upcomingAppointments,
      previousUpcoming,
      completedSessions,
      previousCompleted,
      treatmentProgress,
    ] = await Promise.all([
      this.prisma.client.count({
        where: { therapistId, createdAt: { lte: endDate } }
      }),
      this.prisma.client.count({
        where: { therapistId, createdAt: { lte: previousPeriod.end } }
      }),
      this.prisma.appointment.count({
        where: {
          therapistId,
          scheduledDate: { gte: new Date(), lte: endDate },
          status: { in: ['scheduled', 'confirmed'] }
        }
      }),
      this.prisma.appointment.count({
        where: {
          therapistId,
          scheduledDate: { gte: previousPeriod.start, lte: previousPeriod.end },
          status: { in: ['scheduled', 'confirmed'] }
        }
      }),
      this.prisma.appointment.count({
        where: {
          therapistId,
          scheduledDate: { gte: startDate, lte: endDate },
          status: 'completed'
        }
      }),
      this.prisma.appointment.count({
        where: {
          therapistId,
          scheduledDate: { gte: previousPeriod.start, lte: previousPeriod.end },
          status: 'completed'
        }
      }),
      this.calculateTreatmentProgress(therapistId),
    ]);

    return {
      totalClients,
      clientsGrowth: this.calculateGrowth(totalClients, previousClients),
      upcomingAppointments,
      upcomingGrowth: this.calculateGrowth(upcomingAppointments, previousUpcoming),
      completedSessions,
      completedGrowth: this.calculateGrowth(completedSessions, previousCompleted),
      treatmentProgress,
      treatmentGrowth: 12.3, // This would need actual calculation based on treatment plans
    };
  }

  /**
   * Get session trends - works for all roles
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
   * Get therapist activity - Admin and Clinic can see multiple therapists
   */
  async getTherapistActivity(userId: string, userType: string, filters: ReportFiltersDto) {
    const today = new Date();
    const thisWeekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);

    let therapists;
    if (userType === 'ADMIN') {
      therapists = await this.prisma.therapist.findMany({
        select: { id: true, fullName: true },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
    } else if (userType === 'CLINIC') {
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
      return { therapists: [] };
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
   * Get recent sessions - for all roles
   */
  async getRecentSessions(userId: string, userType: string, limit: number = 5) {
    const whereClause = await this.buildWhereClause(userId, userType, undefined);

    const sessions = await this.prisma.appointment.findMany({
      where: {
        ...whereClause,
        status: { in: ['scheduled', 'confirmed', 'in_progress'] },
        scheduledDate: { gte: new Date() }
      },
      select: {
        id: true,
        scheduledDate: true,
        status: true,
        sessionType: true,
        therapistId: true,
        clientId: true,
      },
      orderBy: { scheduledDate: 'asc' },
      take: limit,
    });

    // Fetch therapist and client details separately
    const sessionDetails = await Promise.all(
      sessions.map(async (session) => {
        const [therapist, client] = await Promise.all([
          this.prisma.therapist.findUnique({
            where: { id: session.therapistId },
            select: { id: true, fullName: true }
          }),
          this.prisma.client.findUnique({
            where: { id: session.clientId },
            select: { id: true, name: true }
          })
        ]);

        return {
          therapistId: therapist?.id || '',
          therapistName: therapist?.fullName || 'Unknown',
          clientId: client?.id || '',
          clientName: client?.name || 'Unknown',
          patientId: `#${client?.id.substring(0, 4) || '0000'}`,
          status: session.status,
          scheduledDate: session.scheduledDate,
        };
      })
    );

    return sessionDetails;
  }

  /**
   * Get session alerts (crisis alerts for therapist)
   */
  async getSessionAlerts(userId: string, userType: string, limit: number = 10) {
    const whereClause = await this.buildWhereClause(userId, userType, undefined);

    const clients = await this.prisma.client.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        crisisHistories: true,
        updatedAt: true,
      },
      take: limit,
    });

    const alerts: any[] = [];
    clients.forEach(client => {
      if (client.crisisHistories && Array.isArray(client.crisisHistories)) {
        const crises = client.crisisHistories as any[];
        crises.forEach(crisis => {
          if (crisis.severity === 'high' || crisis.severity === 'critical') {
            alerts.push({
              id: crisis.crisisId || `crisis-${client.id}`,
              clientName: client.name,
              severity: crisis.severity,
              message: 'Crisis alert flagged in last session',
              createdAt: new Date(crisis.crisisDate),
              timeAgo: this.getTimeAgo(new Date(crisis.crisisDate)),
            });
          }
        });
      }
    });

    alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return alerts.slice(0, limit);
  }

  /**
   * Get upcoming appointments for therapist
   */
  async getUpcomingAppointments(therapistId: string, limit: number = 5) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        therapistId,
        scheduledDate: { gte: new Date() },
        status: { in: ['scheduled', 'confirmed'] }
      },
      select: {
        id: true,
        scheduledDate: true,
        status: true,
        sessionType: true,
        clientId: true,
      },
      orderBy: { scheduledDate: 'asc' },
      take: limit,
    });

    // Fetch client details separately
    const appointmentDetails = await Promise.all(
      appointments.map(async (apt) => {
        const client = await this.prisma.client.findUnique({
          where: { id: apt.clientId },
          select: { id: true, name: true }
        });

        return {
          id: apt.id,
          clientName: client?.name || 'Unknown',
          appointmentType: apt.sessionType || 'Therapy Session',
          scheduledTime: apt.scheduledDate,
          status: apt.status,
        };
      })
    );

    return appointmentDetails;
  }

  /**
   * Get system alerts (for admin/clinic)
   */
  async getSystemAlerts(userId: string, userType: string, limit: number = 5) {
    // Mock system alerts - in production, these would come from a notifications/alerts table
    const alerts = [
      {
        id: '1',
        type: 'crisis',
        title: 'Crisis Alert',
        message: 'Patient flagged for immediate attention',
        severity: 'high',
        timeAgo: this.getTimeAgo(new Date(Date.now() - 2 * 60 * 1000)),
      },
      {
        id: '2',
        type: 'success',
        title: 'Backup Complete',
        message: 'Daily backup completed successfully',
        severity: 'low',
        timeAgo: this.getTimeAgo(new Date(Date.now() - 2 * 60 * 1000)),
      },
      {
        id: '3',
        type: 'warning',
        title: 'Medication Reminder',
        message: 'Patient due for medication administration',
        severity: 'medium',
        timeAgo: this.getTimeAgo(new Date(Date.now() - 5 * 60 * 1000)),
      },
      {
        id: '4',
        type: 'success',
        title: 'Backup Complete',
        message: 'New patient admitted to the ward',
        severity: 'low',
        timeAgo: this.getTimeAgo(new Date(Date.now() - 10 * 60 * 1000)),
      },
      {
        id: '5',
        type: 'warning',
        title: 'Discharge Processed',
        message: 'Patient discharge paperwork completed',
        severity: 'low',
        timeAgo: this.getTimeAgo(new Date(Date.now() - 15 * 60 * 1000)),
      },
    ];

    return alerts.slice(0, limit);
  }

  /**
   * Helper: Calculate treatment progress percentage
   */
  private async calculateTreatmentProgress(therapistId: string): Promise<number> {
    const clients = await this.prisma.client.findMany({
      where: { therapistId },
      select: {
        id: true,
        treatmentGoals: true,
      }
    });

    if (clients.length === 0) return 0;

    // Get appointments count for each client
    const progressData = await Promise.all(
      clients.map(async (client) => {
        const completedCount = await this.prisma.appointment.count({
          where: {
            clientId: client.id,
            status: 'completed'
          }
        });

        // Assume 10 sessions as default goal if no treatmentGoals specified
        const goalSessions = 10;
        const progress = Math.min((completedCount / goalSessions) * 100, 100);
        return progress;
      })
    );

    const totalProgress = progressData.reduce((sum, progress) => sum + progress, 0);
    return Math.round(totalProgress / clients.length);
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
    // ADMIN gets all data, no where clause restriction

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
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} day ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} mo ago`;
    return `${Math.floor(seconds / 31536000)} y ago`;
  }
}