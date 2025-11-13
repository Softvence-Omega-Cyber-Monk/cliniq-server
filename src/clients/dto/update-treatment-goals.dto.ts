import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateTreatmentGoalsDto {
  @ApiProperty({
    description: 'Treatment goals',
    example: 'Reduce anxiety attacks to less than once per month, improve sleep to 7+ hours nightly',
  })
  @IsString()
  @IsNotEmpty()
  treatmentGoals: string;
}