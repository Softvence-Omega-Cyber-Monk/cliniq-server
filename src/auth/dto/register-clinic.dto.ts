import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty, Matches } from 'class-validator';

export class RegisterClinicDto {
  @ApiProperty({
    description: 'Full name of the clinic administrator',
    example: 'Dr. John Smith',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    description: 'Private practice/clinic name',
    example: 'Smith Mental Health Clinic',
  })
  @IsString()
  @IsNotEmpty()
  privatePracticeName: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Email address for clinic account',
    example: 'clinic@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: '123456',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
//   @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
//     message: 'Password must contain uppercase, lowercase, number and special character',
//   })
  password: string;
}