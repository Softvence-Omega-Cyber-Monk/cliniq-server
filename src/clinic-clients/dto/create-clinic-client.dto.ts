import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class CreateClinicClientDto {
  @ApiProperty({
    description: 'Client name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Client email',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Client phone',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Primary condition',
    example: 'Anxiety Disorder',
    required: false,
  })
  @IsString()
  @IsOptional()
  condition?: string;

  @ApiProperty({
    description: 'Health issues',
    example: ['Depression', 'Anxiety', 'Insomnia'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  healthIssues?: string[];

  @ApiProperty({
    description: 'Treatment goals',
    example: 'Reduce anxiety, improve sleep quality',
    required: false,
  })
  @IsString()
  @IsOptional()
  treatmentGoals?: string;

  @ApiProperty({
    description: 'Client status',
    example: 'active',
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: string;
}