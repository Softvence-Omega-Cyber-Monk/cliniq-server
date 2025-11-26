import { ApiProperty } from '@nestjs/swagger';

// Admin Dashboard Stats
export class AdminDashboardStatsDto {
  @ApiProperty({ description: 'Total therapists count', example: 47 })
  totalTherapists: number;

  @ApiProperty({ description: 'Therapists growth percentage', example: 12.3 })
  therapistsGrowth: number;

  @ApiProperty({ description: 'Upcoming sessions count', example: 134 })
  upcomingSessions: number;

  @ApiProperty({ description: 'Upcoming sessions growth percentage', example: 12.3 })
  upcomingGrowth: number;

  @ApiProperty({ description: 'Crisis alerts count', example: 3 })
  crisisAlerts: number;

  @ApiProperty({ description: 'Completed sessions count', example: 892 })
  completedSessions: number;

  @ApiProperty({ description: 'Completed sessions growth percentage', example: 12.3 })
  completedGrowth: number;
}

// Clinic Dashboard Stats
export class ClinicDashboardStatsDto {
  @ApiProperty({ description: 'Total therapists count', example: 5 })
  totalTherapists: number;

  @ApiProperty({ description: 'Therapists growth percentage', example: 12.3 })
  therapistsGrowth: number;

  @ApiProperty({ description: 'Total clients count', example: 76 })
  totalClients: number;

  @ApiProperty({ description: 'Clients growth percentage', example: 12.3 })
  clientsGrowth: number;

  @ApiProperty({ description: 'Upcoming sessions count', example: 17 })
  upcomingSessions: number;

  @ApiProperty({ description: 'Upcoming sessions growth percentage', example: 12.3 })
  upcomingGrowth: number;

  @ApiProperty({ description: 'Crisis alerts count', example: 3 })
  crisisAlerts: number;
}

// Therapist Dashboard Stats
export class TherapistDashboardStatsDto {
  @ApiProperty({ description: 'Total clients count', example: 29 })
  totalClients: number;

  @ApiProperty({ description: 'Clients growth percentage', example: 12.3 })
  clientsGrowth: number;

  @ApiProperty({ description: 'Upcoming appointments count', example: 29 })
  upcomingAppointments: number;

  @ApiProperty({ description: 'Upcoming appointments growth percentage', example: 12.3 })
  upcomingGrowth: number;

  @ApiProperty({ description: 'Sessions completed count', example: 29 })
  completedSessions: number;

  @ApiProperty({ description: 'Completed sessions growth percentage', example: 12.3 })
  completedGrowth: number;

  @ApiProperty({ description: 'Treatment progress percentage', example: 29 })
  treatmentProgress: number;

  @ApiProperty({ description: 'Treatment progress growth percentage', example: 12.3 })
  treatmentGrowth: number;
}

// Generic Dashboard Stats (returns based on role)
export class DashboardStatsDto {
  @ApiProperty({
    description: 'Dashboard statistics (structure varies by role)',
    oneOf: [
      { $ref: '#/components/schemas/AdminDashboardStatsDto' },
      { $ref: '#/components/schemas/ClinicDashboardStatsDto' },
      { $ref: '#/components/schemas/TherapistDashboardStatsDto' },
    ],
  })
  stats: AdminDashboardStatsDto | ClinicDashboardStatsDto | TherapistDashboardStatsDto;
}