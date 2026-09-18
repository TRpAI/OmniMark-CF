import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import { apiClient } from '../api/client';

interface UserInfo {
  id: string;
  username: string;
  createdAt?: string;
  isDefaultPassword?: boolean;
}

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (password: string, username?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: apiClient.getToken(),
  isAuthenticated: Boolean(apiClient.getToken()),
  isLoading: false,
  error: null,

  login: async (password: string, username = 'admin') => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(password, username);
      apiClient.setToken(res.token);
      set({
        user: res.user,
        token: res.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || '管理密码验证失败，请重新输入',
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    apiClient.setToken(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    const token = apiClient.getToken();
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    set({ isLoading: true });
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      apiClient.setToken(null);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
