import React from 'react';
import {
  Layers,
  Lock,
  ExternalLink,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { renderCategoryIcon } from '../../../utils/iconMap';
import { MobileCategoryDrawer } from './MobileCategoryDrawer';

export const CategoryTabs: React.FC = () => {
  const {
    categories,
    customPages,
    activeCategoryId,
    activePageId,
    setActiveCategory,
    setActivePage,
    bookmarks,
    settings,
  } = useBookmarkStore();

  const { setMobileCategoryDrawerOpen } = useUiStore();

  const totalCount = bookmarks.length;

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. Mobile Narrow-Screen Compact Bar (< md)                                */}
      {/* 优化移动端窄屏：轻量横向滚动分类胶囊与“更多分类”侧边栏入口              */}
      {/* ========================================================================= */}
      <div className="block md:hidden w-full px-3 mb-3 select-none">
        {/* Quick Horizontal Swipeable Category Pills on Mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
          {/* 全部 */}
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeCategoryId === 'all' && !activePageId
                ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                : 'bg-white/90 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>全部 ({totalCount})</span>
          </button>

          {/* 站点快讯 */}
          {settings.enableSiteFeed !== false && (
            <button
              type="button"
              onClick={() => setActivePage('site-feed')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activePageId === 'site-feed'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-2xs'
                  : 'bg-white/90 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>快讯</span>
            </button>
          )}

          {/* Top 4 Categories for rapid 1-tap switching */}
          {categories.slice(0, 5).map((cat) => {
            const isActive = activeCategoryId === cat.id && !activePageId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                    : 'bg-white/90 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100'
                }`}
              >
                {renderCategoryIcon(cat.icon, 'w-3 h-3')}
                <span>{cat.name}</span>
              </button>
            );
          })}

          {/* "更多..." 触发侧边栏按钮 */}
          <button
            type="button"
            onClick={() => setMobileCategoryDrawerOpen(true)}
            className="px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60"
          >
            <span>更多分类...</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Desktop Responsive Grid (>= md)                                        */}
      {/* 平板与桌面端：保持整齐划一的等长胶囊网格，清晰美观                          */}
      {/* ========================================================================= */}
      <div className="hidden md:block w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4 sm:mb-8 select-none">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5 pb-2.5 sm:pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80 w-full max-w-full">
          {/* 1. 全部书签 等长胶囊 */}
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`w-full h-10 sm:h-11 flex items-center justify-between px-3 sm:px-3.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-2xs select-none ${
              activeCategoryId === 'all' && !activePageId
                ? 'bg-indigo-600 text-white font-semibold shadow-xs ring-2 ring-indigo-500/25 border border-indigo-600'
                : 'bg-white/95 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-800/80'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">全部书签</span>
            </div>
            <span
              className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-mono font-medium leading-none shrink-0 ml-1.5 ${
                activeCategoryId === 'all' && !activePageId
                  ? 'bg-white/20 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* 2. 站点快讯 / 最新动态 Feed 等长胶囊 */}
          {settings.enableSiteFeed !== false && (
            <button
              type="button"
              onClick={() => setActivePage('site-feed')}
              className={`w-full h-10 sm:h-11 flex items-center justify-between px-3 sm:px-3.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-2xs select-none relative group ${
                activePageId === 'site-feed'
                  ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 text-white font-semibold shadow-xs ring-2 ring-indigo-500/25 border border-indigo-500'
                  : 'bg-white/95 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                <Sparkles
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                    activePageId === 'site-feed' ? 'text-amber-300' : 'text-amber-500'
                  }`}
                />
                <span className="truncate">
                  {settings.siteFeedTitle ? settings.siteFeedTitle.split(' ')[0] : '站点快讯'}
                </span>
              </div>
              <span className="relative flex h-2 w-2 shrink-0 ml-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
            </button>
          )}

          {/* 3. 各分类 等长胶囊 */}
          {categories.map((cat) => {
            const isActive = activeCategoryId === cat.id && !activePageId;
            const actualCount = bookmarks.filter((b) => b.categoryId === cat.id).length;
            const displayCount = actualCount > 0 ? actualCount : cat.count || 0;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full h-10 sm:h-11 flex items-center justify-between px-3 sm:px-3.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-2xs select-none ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs ring-2 ring-indigo-500/25 border border-indigo-600'
                    : 'bg-white/95 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                  {renderCategoryIcon(cat.icon, 'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0')}
                  <span className="truncate">{cat.name}</span>
                  {cat.isPrivate && (
                    <span title="私密分类" className="p-0.5 text-amber-500/90 dark:text-amber-400/90 shrink-0">
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-mono font-medium leading-none shrink-0 ml-1.5 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {displayCount}
                </span>
              </button>
            );
          })}

          {/* 4. 自定义独立页面 等长胶囊 */}
          {customPages &&
            customPages.length > 0 &&
            customPages.map((page) => {
              const isActive = activePageId === page.id;

              const handleClick = () => {
                if (page.linkUrl && page.openInNewTab) {
                  window.open(page.linkUrl, '_blank', 'noopener,noreferrer');
                } else if (page.linkUrl) {
                  window.location.href = page.linkUrl;
                } else {
                  setActivePage(page.id);
                }
              };

              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={handleClick}
                  className={`w-full h-10 sm:h-11 flex items-center justify-between px-3 sm:px-3.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-2xs select-none ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs ring-2 ring-indigo-500/25 border border-indigo-600'
                      : 'bg-white/95 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                    {renderCategoryIcon(page.icon || 'FileText', 'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0')}
                    <span className="truncate">{page.title}</span>
                    {page.isPrivate && (
                      <span title="私密页面" className="p-0.5 text-amber-500/90 dark:text-amber-400/90 shrink-0">
                        <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </span>
                    )}
                  </div>
                  {page.linkUrl && <ExternalLink className="w-3 h-3 opacity-60 shrink-0 ml-1.5" />}
                </button>
              );
            })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Mobile Category Sidebar Drawer (可展开与隐藏的侧边抽屉)                  */}
      {/* ========================================================================= */}
      <MobileCategoryDrawer />
    </>
  );
};
