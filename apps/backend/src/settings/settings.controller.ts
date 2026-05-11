import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UpdateApplicationSettingsDto } from './dto/update-application-settings.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiOperation({ summary: 'Get application settings' })
  @Roles('admin')
  @Get()
  getSettings() {
    return this.settingsService.getSafeSettings();
  }

  @ApiOperation({ summary: 'Get non-sensitive review preferences' })
  @Get('preferences')
  getPreferences() {
    return this.settingsService.getPreferences();
  }

  @ApiOperation({ summary: 'Update application settings' })
  @Roles('admin')
  @Patch()
  updateSettings(@Body() dto: UpdateApplicationSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}
