import { apiClient } from './client';
import { SiteSettings } from '../../packages/shared/types';

export interface OneDriveConfig {
  enabled: boolean;
  scheduleInterval: '1h' | '6h' | '12h' | '24h' | 'change' | 'manual';
  backupFolder: string;
  clientId: string;
  tenantId: string;
  authStatus: 'connected' | 'unconfigured' | 'pending';
  lastBackupTime?: string;
  lastBackupStatus?: 'success' | 'failed' | 'running';
  lastBackupSummary?: string;
}

export interface BackupLog {
  id: string;
  timestamp: string;
  type: 'incremental' | 'full';
  trigger: 'manual' | 'schedule' | 'auto_change';
  bookmarksCount: number;
  addedBookmarks: number;
  updatedBookmarks: number;
  deletedBookmarks: number;
  fileSize: string;
  fileName: string;
  status: 'success' | 'failed';
  message: string;
}

export const settingsApi = {
  getSettings: () =>
    apiClient.get<SiteSettings>('/settings'),

  updateSettings: (settings: Partial<SiteSettings>) =>
    apiClient.put<SiteSettings>('/settings', settings),
};

export const uploadApi = {
  fetchFavicon: (url: string) =>
    apiClient.get<{ favicon: string }>('/upload/favicon', { url }),

  importJson: (data: any, overwrite = false) =>
    apiClient.post('/upload/import-json', { data, overwrite }),

  importHtml: (htmlContent: string) =>
    apiClient.post('/upload/import-html', { htmlContent }),

  getExportJsonUrl: () => '/api/upload/export-json',
  getExportHtmlUrl: () => '/api/upload/export-html',
  getExportD1SqlUrl: () => '/api/upload/export-d1-sql',

  // OneDrive Scheduled Incremental Backup API
  getOneDriveConfig: () =>
    apiClient.get<OneDriveConfig>('/upload/onedrive/config'),

  saveOneDriveConfig: (config: Partial<OneDriveConfig>) =>
    apiClient.post<OneDriveConfig>('/upload/onedrive/config', config),

  testOneDriveConnection: () =>
    apiClient.post<{ success: boolean; message: string; account: string }>('/upload/onedrive/test'),

  triggerOneDriveBackup: (trigger: 'manual' | 'schedule' | 'auto_change' = 'manual') =>
    apiClient.post<{
      success: boolean;
      summary: string;
      details: {
        added: number;
        updated: number;
        deleted: number;
        total: number;
        fileName: string;
        fileSize: string;
      };
    }>('/upload/onedrive/backup', { trigger }),

  getOneDriveHistory: () =>
    apiClient.get<BackupLog[]>('/upload/onedrive/history'),
};
