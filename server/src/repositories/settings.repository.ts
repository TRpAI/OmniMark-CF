import { SiteSettings } from '../../../packages/shared/types';
import { DEFAULT_SETTINGS } from '../../../packages/shared/constants';
import { jsonDb } from './json.repository';

export class SettingsRepository {
  async getSettings(): Promise<SiteSettings> {
    const db = jsonDb.read();
    return db.settings || DEFAULT_SETTINGS;
  }

  async updateSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    let updated = DEFAULT_SETTINGS;
    jsonDb.update((db) => {
      db.settings = { ...(db.settings || DEFAULT_SETTINGS), ...updates };
      updated = db.settings;
    });
    return updated;
  }
}

export const settingsRepository = new SettingsRepository();
