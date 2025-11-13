import { ApiProperty } from '@nestjs/swagger';
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User type',
    example: 'THERAPIST',
    enum: ['CLINIC', 'THERAPIST'],
  })
  userType: string;

  @ApiProperty({
    description: 'User information',
  })
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}