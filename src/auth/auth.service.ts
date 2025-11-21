// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterClinicDto } from './dto/register-clinic.dto';
import { RegisterTherapistDto } from './dto/register-therapist.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import Stripe from 'stripe';

@Injectable()
export class AuthService {
  private stripe: Stripe;
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover',
    });
  }

  /**
   * Register a new private clinic
   */
  async registerClinic(dto: RegisterClinicDto) {
    // Check if email already exists
    const existingClinic = await this.prisma.privateClinic.findUnique({
      where: { email: dto.email },
    });

    if (existingClinic) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Stripe customer creation
    let stripeCustomerId: string;
    try {
      const stripeCustomer = await this.stripe.customers.create({
        email: dto.email,
        name: dto.fullName,
        phone: dto.phone,
        metadata: {
          userType: 'CLINIC',
          practiceName: dto.privatePracticeName
        }
      })
      stripeCustomerId = stripeCustomer.id;
    }
    catch (error) {
      console.log(error)
      throw new BadRequestException('Error creating Stripe customer');
    }

    // Create clinic
    const clinic = await this.prisma.privateClinic.create({
      data: {
        fullName: dto.fullName,
        privatePracticeName: dto.privatePracticeName,
        phone: dto.phone,
        email: dto.email,
        password: hashedPassword,
        stripeCustomerId
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        privatePracticeName: true,
        phone: true,
        stripeCustomerId: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(clinic.id, clinic.email, 'CLINIC');

    return {
      ...tokens,
      user: clinic,
      userType: 'CLINIC',
    };
  }

  /**
   * Register a new therapist (individual or under a clinic)
   */
  async registerTherapist(dto: RegisterTherapistDto) {
    // Check if email already exists
    const existingTherapist = await this.prisma.therapist.findUnique({
      where: { email: dto.email },
    });

    if (existingTherapist) {
      throw new ConflictException('Email already registered');
    }

    // If clinicId provided, verify clinic exists
    if (dto.clinicId) {
      const clinic = await this.prisma.privateClinic.findUnique({
        where: { id: dto.clinicId },
      });

      if (!clinic) {
        throw new NotFoundException('Clinic not found');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    let stripeCustomerId: string;
    try {
      const stripeCustomer = await this.stripe.customers.create({
        email: dto.email,
        name: dto.fullName,
        phone: dto.phone,
        metadata: {
          userType: 'THERAPIST',
          licenseNumber: dto.licenseNumber || 'N/A',
          speciality: dto.speciality || 'N/A',
          ...(dto.clinicId && { clinicId: dto.clinicId }),
        },
      });
      stripeCustomerId = stripeCustomer.id;
    } catch (error) {
      throw new BadRequestException(`Failed to create Stripe customer: ${error.message}`);
    }

    // Create therapist
    const therapist = await this.prisma.therapist.create({
      data: {
        fullName: dto.fullName,
        licenseNumber: dto.licenseNumber,
        qualification: dto.qualification,
        email: dto.email,
        phone: dto.phone,
        speciality: dto.speciality,
        defaultSessionDuration: dto.defaultSessionDuration,
        timeZone: dto.timeZone,
        clinicId: dto.clinicId,
        password: hashedPassword,
        stripeCustomerId
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        licenseNumber: true,
        qualification: true,
        phone: true,
        speciality: true,
        clinicId: true,
        createdAt: true,
        stripeCustomerId: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(therapist.id, therapist.email, 'THERAPIST');

    return {
      ...tokens,
      user: therapist,
      userType: 'THERAPIST',
    };
  }

  /**
   * Login user (clinic or therapist)
   */
  async login(dto: LoginDto) {
    let user;
    let userType = dto.userType;

    if (userType === 'CLINIC') {
      user = await this.prisma.privateClinic.findUnique({
        where: { email: dto.email },
        select: {
          id: true,
          email: true,
          fullName: true,
          privatePracticeName: true,
          password: true,
          stripeCustomerId: true,
        },
      });
    } else if (userType === 'THERAPIST') {
      user = await this.prisma.therapist.findUnique({
        where: { email: dto.email },
        select: {
          id: true,
          email: true,
          fullName: true,
          password: true,
          clinicId: true,
          stripeCustomerId: true,
        },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, userType);

    return {
      ...tokens,
      user: userWithoutPassword,
      userType,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const tokens = await this.generateTokens(
        payload.sub,
        payload.email,
        payload.userType,
      );

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, userType: string, dto: ChangePasswordDto) {
    let user;

    if (userType === 'CLINIC') {
      user = await this.prisma.privateClinic.findUnique({
        where: { id: userId },
      });
    } else {
      user = await this.prisma.therapist.findUnique({
        where: { id: userId },
      });
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    if (userType === 'CLINIC') {
      await this.prisma.privateClinic.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    } else {
      await this.prisma.therapist.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    }

    return { message: 'Password changed successfully' };
  }

  /**
   * Request password reset
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    let user;

    if (dto.userType === 'CLINIC') {
      user = await this.prisma.privateClinic.findUnique({
        where: { email: dto.email },
      });
    } else {
      user = await this.prisma.therapist.findUnique({
        where: { email: dto.email },
      });
    }

    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token (in production, save this to database with expiry)
    const resetToken = randomBytes(32).toString('hex');

    // TODO: Send email with reset token
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  /**
   * Reset password using token
   */
  async resetPassword(dto: ResetPasswordDto) {
    // TODO: Verify token from database and check expiry
    // This is a simplified version

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password (you need to implement token verification logic)
    // await this.prisma.privateClinic/therapist.update(...)

    return { message: 'Password reset successfully' };
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(userId: string, email: string, userType: string) {
    const payload = { sub: userId, email, userType };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '120m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string, userType: string) {
    if (userType === 'CLINIC') {
      const clinic = await this.prisma.privateClinic.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          privatePracticeName: true,
          email: true,
          phone: true,
          isPaymentReminderOn: true,
          isPaymentConfirmOn: true,
          isPlanChangedOn: true,
          subscriptionPlan: true,
          createdAt: true,
          updatedAt: true,
          stripeCustomerId: true,
        },
      });

      if (!clinic) {
        throw new NotFoundException('Clinic not found');
      }

      return { user: clinic, userType: 'CLINIC' };
    } else {
      const therapist = await this.prisma.therapist.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          licenseNumber: true,
          qualification: true,
          email: true,
          phone: true,
          speciality: true,
          defaultSessionDuration: true,
          timeZone: true,
          availabilityStartTime: true,
          availabilityEndTime: true,
          clinicId: true,
          clinic: {
            select: {
              id: true,
              privatePracticeName: true,
            },
          },
          subscriptionPlan: true,
          stripeCustomerId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!therapist) {
        throw new NotFoundException('Therapist not found');
      }

      return { user: therapist, userType: 'THERAPIST' };
    }
  }
}