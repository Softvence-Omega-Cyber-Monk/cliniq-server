import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum AssigneeType {
  THERAPIST = 'therapist',
  CLINIC = 'clinic',
}

export class AssignTherapistDto {
  @ApiProperty({
    description: 'Type of assignee - therapist or clinic',
    enum: AssigneeType,
    example: AssigneeType.THERAPIST,
  })
  @IsEnum(AssigneeType)
  assigneeType: AssigneeType;

  @ApiProperty({
    description: 'Therapist ID to assign (required if assigneeType is therapist)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  therapistId?: string;
}