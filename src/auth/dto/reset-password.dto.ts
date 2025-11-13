import { ApiProperty } from '@nestjs/swagger';
import {IsString, MinLength, IsNotEmpty, Matches} from 'class-validator';
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'NewPass123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
//   @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    // message: 'Password must contain uppercase, lowercase, number and special character',
//   })
  newPassword: string;
}