import { ApiProperty } from '@nestjs/swagger';

export class UpcomingAppointmentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Sarah Johnson' })
  clientName: string;

  @ApiProperty({ example: 'Initial Assessment' })
  appointmentType: string;

  @ApiProperty()
  scheduledTime: Date;

  @ApiProperty({ example: 'confirmed', enum: ['scheduled', 'confirmed'] })
  status: string;
}