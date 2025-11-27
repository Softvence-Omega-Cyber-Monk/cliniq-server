import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SessionStats {
  completed: number;
  scheduled: number;
  cancelled: number;
}

export interface WeeklySessionData {
  week: string;
  completed: number;
  scheduled: number;
  cancelled: number;
}

export interface MonthlySessionData {
  month: string;
  completed: number;
  scheduled: number;
  cancelled: number;
}

export interface RecentSession {
  id: string;
  clientName: string;
  clientEmail: string;
  therapistName: string;
  therapistEmail: string;
  scheduledDate: Date;
  scheduledTime: string;
  duration: number;
  status: string;
  sessionType: string;
  phone: string;
  email: string;
  notes?: string;
  createdAt: Date;
}

export interface SessionCompletionData {
  weekly: WeeklySessionData[];
  monthly: MonthlySessionData[];
}

@Injectable()
export class AdminSessionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get week number from date
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Get month name from date
   */
  private getMonthName(date: Date): string {
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }

  /**
   * Get session completion data for the graph (weekly and monthly)
   */
  async getSessionCompletionData(): Promise<SessionCompletionData> {
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(now.getDate() - 28);

    const fourMonthsAgo = new Date(now);
    fourMonthsAgo.setMonth(now.getMonth() - 4);

    // Get all appointments from the last 4 weeks
    const weeklyAppointments = await this.prisma.appointment.findMany({
      where: {
        scheduledDate: {
          gte: fourWeeksAgo,
          lte: now,
        },
      },
      select: {
        scheduledDate: true,
        status: true,
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    // Get all appointments from the last 4 months
    const monthlyAppointments = await this.prisma.appointment.findMany({
      where: {
        scheduledDate: {
          gte: fourMonthsAgo,
          lte: now,
        },
      },
      select: {
        scheduledDate: true,
        status: true,
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    // Process weekly data
    const weeklyData: Map<number, SessionStats> = new Map();
    const currentWeek = this.getWeekNumber(now);

    // Initialize last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekNum = currentWeek - i;
      weeklyData.set(weekNum, { completed: 0, scheduled: 0, cancelled: 0 });
    }

    // Aggregate weekly appointments
    weeklyAppointments.forEach((apt) => {
      const weekNum = this.getWeekNumber(new Date(apt.scheduledDate));
      const stats = weeklyData.get(weekNum);

      if (stats) {
        if (apt.status === 'completed') {
          stats.completed++;
        } else if (apt.status === 'scheduled' || apt.status === 'confirmed') {
          stats.scheduled++;
        } else if (apt.status === 'cancelled' || apt.status === 'no-show') {
          stats.cancelled++;
        }
      }
    });

    // Convert weekly map to array
    const weekly: WeeklySessionData[] = Array.from(weeklyData.entries()).map(
      ([weekNum, stats], index) => ({
        week: `Week-${index + 1}`,
        ...stats,
      })
    );

    // Process monthly data
    const monthlyData: Map<string, SessionStats> = new Map();

    // Initialize last 4 months
    for (let i = 3; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i);
      const monthKey = this.getMonthName(date);
      monthlyData.set(monthKey, { completed: 0, scheduled: 0, cancelled: 0 });
    }

    // Aggregate monthly appointments
    monthlyAppointments.forEach((apt) => {
      const monthKey = this.getMonthName(new Date(apt.scheduledDate));
      const stats = monthlyData.get(monthKey);

      if (stats) {
        if (apt.status === 'completed') {
          stats.completed++;
        } else if (apt.status === 'scheduled' || apt.status === 'confirmed') {
          stats.scheduled++;
        } else if (apt.status === 'cancelled' || apt.status === 'no-show') {
          stats.cancelled++;
        }
      }
    });

    // Convert monthly map to array
    const monthly: MonthlySessionData[] = Array.from(monthlyData.entries()).map(
      ([month, stats]) => ({
        month,
        ...stats,
      })
    );

    return { weekly, monthly };
  }

  /**
   * Get recent sessions (last 10-20 sessions)
   */
  async getRecentSessions(limit: number = 20): Promise<RecentSession[]> {
    const appointments = await this.prisma.appointment.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        client: {
          select: {
            name: true,
            email: true,
          },
        },
        therapist: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    return appointments.map((apt) => ({
      id: apt.id,
      clientName: apt.client.name,
      clientEmail: apt.client.email,
      therapistName: apt.therapist.fullName,
      therapistEmail: apt.therapist.email,
      scheduledDate: apt.scheduledDate,
      scheduledTime: apt.scheduledTime,
      duration: apt.duration,
      status: apt.status,
      sessionType: apt.sessionType,
      phone: apt.phone,
      email: apt.email,
      notes: apt.notes || undefined,
      createdAt: apt.createdAt,
    }));
  }

  /**
   * Get all sessions with filters and pagination
   */
  async getAllSessions(filters?: {
    status?: string;
    therapistId?: string;
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { 
      status, 
      therapistId, 
      clientId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10 
    } = filters || {};
    
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (therapistId) {
      where.therapistId = therapistId;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) {
        where.scheduledDate.gte = startDate;
      }
      if (endDate) {
        where.scheduledDate.lte = endDate;
      }
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          scheduledDate: 'desc',
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          therapist: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    const sessions = appointments.map((apt) => ({
      id: apt.id,
      client: apt.client,
      therapist: apt.therapist,
      scheduledDate: apt.scheduledDate,
      scheduledTime: apt.scheduledTime,
      duration: apt.duration,
      status: apt.status,
      sessionType: apt.sessionType,
      phone: apt.phone,
      email: apt.email,
      notes: apt.notes || undefined,
      completionNotes: apt.completionNotes || undefined,
      createdAt: apt.createdAt,
      updatedAt: apt.updatedAt,
    }));

    return {
      data: sessions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}