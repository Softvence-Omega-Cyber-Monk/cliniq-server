import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateOverallProgressDto } from './dto/update-overall-progress.dto';
import { UpdateTreatmentGoalsDto } from './dto/update-treatment-goals.dto';
import { AddSessionHistoryDto } from './dto/add-session-history.dto';
import { AddCrisisHistoryDto } from './dto/add-crisis-history.dto';
import { AddTreatmentProgressDto } from './dto/add-treatment-progress.dto';
import { SearchClientDto } from './dto/search-client.dto';
import { v4 as uuidv4 } from 'uuid';
import { UpdateSessionHistoryDto } from './dto/update-session-history.dto';
import { UpdateCrisisHistoryDto } from './dto/update-crisis-history.dto';
import { UpdateTreatmentProgressDto } from './dto/update-treatment-progress.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new client
   */
  async createClient(therapistId: string, dto: CreateClientDto) {
    // Verify therapist exists
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: therapistId },
      select: { id: true },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    // Check if client with email already exists for this therapist
    const existingClient = await this.prisma.client.findFirst({
      where: {
        email: dto.email,
        therapistId: therapistId,
      },
    });

    if (existingClient) {
      throw new BadRequestException('Client with this email already exists for this therapist');
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
        therapistId: therapistId,
        sessionHistory: [],
        crisisHistories: [],
        treatmentProgress: {},
      },
      include: {
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
   * Get client cards with search and filters
   */
  async getClientCards(therapistId: string, query: SearchClientDto) {
    const { search, condition, status, page = 1, limit = 10 } = query;
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

    if (condition) {
      where.condition = { contains: condition, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
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
          updatedAt: true,
          _count: {
            select: {
              appointments: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    // Format client cards
    const clientCards = clients.map((client) => {
      let sessionCount = 0;
      let lastSession: Date | null = null;

      if (client.sessionHistory && Array.isArray(client.sessionHistory)) {
        const sessions = client.sessionHistory as any[];
        sessionCount = sessions.length;
        
        if (sessions.length > 0) {
          const sortedSessions = sessions.sort((a, b) => 
            new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
          );
          lastSession = new Date(sortedSessions[0].sessionDate);
        }
      }

      sessionCount += client._count.appointments;

      return {
        id: client.id,
        name: client.name,
        condition: client.condition,
        status: client.status || 'active',
        sessionCount,
        lastSession,
      };
    });

    return {
      data: clientCards,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update overall progress
   */
  async updateOverallProgress(therapistId: string, clientId: string, dto: UpdateOverallProgressDto) {
    const client = await this.verifyClientAccess(therapistId, clientId);

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
  async updateTreatmentGoals(therapistId: string, clientId: string, dto: UpdateTreatmentGoalsDto) {
    const client = await this.verifyClientAccess(therapistId, clientId);

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
  async addSessionHistory(therapistId: string, clientId: string, dto: AddSessionHistoryDto) {
    const client = await this.verifyClientAccess(therapistId, clientId);

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
  async updateSessionHistory(therapistId: string, clientId: string, dto: UpdateSessionHistoryDto) {
    const client = await this.verifyClientAccess(therapistId, clientId);

    const sessionHistory = (client.sessionHistory as any[]) || [];
    const sessionIndex = sessionHistory.findIndex(s => s.sessionId === dto.sessionId);

    if (sessionIndex === -1) {
      throw new NotFoundException('Session not found');
    }

    // Update only provided fields
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
  async addCrisisHistory(therapistId: string, clientId: string, dto: AddCrisisHistoryDto) {
    const client = await this.verifyClientAccess(therapistId, clientId);

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
  async updateCrisisHistory(therapistId: string, clientId: string, dto: UpdateCrisisHistoryDto) {
    const client = await this.verifyClientAccess(therapistId, clientId);

    const crisisHistories = (client.crisisHistories as any[]) || [];
    const crisisIndex = crisisHistories.findIndex(c => c.crisisId === dto.crisisId);

    if (crisisIndex === -1) {
      throw new NotFoundException('Crisis record not found');
    }

    // Update only provided fields
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
  async addTreatmentProgress(therapistId: string, clientId: string, dto: AddTreatmentProgressDto) {
    const client = await this.verifyClientAccess(therapistId, clientId);

    const treatmentProgress = (client.treatmentProgress as any) || { entries: [] };
    
    if (!treatmentProgress.entries) {
      treatmentProgress.entries = [];
    }

    const newProgress = {
      progressId: uuidv4(),
      progressDate: dto.progressDate,
      goalName: dto.goalName,
      score: dto.score,
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
  async updateTreatmentProgress(therapistId: string, clientId: string, dto: UpdateTreatmentProgressDto) {
    const client = await this.verifyClientAccess(therapistId, clientId);

    const treatmentProgress = (client.treatmentProgress as any) || { entries: [] };
    
    if (!treatmentProgress.entries) {
      throw new NotFoundException('No treatment progress entries found');
    }

    const progressIndex = treatmentProgress.entries.findIndex(p => p.progressId === dto.progressId);

    if (progressIndex === -1) {
      throw new NotFoundException('Progress record not found');
    }

    // Update only provided fields
    if (dto.progressDate !== undefined) treatmentProgress.entries[progressIndex].progressDate = dto.progressDate;
    if (dto.goalName !== undefined) treatmentProgress.entries[progressIndex].goalName = dto.goalName;
    if (dto.score !== undefined) treatmentProgress.entries[progressIndex].score = dto.score;
    if (dto.notes !== undefined) treatmentProgress.entries[progressIndex].notes = dto.notes;
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
   * Helper: Verify client belongs to therapist
   */
  private async verifyClientAccess(therapistId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        therapistId: therapistId,
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found or access denied');
    }

    return client;
  }
}