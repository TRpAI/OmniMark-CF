import React from 'react';
import {
  LayoutDashboard,
  Bookmark,
  Folder,
  ArrowLeft,
  FileCode2,
  Settings,
  Shield,
  ExternalLink,
  BookOpen,
  Rss,
  Sparkles,
  Database,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useUiStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { useBookmarkStore } from '../stores/bookmark.store';
import { Dashboard } from '../features/admin/components/Dashboard';
import { BookmarkManager } from '../features/admin/components/BookmarkManager';
import { FeedManager } from '../features/admin/components/FeedManager';
import { CategoryManager } from '../features/admin/components/CategoryManager';
import { UserManager } from '../features/admin/components/UserManager';
import { ImportExport } from '../features/admin/components/ImportExport';
import { SettingsManager } from '../features/admin/components/SettingsManager';
import { PageManager } from '../features/admin/components/PageManager';

interface NavItem {
  id: 'dashboard' | 'bookmarks' | 'feed' | 'categories' | 'pages' | 'users' | 'import-export' | 'settings';
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  highlight?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const AdminPage: React.FC = () => {
  const { adminTab, setAdminTab, setCurrentView } = useUiStore();
  const { user } = useAuthStore();
  const { bookmarks, categories, customPages, settings } = useBookmarkStore();

  const feedCount = bookmarks.filter(
    (b) => b.inFeed || (settings.feedBookmarkIds && settings.feedBookmarkIds.includes(b.id))
  ).length;

  // Grouped Navigation Structure for clean hierarchy
  const navSections: NavSection[] = [
    {
      title: '总览看板',
      items: [
        {
          id: 'dashboard',
          label: '控制面板',
          icon: LayoutDashboard,
          badge: `${bookmarks.length} 站点`,
          badgeColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
        },
      ],
    },
    {
      title: '内容与动态排布',
      items: [
        {
          id: 'bookmarks',
          label: '书签管理',
          icon: Bookmark,
          badge: `${bookmarks.length}`,
          badgeColor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
        },
        {
          id: 'feed',
          label: '快讯动态配置',
          icon: Rss,
          badge: `${feedCount} 篇精选`,
          badgeColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold',
          highlight: true,
        },
        {
          id: 'categories',
          label: '分类管理',
          icon: Folder,
          badge: `${categories.length}`,
          badgeColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
        },
        {
          id: 'pages',
          label: '自定义页面',
          icon: BookOpen,
          badge: `${customPages.length}`,
          badgeColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
        },
      ],
    },
    {
      title: '系统与数据安全',
      items: [
        {
          id: 'settings',
          label: '全局设置',
          icon: Settings,
        },
        {
          id: 'users',
          label: '安全与存储',
          icon: Shield,
          badge: '本地原子库',
          badgeColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
        },
        {
          id: 'import-export',
          label: '导入与备份',
          icon: FileCode2,
          badge: 'OneDrive / HTML',
          badgeColor: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300',
        },
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* 1. Modern Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 mb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('home')}
            className="p-2.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer shrink-0 shadow-xs"
            title="返回前台主页"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                OmniMark 管理工作台
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50">
                v2.2 Pro
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              当前管理员：<span className="font-semibold text-zinc-800 dark:text-zinc-200">{user?.username || 'admin'}</span> · 已登录状态
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setCurrentView('home')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs"
          >
            <span>返回前台主页</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Mobile Horizontal Navigation Tabs (Visible on small screens) */}
      <div className="lg:hidden mb-6 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max p-1 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
          {navSections.flatMap((s) => s.items).map((item) => {
            const Icon = item.icon;
            const isActive = adminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAdminTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Split Layout: Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Desktop Navigation Sidebar (4 cols) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/90 border border-zinc-200/60 dark:border-zinc-800/80 shadow-xs space-y-5">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                  {section.title}
                </div>

                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = adminTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setAdminTab(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                          isActive
                            ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-700/50'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono shrink-0 ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Storage & Health Status Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-850 border border-zinc-200/60 dark:border-zinc-800 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span>系统存储健康度</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                就绪 (OK)
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              本地原子 JSON 数据库持续同步，支持全量冷备份与多格式导入导出。
            </p>
          </div>
        </aside>

        {/* Main Content Workspace (9 cols) */}
        <main className="lg:col-span-9 min-w-0">
          {adminTab === 'dashboard' && <Dashboard />}
          {adminTab === 'bookmarks' && <BookmarkManager />}
          {adminTab === 'feed' && <FeedManager />}
          {adminTab === 'categories' && <CategoryManager />}
          {adminTab === 'pages' && <PageManager />}
          {adminTab === 'users' && <UserManager />}
          {adminTab === 'import-export' && <ImportExport />}
          {adminTab === 'settings' && <SettingsManager />}
        </main>
      </div>
    </div>
  );
};
