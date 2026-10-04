import { apiClient } from './client';
import { CustomPage } from '../../packages/shared/types';

export const pageApi = {
  list: () =>
    apiClient.get<CustomPage[]>('/pages'),

  getById: (id: string) =>
    apiClient.get<CustomPage>(`/pages/${id}`),

  create: (data: Partial<CustomPage>) =>
    apiClient.post<CustomPage>('/pages', data),

  update: (id: string, data: Partial<CustomPage>) =>
    apiClient.put<CustomPage>(`/pages/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/pages/${id}`),

  reorder: (items: { id: string; sortOrder: number }[]) =>
    apiClient.post('/pages/batch/reorder', { items }),
};
