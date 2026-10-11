import React from 'react';
import { SearchBar } from '../components/SearchBar';
import { CategoryTabs } from '../features/categories/components/CategoryTabs';
import { BookmarkGrid } from '../features/bookmarks/components/BookmarkGrid';
import { CustomPageViewer } from '../features/pages/components/CustomPageViewer';
import { SiteFeedViewer } from '../features/feed/components/SiteFeedViewer';
import { BookmarkDetailModal } from '../features/bookmarks/components/BookmarkDetailModal';
import { useBookmarkStore } from '../stores/bookmark.store';
import { useUiStore } from '../stores/ui.store';
import { Layers } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { settings, isLoading, activePageId } = useBookmarkStore();
  const { toggleMobileCategoryDrawer } = useUiStore();

  return (
    <div className="flex flex-col justify-between overflow-x-hidden w-full max-w-full">
      {/* 移动端窄屏前台侧边栏按钮：以图标形式放置于站点图标下方，不在页头 */}
      <button
        type="button"
        onClick={() => toggleMobileCategoryDrawer()}
        title="展开侧边分类导航栏"
        aria-label="展开侧边分类导航栏"
        className="fixed top-[66px] left-3 z-30 md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 shadow-md backdrop-blur-md text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 transition-all cursor-pointer group"
      >
        <Layers className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
      </button>

      <div className="w-full max-w-full">

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
