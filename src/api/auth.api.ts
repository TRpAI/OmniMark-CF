import { apiClient } from './client';

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<{ token: string; user: { id: string; username: string } }>('/auth/login', { username, password }),

  me: () =>
    apiClient.get<{ id: string; username: string; createdAt: string }>('/auth/me'),

  logout: () =>
    apiClient.post('/auth/logout'),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { oldPassword, newPassword }),

  listUsers: () =>
    apiClient.get<{ id: string; username: string; createdAt: string }[]>('/auth/users'),

  createUser: (username: string, password: string) =>
    apiClient.post<{ id: string; username: string }>('/auth/users', { username, password }),

  deleteUser: (id: string) =>
    apiClient.delete(`/auth/users/${id}`),
};
