// src/support/support.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { AdminReplyDto } from './dto/admin-reply.dto';
import { UpdateSupportStatusDto } from './dto/update-support-status.dto';
import { SearchSupportDto } from './dto/search-support.dto';

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  /**
   * Create support ticket
   */
  async createTicket(
    userId: string,
    userType: string,
    userEmail: string,
    dto: CreateSupportTicketDto,
  ) {
    // Validate user type
    if (userType !== 'THERAPIST' && userType !== 'CLINIC') {
      throw new BadRequestException('Only Therapists and Clinics can create support tickets');
    }

    // Build ticket data based on user type
    const ticketData: any = {
      ownerType: userType,
      ownerId: userId,
      subject: dto.subject,
      message: dto.message,
      status: 'open',
    };

    // Set appropriate relation
    if (userType === 'THERAPIST') {
      ticketData.therapist = {
        connect: { id: userId },
      };
    } else if (userType === 'CLINIC') {
      ticketData.clinic = {
        connect: { id: userId },
      };
    }

    const ticket = await this.prisma.support.create({
      data: ticketData,
      include: {
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        clinic: {
          select: {
            id: true,
            privatePracticeName: true,
            email: true,
          },
        },
      },
    });

    // Send confirmation email to user
    try {
      await this.mailService.sendSupportTicketCreated(
        userEmail,
        ticket.subject,
        ticket.id,
      );
    } catch (error) {
      console.error('Failed to send ticket creation email:', error);
    }

    return {
      ...ticket,
      message: 'Support ticket created successfully. You will receive updates via email.',
    };
  }

  /**
   * Get all tickets (with access control)
   */
  async getTickets(
    userId: string,
    userType: string,
    query: SearchSupportDto,
  ) {
    const { search, status, ownerType, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Access control: Non-admins can only see their own tickets
    if (userType !== 'ADMIN') {
      where.ownerId = userId;
      where.ownerType = userType;
    }

    // Apply filters
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (ownerType && userType === 'ADMIN') {
      where.ownerType = ownerType;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.support.findMany({
        where,
        include: {
          therapist: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          clinic: {
            select: {
              id: true,
              privatePracticeName: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.support.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user's own tickets
   */
  async getMyTickets(
    userId: string,
    userType: string,
    query: SearchSupportDto,
  ) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      ownerId: userId,
      ownerType: userType,
    };

    if (status) {
      where.status = status;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.support.findMany({
        where,
        include: {
          therapist: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          clinic: {
            select: {
              id: true,
              privatePracticeName: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.support.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(userId: string, userType: string, id: string) {
    const ticket = await this.prisma.support.findUnique({
      where: { id },
      include: {
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        clinic: {
          select: {
            id: true,
            privatePracticeName: true,
            email: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Access control: Users can only view their own tickets
    if (userType !== 'ADMIN' && ticket.ownerId !== userId) {
      throw new ForbiddenException('You can only view your own support tickets');
    }

    return ticket;
  }

  /**
   * Admin reply to ticket
   */
  async replyToTicket(adminEmail: string, ticketId: string, dto: AdminReplyDto) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
      include: {
        therapist: {
          select: {
            email: true,
            fullName: true,
          },
        },
        clinic: {
          select: {
            email: true,
            privatePracticeName: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Update ticket with admin reply
    const updated = await this.prisma.support.update({
      where: { id: ticketId },
      data: {
        adminReply: dto.reply,
        adminRepliedAt: new Date(),
        adminEmail: adminEmail,
        status: 'in-progress',
      },
      include: {
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        clinic: {
          select: {
            id: true,
            privatePracticeName: true,
            email: true,
          },
        },
      },
    });

    // Get user email
    const userEmail = ticket.ownerType === 'THERAPIST' 
      ? ticket.therapist?.email 
      : ticket.clinic?.email;

    const userName = ticket.ownerType === 'THERAPIST'
      ? ticket.therapist?.fullName
      : ticket.clinic?.privatePracticeName;

    // Send email notification to user
    if (userEmail) {
      try {
        await this.mailService.sendAdminReply(
          userEmail,
          userName || 'User',
          ticket.subject,
          dto.reply,
          ticketId,
        );
      } catch (error) {
        console.error('Failed to send admin reply email:', error);
      }
    }

    return {
      ...updated,
      message: 'Reply sent successfully. User has been notified via email.',
    };
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: string, dto: UpdateSupportStatusDto) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const updateData: any = {
      status: dto.status,
    };

    if (dto.status === 'resolved' || dto.status === 'closed') {
      updateData.resolvedAt = new Date();
      if (dto.resolutionNote) {
        updateData.resolutionNote = dto.resolutionNote;
      }
    }

    const updated = await this.prisma.support.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        clinic: {
          select: {
            id: true,
            privatePracticeName: true,
            email: true,
          },
        },
      },
    });

    return {
      ...updated,
      message: `Ticket status updated to ${dto.status}`,
    };
  }

  /**
   * Resolve ticket with final response
   */
  async resolveTicket(ticketId: string, dto: AdminReplyDto) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
      include: {
        therapist: {
          select: {
            email: true,
            fullName: true,
          },
        },
        clinic: {
          select: {
            email: true,
            privatePracticeName: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Update ticket as resolved
    const updated = await this.prisma.support.update({
      where: { id: ticketId },
      data: {
        status: 'resolved',
        resolutionNote: dto.reply,
        resolvedAt: new Date(),
      },
      include: {
        therapist: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        clinic: {
          select: {
            id: true,
            privatePracticeName: true,
            email: true,
          },
        },
      },
    });

    // Get user email
    const userEmail = ticket.ownerType === 'THERAPIST' 
      ? ticket.therapist?.email 
      : ticket.clinic?.email;

    const userName = ticket.ownerType === 'THERAPIST'
      ? ticket.therapist?.fullName
      : ticket.clinic?.privatePracticeName;

    // Send resolution email to user
    if (userEmail) {
      try {
        await this.mailService.sendTicketResolved(
          userEmail,
          userName || 'User',
          ticket.subject,
          dto.reply,
          ticketId,
        );
      } catch (error) {
        console.error('Failed to send ticket resolution email:', error);
      }
    }

    return {
      ...updated,
      message: 'Ticket resolved successfully. User has been notified via email.',
    };
  }

  /**
   * Get ticket statistics (Admin only)
   */
  async getTicketStats() {
    const [
      total,
      open,
      inProgress,
      resolved,
      closed,
      byTherapist,
      byClinic,
    ] = await Promise.all([
      this.prisma.support.count(),
      this.prisma.support.count({ where: { status: 'open' } }),
      this.prisma.support.count({ where: { status: 'in-progress' } }),
      this.prisma.support.count({ where: { status: 'resolved' } }),
      this.prisma.support.count({ where: { status: 'closed' } }),
      this.prisma.support.count({ where: { ownerType: 'THERAPIST' } }),
      this.prisma.support.count({ where: { ownerType: 'CLINIC' } }),
    ]);

    return {
      total,
      byStatus: {
        open,
        inProgress,
        resolved,
        closed,
      },
      byOwnerType: {
        therapist: byTherapist,
        clinic: byClinic,
      },
    };
  }
}