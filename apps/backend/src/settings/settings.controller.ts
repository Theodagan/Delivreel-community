import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UpdateApplicationSettingsDto } from './dto/update-application-settings.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiOperation({ summary: 'Get application settings' })
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
  @Patch()
  updateSettings(@Body() dto: UpdateApplicationSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}
