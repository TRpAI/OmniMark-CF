import { apiClient } from './client';
import { SiteSettings } from '../../packages/shared/types';

export interface MicrosoftAccountInfo {
  displayName: string;
  userPrincipalName: string;
  mail?: string;
  id?: string;
  quota?: {
    total: number;
    used: number;
    remaining: number;
    formattedTotal: string;
    formattedUsed: string;
    percentUsed: number;
    state: string;
  };
}

export interface OneDriveConfig {
  enabled: boolean;
  scheduleInterval: 'change' | '1h' | '6h' | '12h' | '24h' | 'manual';
  backupFolder: string;
  authProtocol: 'OAuth 2.0 Authorization Code Flow';
  authService: 'Microsoft Entra ID (原 Azure Active Directory)';
  scopes: string[];
  clientId: string;
  clientSecret?: string;
  tenantId: string;
  redirectUri: string;
  authStatus: 'connected' | 'unconfigured' | 'pending' | 'expired';
  accountInfo?: MicrosoftAccountInfo;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  lastBackupTime?: string;
  lastBackupStatus?: 'success' | 'failed' | 'running';
  lastBackupSummary?: string;
  lastBackupDetails?: {
    added: number;
    updated: number;
    deleted: number;
    total: number;
    fileName: string;
    fileSize: string;
    graphStatus?: string;
  };
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
  graphStatus?: string;
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

  // OneDrive Azure Entra OAuth 2.0 & Graph REST API
  getOneDriveConfig: () =>
    apiClient.get<OneDriveConfig>('/upload/onedrive/config'),

  saveOneDriveConfig: (config: Partial<OneDriveConfig>) =>
    apiClient.post<OneDriveConfig>('/upload/onedrive/config', config),

  getOneDriveAuthUrl: (redirectUri?: string) =>
    apiClient.post<{ authUrl: string; scopes: string[] }>('/upload/onedrive/auth-url', { redirectUri }),

  exchangeAuthCode: (code: string, redirectUri?: string) =>
    apiClient.post<OneDriveConfig>('/upload/onedrive/exchange-code', { code, redirectUri }),

  testOneDriveConnection: () =>
    apiClient.post<{
      success: boolean;
      message: string;
      account: string;
      quota?: MicrosoftAccountInfo['quota'];
    }>('/upload/onedrive/test'),

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
        graphStatus: string;
      };
    }>('/upload/onedrive/backup', { trigger }),

  getOneDriveHistory: () =>
    apiClient.get<BackupLog[]>('/upload/onedrive/history'),

  disconnectOneDrive: () =>
    apiClient.post<OneDriveConfig>('/upload/onedrive/disconnect'),
};
