import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, Min } from "class-validator";

export class UpdateSecuritySettingsDto {
  @ApiProperty({
    description: 'Enable/disable two-factor authentication requirement',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  twoFactorAuth?: boolean;

  @ApiProperty({
    description: 'Session timeout in minutes',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  sessionTimeout?: number;

  @ApiProperty({
    description: 'Maximum login attempts before lockout',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(3)
  maxLoginAttempts?: number;

  @ApiProperty({
    description: 'Lockout duration in minutes',
    example: 15,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  lockoutDuration?: number;
}