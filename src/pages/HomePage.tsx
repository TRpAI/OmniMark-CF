import React from 'react';
import { SearchBar } from '../components/SearchBar';
import { CategoryTabs } from '../features/categories/components/CategoryTabs';
import { BookmarkGrid } from '../features/bookmarks/components/BookmarkGrid';
import { CustomPageViewer } from '../features/pages/components/CustomPageViewer';
import { SiteFeedViewer } from '../features/feed/components/SiteFeedViewer';
import { BookmarkDetailModal } from '../features/bookmarks/components/BookmarkDetailModal';
import { useBookmarkStore } from '../stores/bookmark.store';
import { BrandLogo } from '../components/BrandLogo';
import { Megaphone, Cloud, Zap, Database, ShieldCheck } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { settings, isLoading, activePageId } = useBookmarkStore();

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <main className="pb-16 sm:pb-20">
        {/* Optional Announcement Banner */}
        {settings.announcement && (
          <div className="w-full bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 py-2 px-4 text-center">
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm text-indigo-700 dark:text-indigo-300">
              <Megaphone className="w-4 h-4 shrink-0 text-indigo-500" />
              <span>{settings.announcement}</span>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="pt-4 sm:pt-10 pb-2 sm:pb-4 text-center px-4">
          <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-1">
            {settings.title || 'OmniMark 站点导航'}
          </h1>
          <p className="text-[11px] sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
            {settings.subtitle || '高效、清爽、可自建的现代书签与导航系统'}
          </p>
        </section>

        {/* Search Engine & Filter Bar (hide when viewing custom page / feed to keep it clean) */}
        {!activePageId && <SearchBar />}

        {/* Category & Custom Page Navigation Pills */}
        <CategoryTabs />

        {/* Dynamic Content: Site Feed OR Custom Page OR Bookmarks Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          </div>
        ) : activePageId === 'site-feed' ? (
          <SiteFeedViewer />
        ) : activePageId ? (
          <CustomPageViewer />
        ) : (
          <BookmarkGrid />
        )}

        {/* 站点详情弹窗 / 独立信息页面 (Bookmark Detail View) */}
        <BookmarkDetailModal />
      </main>

      {/* 固定底部页脚 (Fixed Bottom Footer) */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md py-2.5 sm:py-3 px-4 text-center text-xs text-zinc-400 dark:text-zinc-500 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {settings.logoText || 'OmniMark'}
            </span>
          </div>

          {/* Minimalist Tech & Status Icons with Tooltips */}
          <div className="flex items-center gap-3">
            <span title="云端多端同步" className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Cloud className="w-4 h-4 text-sky-500" />
            </span>
            <span title="毫秒级极速响应" className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Zap className="w-4 h-4 text-amber-500" />
            </span>
            <span title="本地原子与云端增量存储" className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Database className="w-4 h-4 text-emerald-500" />
            </span>
            <span title="Secure Administration" className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
