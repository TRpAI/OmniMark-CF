import React from 'react';
import { SearchBar } from '../components/SearchBar';
import { CategoryTabs } from '../features/categories/components/CategoryTabs';
import { BookmarkGrid } from '../features/bookmarks/components/BookmarkGrid';
import { CustomPageViewer } from '../features/pages/components/CustomPageViewer';
import { SiteFeedViewer } from '../features/feed/components/SiteFeedViewer';
import { BookmarkDetailModal } from '../features/bookmarks/components/BookmarkDetailModal';
import { useBookmarkStore } from '../stores/bookmark.store';
import { Megaphone } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { settings, isLoading, activePageId } = useBookmarkStore();

  return (
    <div className="flex flex-col justify-between overflow-x-hidden w-full max-w-full">
      <div className="w-full max-w-full">
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

        {/* Search Engine & Filter Bar (Displayed for bookmarks AND site-feed) */}
        {(!activePageId || activePageId === 'site-feed') && <SearchBar />}

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
      </div>
    </div>
  );
};
