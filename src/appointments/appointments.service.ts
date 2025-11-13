// src/appointments/appointments.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { SearchAppointmentDto } from './dto/search-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create appointment
   */
  async createAppointment(
    userId: string,
    userType: string,
    dto: CreateAppointmentDto,
  ) {
    // Verify client exists
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      select: { id: true, therapistId: true, name: true, email: true, phone: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    let therapistId = dto.therapistId;

    // Handle permissions based on user type
    if (userType === 'THERAPIST') {
      // Therapist can only create appointments for their own clients
      if (client.therapistId !== userId) {
        throw new ForbiddenException('You can only create appointments for your clients');
      }
      therapistId = userId; // Force therapist to be the logged-in user
    } else if (userType === 'CLINIC') {
      // Clinic must specify therapistId
      if (!therapistId) {
        throw new BadRequestException('Clinic must specify therapistId');
      }

      // Verify therapist belongs to this clinic
      const therapist = await this.prisma.therapist.findUnique({
        where: { id: therapistId },
        select: { id: true, clinicId: true },
      });

      if (!therapist) {
        throw new NotFoundException('Therapist not found');
      }

      if (therapist.clinicId !== userId) {
        throw new ForbiddenException('You can only assign therapists from your clinic');
      }
    }

    // Verify therapist exists
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: therapistId! },
      select: { id: true, fullName: true, email: true, speciality: true },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    // Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        client: {
          connect: { id: dto.clientId },
        },
        therapist: {
          connect: { id: therapistId! },
        },
        scheduledDate: new Date(dto.scheduledDate),
        scheduledTime: dto.scheduledTime,
        duration: dto.duration || 60,
        sessionType: dto.sessionType || 'virtual',
        phone: dto.phone || client.phone,
        email: dto.email || client.email,
        status: 'scheduled',
        notes: dto.notes || null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
            speciality: true,
          },
        },
      },
    });

    return appointment;
  }

  /**
   * Get all appointments with filters
   */
  async getAllAppointments(
    userId: string,
    userType: string,
    query: SearchAppointmentDto,
  ) {
    const { search, status, sessionType, date, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Build where clause based on user type
    const where: any = {};

    if (userType === 'THERAPIST') {
      where.therapistId = userId;
    } else if (userType === 'CLINIC') {
      // Get all therapists from this clinic
      const clinicTherapists = await this.prisma.therapist.findMany({
        where: { clinicId: userId },
        select: { id: true },
      });

      where.therapistId = {
        in: clinicTherapists.map((t) => t.id),
      };
    }

    // Apply filters
    if (search) {
      where.OR = [
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { client: { email: { contains: search, mode: 'insensitive' } } },
        { therapist: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (sessionType) {
      where.sessionType = sessionType;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      where.scheduledDate = {
        gte: startDate,
        lt: endDate,
      };
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          therapist: {
            select: {
              id: true,
              fullName: true,
              email: true,
              speciality: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          { scheduledDate: 'asc' },
          { scheduledTime: 'asc' },
        ],
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get upcoming appointments
   */
  async getUpcomingAppointments(
    userId: string,
    userType: string,
    days: number = 30,
    limit: number = 100,
  ) {
    const where: any = {
      scheduledDate: {
        gte: new Date(),
        lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
      status: {
        in: ['scheduled', 'confirmed'],
      },
    };

    if (userType === 'THERAPIST') {
      where.therapistId = userId;
    } else if (userType === 'CLINIC') {
      const clinicTherapists = await this.prisma.therapist.findMany({
        where: { clinicId: userId },
        select: { id: true },
      });

      where.therapistId = {
        in: clinicTherapists.map((t) => t.id),
      };
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
            speciality: true,
          },
        },
      },
      take: limit,
      orderBy: [
        { scheduledDate: 'asc' },
        { scheduledTime: 'asc' },
      ],
    });

    return {
      data: appointments,
      count: appointments.length,
    };
  }

  /**
   * Get today's appointments
   */
  async getTodayAppointments(userId: string, userType: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      scheduledDate: {
        gte: today,
        lt: tomorrow,
      },
    };

    if (userType === 'THERAPIST') {
      where.therapistId = userId;
    } else if (userType === 'CLINIC') {
      const clinicTherapists = await this.prisma.therapist.findMany({
        where: { clinicId: userId },
        select: { id: true },
      });

      where.therapistId = {
        in: clinicTherapists.map((t) => t.id),
      };
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
            speciality: true,
          },
        },
      },
      orderBy: [{ scheduledTime: 'asc' }],
    });

    return {
      data: appointments,
      count: appointments.length,
      date: today.toISOString().split('T')[0],
    };
  }

  /**
   * Get appointments by specific date
   */
  async getAppointmentsByDate(userId: string, userType: string, date: string) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const where: any = {
      scheduledDate: {
        gte: startDate,
        lt: endDate,
      },
    };

    if (userType === 'THERAPIST') {
      where.therapistId = userId;
    } else if (userType === 'CLINIC') {
      const clinicTherapists = await this.prisma.therapist.findMany({
        where: { clinicId: userId },
        select: { id: true },
      });

      where.therapistId = {
        in: clinicTherapists.map((t) => t.id),
      };
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
            speciality: true,
          },
        },
      },
      orderBy: [{ scheduledTime: 'asc' }],
    });

    return {
      data: appointments,
      count: appointments.length,
      date: date,
    };
  }

  /**
   * Get appointments by date range
   */
  async getAppointmentsByDateRange(
    userId: string,
    userType: string,
    startDate: string,
    endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const where: any = {
      scheduledDate: {
        gte: start,
        lt: end,
      },
    };

    if (userType === 'THERAPIST') {
      where.therapistId = userId;
    } else if (userType === 'CLINIC') {
      const clinicTherapists = await this.prisma.therapist.findMany({
        where: { clinicId: userId },
        select: { id: true },
      });

      where.therapistId = {
        in: clinicTherapists.map((t) => t.id),
      };
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
            speciality: true,
          },
        },
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { scheduledTime: 'asc' },
      ],
    });

    // Group by date
    const groupedByDate = appointments.reduce((acc, appointment) => {
      const dateKey = appointment.scheduledDate.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(appointment);
      return acc;
    }, {} as Record<string, typeof appointments>);

    return {
      data: appointments,
      groupedByDate,
      count: appointments.length,
      startDate: startDate,
      endDate: endDate,
    };
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(userId: string, userType: string, id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            condition: true,
          },
        },
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            speciality: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check access permissions
    if (userType === 'THERAPIST' && appointment.therapistId !== userId) {
      throw new ForbiddenException('You can only view your own appointments');
    } else if (userType === 'CLINIC') {
      const therapist = await this.prisma.therapist.findUnique({
        where: { id: appointment.therapistId },
        select: { clinicId: true },
      });

      if (therapist?.clinicId !== userId) {
        throw new ForbiddenException('You can only view appointments from your clinic');
      }
    }

    return appointment;
  }

  /**
   * Update appointment
   */
  async updateAppointment(
    userId: string,
    userType: string,
    id: string,
    dto: UpdateAppointmentDto,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: { id: true, therapistId: true, clientId: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check permissions
    await this.checkAppointmentAccess(userId, userType, appointment.therapistId);

    // Build update data
    const updateData: any = {};

    if (dto.scheduledDate) updateData.scheduledDate = new Date(dto.scheduledDate);
    if (dto.scheduledTime) updateData.scheduledTime = dto.scheduledTime;
    if (dto.duration) updateData.duration = dto.duration;
    if (dto.sessionType) updateData.sessionType = dto.sessionType;
    if (dto.phone) updateData.phone = dto.phone;
    if (dto.email) updateData.email = dto.email;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
            speciality: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(
    userId: string,
    userType: string,
    id: string,
    dto: UpdateAppointmentStatusDto,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: { id: true, therapistId: true, status: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check permissions
    await this.checkAppointmentAccess(userId, userType, appointment.therapistId);

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: dto.status,
        completionNotes: dto.completionNotes || null,
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
    });

    return {
      ...updated,
      message: `Appointment status updated to ${dto.status}`,
    };
  }

  /**
   * Delete appointment
   */
  async deleteAppointment(userId: string, userType: string, id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: { id: true, therapistId: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check permissions
    await this.checkAppointmentAccess(userId, userType, appointment.therapistId);

    await this.prisma.appointment.delete({
      where: { id },
    });

    return {
      message: 'Appointment deleted successfully',
      id,
    };
  }

  /**
   * Get therapist appointments
   */
  async getTherapistAppointments(therapistId: string, query: SearchAppointmentDto) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { therapistId };

    if (status) {
      where.status = status;
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          therapist: {
            select: {
              id: true,
              fullName: true,
              email: true,
              speciality: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          { scheduledDate: 'asc' },
          { scheduledTime: 'asc' },
        ],
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get client appointments
   */
  async getClientAppointments(clientId: string, query: SearchAppointmentDto) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { clientId };

    if (status) {
      where.status = status;
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          therapist: {
            select: {
              id: true,
              fullName: true,
              email: true,
              speciality: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          { scheduledDate: 'desc' },
          { scheduledTime: 'desc' },
        ],
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Helper: Check appointment access
   */
  private async checkAppointmentAccess(
    userId: string,
    userType: string,
    appointmentTherapistId: string,
  ) {
    if (userType === 'THERAPIST' && appointmentTherapistId !== userId) {
      throw new ForbiddenException('You can only manage your own appointments');
    } else if (userType === 'CLINIC') {
      const therapist = await this.prisma.therapist.findUnique({
        where: { id: appointmentTherapistId },
        select: { clinicId: true },
      });

      if (therapist?.clinicId !== userId) {
        throw new ForbiddenException(
          'You can only manage appointments from your clinic',
        );
      }
    }
  }
}