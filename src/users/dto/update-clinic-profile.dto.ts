import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateClinicProfileDto {
  @ApiProperty({
    description: 'Full name of the clinic administrator',
    example: 'Dr. John Smith',
    required: false,
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    description: 'Private practice/clinic name',
    example: 'Smith Mental Health Clinic',
    required: false,
  })
  @IsString()
  @IsOptional()
  privatePracticeName?: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Email address',
    example: 'admin@smithclinic.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;
}