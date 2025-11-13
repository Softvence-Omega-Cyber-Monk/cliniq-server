// src/support/support.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { AdminReplyDto } from './dto/admin-reply.dto';
import { UpdateSupportStatusDto } from './dto/update-support-status.dto';
import { SearchSupportDto } from './dto/search-support.dto';
import { SupportTicketDto } from './dto/support-ticket.dto';

@ApiTags('Support')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ==================== CREATE SUPPORT TICKET ====================

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create support ticket',
    description: 'Any logged-in user (Therapist or Clinic) can create a support ticket to contact admin.',
  })
  @ApiResponse({
    status: 201,
    description: 'Support ticket created successfully',
    type: SupportTicketDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createTicket(
    @Request() req,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.supportService.createTicket(
      req.user.sub,
      req.user.userType,
      req.user.email,
      dto,
    );
  }

  // ==================== GET TICKETS ====================

  @Get('tickets')
  @ApiOperation({
    summary: 'Get support tickets',
    description: 'Users see their own tickets, Admins see all tickets.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tickets retrieved successfully',
    type: SupportTicketDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'login issue' })
  @ApiQuery({ name: 'status', required: false, type: String, example: 'open' })
  @ApiQuery({ name: 'ownerType', required: false, type: String, example: 'THERAPIST' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getTickets(
    @Request() req,
    @Query() query: SearchSupportDto,
  ) {
    return this.supportService.getTickets(
      req.user.sub,
      req.user.userType,
      query,
    );
  }

  @Get('my-tickets')
  @ApiOperation({
    summary: 'Get my support tickets',
    description: 'Get all support tickets created by the logged-in user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User tickets retrieved successfully',
    type: SupportTicketDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'status', required: false, type: String, example: 'open' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getMyTickets(
    @Request() req,
    @Query() query: SearchSupportDto,
  ) {
    return this.supportService.getMyTickets(
      req.user.sub,
      req.user.userType,
      query,
    );
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get support ticket statistics',
    description: 'Get support ticket statistics (Admin only).',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getTicketStats() {
    return this.supportService.getTicketStats();
  }

  // ==================== GET SINGLE TICKET ====================

  @Get('tickets/:id')
  @ApiOperation({
    summary: 'Get ticket details',
    description: 'Get detailed information about a specific support ticket.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket details retrieved successfully',
    type: SupportTicketDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiParam({
    name: 'id',
    description: 'Support Ticket ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getTicketById(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.supportService.getTicketById(
      req.user.sub,
      req.user.userType,
      id,
    );
  }

  // ==================== ADMIN REPLY ====================

  @Post('tickets/:id/reply')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Reply to support ticket (Admin only)',
    description: 'Admin can reply to a support ticket. User will receive email notification with admin response.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reply sent successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiParam({
    name: 'id',
    description: 'Support Ticket ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async replyToTicket(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AdminReplyDto,
  ) {
    return this.supportService.replyToTicket(
      req.user.email,
      id,
      dto,
    );
  }

  // ==================== UPDATE STATUS ====================

  @Put('tickets/:id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update ticket status (Admin only)',
    description: 'Admin can update the status of a support ticket (open, in-progress, resolved, closed).',
  })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiParam({
    name: 'id',
    description: 'Support Ticket ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async updateTicketStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateSupportStatusDto,
  ) {
    return this.supportService.updateTicketStatus(id, dto);
  }

  // ==================== RESOLVE TICKET ====================

  @Put('tickets/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve ticket (Admin only)',
    description: 'Admin can mark a ticket as resolved. User will receive email notification.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket resolved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiParam({
    name: 'id',
    description: 'Support Ticket ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async resolveTicket(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AdminReplyDto,
  ) {
    return this.supportService.resolveTicket(id, dto);
  }
}