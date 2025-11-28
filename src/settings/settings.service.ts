// src/settings/settings.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateSecuritySettingsDto } from './dto/updatesecurity.dto';
import { UpdatePasswordPolicyDto } from './dto/password.dto';
import { ChangePasswordDto } from './dto/changepassword.dto';


// Settings storage - in production, use database or config service
export interface SecuritySettings {
  twoFactorAuth: boolean;
  passwordMinLength: number;
  passwordExpiration: number; // in days
  sessionTimeout: number; // in minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
}

export interface SystemSettings {
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  defaultTimezone: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  notifyOnNewUser: boolean;
  notifyOnFailedPayment: boolean;
  notifyOnSupportTicket: boolean;
}

@Injectable()
export class SettingsService {
  // In-memory storage (in production, use database)
  private securitySettings: SecuritySettings = {
    twoFactorAuth: true,
    passwordMinLength: 8,
    passwordExpiration: 90,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
  };

  private systemSettings: SystemSettings = {
    platformName: 'Therapy Platform',
    supportEmail: 'support@therapyplatform.com',
    maintenanceMode: false,
    allowNewRegistrations: true,
    defaultTimezone: 'UTC',
  };

  private notificationSettings: NotificationSettings = {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    notifyOnNewUser: true,
    notifyOnFailedPayment: true,
    notifyOnSupportTicket: true,
  };

  constructor(private prisma: PrismaService) {}

  // ==================== SECURITY SETTINGS ====================

  async getSecuritySettings() {
    return {
      settings: this.securitySettings,
    };
  }

  async updateSecuritySettings(dto: UpdateSecuritySettingsDto) {
    if (dto.twoFactorAuth !== undefined) {
      this.securitySettings.twoFactorAuth = dto.twoFactorAuth;
    }
    if (dto.sessionTimeout !== undefined) {
      this.securitySettings.sessionTimeout = dto.sessionTimeout;
    }
    if (dto.maxLoginAttempts !== undefined) {
      this.securitySettings.maxLoginAttempts = dto.maxLoginAttempts;
    }
    if (dto.lockoutDuration !== undefined) {
      this.securitySettings.lockoutDuration = dto.lockoutDuration;
    }

    return {
      message: 'Security settings updated successfully',
      settings: this.securitySettings,
    };
  }

  async updatePasswordPolicy(dto: UpdatePasswordPolicyDto) {
    if (dto.minLength !== undefined) {
      if (dto.minLength < 8) {
        throw new BadRequestException('Minimum password length must be at least 8');
      }
      this.securitySettings.passwordMinLength = dto.minLength;
    }
    if (dto.expirationDays !== undefined) {
      this.securitySettings.passwordExpiration = dto.expirationDays;
    }

    return {
      message: 'Password policy updated successfully',
      policy: {
        minLength: this.securitySettings.passwordMinLength,
        expirationDays: this.securitySettings.passwordExpiration,
      },
    };
  }

  // ==================== LOGIN HISTORY ====================

  async getLoginHistory() {
    // Get recent admin logins
    const admins = await this.prisma.admin.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    // Get recent therapist logins
    const therapists = await this.prisma.therapist.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    const loginHistory = [
      ...admins.map((admin) => ({
        userId: admin.id,
        user: admin.fullName,
        email: admin.email,
        userType: 'Admin',
        lastLogin: this.getRelativeTime(admin.updatedAt),
        status: this.isRecentlyActive(admin.updatedAt) ? 'Active' : 'Inactive',
        timestamp: admin.updatedAt,
      })),
      ...therapists.map((therapist) => ({
        userId: therapist.id,
        user: therapist.fullName,
        email: therapist.email,
        userType: 'Therapist',
        lastLogin: this.getRelativeTime(therapist.updatedAt),
        status: this.isRecentlyActive(therapist.updatedAt) ? 'Active' : 'Inactive',
        timestamp: therapist.updatedAt,
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    return {
      history: loginHistory,
      total: loginHistory.length,
    };
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      return `${diffDays} days ago`;
    }
  }

  private isRecentlyActive(date: Date): boolean {
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours < 24; // Active if logged in within last 24 hours
  }

  // ==================== PASSWORD MANAGEMENT ====================

  async changePassword(adminId: string, dto: ChangePasswordDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, admin.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Verify new password confirmation
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Validate new password length
    if (dto.newPassword.length < this.securitySettings.passwordMinLength) {
      throw new BadRequestException(
        `Password must be at least ${this.securitySettings.passwordMinLength} characters`,
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  // ==================== SYSTEM SETTINGS ====================

  async getSystemSettings() {
    return {
      settings: this.systemSettings,
    };
  }

  async updateSystemSettings(settings: Partial<SystemSettings>) {
    this.systemSettings = {
      ...this.systemSettings,
      ...settings,
    };

    return {
      message: 'System settings updated successfully',
      settings: this.systemSettings,
    };
  }

  // ==================== NOTIFICATION SETTINGS ====================

  async getNotificationSettings() {
    return {
      settings: this.notificationSettings,
    };
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>) {
    this.notificationSettings = {
      ...this.notificationSettings,
      ...settings,
    };

    return {
      message: 'Notification settings updated successfully',
      settings: this.notificationSettings,
    };
  }

  // ==================== HELPER METHODS ====================

  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < this.securitySettings.passwordMinLength) {
      errors.push(
        `Password must be at least ${this.securitySettings.passwordMinLength} characters`,
      );
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}