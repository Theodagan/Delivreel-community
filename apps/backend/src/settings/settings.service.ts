import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ApplicationSetting } from './entities/application-setting.entity.js';
import { UpdateApplicationSettingsDto } from './dto/update-application-settings.dto.js';

export type AppEnvironment = 'dev' | 'prod' | 'selfhost';

export interface SafeApplicationSettings {
  appEnvironment: AppEnvironment;
  timelineMarkerSize: 'compact' | 'comfortable' | 'large';
  defaultCommentFilter: 'all' | 'open' | 'resolved';
  autoplayOnLoad: boolean;
  showProviderBadge: boolean;
}

export interface ApplicationPreferences {
  timelineMarkerSize: 'compact' | 'comfortable' | 'large';
  defaultCommentFilter: 'all' | 'open' | 'resolved';
  autoplayOnLoad: boolean;
  showProviderBadge: boolean;
}

const SETTINGS_KEYS = new Set([
  'timelineMarkerSize',
  'defaultCommentFilter',
  'autoplayOnLoad',
  'showProviderBadge',
]);

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(ApplicationSetting)
    private readonly settingsRepository: Repository<ApplicationSetting>,
  ) {}

  getAppEnvironment(): AppEnvironment {
    const rawValue = (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'dev').toLowerCase();
    if (rawValue === 'production') {
      return 'prod';
    }
    if (rawValue === 'prod' || rawValue === 'selfhost' || rawValue === 'dev') {
      return rawValue;
    }
    return 'dev';
  }

  async getSafeSettings(): Promise<SafeApplicationSettings> {
    const values = await this.getSettingsMap();
    const appEnvironment = this.getAppEnvironment();

    return {
      appEnvironment,
      timelineMarkerSize: this.choiceValue(values, 'timelineMarkerSize', ['compact', 'comfortable', 'large'], 'comfortable'),
      defaultCommentFilter: this.choiceValue(values, 'defaultCommentFilter', ['all', 'open', 'resolved'], 'all'),
      autoplayOnLoad: this.booleanValue(values, 'autoplayOnLoad', false),
      showProviderBadge: this.booleanValue(values, 'showProviderBadge', true),
    };
  }

  async updateSettings(dto: UpdateApplicationSettingsDto): Promise<SafeApplicationSettings> {
    const appEnvironment = this.getAppEnvironment();
    if (appEnvironment === 'prod') {
      throw new BadRequestException('Production settings are controlled by environment variables');
    }

    const currentValues = await this.getSettingsMap();
    const candidateValues = { ...currentValues };
    const updates = Object.entries(dto).filter(([key, value]) => value !== undefined && SETTINGS_KEYS.has(key));

    for (const [key, value] of updates) {
      const trimmed = String(value).trim();
      if (trimmed) {
        candidateValues[key] = trimmed;
      } else {
        delete candidateValues[key];
      }
    }

    for (const [key, value] of updates) {
      await this.setValue(key, String(value), false);
    }

    return this.getSafeSettings();
  }

  async getPreferences(): Promise<ApplicationPreferences> {
    const settings = await this.getSafeSettings();
    return {
      timelineMarkerSize: settings.timelineMarkerSize,
      defaultCommentFilter: settings.defaultCommentFilter,
      autoplayOnLoad: settings.autoplayOnLoad,
      showProviderBadge: settings.showProviderBadge,
    };
  }

  async getSecretValue(key: string): Promise<string | undefined> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting?.value?.trim() || undefined;
  }

  async getSettingsMap(): Promise<Record<string, string>> {
    const rows = await this.settingsRepository.find();
    return rows.reduce<Record<string, string>>((settings, row) => {
      if (row.value !== null && row.value !== undefined) {
        settings[row.key] = row.value;
      }
      return settings;
    }, {});
  }

  async assertBootConfiguration(): Promise<void> {
    return undefined;
  }

  private async setValue(key: string, value: string, secret: boolean): Promise<void> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    const trimmed = value.trim();
    if (!trimmed) {
      if (setting) {
        await this.settingsRepository.remove(setting);
      }
      return;
    }

    await this.settingsRepository.save({
      ...(setting ?? {}),
      key,
      value: trimmed,
      secret,
    });
  }

  private numberValue(values: Record<string, string>, key: string, fallback: number): number {
    const parsed = Number(values[key]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private booleanValue(values: Record<string, string>, key: string, fallback: boolean): boolean {
    if (values[key] === 'true') return true;
    if (values[key] === 'false') return false;
    return fallback;
  }

  private choiceValue<T extends string>(values: Record<string, string>, key: string, choices: T[], fallback: T): T {
    return choices.includes(values[key] as T) ? values[key] as T : fallback;
  }

}
