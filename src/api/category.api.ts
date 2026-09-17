import { apiClient } from './client';
import { Category } from '../../packages/shared/types';

export const categoryApi = {
  list: () =>
    apiClient.get<(Category & { count: number })[]>('/categories'),

  create: (data: Partial<Category>) =>
    apiClient.post<Category>('/categories', data),

  update: (id: string, data: Partial<Category>) =>
    apiClient.put<Category>(`/categories/${id}`, data),

  delete: (id: string, deleteBookmarks = false) =>
    apiClient.delete(`/categories/${id}?deleteBookmarks=${deleteBookmarks}`),

  reorder: (items: { id: string; sortOrder: number }[]) =>
    apiClient.post('/categories/batch/reorder', { items }),
};
