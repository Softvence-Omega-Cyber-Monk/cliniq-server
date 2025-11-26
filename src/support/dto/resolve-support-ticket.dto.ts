import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResolveSupportTicketDto {
  @ApiProperty({
    description: 'Resolution notes',
    example: 'Issue resolved: Refund processed for duplicate charge. User notified via email.',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  resolutionNote: string;
}