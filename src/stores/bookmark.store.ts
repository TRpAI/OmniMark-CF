import { create } from 'zustand';
import { Bookmark, Category, SiteSettings, StatsData, CustomPage } from '../../packages/shared/types';
import { bookmarkApi } from '../api/bookmark.api';
import { categoryApi } from '../api/category.api';
import { settingsApi } from '../api/settings.api';
import { pageApi } from '../api/page.api';
import { DEFAULT_SETTINGS, INITIAL_BOOKMARKS, INITIAL_CATEGORIES, INITIAL_PAGES } from '../../packages/shared/constants';

interface BookmarkState {
  bookmarks: Bookmark[];
  categories: (Category & { count?: number })[];
  customPages: CustomPage[];
  settings: SiteSettings;
  stats: StatsData | null;
  activeCategoryId: string;
  activePageId: string | null;
  searchQuery: string;
  selectedEngineId: string;
  selectedBookmarkDetail: Bookmark | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadInitialData: () => Promise<void>;
  setActiveCategory: (id: string) => void;
  setActivePage: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setSelectedEngine: (id: string) => void;
  openBookmarkDetail: (bookmark: Bookmark) => void;
  closeBookmarkDetail: () => void;
  recordBookmarkClick: (id: string) => Promise<void>;

  // Bookmark actions
  createBookmark: (data: Partial<Bookmark>) => Promise<Bookmark>;
  updateBookmark: (id: string, data: Partial<Bookmark>) => Promise<Bookmark>;
  deleteBookmark: (id: string) => Promise<void>;
  reorderBookmarks: (items: { id: string; sortOrder: number; categoryId?: string }[]) => Promise<void>;

  // Category actions
  createCategory: (data: Partial<Category>) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: string, deleteBookmarks?: boolean) => Promise<void>;
  reorderCategories: (items: { id: string; sortOrder: number }[]) => Promise<void>;

  // Custom Page actions
  createCustomPage: (data: Partial<CustomPage>) => Promise<CustomPage>;
  updateCustomPage: (id: string, data: Partial<CustomPage>) => Promise<CustomPage>;
  deleteCustomPage: (id: string) => Promise<void>;
  reorderCustomPages: (items: { id: string; sortOrder: number }[]) => Promise<void>;

  updateSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: INITIAL_BOOKMARKS,
  categories: INITIAL_CATEGORIES,
  customPages: INITIAL_PAGES,
  settings: DEFAULT_SETTINGS,
  stats: null,
  activeCategoryId: 'all',
  activePageId: null,
  searchQuery: '',
  selectedEngineId: 'google',
  selectedBookmarkDetail: null,
  isLoading: false,
  error: null,

  loadInitialData: async () => {
    try {
      const [bookmarks, categories, settings, pages] = await Promise.all([
        bookmarkApi.list().catch(() => null),
        categoryApi.list().catch(() => null),
        settingsApi.getSettings().catch(() => null),
        pageApi.list().catch(() => null),
      ]);

      set({
        bookmarks: bookmarks && Array.isArray(bookmarks) ? bookmarks : get().bookmarks,
        categories: categories && Array.isArray(categories) ? categories : get().categories,
        customPages: pages && Array.isArray(pages) ? pages : get().customPages,
        settings: settings || get().settings,
        selectedEngineId: (settings && settings.defaultSearchEngineId) || get().selectedEngineId,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.warn('Failed to load initial data from server, retaining local data:', err);
      set({ isLoading: false });
    }
  },

  setActiveCategory: (id) => set({ activeCategoryId: id, activePageId: null }),
  setActivePage: (id) => set({ activePageId: id, searchQuery: '' }),
  setSearchQuery: (q) => set({ searchQuery: q, activePageId: null }),
  setSelectedEngine: (id) => set({ selectedEngineId: id }),

  openBookmarkDetail: (bookmark) => {
    set({ selectedBookmarkDetail: bookmark });
  },

  closeBookmarkDetail: () => {
    set({ selectedBookmarkDetail: null });
  },

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
    const existing = get().bookmarks.find((b) => b.id === id);
    const fullData = existing ? { ...existing, ...data } : data;
    const updated = await bookmarkApi.update(id, fullData);
    set((state) => ({
      bookmarks: state.bookmarks.map((b) => (b.id === id ? { ...b, ...updated } : b)),
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

  createCustomPage: async (data) => {
    const created = await pageApi.create(data);
    set((state) => ({ customPages: [...state.customPages, created] }));
    return created;
  },

  updateCustomPage: async (id, data) => {
    const updated = await pageApi.update(id, data);
    set((state) => ({
      customPages: state.customPages.map((p) => (p.id === id ? updated : p)),
    }));
    return updated;
  },

  deleteCustomPage: async (id) => {
    await pageApi.delete(id);
    set((state) => ({
      customPages: state.customPages.filter((p) => p.id !== id),
      activePageId: state.activePageId === id ? null : state.activePageId,
    }));
  },

  reorderCustomPages: async (items) => {
    await pageApi.reorder(items);
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
