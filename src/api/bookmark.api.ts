import { apiClient } from './client';
import { Bookmark, StatsData } from '../../packages/shared/types';

export interface BookmarkFilter {
  categoryId?: string;
  search?: string;
  isPinned?: boolean;
}

export const bookmarkApi = {
  list: (filter?: BookmarkFilter) =>
    apiClient.get<Bookmark[]>('/bookmarks', filter),

  getById: (id: string) =>
    apiClient.get<Bookmark>(`/bookmarks/${id}`),

  create: (data: Partial<Bookmark>) =>
    apiClient.post<Bookmark>('/bookmarks', data),

  update: (id: string, data: Partial<Bookmark>) =>
    apiClient.put<Bookmark>(`/bookmarks/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/bookmarks/${id}`),

  recordClick: (id: string) =>
    apiClient.post<{ clickCount: number }>(`/bookmarks/${id}/click`),

  reorder: (items: { id: string; sortOrder: number; categoryId?: string }[]) =>
    apiClient.post('/bookmarks/batch/reorder', { items }),

  batchDelete: (ids: string[]) =>
    apiClient.post<{ count: number }>('/bookmarks/batch/delete', { ids }),

  batchUpdate: (ids: string[], updates: Partial<Bookmark>) =>
    apiClient.post<Bookmark[]>('/bookmarks/batch/update', { ids, updates }),

  getStats: () =>
    apiClient.get<StatsData>('/bookmarks/stats'),
};
