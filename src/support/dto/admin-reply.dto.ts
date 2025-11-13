import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class AdminReplyDto {
  @ApiProperty({
    description: 'Admin reply/response to the support ticket',
    example: 'Thank you for reporting this issue. We have identified the problem and deployed a fix. Please try scheduling appointments again and let us know if the issue persists.',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reply: string;
}