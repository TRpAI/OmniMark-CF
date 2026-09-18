import { apiClient } from './client';

export const authApi = {
  login: (password: string, username = 'admin') =>
    apiClient.post<{ token: string; user: { id: string; username: string; isDefaultPassword?: boolean } }>('/auth/login', {
      password,
      username,
    }),

  me: () =>
    apiClient.get<{ id: string; username: string; createdAt?: string; isDefaultPassword?: boolean }>('/auth/me'),

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
