// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterClinicDto } from './dto/register-clinic.dto';
import { RegisterTherapistDto } from './dto/register-therapist.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterIndividualTherapistDto } from './dto/register-individual-therapist.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/clinic')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new private clinic',
    description: 'Create a new clinic account. Clinic can later add therapists and clients.',
  })
  @ApiResponse({
    status: 201,
    description: 'Clinic registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiBody({ type: RegisterClinicDto })
  async registerClinic(@Body() dto: RegisterClinicDto) {
    return this.authService.registerClinic(dto);
  }

  @Post('register/therapist')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new therapist',
    description: 'Create a new individual therapist account or register a therapist under a clinic. Therapists can manage their own clients and subscriptions.',
  })
  @ApiResponse({
    status: 201,
    description: 'Therapist registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  @ApiResponse({
    status: 404,
    description: 'Clinic not found (if clinicId provided)',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiBody({ type: RegisterTherapistDto })
  async registerTherapist(@Body() dto: RegisterTherapistDto) {
    return this.authService.registerTherapist(dto);
  }

  @Post('register/individual-therapist')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new individual therapist',
    description: 'Create a new individual therapist account. Individual therapists can manage their own clients and subscriptions.',
  })
  @ApiResponse({
    status: 201,
    description: 'Individual therapist registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiBody({ type: RegisterIndividualTherapistDto })
  async registerIndividualTherapist(@Body() dto: RegisterIndividualTherapistDto) {
    return this.authService.registerIndividualTherapist(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login to account',
    description: 'Authenticate as a clinic or therapist. Returns JWT access token and refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generate a new access token using a valid refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve profile information for the authenticated user (clinic or therapist).',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      properties: {
        user: { type: 'object' },
        userType: { type: 'string', enum: ['CLINIC', 'THERAPIST'] },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.sub, req.user.userType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Change password',
    description: 'Change password for the authenticated user. Requires current password verification.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Password changed successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Current password is incorrect',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user.sub,
      req.user.userType,
      dto,
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send a password reset link to the user\'s email address. The response is intentionally vague to prevent email enumeration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset request processed',
    schema: {
      properties: {
        message: { 
          type: 'string', 
          example: 'If the email exists, a reset link has been sent' 
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset password using a valid reset token received via email.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Password reset successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Logout',
    description: 'Logout the current user. In a production environment, this would invalidate the refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      properties: {
        message: { type: 'string', example: 'Logout successful' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async logout(@Request() req) {
    // In production, you would invalidate the refresh token here
    // For example, add it to a blacklist or remove from database
    return { message: 'Logout successful' };
  }
}