import { ApiProperty } from '@nestjs/swagger';

export class CrisisAlertDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'High Risk Assessment' })
  title: string;

  @ApiProperty({ example: '#2847' })
  clientId: string;

  @ApiProperty({ example: 'John Doe' })
  clientName: string;

  @ApiProperty({ example: 'high' })
  severity: string;

  @ApiProperty({ example: '2h ago' })
  timeAgo: string;

  @ApiProperty()
  createdAt: Date;
}