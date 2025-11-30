import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicClientDto } from './dto/create-clinic-client.dto';
import { UpdateOverallProgressDto } from 'src/clients/dto/update-overall-progress.dto';
import { UpdateTreatmentGoalsDto } from 'src/clients/dto/update-treatment-goals.dto';
import { AddSessionHistoryDto } from 'src/clients/dto/add-session-history.dto';
import { AddCrisisHistoryDto } from 'src/clients/dto/add-crisis-history.dto';
import { AddTreatmentProgressDto } from 'src/clients/dto/add-treatment-progress.dto';
import { SearchClientDto } from 'src/clients/dto/search-client.dto';
import { v4 as uuidv4 } from 'uuid';
import { UpdateSessionHistoryDto } from 'src/clients/dto/update-session-history.dto';
import { UpdateCrisisHistoryDto } from 'src/clients/dto/update-crisis-history.dto';
import { UpdateTreatmentProgressDto } from 'src/clients/dto/update-treatment-progress.dto';
import { AssignTherapistDto } from './dto/assign-therapist.dto';


@Injectable()
export class ClinicClientsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Create a new client under clinic (without therapist)
   */
  async createClient(clinicId: string, dto: CreateClinicClientDto) {
    // Verify clinic exists
    const clinic = await this.prisma.privateClinic.findUnique({
      where: { id: clinicId },
      select: { id: true },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Check if client with email already exists in this clinic
    const existingClient = await this.prisma.client.findFirst({
      where: {
        email: dto.email,
        clinicId: clinicId,
      },
    });

    if (existingClient) {
      throw new BadRequestException('Client with this email already exists in this clinic');
    }

    const client = await this.prisma.client.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone || '',
        condition: dto.condition || null,
        healthIssues: dto.healthIssues || [],
        treatmentGoals: dto.treatmentGoals || null,
        status: dto.status || 'active',
        clinicId: clinicId,
        therapistId: null,
        sessionHistory: [],
        crisisHistories: [],
        treatmentProgress: {},
      },
      include: {
        clinic: {
          select: {
            id: true,
            fullName: true,
            privatePracticeName: true,
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

    return client;
  }

  /**
   * Get all clients under clinic (including nested clients under therapists)
   * Returns summary view with: therapist/clinic name, id, condition, total sessions, last/next session
   */
  async getAllClinicClients(clinicId: string, query: SearchClientDto) {
    const { search, condition, status, therapistId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Verify clinic exists
    const clinic = await this.prisma.privateClinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        privatePracticeName: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Get all therapists under this clinic
    const clinicTherapists = await this.prisma.therapist.findMany({
      where: { clinicId },
      select: { id: true },
    });

    const therapistIds = clinicTherapists.map(t => t.id);

    // Build where clause for clients
    // Include: 1) Direct clinic clients, 2) Clients under clinic's therapists
    const where: any = {
      OR: [
        { clinicId: clinicId },
        { therapistId: { in: therapistIds } },
      ],
    };

    // Apply additional filters
    const additionalFilters: any = {};

    if (search) {
      additionalFilters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (condition) {
      additionalFilters.condition = { contains: condition, mode: 'insensitive' };
    }

    if (status) {
      additionalFilters.status = status;
    }

    if (therapistId) {
      additionalFilters.therapistId = therapistId;
    }

    // Merge filters
    if (Object.keys(additionalFilters).length > 0) {
      where.AND = additionalFilters;
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        select: {
          id: true,
          name: true,
          condition: true,
          status: true,
          sessionHistory: true,
          therapistId: true,
          clinicId: true,
          therapist: {
            select: {
              id: true,
              fullName: true,
            },
          },
          appointments: {
            select: {
              scheduledDate: true,
              scheduledTime: true,
              status: true,
            },
            orderBy: { scheduledDate: 'desc' },
          },
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    // Format client summary cards
    const clientSummaries = clients.map((client) => {
      // Calculate total sessions
      let totalSessions = 0;
      let lastSessionDate: Date | null = null;

      if (client.sessionHistory && Array.isArray(client.sessionHistory)) {
        const sessions = client.sessionHistory as any[];
        totalSessions = sessions.length;

        if (sessions.length > 0) {
          const sortedSessions = sessions.sort((a, b) =>
            new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
          );
          lastSessionDate = new Date(sortedSessions[0].sessionDate);
        }
      }

      // Add appointments to total sessions
      totalSessions += client.appointments.length;

      // Get last session from appointments if more recent
      if (client.appointments.length > 0) {
        const lastAppointment = client.appointments[0];
        const appointmentDate = new Date(lastAppointment.scheduledDate);

        if (!lastSessionDate || appointmentDate > lastSessionDate) {
          lastSessionDate = appointmentDate;
        }
      }

      // Find next scheduled appointment
      const now = new Date();
      const upcomingAppointments = client.appointments
        .filter(apt => {
          const aptDate = new Date(apt.scheduledDate);
          return aptDate > now && apt.status === 'scheduled';
        })
        .sort((a, b) =>
          new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
        );

      const nextSessionDate = upcomingAppointments.length > 0
        ? new Date(upcomingAppointments[0].scheduledDate)
        : null;

      // Determine provider name (therapist or clinic)
      let providerName: string;
      let providerId: string;

      if (client.therapist) {
        providerName = client.therapist.fullName;
        providerId = client.therapist.id;
      } else {
        providerName = clinic.privatePracticeName;
        providerId = clinicId;
      }

      return {
        id: client.id,
        name: client.name,
        condition: client.condition,
        status: client.status || 'active',
        providerName, // Therapist name or clinic name
        providerId,
        providerType: client.therapist ? 'therapist' : 'clinic',
        totalSessions,
        lastSessionDate,
        nextSessionDate,
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
   * Get complete client details
   * Returns everything that remains in the client model
   */
  async getClientFullDetails(clinicId: string, clientId: string) {
    // Verify clinic exists
    const clinic = await this.prisma.privateClinic.findUnique({
      where: { id: clinicId },
      select: { id: true },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Get all therapists under this clinic
    const clinicTherapists = await this.prisma.therapist.findMany({
      where: { clinicId },
      select: { id: true },
    });

    const therapistIds = clinicTherapists.map(t => t.id);

    // Find client - must be either direct clinic client or under clinic's therapist
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        OR: [
          { clinicId: clinicId },
          { therapistId: { in: therapistIds } },
        ],
      },
      include: {
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            speciality: true,
            licenseNumber: true,
          },
        },
        clinic: {
          select: {
            id: true,
            fullName: true,
            privatePracticeName: true,
            email: true,
            phone: true,
          },
        },
        appointments: {
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found or access denied');
    }

    return client;
  }

  /**
   * Assign therapist to client
   */
  async assignTherapist(clinicId: string, clientId: string, dto: AssignTherapistDto) {
    // Verify client access
    await this.verifyClientAccess(clinicId, clientId);

    // Verify therapist exists and belongs to clinic
    const therapist = await this.prisma.therapist.findFirst({
      where: {
        id: dto.therapistId,
        clinicId: clinicId,
      },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found or not part of this clinic');
    }

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        therapistId: dto.therapistId,
      },
      include: {
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

    return updated;
  }

  /**
   * Update overall progress
   */
  async updateOverallProgress(clinicId: string, clientId: string, dto: UpdateOverallProgressDto) {
    await this.verifyClientAccess(clinicId, clientId);

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        overallProgress: dto.overallProgress,
      },
      select: {
        id: true,
        name: true,
        overallProgress: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Update treatment goals
   */
  async updateTreatmentGoals(clinicId: string, clientId: string, dto: UpdateTreatmentGoalsDto) {
    await this.verifyClientAccess(clinicId, clientId);

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        treatmentGoals: dto.treatmentGoals,
      },
      select: {
        id: true,
        name: true,
        treatmentGoals: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Add session history
   */
  async addSessionHistory(clinicId: string, clientId: string, dto: AddSessionHistoryDto) {
    const client = await this.verifyClientAccess(clinicId, clientId);

    const sessionHistory = (client.sessionHistory as any[]) || [];

    const newSession = {
      sessionId: uuidv4(),
      sessionDate: dto.sessionDate,
      notes: dto.notes,
      duration: dto.duration || 60,
      sessionType: dto.sessionType || 'Individual Therapy',
      createdAt: new Date().toISOString(),
    };

    sessionHistory.push(newSession);

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        sessionHistory: sessionHistory,
      },
      select: {
        id: true,
        name: true,
        sessionHistory: true,
      },
    });

    return {
      client: updated,
      addedSession: newSession,
    };
  }

  /**
   * Update session history
   */
  async updateSessionHistory(clinicId: string, clientId: string, dto: UpdateSessionHistoryDto) {
    const client = await this.verifyClientAccess(clinicId, clientId);

    const sessionHistory = (client.sessionHistory as any[]) || [];
    const sessionIndex = sessionHistory.findIndex(s => s.sessionId === dto.sessionId);

    if (sessionIndex === -1) {
      throw new NotFoundException('Session not found');
    }

    if (dto.sessionDate !== undefined) sessionHistory[sessionIndex].sessionDate = dto.sessionDate;
    if (dto.notes !== undefined) sessionHistory[sessionIndex].notes = dto.notes;
    if (dto.duration !== undefined) sessionHistory[sessionIndex].duration = dto.duration;
    if (dto.sessionType !== undefined) sessionHistory[sessionIndex].sessionType = dto.sessionType;
    sessionHistory[sessionIndex].updatedAt = new Date().toISOString();

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        sessionHistory: sessionHistory,
      },
      select: {
        id: true,
        name: true,
        sessionHistory: true,
      },
    });

    return {
      client: updated,
      updatedSession: sessionHistory[sessionIndex],
    };
  }

  /**
   * Add crisis history
   */
  async addCrisisHistory(clinicId: string, clientId: string, dto: AddCrisisHistoryDto) {
    const client = await this.verifyClientAccess(clinicId, clientId);

    const crisisHistories = (client.crisisHistories as any[]) || [];

    const newCrisis = {
      crisisId: uuidv4(),
      crisisDate: dto.crisisDate,
      description: dto.description,
      severity: dto.severity,
      intervention: dto.intervention,
      outcome: dto.outcome,
      createdAt: new Date().toISOString(),
    };

    crisisHistories.push(newCrisis);

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        crisisHistories: crisisHistories,
      },
      select: {
        id: true,
        name: true,
        crisisHistories: true,
      },
    });

    return {
      client: updated,
      addedCrisis: newCrisis,
    };
  }

  /**
   * Update crisis history
   */
  async updateCrisisHistory(clinicId: string, clientId: string, dto: UpdateCrisisHistoryDto) {
    const client = await this.verifyClientAccess(clinicId, clientId);

    const crisisHistories = (client.crisisHistories as any[]) || [];
    const crisisIndex = crisisHistories.findIndex(c => c.crisisId === dto.crisisId);

    if (crisisIndex === -1) {
      throw new NotFoundException('Crisis record not found');
    }

    if (dto.crisisDate !== undefined) crisisHistories[crisisIndex].crisisDate = dto.crisisDate;
    if (dto.description !== undefined) crisisHistories[crisisIndex].description = dto.description;
    if (dto.severity !== undefined) crisisHistories[crisisIndex].severity = dto.severity;
    if (dto.intervention !== undefined) crisisHistories[crisisIndex].intervention = dto.intervention;
    if (dto.outcome !== undefined) crisisHistories[crisisIndex].outcome = dto.outcome;
    crisisHistories[crisisIndex].updatedAt = new Date().toISOString();

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        crisisHistories: crisisHistories,
      },
      select: {
        id: true,
        name: true,
        crisisHistories: true,
      },
    });

    return {
      client: updated,
      updatedCrisis: crisisHistories[crisisIndex],
    };
  }

  /**
   * Add treatment progress
   */
  async addTreatmentProgress(clinicId: string, clientId: string, dto: AddTreatmentProgressDto) {
    const client = await this.verifyClientAccess(clinicId, clientId);

    const treatmentProgress = (client.treatmentProgress as any) || { entries: [] };

    if (!treatmentProgress.entries) {
      treatmentProgress.entries = [];
    }

    const newProgress = {
      progressId: uuidv4(),
      progressDate: dto.progressDate,
      goals: dto.goals, // Changed from goalName/score to goals array
      notes: dto.notes,
      createdAt: new Date().toISOString(),
    };

    treatmentProgress.entries.push(newProgress);

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        treatmentProgress: treatmentProgress,
      },
      select: {
        id: true,
        name: true,
        treatmentProgress: true,
      },
    });

    return {
      client: updated,
      addedProgress: newProgress,
    };
  }

  /**
   * Update treatment progress
   */
  async updateTreatmentProgress(clinicId: string, clientId: string, dto: UpdateTreatmentProgressDto) {
    const client = await this.verifyClientAccess(clinicId, clientId);

    const treatmentProgress = (client.treatmentProgress as any) || { entries: [] };

    if (!treatmentProgress.entries) {
      throw new NotFoundException('No treatment progress entries found');
    }

    const progressIndex = treatmentProgress.entries.findIndex(p => p.progressId === dto.progressId);

    if (progressIndex === -1) {
      throw new NotFoundException('Progress record not found');
    }

    // Update only provided fields
    if (dto.progressDate !== undefined) {
      treatmentProgress.entries[progressIndex].progressDate = dto.progressDate;
    }
    if (dto.goals !== undefined) {
      treatmentProgress.entries[progressIndex].goals = dto.goals;
    }
    if (dto.notes !== undefined) {
      treatmentProgress.entries[progressIndex].notes = dto.notes;
    }
    treatmentProgress.entries[progressIndex].updatedAt = new Date().toISOString();

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        treatmentProgress: treatmentProgress,
      },
      select: {
        id: true,
        name: true,
        treatmentProgress: true,
      },
    });

    return {
      client: updated,
      updatedProgress: treatmentProgress.entries[progressIndex],
    };
  }

  /**
   * Helper: Verify client belongs to clinic or clinic's therapists
   */
  private async verifyClientAccess(clinicId: string, clientId: string) {
    // Get all therapists under this clinic
    const clinicTherapists = await this.prisma.therapist.findMany({
      where: { clinicId },
      select: { id: true },
    });

    const therapistIds = clinicTherapists.map(t => t.id);

    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        OR: [
          { clinicId: clinicId },
          { therapistId: { in: therapistIds } },
        ],
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found or access denied');
    }

    return client;
  }
}