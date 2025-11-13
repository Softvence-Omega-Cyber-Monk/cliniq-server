import { ApiProperty } from '@nestjs/swagger';

export class SessionDataItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  therapistId: string;

  @ApiProperty({ example: 'Brooklyn Simmons' })
  therapistName: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatar?: string;

  @ApiProperty({ example: 53 })
  sessions: number;

  @ApiProperty({ example: 50 })
  avgDuration: number;

  @ApiProperty({ example: 95 })
  completionRate: number;

  @ApiProperty({ example: 'active' })
  status: string;
}

export class SessionDataReportDto {
  @ApiProperty({
    description: 'Session data by therapist',
    type: [SessionDataItemDto],
  })
  data: SessionDataItemDto[];
}