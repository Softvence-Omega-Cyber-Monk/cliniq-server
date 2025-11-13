import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
export class UpdateNotificationSettingsDto {
  @ApiProperty({
    description: 'Enable payment reminder notifications',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPaymentReminderOn?: boolean;

  @ApiProperty({
    description: 'Enable payment confirmation notifications',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPaymentConfirmOn?: boolean;

  @ApiProperty({
    description: 'Enable plan changed notifications',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPlanChangedOn?: boolean;
}