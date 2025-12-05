import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SuspendClientDto {
  @ApiProperty({
    description: 'Reason for suspending the client',
    example: 'Client requested temporary pause in treatment',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}