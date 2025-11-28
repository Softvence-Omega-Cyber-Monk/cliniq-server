// src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Strongly-typed shapes used across the analytics service
 */
type OverviewStats = {
  totalTherapists: { count: number; growth: number };
  upcomingSessions: { count: number; change: number };
  completedSessions: { count: number };
};

type SessionCompletionItem = {
  period: string;
  completed: number;
  scheduled: number;
  cancelled: number;
};

type SessionCompletionResponse = {
  data: SessionCompletionItem[];
};

type TherapistActivityItem = {
  month: string;
  'This Week': number;
  'Last Week': number;
};

type TherapistActivityResponse = {
  data: TherapistActivityItem[];
};

type RecentSessionItem = {
  id: string;
  therapistName: string;
  therapistAvatar: string;
  action: string;
  date: Date;
  status: string;
};

type RecentSessionsResponse = {
  sessions: RecentSessionItem[];
};

type ReportStatsResponse = {
  totalSessions: number;
  completedSessions: number;
  crisisAlerts: number;
  avgPatientProgress: string;
};

type SessionTrendItem = {
  month: string;
  completed: number;
  scheduled: number;
  cancelled: number;
};

type SessionTrendsResponse = {
  data: SessionTrendItem[];
};

type TopTherapistItem = {
  name: string;
  sessions: number;
  id: string;
};

type TopTherapistsResponse = {
  therapists: TopTherapistItem[];
};

type SessionTypeDistributionItem = {
  name: string;
  value: number; // percentage
  count: number;
};

type SessionTypeDistributionResponse = {
  distribution: SessionTypeDistributionItem[];
  total: number;
};

type TherapistPerformanceItem = {
  therapistId: string;
  therapistName: string;
  totalSessions: number;
  completedSessions: number;
  scheduledSessions: number;
  cancelledSessions: number;
  completionRate: number;
  totalClients: number;
};

type TherapistPerformanceResponse = {
  performance: TherapistPerformanceItem[];
};

type PatientProgressItem = {
  clientId: string;
  clientName: string;
  progress: number;
  status: string;
};

type PatientProgressResponse = {
  averageProgress: number;
  totalClients: number;
  progressData: PatientProgressItem[];
};

type RevenueAnalyticsItem = {
  period: string;
  revenue: number;
  transactions: number;
};

type RevenueAnalyticsResponse = {
  data: RevenueAnalyticsItem[];
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
  };
};

type SubscriptionAnalyticsResponse = {
  totalSubscriptions: number;
  activeSubscriptions: number;
  planDistribution: {
    planName: string;
    activeSubscriptions: number;
    totalSubscriptions: number;
  }[];
  statusBreakdown: Record<string, number>;
};

/**
 * AnalyticsService
 *
 * - Adds explicit typing for all arrays that were previously inferred as `never[]`.
 * - Uses Prisma.JsonNull for JSON field null filtering as required by Prisma types.
 * - Avoids dynamic object keys like `[period]` in pushed items by using consistent property names.
 */
