import { ApiProperty } from '@nestjs/swagger';
export class ClinicResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Dr. John Smith' })
  fullName: string;

  @ApiProperty({ example: 'Smith Mental Health Clinic' })
  privatePracticeName: string;

  @ApiProperty({ example: '+1234567890' })
  phone: string;

  @ApiProperty({ example: 'admin@smithclinic.com' })
  email: string;

  @ApiProperty({ example: false })
  isPaymentReminderOn: boolean;

  @ApiProperty({ example: false })
  isPaymentConfirmOn: boolean;

  @ApiProperty({ example: false })
  isPlanChangedOn: boolean;

  @ApiProperty({ required: false })
  subscriptionPlan?: object;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
