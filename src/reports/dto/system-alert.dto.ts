import { ApiProperty } from '@nestjs/swagger';

export class SessionAlertDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Emma Davis' })
  clientName: string;

  @ApiProperty({ example: 'high', enum: ['low', 'medium', 'high', 'critical'] })
  severity: string;

  @ApiProperty({ example: 'Crisis alert flagged in last session' })
  message: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ example: '2 hours ago' })
  timeAgo: string;
}