// src/support/support.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { AdminReplyDto } from './dto/admin-reply.dto';
import { ResolveSupportTicketDto } from './dto/resolve-support-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Support & Billing')
@Controller('support')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ==================== USER ENDPOINTS ====================

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new support ticket',
    description: 'Create a support ticket for billing or technical issues',
  })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createTicket(@Request() req, @Body() dto: CreateSupportTicketDto) {
    return this.supportService.createTicket(req.user.sub, req.user.userType, dto);
  }

  @Get('tickets')
  @ApiOperation({
    summary: 'Get all tickets for current user',
    description: 'Retrieve all support tickets created by the authenticated user',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['open', 'in-progress', 'resolved', 'closed'] })
  @ApiResponse({ status: 200, description: 'Tickets retrieved successfully' })
  async getUserTickets(@Request() req, @Query('status') status?: string) {
    return this.supportService.getUserTickets(req.user.sub, req.user.userType, status);
  }

  @Get('tickets/:id')
  @ApiOperation({
    summary: 'Get ticket by ID',
    description: 'Retrieve a specific support ticket',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async getTicketById(@Request() req, @Param('id') ticketId: string) {
    return this.supportService.getTicketById(ticketId, req.user.sub, req.user.userType);
  }

  @Patch('tickets/:id')
  @ApiOperation({
    summary: 'Update a ticket',
    description: 'Update subject or message of an open ticket',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update closed/resolved ticket' })
  async updateTicket(
    @Request() req,
    @Param('id') ticketId: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return this.supportService.updateTicket(ticketId, req.user.sub, req.user.userType, dto);
  }

  @Delete('tickets/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a ticket',
    description: 'Delete an open ticket (only works for open tickets)',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket deleted successfully' })
  @ApiResponse({ status: 400, description: 'Can only delete open tickets' })
  async deleteTicket(@Request() req, @Param('id') ticketId: string) {
    return this.supportService.deleteTicket(ticketId, req.user.sub, req.user.userType);
  }

  // ==================== MESSAGING ENDPOINTS ====================

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send a message in ticket thread',
    description: 'Send a message in the support ticket conversation',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async sendMessage(
    @Request() req,
    @Param('id') ticketId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.supportService.sendMessage(
      ticketId,
      req.user.sub,
      req.user.userType,
      dto.message,
    );
  }

  @Get('tickets/:id/messages')
  @ApiOperation({
    summary: 'Get all messages for a ticket',
    description: 'Retrieve all messages in a support ticket thread',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getTicketMessages(@Request() req, @Param('id') ticketId: string) {
    return this.supportService.getTicketMessages(ticketId, req.user.sub, req.user.userType);
  }

  @Get('tickets/:id/unread-count')
  @ApiOperation({
    summary: 'Get unread message count for ticket',
    description: 'Get the count of unread messages in a specific ticket',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadMessageCount(@Request() req, @Param('id') ticketId: string) {
    return this.supportService.getUnreadMessageCount(ticketId, req.user.sub, req.user.userType);
  }

  @Get('unread-messages')
  @ApiOperation({
    summary: 'Get total unread messages',
    description: 'Get total unread messages across all tickets for current user',
  })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getTotalUnreadMessages(@Request() req) {
    return this.supportService.getTotalUnreadMessages(req.user.sub, req.user.userType);
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a message',
    description: 'Delete your own message from a ticket thread',
  })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Can only delete your own messages' })
  async deleteMessage(@Request() req, @Param('id') messageId: string) {
    return this.supportService.deleteMessage(messageId, req.user.sub, req.user.userType);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/tickets')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get all tickets (Admin)',
    description: 'Admin endpoint to retrieve all support tickets',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'ownerType', required: false, enum: ['CLINIC', 'THERAPIST'] })
  @ApiResponse({ status: 200, description: 'All tickets retrieved successfully' })
  async getAllTickets(
    @Query('status') status?: string,
    @Query('ownerType') ownerType?: string,
  ) {
    return this.supportService.getAllTickets(status, ownerType);
  }

  @Post('admin/tickets/:id/reply')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin reply to ticket',
    description: 'Admin sends a reply to a support ticket',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Reply sent successfully' })
  async adminReplyToTicket(
    @Request() req,
    @Param('id') ticketId: string,
    @Body() dto: AdminReplyDto,
  ) {
    return this.supportService.adminReplyToTicket(ticketId, req.user.email, dto);
  }

  @Patch('admin/tickets/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Resolve a ticket',
    description: 'Mark a ticket as resolved with resolution notes',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket resolved successfully' })
  async resolveTicket(
    @Param('id') ticketId: string,
    @Body() dto: ResolveSupportTicketDto,
  ) {
    return this.supportService.resolveTicket(ticketId, dto);
  }

  @Patch('admin/tickets/:id/close')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Close a ticket',
    description: 'Close a support ticket',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket closed successfully' })
  async closeTicket(@Param('id') ticketId: string) {
    return this.supportService.closeTicket(ticketId);
  }

  @Patch('admin/tickets/:id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update ticket status',
    description: 'Update the status of a support ticket',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateTicketStatus(
    @Param('id') ticketId: string,
    @Body('status') status: string,
  ) {
    return this.supportService.updateTicketStatus(ticketId, status);
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get ticket statistics',
    description: 'Get statistics about support tickets',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getTicketStats() {
    return this.supportService.getTicketStats();
  }
}