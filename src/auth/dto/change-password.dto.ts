import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty, Matches } from 'class-validator';
export class ChangePasswordDto {
    @ApiProperty({
        description: 'Current password',
        example: 'OldPass123!',
    })
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @ApiProperty({
        description: 'New password (minimum 8 characters)',
        example: '12345678',
        minLength: 6,
    })
    @IsString()
    @MinLength(6)
    //   @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    // message: 'Password must contain uppercase, lowercase, number and special character',
    //   })
    newPassword: string;
}