import { ApiProperty } from '@nestjs/swagger';

export class ClientCardDto {
  @ApiProperty({
    description: 'Client ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Client name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Primary condition',
    example: 'Anxiety Disorder',
  })
  condition: string | null;

  @ApiProperty({
    description: 'Client status',
    example: 'active',
  })
  status: string;

  @ApiProperty({
    description: 'Number of sessions',
    example: 8,
  })
  sessionCount: number;

  @ApiProperty({
    description: 'Last session date',
    example: '2024-01-15T10:00:00Z',
  })
  lastSession: Date | null;
}