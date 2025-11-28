import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'currentPassword123',
  })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'newPassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'newPassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}