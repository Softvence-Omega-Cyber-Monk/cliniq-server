// src/settings/settings.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
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
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateSecuritySettingsDto } from './dto/updatesecurity.dto';
import { UpdatePasswordPolicyDto } from './dto/password.dto';
import { ChangePasswordDto } from './dto/changepassword.dto';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('bearer')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ==================== SECURITY SETTINGS ====================

  @Get('security')
  @ApiOperation({
    summary: 'Get security settings',
    description: 'Retrieve current security configuration',
  })
  @ApiResponse({ status: 200, description: 'Security settings retrieved' })
  async getSecuritySettings() {
    return this.settingsService.getSecuritySettings();
  }

  @Patch('security')
  @ApiOperation({
    summary: 'Update security settings',
    description: 'Update security configuration like 2FA requirements',
  })
  @ApiResponse({ status: 200, description: 'Security settings updated' })
  async updateSecuritySettings(@Body() dto: UpdateSecuritySettingsDto) {
    return this.settingsService.updateSecuritySettings(dto);
  }

  @Patch('security/password-policy')
  @ApiOperation({
    summary: 'Update password policy',
    description: 'Update password requirements and expiration settings',
  })
  @ApiResponse({ status: 200, description: 'Password policy updated' })
  async updatePasswordPolicy(@Body() dto: UpdatePasswordPolicyDto) {
    return this.settingsService.updatePasswordPolicy(dto);
  }

  // ==================== LOGIN HISTORY ====================

  @Get('security/login-history')
  @ApiOperation({
    summary: 'Get login history',
    description: 'Retrieve recent login activity for all users',
  })
  @ApiResponse({ status: 200, description: 'Login history retrieved' })
  async getLoginHistory() {
    return this.settingsService.getLoginHistory();
  }

  // ==================== PASSWORD MANAGEMENT ====================

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description: 'Admin changes their own password',
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.settingsService.changePassword(req.user.sub, dto);
  }

  // ==================== SYSTEM SETTINGS ====================

  @Get('system')
  @ApiOperation({
    summary: 'Get system settings',
    description: 'Retrieve general system configuration',
  })
  @ApiResponse({ status: 200, description: 'System settings retrieved' })
  async getSystemSettings() {
    return this.settingsService.getSystemSettings();
  }

  @Patch('system')
  @ApiOperation({
    summary: 'Update system settings',
    description: 'Update general system configuration',
  })
  @ApiResponse({ status: 200, description: 'System settings updated' })
  async updateSystemSettings(@Body() settings: any) {
    return this.settingsService.updateSystemSettings(settings);
  }

  // ==================== NOTIFICATION SETTINGS ====================

  @Get('notifications')
  @ApiOperation({
    summary: 'Get notification settings',
    description: 'Retrieve notification configuration',
  })
  @ApiResponse({ status: 200, description: 'Notification settings retrieved' })
  async getNotificationSettings() {
    return this.settingsService.getNotificationSettings();
  }

  @Patch('notifications')
  @ApiOperation({
    summary: 'Update notification settings',
    description: 'Update notification configuration',
  })
  @ApiResponse({ status: 200, description: 'Notification settings updated' })
  async updateNotificationSettings(@Body() settings: any) {
    return this.settingsService.updateNotificationSettings(settings);
  }
}