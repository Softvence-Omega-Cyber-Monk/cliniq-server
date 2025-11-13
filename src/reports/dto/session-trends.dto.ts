import { ApiProperty } from '@nestjs/swagger';

export class WeeklyDataDto {
  @ApiProperty({ example: 'Week-1' })
  week: string;

  @ApiProperty({ example: 120 })
  completed: number;

  @ApiProperty({ example: 85 })
  scheduled: number;

  @ApiProperty({ example: 15 })
  cancelled: number;
}

export class SessionTrendsDto {
  @ApiProperty({
    description: 'Weekly session data',
    type: [WeeklyDataDto],
  })
  weeklyData: WeeklyDataDto[];

  @ApiProperty({
    description: 'Total completed sessions',
    example: 480,
  })
  totalCompleted: number;

  @ApiProperty({
    description: 'Total scheduled sessions',
    example: 340,
  })
  totalScheduled: number;

  @ApiProperty({
    description: 'Total cancelled sessions',
    example: 60,
  })
  totalCancelled: number;
}