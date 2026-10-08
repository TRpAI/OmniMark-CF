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
  isPrivate?: boolean;
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
  isPrivate?: boolean;
  inFeed?: boolean; // 是否加入站点快讯 (精选/动态展示)
  feedCustomNote?: string; // 自定义快讯动态解读/最新简报
  feedHighlight?: boolean; // 是否在快讯中标记为精选/头条
  createdAt: string;
  updatedAt: string;
}

export interface CustomPage {
  id: string;
  title: string;
  slug?: string;
  icon?: string;
  content: string;
  linkUrl?: string;
  openInNewTab?: boolean;
  isPrivate?: boolean;
  sortOrder: number;
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

export type AiProviderType = 'gemini' | 'openai' | 'deepseek' | 'anthropic' | 'custom';

export interface AiModelOption {
  id: string;
  name: string;
  provider?: string;
  description?: string;
}

export interface SiteSettings {
  title: string;
  subtitle: string;
  logoText: string;
  footerText: string;
  announcement?: string;
  enableClickCounter: boolean;
  enablePinnedSection: boolean;
  enableSiteFeed?: boolean;        // 是否在导航栏启用站点快讯
  siteFeedTitle?: string;          // 站点快讯页面主标题
  siteFeedSubtitle?: string;       // 站点快讯页面副标题
  feedBookmarkIds?: string[];      // 明确选定加入快讯的书签ID列表
  maxBookmarksPerCategory?: number; // 首页每个分类默认最多展示书签数，0 为不限制
  maxTotalBookmarks?: number;       // 首页单分类/总列表默认最多展示书签数，0 为不限制
  searchEngines: SearchEngine[];
  defaultSearchEngineId: string;

  // AI 智能助手与多厂商模型配置
  aiProvider?: AiProviderType;          // 'gemini' | 'openai' | 'deepseek' | 'anthropic' | 'custom'
  aiApiKey?: string;                    // API Key / Token
  aiBaseUrl?: string;                   // 自定义 Base URL (例如 https://api.openai.com/v1, https://api.deepseek.com/v1, 自建 OneAPI/NewAPI/Ollama)
  aiModel?: string;                     // 当前选中的模型名称 (例如 gemini-3.5-flash, gpt-4o-mini, deepseek-chat, claude-3-5-haiku 等)
  aiCustomModelName?: string;           // 自定义模型名称
  aiCustomModels?: string[];            // 从上游获取到的或用户自定义保存的模型列表
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
