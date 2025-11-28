import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, Min } from "class-validator";

export class UpdatePasswordPolicyDto {
  @ApiProperty({
    description: 'Minimum password length',
    example: 8,
    required: false,
    minimum: 8,
  })
  @IsOptional()
  @IsNumber()
  @Min(8)
  minLength?: number;

  @ApiProperty({
    description: 'Password expiration in days',
    example: 90,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  expirationDays?: number;
}