import { settingsRepository } from '../repositories/settings.repository';
import { SiteSettings } from '../../../packages/shared/types';

export class SettingsService {
  async getSettings(): Promise<SiteSettings> {
    return settingsRepository.getSettings();
  }

  async updateSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    return settingsRepository.updateSettings(updates);
  }
}

export const settingsService = new SettingsService();
