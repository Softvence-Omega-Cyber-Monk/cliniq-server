// src/support/support.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { AdminReplyDto } from './dto/admin-reply.dto';
import { ResolveSupportTicketDto } from './dto/resolve-support-ticket.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new support ticket
   */
  async createTicket(userId: string, userType: string, dto: CreateSupportTicketDto) {
    // Validate userType
    if (!['CLINIC', 'THERAPIST'].includes(userType)) {
      throw new BadRequestException('Only CLINIC and THERAPIST can create support tickets');
    }

    // Verify user exists
    if (userType === 'CLINIC') {
      const clinic = await this.prisma.privateClinic.findUnique({
        where: { id: userId },
      });
      if (!clinic) {
        throw new NotFoundException('Clinic not found');
      }
    } else {
      const therapist = await this.prisma.therapist.findUnique({
        where: { id: userId },
      });
      if (!therapist) {
        throw new NotFoundException('Therapist not found');
      }
    }

    // Create support ticket
    const ticket = await this.prisma.support.create({
      data: {
        subject: dto.subject,
        message: dto.message,
        ownerType: userType as any,
        ownerId: userId,
        ...(userType === 'CLINIC' && { clinicId: userId }),
        ...(userType === 'THERAPIST' && { therapistId: userId }),
        status: 'open',
      },
      include: {
        clinic: {
          select: {
            id: true,
            fullName: true,
            email: true,
            privatePracticeName: true,
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
      message: 'Support ticket created successfully',
      ticket,
    };
  }

  /**
   * Get all tickets for a user
   */
  async getUserTickets(userId: string, userType: string, status?: string) {
    const where: any = {
      ownerId: userId,
      ownerType: userType as any,
      ...(status && { status }),
    };

    const tickets = await this.prisma.support.findMany({
      where,
      include: {
        clinic: {
          select: {
            fullName: true,
            email: true,
            privatePracticeName: true,
          },
        },
        therapist: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      total: tickets.length,
      tickets,
    };
  }

  /**
   * Get a specific ticket by ID
   */
  async getTicketById(ticketId: string, userId: string, userType: string) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
      include: {
        clinic: {
          select: {
            id: true,
            fullName: true,
            email: true,
            privatePracticeName: true,
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

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Check if user owns this ticket (unless admin)
    if (userType !== 'ADMIN' && ticket.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  /**
   * Update ticket by user (only if not resolved/closed)
   */
  async updateTicket(
    ticketId: string,
    userId: string,
    userType: string,
    dto: UpdateSupportTicketDto,
  ) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Check ownership
    if (ticket.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    // Don't allow updates on closed/resolved tickets
    if (['closed', 'resolved'].includes(ticket.status)) {
      throw new BadRequestException('Cannot update a closed or resolved ticket');
    }

    const updatedTicket = await this.prisma.support.update({
      where: { id: ticketId },
      data: {
        ...(dto.subject && { subject: dto.subject }),
        ...(dto.message && { message: dto.message }),
      },
      include: {
        clinic: {
          select: {
            fullName: true,
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

    return {
      message: 'Ticket updated successfully',
      ticket: updatedTicket,
    };
  }

  /**
   * Delete ticket (only if open and user owns it)
   */
  async deleteTicket(ticketId: string, userId: string, userType: string) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Check ownership
    if (ticket.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    // Only allow deletion of open tickets
    if (ticket.status !== 'open') {
      throw new BadRequestException('Can only delete open tickets');
    }

    await this.prisma.support.delete({
      where: { id: ticketId },
    });

    return {
      message: 'Ticket deleted successfully',
    };
  }

  // ==================== ADMIN OPERATIONS ====================

  /**
   * Get all tickets (Admin only)
   */
  async getAllTickets(status?: string, ownerType?: string) {
    const where: any = {
      ...(status && { status }),
      ...(ownerType && { ownerType }),
    };

    const tickets = await this.prisma.support.findMany({
      where,
      include: {
        clinic: {
          select: {
            id: true,
            fullName: true,
            email: true,
            privatePracticeName: true,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      total: tickets.length,
      tickets,
    };
  }

  /**
   * Admin reply to ticket
   */
  async adminReplyToTicket(ticketId: string, adminEmail: string, dto: AdminReplyDto) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (ticket.status === 'closed') {
      throw new BadRequestException('Cannot reply to a closed ticket');
    }

    const updatedTicket = await this.prisma.support.update({
      where: { id: ticketId },
      data: {
        adminReply: dto.reply,
        adminEmail: adminEmail,
        adminRepliedAt: new Date(),
        status: 'in-progress',
      },
      include: {
        clinic: {
          select: {
            fullName: true,
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

    // TODO: Send email notification to user
    // await this.emailService.sendTicketReplyNotification(...)

    return {
      message: 'Reply sent successfully',
      ticket: updatedTicket,
    };
  }

  /**
   * Admin resolve ticket
   */
  async resolveTicket(ticketId: string, dto: ResolveSupportTicketDto) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (ticket.status === 'closed') {
      throw new BadRequestException('Ticket is already closed');
    }

    const updatedTicket = await this.prisma.support.update({
      where: { id: ticketId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolutionNote: dto.resolutionNote,
      },
      include: {
        clinic: {
          select: {
            fullName: true,
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

    // TODO: Send email notification
    // await this.emailService.sendTicketResolvedNotification(...)

    return {
      message: 'Ticket resolved successfully',
      ticket: updatedTicket,
    };
  }

  /**
   * Admin close ticket
   */
  async closeTicket(ticketId: string) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const updatedTicket = await this.prisma.support.update({
      where: { id: ticketId },
      data: {
        status: 'closed',
      },
      include: {
        clinic: {
          select: {
            fullName: true,
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

    return {
      message: 'Ticket closed successfully',
      ticket: updatedTicket,
    };
  }

  /**
   * Admin update ticket status
   */
  async updateTicketStatus(ticketId: string, status: string) {
    const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
    
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const updatedTicket = await this.prisma.support.update({
      where: { id: ticketId },
      data: { status },
      include: {
        clinic: {
          select: {
            fullName: true,
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

    return {
      message: 'Ticket status updated successfully',
      ticket: updatedTicket,
    };
  }

  /**
   * Get ticket statistics (Admin only)
   */
  async getTicketStats() {
    const [total, open, inProgress, resolved, closed, byClinic, byTherapist] =
      await Promise.all([
        this.prisma.support.count(),
        this.prisma.support.count({ where: { status: 'open' } }),
        this.prisma.support.count({ where: { status: 'in-progress' } }),
        this.prisma.support.count({ where: { status: 'resolved' } }),
        this.prisma.support.count({ where: { status: 'closed' } }),
        this.prisma.support.count({ where: { ownerType: 'CLINIC' } }),
        this.prisma.support.count({ where: { ownerType: 'THERAPIST' } }),
      ]);

    return {
      total,
      byStatus: {
        open,
        inProgress,
        resolved,
        closed,
      },
      byUserType: {
        clinic: byClinic,
        therapist: byTherapist,
      },
    };
  }

  // ==================== MESSAGING FEATURE ====================

  /**
   * Send a message in a ticket thread
   */
  async sendMessage(
    ticketId: string,
    userId: string,
    userType: string,
    message: string,
  ) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
      include: {
        clinic: {
          select: {
            fullName: true,
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

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Check access rights
    if (userType !== 'ADMIN' && ticket.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    if (ticket.status === 'closed') {
      throw new BadRequestException('Cannot send messages to a closed ticket');
    }

    // Get sender information
    let senderName: string;
    let senderEmail: string;

    if (userType === 'ADMIN') {
      const admin = await this.prisma.admin.findUnique({
        where: { id: userId },
        select: { fullName: true, email: true },
      });
      senderName = admin?.fullName || 'Admin';
      senderEmail = admin?.email || '';
    } else if (userType === 'CLINIC') {
      senderName = ticket.clinic?.fullName || 'Clinic User';
      senderEmail = ticket.clinic?.email || '';
    } else {
      senderName = ticket.therapist?.fullName || 'Therapist User';
      senderEmail = ticket.therapist?.email || '';
    }

    // Create message
    const newMessage = await this.prisma.supportMessage.create({
      data: {
        supportId: ticketId,
        senderType: userType === 'ADMIN' ? 'ADMIN' : 'USER',
        senderId: userId,
        senderName,
        senderEmail,
        message,
      },
    });

    // Update ticket status if admin is replying
    if (userType === 'ADMIN' && ticket.status === 'open') {
      await this.prisma.support.update({
        where: { id: ticketId },
        data: { status: 'in-progress' },
      });
    }

    // TODO: Send email notification to the other party
    // if (userType === 'ADMIN') {
    //   await this.emailService.sendNewMessageNotification(ticket.clinic?.email || ticket.therapist?.email);
    // } else {
    //   await this.emailService.sendNewMessageToAdmin(ticket);
    // }

    return {
      message: 'Message sent successfully',
      data: newMessage,
    };
  }

  /**
   * Get all messages for a ticket
   */
  async getTicketMessages(ticketId: string, userId: string, userType: string) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Check access rights
    if (userType !== 'ADMIN' && ticket.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    const messages = await this.prisma.supportMessage.findMany({
      where: { supportId: ticketId },
      orderBy: { createdAt: 'asc' },
    });

    // Mark messages as read if user is viewing them
    if (userType !== 'ADMIN') {
      await this.prisma.supportMessage.updateMany({
        where: {
          supportId: ticketId,
          senderType: 'ADMIN',
          isRead: false,
        },
        data: { isRead: true },
      });
    } else {
      await this.prisma.supportMessage.updateMany({
        where: {
          supportId: ticketId,
          senderType: 'USER',
          isRead: false,
        },
        data: { isRead: true },
      });
    }

    return {
      total: messages.length,
      messages,
    };
  }

  /**
   * Get unread message count for a ticket
   */
  async getUnreadMessageCount(ticketId: string, userId: string, userType: string) {
    const ticket = await this.prisma.support.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Check access rights
    if (userType !== 'ADMIN' && ticket.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    const senderTypeToCheck = userType === 'ADMIN' ? 'USER' : 'ADMIN';

    const unreadCount = await this.prisma.supportMessage.count({
      where: {
        supportId: ticketId,
        senderType: senderTypeToCheck,
        isRead: false,
      },
    });

    return {
      ticketId,
      unreadCount,
    };
  }

  /**
   * Get total unread messages for user across all tickets
   */
  async getTotalUnreadMessages(userId: string, userType: string) {
    let tickets;

    if (userType === 'ADMIN') {
      // Admin sees all tickets
      tickets = await this.prisma.support.findMany({
        select: { id: true },
      });
    } else {
      // User sees only their tickets
      tickets = await this.prisma.support.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
    }

    const ticketIds = tickets.map((t) => t.id);
    const senderTypeToCheck = userType === 'ADMIN' ? 'USER' : 'ADMIN';

    const unreadCount = await this.prisma.supportMessage.count({
      where: {
        supportId: { in: ticketIds },
        senderType: senderTypeToCheck,
        isRead: false,
      },
    });

    return {
      totalUnreadMessages: unreadCount,
    };
  }

  /**
   * Delete a message (only by sender or admin)
   */
  async deleteMessage(
    messageId: string,
    userId: string,
    userType: string,
  ) {
    const message = await this.prisma.supportMessage.findUnique({
      where: { id: messageId },
      include: {
        support: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only sender or admin can delete
    if (userType !== 'ADMIN' && message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.supportMessage.delete({
      where: { id: messageId },
    });

    return {
      message: 'Message deleted successfully',
    };
  }
}