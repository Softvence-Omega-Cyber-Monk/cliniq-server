// src/therapists/therapists.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchTherapistDto } from './dto/search-therapist.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { SearchClientDto } from '../clients/dto/search-client.dto';

@Injectable()
export class TherapistsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get therapist cards with patient count
   */
  async getTherapistCards(query: SearchTherapistDto) {
    const { search, speciality, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { speciality: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (speciality) {
      where.speciality = { contains: speciality, mode: 'insensitive' };
    }

    const [therapists, total] = await Promise.all([
      this.prisma.therapist.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          speciality: true,
          licenseNumber: true,
          _count: {
            select: {
              clients: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.therapist.count({ where }),
    ]);

    const therapistCards = therapists.map((therapist) => ({
      id: therapist.id,
      fullName: therapist.fullName,
      email: therapist.email,
      phone: therapist.phone,
      speciality: therapist.speciality,
      licenseNumber: therapist.licenseNumber,
      patientCount: therapist._count.clients,
    }));

    return {
      data: therapistCards,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get therapist statistics
   */
  async getTherapistStats() {
    const [totalTherapists, clinicTherapists] = await Promise.all([
      this.prisma.therapist.count(),
      this.prisma.therapist.count({
        where: { clinicId: { not: null } },
      }),
    ]);

    const independentTherapists = totalTherapists - clinicTherapists;

    return {
      totalTherapists,
      activeTherapists: totalTherapists, // You can add active status logic
      clinicTherapists,
      independentTherapists,
    };
  }

  /**
   * Get therapist profile with details
   */
  async getTherapistProfile(therapistId: string) {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: therapistId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        speciality: true,
        licenseNumber: true,
        qualification: true,
        defaultSessionDuration: true,
        timeZone: true,
        availabilityStartTime: true,
        availabilityEndTime: true,
        createdAt: true,
        updatedAt: true,
        clinic: {
          select: {
            id: true,
            privatePracticeName: true,
          },
        },
        subscriptionPlan: {
          select: {
            id: true,
            planName: true,
            price: true,
          },
        },
        _count: {
          select: {
            clients: true,
            appointments: true,
          },
        },
      },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    return {
      ...therapist,
      totalPatients: therapist._count.clients,
      totalSessions: therapist._count.appointments,
      accountStatus: 'active', // Add logic for account status
    };
  }

  /**
   * Get therapist's clients table
   */
  async getTherapistClients(therapistId: string, query: SearchClientDto) {
    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Verify therapist exists
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: therapistId },
      select: { id: true },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    // Build where clause
    const where: any = { therapistId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          overallProgress: true,
          status: true,
          sessionHistory: true,
          _count: {
            select: {
              appointments: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    // Format response
    const clientSummaries = clients.map((client) => {
      // Calculate session count from sessionHistory JSON
      let sessionCount = 0;
      if (client.sessionHistory && Array.isArray(client.sessionHistory)) {
        sessionCount = (client.sessionHistory as any[]).length;
      }
      // Also add appointments count
      sessionCount += client._count.appointments;

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        sessionCount,
        overallProgress: client.overallProgress,
        status: client.status || 'active',
      };
    });

    return {
      data: clientSummaries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get client details
   */
  async getClientDetail(therapistId: string, clientId: string) {
    // First verify therapist exists
    const therapistExists = await this.prisma.therapist.findUnique({
      where: { id: therapistId },
      select: { id: true },
    });

    if (!therapistExists) {
      throw new NotFoundException('Therapist not found');
    }

    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        therapistId: therapistId,
      },
      include: {
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
            speciality: true,
          },
        },
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found or does not belong to this therapist');
    }

    // Calculate total sessions
    let sessionHistoryCount = 0;
    if (client.sessionHistory && Array.isArray(client.sessionHistory)) {
      sessionHistoryCount = (client.sessionHistory as any[]).length;
    }
    const totalSessions = sessionHistoryCount + client._count.appointments;

    return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      overallProgress: client.overallProgress,
      treatmentGoals: client.treatmentGoals,
      status: client.status || 'active',
      condition: client.condition,
      healthIssues: client.healthIssues,
      crisisHistories: client.crisisHistories,
      treatmentProgress: client.treatmentProgress,
      sessionHistory: client.sessionHistory,
      totalSessions,
      therapist: client.therapist,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  /**
   * Update account status
   */
  async updateAccountStatus(
    userId: string,
    userType: string,
    therapistId: string,
    dto: UpdateAccountStatusDto,
  ) {
    // Verify therapist exists first
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: therapistId },
      select: {
        id: true,
        fullName: true,
        email: true,
        clinicId: true,
      },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    // Check permissions
    if (userType === 'THERAPIST' && userId !== therapistId) {
      throw new ForbiddenException('You can only update your own status');
    }

    if (userType === 'CLINIC') {
      if (!therapist.clinicId || therapist.clinicId !== userId) {
        throw new ForbiddenException(
          'You can only update therapists from your clinic',
        );
      }
    }

    // Note: Since we don't have accountStatus field in Prisma schema,
    // we'll return the status. In a real app, you'd add this field to the schema.
    return {
      id: therapist.id,
      fullName: therapist.fullName,
      email: therapist.email,
      accountStatus: dto.status,
      message: `Account status updated to ${dto.status}`,
    };
  }

  /**
   * Search therapists (public)
   */
  async searchTherapists(query: SearchTherapistDto) {
    return this.getTherapistCards(query);
  }

  /**
   * Get total therapist count
   */
  async getTotalCount() {
    const total = await this.prisma.therapist.count();
    return { totalTherapists: total };
  }

  /**
   * Get therapist overview statistics
   */
  async getTherapistOverview(therapistId: string) {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: therapistId },
      select: {
        id: true,
        _count: {
          select: {
            clients: true,
            appointments: true,
          },
        },
      },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    // Calculate total sessions from all clients' session history
    const clients = await this.prisma.client.findMany({
      where: { therapistId },
      select: {
        sessionHistory: true,
      },
    });

    let totalSessionsFromHistory = 0;
    clients.forEach((client) => {
      if (client.sessionHistory && Array.isArray(client.sessionHistory)) {
        totalSessionsFromHistory += (client.sessionHistory as any[]).length;
      }
    });

    const totalSessions = totalSessionsFromHistory + therapist._count.appointments;

    return {
      totalPatients: therapist._count.clients,
      totalSessions,
      totalAppointments: therapist._count.appointments,
      accountStatus: 'active',
    };
  }
}