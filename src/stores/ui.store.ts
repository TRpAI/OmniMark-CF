import { create } from 'zustand';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UiState {
  currentView: 'home' | 'admin';
  isLoginModalOpen: boolean;
  toasts: ToastMessage[];
  adminTab: 'dashboard' | 'bookmarks' | 'categories' | 'users' | 'import-export' | 'cloudflare' | 'settings';

  setCurrentView: (view: 'home' | 'admin') => void;
  setLoginModalOpen: (open: boolean) => void;
  setAdminTab: (tab: 'dashboard' | 'bookmarks' | 'categories' | 'users' | 'import-export' | 'cloudflare' | 'settings') => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentView: 'home',
  isLoginModalOpen: false,
  toasts: [],
  adminTab: 'dashboard',

  setCurrentView: (view) => set({ currentView: view }),
  setLoginModalOpen: (open) => set({ isLoginModalOpen: open }),
  setAdminTab: (tab) => set({ adminTab: tab }),

  showToast: (message, type = 'info') => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
