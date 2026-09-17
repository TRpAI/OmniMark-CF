export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  ipHash?: string;
  userAgentHash?: string;
  expiresAt: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  categoryId: string;
  title: string;
  url: string;
  description: string;
  favicon?: string;
  tags: string[];
  clickCount: number;
  sortOrder: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchEngine {
  id: string;
  name: string;
  placeholder: string;
  searchUrl: string; // e.g. "https://www.google.com/search?q="
  icon: string;
}

export interface SiteSettings {
  title: string;
  subtitle: string;
  logoText: string;
  footerText: string;
  announcement?: string;
  enableClickCounter: boolean;
  enablePinnedSection: boolean;
  searchEngines: SearchEngine[];
  defaultSearchEngineId: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StatsData {
  totalBookmarks: number;
  totalCategories: number;
  totalClicks: number;
  pinnedBookmarks: number;
  topBookmarks: Bookmark[];
}
