import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty} from 'class-validator';
export class LoginDto {
  @ApiProperty({
    description: 'Email address',
    example: 'therapist@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'User type (CLINIC or THERAPIST)',
    example: 'THERAPIST',
    enum: ['ADMIN' , 'CLINIC', 'THERAPIST', 'INDIVIDUAL_THERAPIST'],
  })
  @IsString()
  @IsNotEmpty()
  userType: 'ADMIN' | 'CLINIC' | 'THERAPIST' | 'INDIVIDUAL_THERAPIST';
}
