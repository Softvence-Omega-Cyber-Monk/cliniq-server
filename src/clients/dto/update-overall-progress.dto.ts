import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateOverallProgressDto {
  @ApiProperty({
    description: 'Overall progress description',
    example: 'Client showing significant improvement in managing anxiety. Sleep patterns have improved.',
  })
  @IsString()
  @IsNotEmpty()
  overallProgress: string;
}