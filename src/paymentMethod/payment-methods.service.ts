// src/payment-methods/payment-methods.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new payment method (card) for subscription payments
   */
  async createPaymentMethod(
    userId: string,
    userType: string,
    dto: CreatePaymentMethodDto,
  ) {
    // Check if Stripe payment method already exists
    const existingPaymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { stripePaymentMethodId: dto.stripePaymentMethodId },
    });

    if (existingPaymentMethod) {
      throw new ConflictException('This payment method has already been added');
    }

    // Check if this will be the first (default) payment method
    const existingMethodsCount = await this.getPaymentMethodCount(userId, userType);
    const isDefault = existingMethodsCount === 0;

    // Validate user exists and get Stripe customer ID
    let stripeCustomerId: string | null = null;

    if (userType === 'CLINIC') {
      const clinic = await this.prisma.privateClinic.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!clinic) {
        throw new NotFoundException('Clinic not found');
      }

      stripeCustomerId = clinic.stripeCustomerId;
    } else if (userType === 'THERAPIST') {
      const therapist = await this.prisma.therapist.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!therapist) {
        throw new NotFoundException('Therapist not found');
      }

      stripeCustomerId = therapist.stripeCustomerId;
    }

    if (!stripeCustomerId) {
      throw new BadRequestException('User does not have a Stripe customer ID');
    }

    // Create payment method based on user type
    const paymentMethodData = {
      stripePaymentMethodId: dto.stripePaymentMethodId,
      stripeCustomerId,
      cardHolderName: dto.cardHolderName, // Fixed: matches schema field name
      cardLast4: dto.cardLast4,
      cardBrand: dto.cardBrand,
      expiryMonth: dto.expiryMonth,
      expiryYear: dto.expiryYear,
      billingAddressLine1: dto.billingAddressLine1,
      billingAddressLine2: dto.billingAddressLine2,
      billingCity: dto.billingCity,
      billingState: dto.billingState,
      billingPostalCode: dto.billingPostalCode,
      billingCountry: dto.billingCountry,
      isDefault,
    };

    if (userType === 'CLINIC') {
      const paymentMethod = await this.prisma.paymentMethod.create({
        data: {
          ...paymentMethodData,
          clinicId: userId,
        },
        select: this.getPaymentMethodSelect(),
      });

      return paymentMethod;
    } else if (userType === 'THERAPIST') {
      const paymentMethod = await this.prisma.paymentMethod.create({
        data: {
          ...paymentMethodData,
          therapistId: userId,
        },
        select: this.getPaymentMethodSelect(),
      });

      return paymentMethod;
    }

    throw new BadRequestException('Invalid user type');
  }

  /**
   * Get all payment methods for a user
   */
  async getPaymentMethods(userId: string, userType: string) {
    const where =
      userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId };

    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where,
      select: this.getPaymentMethodSelect(),
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return paymentMethods;
  }

  /**
   * Get a specific payment method by ID
   */
  async getPaymentMethodById(
    userId: string,
    userType: string,
    paymentMethodId: string,
  ) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
      select: this.getPaymentMethodSelect(),
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Check if user owns this payment method
    if (
      (userType === 'CLINIC' && paymentMethod.clinicId !== userId) ||
      (userType === 'THERAPIST' && paymentMethod.therapistId !== userId)
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this payment method',
      );
    }

    return paymentMethod;
  }

  /**
   * Update a payment method (only billing info and expiry)
   */
  async updatePaymentMethod(
    userId: string,
    userType: string,
    paymentMethodId: string,
    dto: UpdatePaymentMethodDto,
  ) {
    // Verify ownership
    await this.getPaymentMethodById(userId, userType, paymentMethodId);

    const paymentMethod = await this.prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: dto,
      select: this.getPaymentMethodSelect(),
    });

    return paymentMethod;
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(
    userId: string,
    userType: string,
    paymentMethodId: string,
  ) {
    // Verify ownership
    const paymentMethod = await this.getPaymentMethodById(
      userId,
      userType,
      paymentMethodId,
    );

    // If deleting the default payment method, set another as default
    if (paymentMethod.isDefault) {
      const where =
        userType === 'CLINIC'
          ? { clinicId: userId, id: { not: paymentMethodId } }
          : { therapistId: userId, id: { not: paymentMethodId } };

      const nextPaymentMethod = await this.prisma.paymentMethod.findFirst({
        where,
        orderBy: { createdAt: 'asc' },
      });

      if (nextPaymentMethod) {
        await this.prisma.paymentMethod.update({
          where: { id: nextPaymentMethod.id },
          data: { isDefault: true },
        });
      }
    }

    await this.prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });

    return { message: 'Payment method deleted successfully' };
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(
    userId: string,
    userType: string,
    paymentMethodId: string,
  ) {
    // Verify ownership
    await this.getPaymentMethodById(userId, userType, paymentMethodId);

    const where =
      userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId };

    // Remove default from all other payment methods
    await this.prisma.paymentMethod.updateMany({
      where,
      data: { isDefault: false },
    });

    // Set new default
    const paymentMethod = await this.prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
      select: this.getPaymentMethodSelect(),
    });

    return paymentMethod;
  }

  /**
   * Get the default payment method
   */
  async getDefaultPaymentMethod(userId: string, userType: string) {
    const where =
      userType === 'CLINIC'
        ? { clinicId: userId, isDefault: true }
        : { therapistId: userId, isDefault: true };

    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where,
      select: this.getPaymentMethodSelect(),
    });

    if (!paymentMethod) {
      throw new NotFoundException('No default payment method found');
    }

    return paymentMethod;
  }

  /**
   * Get payment method by Stripe Payment Method ID (internal use)
   */
  async getPaymentMethodByStripeId(stripePaymentMethodId: string) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { stripePaymentMethodId },
      select: {
        ...this.getPaymentMethodSelect(),
        stripePaymentMethodId: true,
        stripeCustomerId: true,
      },
    });

    return paymentMethod;
  }

  /**
   * Helper: Get payment method count for a user
   */
  private async getPaymentMethodCount(
    userId: string,
    userType: string,
  ): Promise<number> {
    const where =
      userType === 'CLINIC' ? { clinicId: userId } : { therapistId: userId };

    return this.prisma.paymentMethod.count({ where });
  }

  /**
   * Helper: Get select fields for payment method (excludes Stripe IDs for security)
   */
  private getPaymentMethodSelect() {
    return {
      id: true,
      cardHolderName: true, // Matches schema field name
      cardLast4: true,
      cardBrand: true,
      expiryMonth: true,
      expiryYear: true,
      billingAddressLine1: true,
      billingAddressLine2: true,
      billingCity: true,
      billingState: true,
      billingPostalCode: true,
      billingCountry: true,
      isDefault: true,
      clinicId: true,
      therapistId: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}