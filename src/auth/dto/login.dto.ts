import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty} from 'class-validator';
export class LoginDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
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
    enum: ['CLINIC', 'THERAPIST'],
  })
  @IsString()
  @IsNotEmpty()
  userType: 'CLINIC' | 'THERAPIST';
}
