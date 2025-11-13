import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum SupportStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export class UpdateSupportStatusDto {
  @ApiProperty({
    description: 'Support ticket status',
    enum: SupportStatus,
    example: 'resolved',
  })
  @IsEnum(SupportStatus)
  @IsNotEmpty()
  status: SupportStatus;

  @ApiProperty({
    description: 'Optional resolution note (recommended when resolving or closing)',
    example: 'Issue was resolved by clearing browser cache.',
    required: false,
  })
  @IsString()
  @IsOptional()
  resolutionNote?: string;
}