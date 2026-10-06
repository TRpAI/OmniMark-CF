import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import { apiClient } from '../api/client';
import { useBookmarkStore } from './bookmark.store';

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
  needsInit: boolean;
  isLoading: boolean;
  error: string | null;
  login: (password: string, username?: string) => Promise<boolean>;
  initAdminPassword: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: apiClient.getToken(),
  isAuthenticated: Boolean(apiClient.getToken()),
  needsInit: false,
  isLoading: false,
  error: null,

  checkAuthStatus: async () => {
    try {
      const res = await authApi.status();
      const needs = Boolean(res?.needsInit);
      set({ needsInit: needs });
      return needs;
    } catch {
      return false;
    }
  },

  initAdminPassword: async (password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.initPassword(password);
      apiClient.setToken(res.token);
      set({
        user: res.user,
        token: res.token,
        isAuthenticated: true,
        needsInit: false,
        isLoading: false,
        error: null,
      });
      useBookmarkStore.getState().loadInitialData();
      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || '初始化密码失败，请重试',
      });
      return false;
    }
  },

  login: async (password: string, username = 'admin') => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(password, username);
      apiClient.setToken(res.token);
      set({
        user: res.user,
        token: res.token,
        isAuthenticated: true,
        needsInit: false,
        isLoading: false,
        error: null,
      });
      useBookmarkStore.getState().loadInitialData();
      return true;
    } catch (err: any) {
      const isNeedsInit = Boolean(err.needsInit) || (typeof err.message === 'string' && err.message.includes('尚未初始化'));
      set({
        isLoading: false,
        needsInit: isNeedsInit,
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
    useBookmarkStore.getState().loadInitialData();
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