@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ==================== OVERVIEW METHODS ====================

  async getOverviewStats(): Promise<OverviewStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalTherapists,
      totalTherapistsLastMonth,
      upcomingSessions,
      upcomingSessionsLastMonth,
      completedSessions,
      completedSessionsLastMonth,
    ] = await Promise.all([
      this.prisma.therapist.count(),
      // therapists created before the start of this month (i.e., last month count)
      this.prisma.therapist.count({
        where: { createdAt: { lt: startOfMonth } },
      }),
      this.prisma.appointment.count({
        where: {
          status: 'scheduled',
          scheduledDate: { gte: now },
        },
      }),
      this.prisma.appointment.count({
        where: {
          status: 'scheduled',
          scheduledDate: {
            gte: lastMonth,
            lt: startOfMonth,
          },
        },
      }),
      this.prisma.appointment.count({
        where: { status: 'completed' },
      }),
      this.prisma.appointment.count({
        where: {
          status: 'completed',
          updatedAt: { lt: startOfMonth },
        },
      }),
    ]);

    const therapistGrowth =
      totalTherapistsLastMonth > 0
        ? ((totalTherapists - totalTherapistsLastMonth) / totalTherapistsLastMonth) * 100
        : 0;

    const upcomingChange =
      upcomingSessionsLastMonth > 0
        ? ((upcomingSessions - upcomingSessionsLastMonth) / upcomingSessionsLastMonth) * 100
        : 0;

    return {
      totalTherapists: {
        count: totalTherapists,
        growth: Number(therapistGrowth.toFixed(1)),
      },
      upcomingSessions: {
        count: upcomingSessions,
        change: Number(upcomingChange.toFixed(1)),
      },
      completedSessions: {
        count: completedSessions,
      },
    };
  }

  async getSessionCompletionData(period: 'week' | 'month', range?: number): Promise<SessionCompletionResponse> {
    const defaultRange = period === 'week' ? 4 : 6;
    const periodsToFetch = range || defaultRange;
    const data: SessionCompletionItem[] = [];

    // We iterate from oldest to newest block (i decreasing produces earlier-to-later labels as in original)
    for (let i = periodsToFetch - 1; i >= 0; i--) {
      const now = new Date();
      const endDate = new Date(now);
      const startDate = new Date(now);

      if (period === 'week') {
        // endDate: now - i * 7 days
        // startDate: now - (i + 1) * 7 days
        startDate.setDate(now.getDate() - (i + 1) * 7);
        endDate.setDate(now.getDate() - i * 7);
      } else {
        // monthly
        startDate.setMonth(now.getMonth() - (i + 1));
        endDate.setMonth(now.getMonth() - i);
      }

      const [completed, scheduled, cancelled] = await Promise.all([
        this.prisma.appointment.count({
          where: {
            status: 'completed',
            scheduledDate: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.appointment.count({
          where: {
            status: 'scheduled',
            scheduledDate: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.appointment.count({
          where: {
            status: 'cancelled',
            scheduledDate: { gte: startDate, lt: endDate },
          },
        }),
      ]);

      const label = period === 'week' ? `Week-${periodsToFetch - i}` : startDate.toLocaleString('default', { month: 'short' });

      data.push({
        period: label,
        completed,
        scheduled,
        cancelled,
      });
    }

    return { data };
  }

  async getTherapistActivityData(period: 'week' | 'month'): Promise<TherapistActivityResponse> {
    const data: TherapistActivityItem[] = [];
    const periodsToFetch = period === 'week' ? 6 : 6;

    for (let i = periodsToFetch - 1; i >= 0; i--) {
      const now = new Date();
      const currentPeriodEnd = new Date(now);
      const currentPeriodStart = new Date(now);
      const lastPeriodEnd = new Date(now);
      const lastPeriodStart = new Date(now);

      if (period === 'week') {
        currentPeriodStart.setDate(now.getDate() - (i + 1) * 7);
        currentPeriodEnd.setDate(now.getDate() - i * 7);
        lastPeriodStart.setDate(now.getDate() - (i + 2) * 7);
        lastPeriodEnd.setDate(now.getDate() - (i + 1) * 7);
      } else {
        currentPeriodStart.setMonth(now.getMonth() - (i + 1));
        currentPeriodEnd.setMonth(now.getMonth() - i);
        lastPeriodStart.setMonth(now.getMonth() - (i + 2));
        lastPeriodEnd.setMonth(now.getMonth() - (i + 1));
      }

      const [currentCount, lastCount] = await Promise.all([
        this.prisma.appointment.count({
          where: {
            scheduledDate: { gte: currentPeriodStart, lt: currentPeriodEnd },
          },
        }),
        this.prisma.appointment.count({
          where: {
            scheduledDate: { gte: lastPeriodStart, lt: lastPeriodEnd },
          },
        }),
      ]);

      const label = period === 'month' ? currentPeriodStart.toLocaleString('default', { month: 'short' }) : `Week ${periodsToFetch - i}`;

      data.push({
        month: label,
        'This Week': currentCount,
        'Last Week': lastCount,
      });
    }

    return { data };
  }

  async getRecentSessions(limit: number): Promise<RecentSessionsResponse> {
    const sessions = await this.prisma.appointment.findMany({
      where: {
        status: { in: ['completed', 'scheduled'] },
      },
      include: {
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
      take: limit,
    });

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        therapistName: session.therapist.fullName,
        therapistAvatar: session.therapist.fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        action: `${session.status === 'completed' ? 'Completed' : 'Scheduled'} session with ${session.client.name}`,
        date: session.scheduledDate,
        status: session.status,
      })),
    };
  }

  // ==================== REPORTS METHODS ====================

  async getReportStats(): Promise<ReportStatsResponse> {
    const [
      totalSessions,
      completedSessions,
      crisisAlerts,
      clientsWithProgress,
    ] = await Promise.all([
      this.prisma.appointment.count(),
      this.prisma.appointment.count({ where: { status: 'completed' } }),
      // If crisisHistories is a JSON field, use Prisma.JsonNull to compare against JSON null.
      this.prisma.client.count({
        where: {
          crisisHistories: { not: Prisma.JsonNull },
        },
      }),
      this.prisma.client.findMany({
        where: {
          treatmentProgress: { not: Prisma.JsonNull },
        },
        select: {
          treatmentProgress: true,
        },
      }),
    ]);

    // Calculate average progress
    let totalProgress = 0;
    let progressCount = 0;

    clientsWithProgress.forEach((client) => {
      if (client.treatmentProgress && typeof client.treatmentProgress === 'object') {
        // some schemas store progress as { percentage: number }
        const progress = (client.treatmentProgress as any).percentage;
        if (typeof progress === 'number') {
          totalProgress += progress;
          progressCount++;
        }
      }
    });

    const avgProgress = progressCount > 0 ? Math.round(totalProgress / progressCount) : 0;

    return {
      totalSessions,
      completedSessions,
      crisisAlerts,
      avgPatientProgress: `${avgProgress}%`,
    };
  }

  async getSessionTrends(period: 'week' | 'month' | 'year', range?: number): Promise<SessionTrendsResponse> {
    const defaultRange = period === 'year' ? 2 : period === 'month' ? 12 : 8;
    const periodsToFetch = range || defaultRange;
    const data: SessionTrendItem[] = [];

    for (let i = periodsToFetch - 1; i >= 0; i--) {
      const now = new Date();
      const endDate = new Date(now);
      const startDate = new Date(now);

      if (period === 'week') {
        startDate.setDate(now.getDate() - (i + 1) * 7);
        endDate.setDate(now.getDate() - i * 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - (i + 1));
        endDate.setMonth(now.getMonth() - i);
      } else {
        startDate.setFullYear(now.getFullYear() - (i + 1));
        endDate.setFullYear(now.getFullYear() - i);
      }

      const [completed, scheduled, cancelled] = await Promise.all([
        this.prisma.appointment.count({
          where: {
            status: 'completed',
            scheduledDate: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.appointment.count({
          where: {
            status: 'scheduled',
            scheduledDate: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.appointment.count({
          where: {
            status: 'cancelled',
            scheduledDate: { gte: startDate, lt: endDate },
          },
        }),
      ]);

      let label: string;
      if (period === 'month') {
        label = startDate.toLocaleString('default', { month: 'short' });
      } else if (period === 'year') {
        label = startDate.getFullYear().toString();
      } else {
        label = `Week ${periodsToFetch - i}`;
      }

      data.push({
        month: label,
        completed,
        scheduled,
        cancelled,
      });
    }

    return { data };
  }

  async getTopTherapists(limit: number, startDate?: string, endDate?: string): Promise<TopTherapistsResponse> {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const therapists = await this.prisma.therapist.findMany({
      include: {
        appointments: {
          where: {
            status: 'completed',
            // only include scheduledDate filter if either startDate or endDate provided
            ...(startDate || endDate ? { scheduledDate: dateFilter } : {}),
          },
        },
      },
    });

    const therapistStats = therapists
      .map((therapist) => ({
        name: therapist.fullName,
        sessions: therapist.appointments.length,
        id: therapist.id,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, limit);

    return { therapists: therapistStats };
  }

  async getSessionTypeDistribution(startDate?: string, endDate?: string): Promise<SessionTypeDistributionResponse> {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: 'completed',
        ...(startDate || endDate ? { scheduledDate: dateFilter } : {}),
      },
      select: {
        sessionType: true,
      },
    });

    const total = appointments.length;
    const typeCounts: Record<string, number> = {};

    appointments.forEach((apt) => {
      const type = apt.sessionType || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const distribution = Object.entries(typeCounts).map(([name, count]) => ({
      name,
      value: total > 0 ? Math.round((count / total) * 100) : 0,
      count,
    }));

    return { distribution, total };
  }

  async getTherapistPerformance(therapistId?: string, startDate?: string, endDate?: string): Promise<TherapistPerformanceResponse> {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const whereClause: any = {
      ...(therapistId ? { id: therapistId } : {}),
    };

    const therapists = await this.prisma.therapist.findMany({
      where: whereClause,
      include: {
        appointments: {
          where: {
            ...(startDate || endDate ? { scheduledDate: dateFilter } : {}),
          },
        },
        clients: true,
      },
    });

    const performance = therapists.map((therapist) => {
      const completed = therapist.appointments.filter((a) => a.status === 'completed').length;
      const scheduled = therapist.appointments.filter((a) => a.status === 'scheduled').length;
      const cancelled = therapist.appointments.filter((a) => a.status === 'cancelled').length;
      const total = therapist.appointments.length;

      return {
        therapistId: therapist.id,
        therapistName: therapist.fullName,
        totalSessions: total,
        completedSessions: completed,
        scheduledSessions: scheduled,
        cancelledSessions: cancelled,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalClients: therapist.clients.length,
      };
    });

    return { performance };
  }

  async getPatientProgress(startDate?: string, endDate?: string): Promise<PatientProgressResponse> {
    // filter for clients that actually have treatmentProgress not null
    const clients = await this.prisma.client.findMany({
      where: {
        treatmentProgress: { not: Prisma.JsonNull },
      },
      select: {
        id: true,
        name: true,
        treatmentProgress: true,
        status: true,
      },
    });

    let totalProgress = 0;
    let count = 0;

    const progressData: PatientProgressItem[] = clients.map((client) => {
      let progress = 0;
      if (client.treatmentProgress && typeof client.treatmentProgress === 'object') {
        progress = (client.treatmentProgress as any).percentage || 0;
        totalProgress += progress;
        count++;
      }

      return {
        clientId: client.id,
        clientName: client.name,
        progress,
        status: client.status || '',
      };
    });

    return {
      averageProgress: count > 0 ? Math.round(totalProgress / count) : 0,
      totalClients: clients.length,
      progressData,
    };
  }

  async getRevenueAnalytics(period: 'week' | 'month' | 'year', range?: number): Promise<RevenueAnalyticsResponse> {
    const defaultRange = period === 'year' ? 2 : period === 'month' ? 12 : 8;
    const periodsToFetch = range || defaultRange;
    const data: RevenueAnalyticsItem[] = [];

    for (let i = periodsToFetch - 1; i >= 0; i--) {
      const now = new Date();
      const endDate = new Date(now);
      const startDate = new Date(now);

      if (period === 'week') {
        startDate.setDate(now.getDate() - (i + 1) * 7);
        endDate.setDate(now.getDate() - i * 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - (i + 1));
        endDate.setMonth(now.getMonth() - i);
      } else {
        startDate.setFullYear(now.getFullYear() - (i + 1));
        endDate.setFullYear(now.getFullYear() - i);
      }

      const payments = await this.prisma.payment.findMany({
        where: {
          paidAt: { gte: startDate, lt: endDate },
          status: 'succeeded',
        },
      });

      const revenue = payments.reduce((sum, payment) => sum + (typeof payment.amount === 'number' ? payment.amount : 0), 0);

      let label: string;
      if (period === 'month') {
        label = startDate.toLocaleString('default', { month: 'short' });
      } else if (period === 'year') {
        label = startDate.getFullYear().toString();
      } else {
        label = `Week ${periodsToFetch - i}`;
      }

      data.push({
        period: label,
        revenue: Number(revenue.toFixed(2)),
        transactions: payments.length,
      });
    }

    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const totalTransactions = data.reduce((sum, item) => sum + item.transactions, 0);

    return {
      data,
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalTransactions,
        averageTransactionValue: totalTransactions > 0 ? Number((totalRevenue / totalTransactions).toFixed(2)) : 0,
      },
    };
  }

  async getSubscriptionAnalytics(): Promise<SubscriptionAnalyticsResponse> {
    const [subscriptions, plans] = await Promise.all([
      this.prisma.subscription.findMany({
        include: {
          subscriptionPlan: true,
        },
      }),
      this.prisma.subscriptionPlan.findMany({
        include: {
          subscriptions: true,
        },
      }),
    ]);

    const planDistribution = plans.map((plan) => ({
      planName: plan.planName,
      activeSubscriptions: plan.subscriptions.filter((s) => s.status === 'active').length,
      totalSubscriptions: plan.subscriptions.length,
    }));

    const statusCounts = subscriptions.reduce((acc: Record<string, number>, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: statusCounts.active || 0,
      planDistribution,
      statusBreakdown: statusCounts,
    };
  }

  async exportData(
    reportType: string,
    format: 'json' | 'csv',
    startDate?: string,
    endDate?: string,
  ): Promise<{ format: string; data: string | object; filename: string }> {
    let data: any;

    switch (reportType) {
      case 'sessions':
        data = await this.getSessionTrends('month', 12);
        break;
      case 'therapists':
        data = await this.getTopTherapists(100, startDate, endDate);
        break;
      case 'revenue':
        data = await this.getRevenueAnalytics('month', 12);
        break;
      case 'patients':
        data = await this.getPatientProgress(startDate, endDate);
        break;
      default:
        throw new Error('Invalid report type');
    }

    const filenameBase = `${reportType}_report_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      // Convert to CSV format
      return {
        format: 'csv',
        data: this.convertToCSV(data),
        filename: `${filenameBase}.csv`,
      };
    }

    return {
      format: 'json',
      data,
      filename: `${filenameBase}.json`,
    };
  }

  /**
   * convertToCSV
   *
   * Produces CSV from common shapes returned by exportData. This function treats a few possible
   * top-level shapes (data.data, data.therapists, data.performance, data.progressData).
   *
   * NOTE: This is a simple converter. If you require nested objects flattening or special formatting,
   * enhance accordingly.
   */
  private convertToCSV(data: any): string {
    if (!data || typeof data !== 'object') return '';

    // Determine main array to convert
    const mainData: any[] =
      (Array.isArray(data.data) && data.data) ||
      (Array.isArray((data as any).therapists) && (data as any).therapists) ||
      (Array.isArray((data as any).performance) && (data as any).performance) ||
      (Array.isArray((data as any).progressData) && (data as any).progressData) ||
      [];

    if (!Array.isArray(mainData) || mainData.length === 0) return '';

    // Build union set of headers present in all rows (to support slightly different shapes)
    const headerSet = new Set<string>();
    mainData.forEach((row) => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((k) => headerSet.add(k));
      }
    });

    const headers = Array.from(headerSet);
    const csvRows: string[] = [headers.join(',')];

    for (const row of mainData) {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') {
          // escape quotes by doubling them
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (typeof value === 'object') {
          // stringify small objects
          try {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          } catch {
            return '""';
          }
        }
        return String(value);
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}
