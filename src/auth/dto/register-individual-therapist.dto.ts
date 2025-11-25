import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterIndividualTherapistDto {
    @ApiProperty({
        description: 'Full name of the private therapist',
        example: 'Dr. John Smith',
    })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({
        description: 'Professional license number',
        example: 'PR-67890',
        required: false
    })
    @IsString()
    @IsOptional()
    licenseNumber?: string;

    @ApiProperty({
        description: 'Professional qualifications',
        example: 'MD in Psychiatry',
        required: false
    })
    @IsString()
    @IsOptional()
    qualification?: string;

    @ApiProperty({
        description: 'Email address for private therapist account',
        example: 'privatetherapist@gmail.com'
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Contact phone number',
        example: '+19876543210'
    })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiProperty({
        description: 'Area of specialization',
        example: 'Psychoanalysis',
        required: false
    })
    @IsString()
    @IsOptional()
    speciality?: string;

    @ApiProperty({
        description: 'Default session duration in minutes',
        example: 60,
        required: false,
    })
    @IsOptional()
    defaultSessionDuration?: number;

    @ApiProperty({
        description: 'Therapist timezone',
        example: 'America/New_York',
        required: false,
    })
    @IsString()
    @IsOptional()
    timeZone?: string;

    @ApiProperty({
        description: 'Password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
        example: '123456',
        minLength: 6,
    })
    @IsString()
    @MinLength(6)
    password: string;
}