// src/payment-methods/payment-methods.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentMethodsService } from './payment-methods.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';

@ApiTags('Payment Methods')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a new payment method for subscription',
    description:
      'Save card information for subscription payments via Stripe. The card must be tokenized on the client-side using Stripe.js before sending to this endpoint. The first payment method will be set as default automatically.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment method created successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or user does not have Stripe customer ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Payment method already exists',
  })
  async createPaymentMethod(
    @Request() req,
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.createPaymentMethod(
      req.user.sub,
      req.user.userType,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all saved payment methods',
    description:
      'Retrieve all saved card information for the authenticated user, ordered by default status and creation date.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payment methods retrieved successfully',
    type: [PaymentMethodResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getPaymentMethods(@Request() req) {
    return this.paymentMethodsService.getPaymentMethods(
      req.user.sub,
      req.user.userType,
    );
  }

  @Get('default')
  @ApiOperation({
    summary: 'Get default payment method',
    description: 'Retrieve the default payment method that will be used for subscription payments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Default payment method retrieved successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'No default payment method found',
  })
  async getDefaultPaymentMethod(@Request() req) {
    return this.paymentMethodsService.getDefaultPaymentMethod(
      req.user.sub,
      req.user.userType,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get payment method by ID',
    description: 'Retrieve a specific payment method by its ID. Users can only access their own payment methods.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment method retrieved successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot access this payment method',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment method not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment method ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getPaymentMethodById(@Request() req, @Param('id') id: string) {
    return this.paymentMethodsService.getPaymentMethodById(
      req.user.sub,
      req.user.userType,
      id,
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update payment method',
    description:
      'Update payment method details such as billing address, expiry date, or cardholder name. Cannot update card number or Stripe payment method ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment method updated successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot update this payment method',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment method not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment method ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async updatePaymentMethod(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.updatePaymentMethod(
      req.user.sub,
      req.user.userType,
      id,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete payment method',
    description:
      'Delete a saved payment method. If deleting the default payment method, another method will be automatically set as default.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment method deleted successfully',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: 'Payment method deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot delete this payment method',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment method not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment method ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async deletePaymentMethod(@Request() req, @Param('id') id: string) {
    return this.paymentMethodsService.deletePaymentMethod(
      req.user.sub,
      req.user.userType,
      id,
    );
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set payment method as default',
    description:
      'Set a specific payment method as the default for subscription payments. Only one payment method can be default at a time.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment method set as default successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot modify this payment method',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment method not found',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment method ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async setDefaultPaymentMethod(@Request() req, @Param('id') id: string) {
    return this.paymentMethodsService.setDefaultPaymentMethod(
      req.user.sub,
      req.user.userType,
      id,
    );
  }
}