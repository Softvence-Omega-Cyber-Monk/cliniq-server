// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateClinicProfileDto } from './dto/update-clinic-profile.dto';
import { UpdateTherapistProfileDto } from './dto/update-therapist-profile.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { QueryParamsDto } from './dto/query-params.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ==================== CLINIC MANAGEMENT ====================

  /**
   * Get clinic profile by ID
   */
  async getClinicById(clinicId: string) {
    const clinic = await this.prisma.privateClinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        fullName: true,
        privatePracticeName: true,
        phone: true,
        email: true,
        isPaymentReminderOn: true,
        isPaymentConfirmOn: true,
        isPlanChangedOn: true,
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    return clinic;
  }

  /**
   * Get all clinics with pagination and search
   */
  async getAllClinics(query: QueryParamsDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where = query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' as const } },
            { privatePracticeName: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [clinics, total] = await Promise.all([
      this.prisma.privateClinic.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          privatePracticeName: true,
          phone: true,
          email: true,
          isPaymentReminderOn: true,
          isPaymentConfirmOn: true,
          isPlanChangedOn: true,
          subscriptionPlan: {
            select: {
              id: true,
              planName: true,
              price: true,
            },
          },
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              therapists: true,
              clients: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.privateClinic.count({ where }),
    ]);

    return {
      data: clinics,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update clinic profile
   */
  async updateClinicProfile(
    userId: string,
    userType: string,
    clinicId: string,
    dto: UpdateClinicProfileDto,
  ) {
    // Check if user has permission
    if (userType === 'CLINIC' && userId !== clinicId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Check if email is being changed and already exists
    if (dto.email) {
      const existingClinic = await this.prisma.privateClinic.findUnique({
        where: { email: dto.email },
      });

      if (existingClinic && existingClinic.id !== clinicId) {
        throw new ConflictException('Email already in use');
      }
    }

    const clinic = await this.prisma.privateClinic.update({
      where: { id: clinicId },
      data: dto,
      select: {
        id: true,
        fullName: true,
        privatePracticeName: true,
        phone: true,
        email: true,
        isPaymentReminderOn: true,
        isPaymentConfirmOn: true,
        isPlanChangedOn: true,
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return clinic;
  }

  /**
   * Update clinic notification settings
   */
  async updateClinicNotifications(
    userId: string,
    userType: string,
    clinicId: string,
    dto: UpdateNotificationSettingsDto,
  ) {
    // Check if user has permission
    if (userType === 'CLINIC' && userId !== clinicId) {
      throw new ForbiddenException('You can only update your own settings');
    }

    const clinic = await this.prisma.privateClinic.update({
      where: { id: clinicId },
      data: dto,
      select: {
        id: true,
        isPaymentReminderOn: true,
        isPaymentConfirmOn: true,
        isPlanChangedOn: true,
      },
    });

    return clinic;
  }

  /**
   * Delete clinic
   */
  async deleteClinic(userId: string, userType: string, clinicId: string) {
    // Check if user has permission
    if (userType === 'CLINIC' && userId !== clinicId) {
      throw new ForbiddenException('You can only delete your own account');
    }

    // Check if clinic has therapists or clients
    const clinic = await this.prisma.privateClinic.findUnique({
      where: { id: clinicId },
      include: {
        _count: {
          select: {
            therapists: true,
            clients: true,
          },
        },
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    if (clinic._count.therapists > 0 || clinic._count.clients > 0) {
      throw new BadRequestException(
        'Cannot delete clinic with existing therapists or clients',
      );
    }

    await this.prisma.privateClinic.delete({
      where: { id: clinicId },
    });

    return { message: 'Clinic deleted successfully' };
  }

  // ==================== THERAPIST MANAGEMENT ====================

  /**
   * Get therapist profile by ID
   */
  async getTherapistById(therapistId: string) {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: therapistId },
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
            email: true,
          },
        },
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    return therapist;
  }

  /**
   * Get all therapists with pagination and search
   */
  async getAllTherapists(query: QueryParamsDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where = query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { speciality: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [therapists, total] = await Promise.all([
      this.prisma.therapist.findMany({
        where,
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
          clinicId: true,
          clinic: {
            select: {
              id: true,
              privatePracticeName: true,
            },
          },
          subscriptionPlan: {
            select: {
              id: true,
              planName: true,
              price: true,
            },
          },
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              clients: true,
              appointments: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.therapist.count({ where }),
    ]);

    return {
      data: therapists,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get therapists by clinic ID
   */
  async getTherapistsByClinic(clinicId: string, query: QueryParamsDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Verify clinic exists
    const clinic = await this.prisma.privateClinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const where: any = { clinicId };

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
        { speciality: { contains: query.search, mode: 'insensitive' as const } },
      ];
    }

    const [therapists, total] = await Promise.all([
      this.prisma.therapist.findMany({
        where,
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
          createdAt: true,
          updatedAt: true,
          status: true,
          availableDays: true,
          _count: {
            select: {
              clients: true,
              appointments: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.therapist.count({ where }),
    ]);

    return {
      data: therapists,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update therapist profile
   */
  async updateTherapistProfile(
    userId: string,
    userType: string,
    therapistId: string,
    dto: UpdateTherapistProfileDto,
  ) {
    // Check if user has permission
    if (userType === 'THERAPIST' && userId !== therapistId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // If clinic is updating, verify they own the therapist
    if (userType === 'CLINIC') {
      const therapist = await this.prisma.therapist.findUnique({
        where: { id: therapistId },
      });

      if (!therapist || therapist.clinicId !== userId) {
        throw new ForbiddenException(
          'You can only update therapists from your clinic',
        );
      }
    }

    // Check if email is being changed and already exists
    if (dto.email) {
      const existingTherapist = await this.prisma.therapist.findUnique({
        where: { email: dto.email },
      });

      if (existingTherapist && existingTherapist.id !== therapistId) {
        throw new ConflictException('Email already in use');
      }
    }

    const therapist = await this.prisma.therapist.update({
      where: { id: therapistId },
      data: dto,
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
        createdAt: true,
        updatedAt: true,
      },
    });

    return therapist;
  }

  /**
   * Delete therapist
   */
  async deleteTherapist(userId: string, userType: string, therapistId: string) {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: therapistId },
      include: {
        _count: {
          select: {
            clients: true,
            appointments: true,
          },
        },
      },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    // Check permissions
    if (userType === 'THERAPIST' && userId !== therapistId) {
      throw new ForbiddenException('You can only delete your own account');
    }

    if (userType === 'CLINIC' && therapist.clinicId !== userId) {
      throw new ForbiddenException(
        'You can only delete therapists from your clinic',
      );
    }

    // Check if therapist has clients or appointments
    if (therapist._count.clients > 0 || therapist._count.appointments > 0) {
      throw new BadRequestException(
        'Cannot delete therapist with existing clients or appointments',
      );
    }

    await this.prisma.therapist.delete({
      where: { id: therapistId },
    });

    return { message: 'Therapist deleted successfully' };
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  /**
   * Assign subscription to clinic
   */
  async assignClinicSubscription(
    userId: string,
    userType: string,
    clinicId: string,
    dto: AssignSubscriptionDto,
  ) {
    // Check permissions
    if (userType === 'CLINIC' && userId !== clinicId) {
      throw new ForbiddenException('You can only manage your own subscription');
    }

    // Verify subscription plan exists
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.subscriptionPlanId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const clinic = await this.prisma.privateClinic.update({
      where: { id: clinicId },
      data: { subscriptionPlanId: dto.subscriptionPlanId },
      select: {
        id: true,
        fullName: true,
        privatePracticeName: true,
        subscriptionPlan: true,
      },
    });

    return clinic;
  }

  /**
   * Assign subscription to therapist
   */
  async assignTherapistSubscription(
    userId: string,
    userType: string,
    therapistId: string,
    dto: AssignSubscriptionDto,
  ) {
    // Check permissions
    if (userType === 'THERAPIST' && userId !== therapistId) {
      throw new ForbiddenException('You can only manage your own subscription');
    }

    // Verify subscription plan exists
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.subscriptionPlanId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const therapist = await this.prisma.therapist.update({
      where: { id: therapistId },
      data: { subscriptionPlanId: dto.subscriptionPlanId },
      select: {
        id: true,
        fullName: true,
        email: true,
        subscriptionPlan: true,
      },
    });

    return therapist;
  }

  /**
   * Remove subscription from clinic
   */
  async removeClinicSubscription(
    userId: string,
    userType: string,
    clinicId: string,
  ) {
    // Check permissions
    if (userType === 'CLINIC' && userId !== clinicId) {
      throw new ForbiddenException('You can only manage your own subscription');
    }

    const clinic = await this.prisma.privateClinic.update({
      where: { id: clinicId },
      data: { subscriptionPlanId: null },
      select: {
        id: true,
        fullName: true,
        privatePracticeName: true,
        subscriptionPlan: true,
      },
    });

    return clinic;
  }

  /**
   * Remove subscription from therapist
   */
  async removeTherapistSubscription(
    userId: string,
    userType: string,
    therapistId: string,
  ) {
    // Check permissions
    if (userType === 'THERAPIST' && userId !== therapistId) {
      throw new ForbiddenException('You can only manage your own subscription');
    }

    const therapist = await this.prisma.therapist.update({
      where: { id: therapistId },
      data: { subscriptionPlanId: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        subscriptionPlan: true,
      },
    });

    return therapist;
  }
}