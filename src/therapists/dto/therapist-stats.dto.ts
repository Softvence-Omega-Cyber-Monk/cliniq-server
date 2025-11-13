import { ApiProperty } from "@nestjs/swagger";

export class TherapistStatsDto {
  @ApiProperty({
    description: 'Total number of therapists',
    example: 25,
  })
  totalTherapists: number;

  @ApiProperty({
    description: 'Active therapists',
    example: 20,
  })
  activeTherapists: number;

  @ApiProperty({
    description: 'Therapists with clinic',
    example: 15,
  })
  clinicTherapists: number;

  @ApiProperty({
    description: 'Independent therapists',
    example: 10,
  })
  independentTherapists: number;
}