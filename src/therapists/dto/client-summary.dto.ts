import { ApiProperty } from "@nestjs/swagger";

export class ClientSummaryDto {
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
    description: 'Client email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Number of sessions',
    example: 8,
  })
  sessionCount: number;

  @ApiProperty({
    description: 'Overall progress',
    example: 'Showing steady improvement',
  })
  overallProgress: string | null;

  @ApiProperty({
    description: 'Client status',
    example: 'active',
  })
  status: string;
}