import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';

export class SettingsController {
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getSettings();
      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const updated = await settingsService.updateSettings(req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const settingsController = new SettingsController();
