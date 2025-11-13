import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export class UpdateAccountStatusDto {
  @ApiProperty({
    description: 'Account status',
    example: 'active',
    enum: AccountStatus,
  })
  @IsEnum(AccountStatus)
  @IsNotEmpty()
  status: AccountStatus;
}