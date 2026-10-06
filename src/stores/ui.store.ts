import { create } from 'zustand';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UiState {
  currentView: 'home' | 'admin';
  isLoginModalOpen: boolean;
  isAiAssistantOpen: boolean;
  aiTargetBookmarkId?: string;
  toasts: ToastMessage[];
  adminTab: 'dashboard' | 'bookmarks' | 'feed' | 'categories' | 'pages' | 'users' | 'import-export' | 'cloudflare' | 'settings';

  setCurrentView: (view: 'home' | 'admin') => void;
  setLoginModalOpen: (open: boolean) => void;
  setAiAssistantOpen: (open: boolean) => void;
  openAiAssistantWithBookmark: (bookmarkId: string) => void;
  toggleAiAssistant: () => void;
  setAdminTab: (tab: 'dashboard' | 'bookmarks' | 'feed' | 'categories' | 'pages' | 'users' | 'import-export' | 'cloudflare' | 'settings') => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentView: 'home',
  isLoginModalOpen: false,
  isAiAssistantOpen: false,
  toasts: [],
  adminTab: 'dashboard',

  setCurrentView: (view) => set({ currentView: view }),
  setLoginModalOpen: (open) => set({ isLoginModalOpen: open }),
  setAiAssistantOpen: (open) => set({ isAiAssistantOpen: open, aiTargetBookmarkId: open ? undefined : undefined }),
  openAiAssistantWithBookmark: (bookmarkId) => set({ isAiAssistantOpen: true, aiTargetBookmarkId: bookmarkId }),
  toggleAiAssistant: () => set((s) => ({ isAiAssistantOpen: !s.isAiAssistantOpen })),
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
