import { create } from 'zustand';
import { Bookmark, Category, SiteSettings, StatsData } from '../../packages/shared/types';
import { bookmarkApi } from '../api/bookmark.api';
import { categoryApi } from '../api/category.api';
import { settingsApi } from '../api/settings.api';
import { DEFAULT_SETTINGS } from '../../packages/shared/constants';

interface BookmarkState {
  bookmarks: Bookmark[];
  categories: (Category & { count?: number })[];
  settings: SiteSettings;
  stats: StatsData | null;
  activeCategoryId: string;
  searchQuery: string;
  selectedEngineId: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadInitialData: () => Promise<void>;
  setActiveCategory: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setSelectedEngine: (id: string) => void;
  recordBookmarkClick: (id: string) => Promise<void>;

  // Management actions
  createBookmark: (data: Partial<Bookmark>) => Promise<Bookmark>;
  updateBookmark: (id: string, data: Partial<Bookmark>) => Promise<Bookmark>;
  deleteBookmark: (id: string) => Promise<void>;
  reorderBookmarks: (items: { id: string; sortOrder: number; categoryId?: string }[]) => Promise<void>;

  createCategory: (data: Partial<Category>) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: string, deleteBookmarks?: boolean) => Promise<void>;
  reorderCategories: (items: { id: string; sortOrder: number }[]) => Promise<void>;

  updateSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  categories: [],
  settings: DEFAULT_SETTINGS,
  stats: null,
  activeCategoryId: 'all',
  searchQuery: '',
  selectedEngineId: 'google',
  isLoading: false,
  error: null,

  loadInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [bookmarks, categories, settings] = await Promise.all([
        bookmarkApi.list(),
        categoryApi.list(),
        settingsApi.getSettings().catch(() => DEFAULT_SETTINGS),
      ]);

      set({
        bookmarks,
        categories,
        settings,
        selectedEngineId: settings.defaultSearchEngineId || 'google',
        isLoading: false,
      });
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  setActiveCategory: (id) => set({ activeCategoryId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedEngine: (id) => set({ selectedEngineId: id }),

  recordBookmarkClick: async (id: string) => {
    // Optimistically update click count
    set((state) => ({
      bookmarks: state.bookmarks.map((b) =>
        b.id === id ? { ...b, clickCount: (b.clickCount || 0) + 1 } : b
      ),
    }));
    try {
      await bookmarkApi.recordClick(id);
    } catch (e) {
      console.warn('Failed to record bookmark click on server:', e);
    }
  },

  createBookmark: async (data) => {
    const created = await bookmarkApi.create(data);
    set((state) => ({ bookmarks: [created, ...state.bookmarks] }));
    get().loadInitialData(); // Refresh counts
    return created;
  },

  updateBookmark: async (id, data) => {
    const updated = await bookmarkApi.update(id, data);
    set((state) => ({
      bookmarks: state.bookmarks.map((b) => (b.id === id ? updated : b)),
    }));
    return updated;
  },

  deleteBookmark: async (id) => {
    await bookmarkApi.delete(id);
    set((state) => ({
      bookmarks: state.bookmarks.filter((b) => b.id !== id),
    }));
    get().loadInitialData();
  },

  reorderBookmarks: async (items) => {
    await bookmarkApi.reorder(items);
    get().loadInitialData();
  },

  createCategory: async (data) => {
    const created = await categoryApi.create(data);
    set((state) => ({ categories: [...state.categories, { ...created, count: 0 }] }));
    return created;
  },

  updateCategory: async (id, data) => {
    const updated = await categoryApi.update(id, data);
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? { ...c, ...updated } : c)),
    }));
    return updated;
  },

  deleteCategory: async (id, deleteBookmarks = false) => {
    await categoryApi.delete(id, deleteBookmarks);
    get().loadInitialData();
  },

  reorderCategories: async (items) => {
    await categoryApi.reorder(items);
    get().loadInitialData();
  },

  updateSettings: async (newSettings) => {
    const updated = await settingsApi.updateSettings(newSettings);
    set({ settings: updated });
  },

  refreshStats: async () => {
    try {
      const stats = await bookmarkApi.getStats();
      set({ stats });
    } catch {}
  },
}));
