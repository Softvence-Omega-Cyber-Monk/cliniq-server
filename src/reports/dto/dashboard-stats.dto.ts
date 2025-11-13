import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Total sessions count',
    example: 1247,
  })
  totalSessions: number;

  @ApiProperty({
    description: 'Sessions growth percentage',
    example: 12.3,
  })
  sessionsGrowth: number;

  @ApiProperty({
    description: 'Active therapists count',
    example: 24,
  })
  activeTherapists: number;

  @ApiProperty({
    description: 'Therapists growth percentage',
    example: 12.3,
  })
  therapistsGrowth: number;

  @ApiProperty({
    description: 'Active clients count',
    example: 342,
  })
  activeClients: number;

  @ApiProperty({
    description: 'Clients growth percentage',
    example: 12.3,
  })
  clientsGrowth: number;

  @ApiProperty({
    description: 'Crisis alerts count',
    example: 7,
  })
  crisisAlerts: number;
}