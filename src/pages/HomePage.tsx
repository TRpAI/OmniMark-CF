import React from 'react';
import { SearchBar } from '../components/SearchBar';
import { MobileCategoryDrawer } from '../features/categories/components/MobileCategoryDrawer';
import { CategorySidebar } from '../features/categories/components/CategorySidebar';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
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
    <div className="flex w-full min-h-[calc(100vh-3.5rem)]">
      {/* 1. PC 宽屏左侧分类侧边栏导航 (>= lg) */}
      <CategorySidebar />

      {/* 2. 移动端/窄屏侧边栏呼出悬浮图标 (位于站点图标下方，不在页头) */}
      <button
        type="button"
        onClick={() => toggleMobileCategoryDrawer()}
        title="展开侧边分类导航栏"
        aria-label="展开侧边分类导航栏"
        className="fixed top-[66px] left-3 z-30 lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 shadow-md backdrop-blur-md text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 transition-all cursor-pointer group"
      >
        <Layers className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
      </button>

      {/* 3. 主体内容展示区域 */}
      <div className="flex-1 min-w-0 w-full max-w-full flex flex-col">
        {/* Hero Section */}
        <section className="pt-4 sm:pt-8 pb-2 sm:pb-3 text-center px-4">
          <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-1">
            {settings.title || 'OmniMark 站点导航'}
          </h1>
          <p className="text-[11px] sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
            {settings.subtitle || '高效、清爽、可自建的现代书签与导航系统'}
          </p>
        </section>

        {/* 站点公告展示条：后台设置了公告即动态在此展示，支持单次阅读关闭 */}
        <AnnouncementBanner />

        {/* Search Engine & Filter Bar (Displayed for bookmarks AND site-feed) */}
        {(!activePageId || activePageId === 'site-feed') && <SearchBar />}

        {/* Category Drawer for mobile screens (drawer popup when clicking left floating button) */}
        <MobileCategoryDrawer />

        {/* Dynamic Content: Site Feed OR Custom Page OR Bookmarks Grid */}
        <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-6">
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
        </div>

        {/* 站点详情弹窗 / 独立信息页面 (Bookmark Detail View) */}
        <BookmarkDetailModal />
      </div>
    </div>
  );
};
