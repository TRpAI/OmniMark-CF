import { apiClient } from './client';
import { SiteSettings } from '../../packages/shared/types';

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
};
