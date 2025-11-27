import {
  Controller,
  Get,
  Query,
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
} from '@nestjs/swagger';
import { AdminSessionsService } from './admin-sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetAllSessionsDto } from './dto/get-all-sessions.dto';

@ApiTags('Admin Sessions')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('admin/sessions')
export class AdminSessionsController {
  constructor(private readonly adminSessionsService: AdminSessionsService) {}

  @Get('completion-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get session completion data for graph',
    description: 'Retrieve weekly and monthly session completion statistics for the admin dashboard graph.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session completion data retrieved successfully',
    schema: {
      example: {
        weekly: [
          { week: 'Week-1', completed: 125, scheduled: 80, cancelled: 25 },
          { week: 'Week-2', completed: 190, scheduled: 120, cancelled: 30 },
          { week: 'Week-3', completed: 260, scheduled: 180, cancelled: 90 },
          { week: 'Week-4', completed: 230, scheduled: 130, cancelled: 40 },
        ],
        monthly: [
          { month: 'Sep 2024', completed: 450, scheduled: 320, cancelled: 110 },
          { month: 'Oct 2024', completed: 520, scheduled: 380, cancelled: 95 },
          { month: 'Nov 2024', completed: 605, scheduled: 410, cancelled: 125 },
          { month: 'Dec 2024', completed: 580, scheduled: 390, cancelled: 105 },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessionCompletionData() {
    return this.adminSessionsService.getSessionCompletionData();
  }

  @Get('recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get recent sessions',
    description: 'Retrieve the most recent sessions across all therapists and clinics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent sessions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent sessions to retrieve',
    example: 20,
  })
  async getRecentSessions(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.adminSessionsService.getRecentSessions(parsedLimit);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all sessions with filters',
    description: 'Retrieve all sessions with optional filtering and pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllSessions(@Query() query: GetAllSessionsDto) {
    const filters = {
      status: query.status,
      therapistId: query.therapistId,
      clientId: query.clientId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page ? parseInt(query.page.toString(), 10) : 1,
      limit: query.limit ? parseInt(query.limit.toString(), 10) : 10,
    };

    return this.adminSessionsService.getAllSessions(filters);
  }
}