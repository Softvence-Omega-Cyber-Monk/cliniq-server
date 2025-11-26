import { ApiProperty } from '@nestjs/swagger';

export class RecentSessionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  therapistId: string;

  @ApiProperty({ example: 'Dr. Sarah Johnson' })
  therapistName: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  clientId: string;

  @ApiProperty({ example: 'John Doe' })
  clientName: string;

  @ApiProperty({ example: '#1248' })
  patientId: string;

  @ApiProperty({ example: 'confirmed' })
  status: string;

  @ApiProperty()
  scheduledDate: Date;
}