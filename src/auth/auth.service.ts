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
import { RegisterIndividualTherapistDto } from './dto/register-individual-therapist.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { UpdateAdminDto } from './dto/update-admin-dto';

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
   * Register a new admin
   */
  async registerAdmin(dto: RegisterAdminDto) {
    // Check if email already exists
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (existingAdmin) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create admin (no Stripe customer for admin)
    const admin = await this.prisma.admin.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(admin.id, admin.email, 'ADMIN');

    return {
      ...tokens,
      user: admin,
      userType: 'ADMIN',
    };
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

  async registerTherapist(dto: RegisterTherapistDto) {
    const existingTherapist = await this.prisma.therapist.findUnique({
      where: { email: dto.email },
    });

    if (existingTherapist) {
      throw new ConflictException('Email already registered');
    }
    if (dto.clinicId) {
      const clinic = await this.prisma.privateClinic.findUnique({
        where: { id: dto.clinicId },
      });

      if (!clinic) {
        throw new NotFoundException('Clinic not found');
      }
    }
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
        availableDays: dto.availableDays,
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
        availableDays: true,
        clinicId: true,
        createdAt: true,
        stripeCustomerId: true,
      },
    });
    const tokens = await this.generateTokens(therapist.id, therapist.email, 'THERAPIST');
    return {
      ...tokens,
      user: therapist,
      userType: 'THERAPIST',
    };
  }

  async registerIndividualTherapist(dto: RegisterIndividualTherapistDto) {
    // Check if email already exists
    const existingTherapist = await this.prisma.therapist.findUnique({
      where: { email: dto.email },
    });

    if (existingTherapist) {
      throw new ConflictException('Email already registered');
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
          userType: 'INDIVIDUAL_THERAPIST',
          licenseNumber: dto.licenseNumber || 'N/A',
          speciality: dto.speciality || 'N/A',
        },
      });
      stripeCustomerId = stripeCustomer.id;
    } catch (error) {
      throw new BadRequestException(`Failed to create Stripe customer: ${error.message}`);
    }

    // Create therapist
    const individualTherapist = await this.prisma.therapist.create({
      data: {
        fullName: dto.fullName,
        licenseNumber: dto.licenseNumber,
        qualification: dto.qualification,
        email: dto.email,
        phone: dto.phone,
        speciality: dto.speciality,
        defaultSessionDuration: dto.defaultSessionDuration,
        timeZone: dto.timeZone,
        availableDays: dto.availableDays,
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
        availableDays: true,
        clinicId: true,
        createdAt: true,
        stripeCustomerId: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(individualTherapist.id, individualTherapist.email, 'INDIVIDUAL_THERAPIST');

    return {
      ...tokens,
      user: individualTherapist,
      userType: 'INDIVIDUAL_THERAPIST',
    };
  }

  /**
   * Login user (admin, clinic or therapist)
   */
  async login(dto: LoginDto) {
    let user;
    let userType = dto.userType;

    if (userType === 'ADMIN') {
      user = await this.prisma.admin.findUnique({
        where: { email: dto.email },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          password: true,
        },
      });
    }
    else if (userType === 'CLINIC') {
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
    } else if (userType === 'THERAPIST' || userType === 'INDIVIDUAL_THERAPIST') {
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

    if (userType === 'ADMIN') {
      user = await this.prisma.admin.findUnique({
        where: { id: userId },
      });
    } else if (userType === 'CLINIC') {
      user = await this.prisma.privateClinic.findUnique({
        where: { id: userId },
      });
    } else if (userType === 'THERAPIST' || userType === 'INDIVIDUAL_THERAPIST') {
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
    if (userType === 'ADMIN') {
      await this.prisma.admin.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    } else if (userType === 'CLINIC') {
      await this.prisma.privateClinic.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    } else if (userType === 'THERAPIST' || userType === 'INDIVIDUAL_THERAPIST') {
      await this.prisma.therapist.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    }

    return { message: 'Password changed successfully' };
  }

  /**
   * Update admin profile
   */
  async updateAdminProfile(adminId: string, dto: UpdateAdminDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Check if email is being changed and if it already exists
    if (dto.email && dto.email !== admin.email) {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });

      if (existingAdmin) {
        throw new ConflictException('Email already in use');
      }
    }

    // Update admin
    const updatedAdmin = await this.prisma.admin.update({
      where: { id: adminId },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phone && { phone: dto.phone }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Profile updated successfully',
      user: updatedAdmin,
    };
  }

  /**
   * Request password reset - COMPLETE IMPLEMENTATION
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    let user;
    let userId: string;

    if (dto.userType === 'ADMIN') {
      user = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });
      userId = user?.id;
    }
    else if (dto.userType === 'CLINIC') {
      user = await this.prisma.privateClinic.findUnique({
        where: { email: dto.email },
      });
      userId = user?.id;
    } else {
      user = await this.prisma.therapist.findUnique({
        where: { email: dto.email },
      });
      userId = user?.id;
    }

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Save reset token to database
    await this.prisma.passwordReset.create({
      data: {
        token: resetToken,
        email: dto.email,
        userType: dto.userType as any,
        expiresAt,
        ...(dto.userType === 'ADMIN' && { adminId: userId }),
        ...(dto.userType === 'CLINIC' && { clinicId: userId }),
        ...((dto.userType === 'THERAPIST' || dto.userType === 'INDIVIDUAL_THERAPIST') && { therapistId: userId }),
      },
    });

    // TODO: Send email with reset link
    // const resetLink = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    // await this.emailService.sendPasswordResetEmail(user.email, resetLink);
    
    console.log(`Password reset token for ${dto.email}: ${resetToken}`);
    console.log(`Reset link: ${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/reset-password?token=${resetToken}`);

    return { 
      message: 'If the email exists, a reset link has been sent',
      // REMOVE IN PRODUCTION - only for development/testing
      ...(process.env.NODE_ENV === 'development' && { token: resetToken })
    };
  }

  /**
   * Reset password using token - COMPLETE IMPLEMENTATION
   */
  async resetPassword(dto: ResetPasswordDto) {
    // Find the password reset record
    const resetRecord = await this.prisma.passwordReset.findFirst({
      where: {
        token: dto.token,
        used: false,
      },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token has expired
    if (new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password based on user type
    try {
      if (resetRecord.userType === 'ADMIN' && resetRecord.adminId) {
        await this.prisma.admin.update({
          where: { id: resetRecord.adminId },
          data: { password: hashedPassword },
        });
      } else if (resetRecord.userType === 'CLINIC' && resetRecord.clinicId) {
        await this.prisma.privateClinic.update({
          where: { id: resetRecord.clinicId },
          data: { password: hashedPassword },
        });
      } else if ((resetRecord.userType === 'THERAPIST' || resetRecord.userType === 'INDIVIDUAL_THERAPIST') && resetRecord.therapistId) {
        await this.prisma.therapist.update({
          where: { id: resetRecord.therapistId },
          data: { password: hashedPassword },
        });
      } else {
        throw new BadRequestException('Invalid reset record - missing user ID');
      }

      // Mark token as used
      await this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      });

      return { message: 'Password reset successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to reset password');
    }
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
   * Get user profile - FIXED for INDIVIDUAL_THERAPIST
   */
  async getProfile(userId: string, userType: string) {
    if (userType === 'ADMIN') {
      const admin = await this.prisma.admin.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      return { user: admin, userType: 'ADMIN' };
    }
    else if (userType === 'CLINIC') {
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
    } else if (userType === 'THERAPIST' || userType === 'INDIVIDUAL_THERAPIST') {
      // FIX: Handle both THERAPIST and INDIVIDUAL_THERAPIST
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
          availableDays: true,
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

      // FIX: Return the correct userType from the JWT token
      // This preserves whether they logged in as THERAPIST or INDIVIDUAL_THERAPIST
      return { user: therapist, userType: userType };
    }
  }
}