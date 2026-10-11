import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  Lock,
  ExternalLink,
  X,
  Search,
  ChevronRight,
  Bookmark as BookmarkIcon,
} from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { renderCategoryIcon } from '../../../utils/iconMap';

export const MobileCategoryDrawer: React.FC = () => {
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

  const { isMobileCategoryDrawerOpen, setMobileCategoryDrawerOpen } = useUiStore();
  const [filterText, setFilterText] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileCategoryDrawerOpen) {
        setMobileCategoryDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileCategoryDrawerOpen, setMobileCategoryDrawerOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isMobileCategoryDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setFilterText('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileCategoryDrawerOpen]);

  if (!isMobileCategoryDrawerOpen) return null;

  const totalBookmarksCount = bookmarks.length;

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredPages = (customPages || []).filter((p) =>
    p.title.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleSelectAll = () => {
    setActiveCategory('all');
    setMobileCategoryDrawerOpen(false);
  };

  const handleSelectFeed = () => {
    setActivePage('site-feed');
    setMobileCategoryDrawerOpen(false);
  };

  const handleSelectCategory = (catId: string) => {
    setActiveCategory(catId);
    setMobileCategoryDrawerOpen(false);
  };

  const handleSelectPage = (page: typeof customPages[0]) => {
    if (page.linkUrl && page.openInNewTab) {
      window.open(page.linkUrl, '_blank', 'noopener,noreferrer');
    } else if (page.linkUrl) {
      window.location.href = page.linkUrl;
    } else {
      setActivePage(page.id);
    }
    setMobileCategoryDrawerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 1. Backdrop Overlay */}
      <div
        onClick={() => setMobileCategoryDrawerOpen(false)}
        className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* 2. Slide-out Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="分类与独立页面导航"
        className="relative z-10 w-[84vw] max-w-xs sm:max-w-sm h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-left duration-250 ease-out"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white leading-none">
                分类与页面导航
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-none">
                全站共收录 {totalBookmarksCount} 个书签
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileCategoryDrawerOpen(false)}
            title="关闭侧边栏"
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Input */}
        <div className="px-3.5 py-2.5 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="快速过滤分类或独立页面..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-all"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText('')}
                className="absolute right-2 text-zinc-400 hover:text-zinc-600 text-xs p-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Categories List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Section: 核心导航 */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 pb-1 block">
              核心浏览
            </span>

            {/* 1. 全部书签 */}
            <button
              type="button"
              onClick={handleSelectAll}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeCategoryId === 'all' && !activePageId
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <BookmarkIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">全部书签</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                  activeCategoryId === 'all' && !activePageId
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {totalBookmarksCount}
              </span>
            </button>

            {/* 2. 站点快讯 */}
            {settings.enableSiteFeed !== false && (
              <button
                type="button"
                onClick={handleSelectFeed}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  activePageId === 'site-feed'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Sparkles
                    className={`w-4 h-4 shrink-0 ${
                      activePageId === 'site-feed' ? 'text-amber-300' : 'text-amber-500'
                    }`}
                  />
                  <span className="truncate">
                    {settings.siteFeedTitle ? settings.siteFeedTitle.split(' ')[0] : '站点快讯'}
                  </span>
                </div>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                </span>
              </button>
            )}
          </div>

          {/* Section: 书签分类 */}
          <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 pb-1 block">
              书签分类 ({filteredCategories.length})
            </span>

            {filteredCategories.length === 0 ? (
              <p className="text-xs text-zinc-400 px-2 py-3 text-center">无匹配分类</p>
            ) : (
              filteredCategories.map((cat) => {
                const isActive = activeCategoryId === cat.id && !activePageId;
                const actualCount = bookmarks.filter((b) => b.categoryId === cat.id).length;
                const displayCount = actualCount > 0 ? actualCount : cat.count || 0;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                      {renderCategoryIcon(cat.icon, 'w-4 h-4 shrink-0')}
                      <span className="truncate">{cat.name}</span>
                      {cat.isPrivate && (
                        <span title="私密分类" className="p-0.5 text-amber-500 shrink-0">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium shrink-0 ml-2 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {displayCount}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Section: 独立页面 */}
          {filteredPages.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 pb-1 block">
                独立页面 ({filteredPages.length})
              </span>

              {filteredPages.map((page) => {
                const isActive = activePageId === page.id;

                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => handleSelectPage(page)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                      {renderCategoryIcon(page.icon || 'FileText', 'w-4 h-4 shrink-0')}
                      <span className="truncate">{page.title}</span>
                      {page.isPrivate && (
                        <span title="私密页面" className="p-0.5 text-amber-500 shrink-0">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    {page.linkUrl ? (
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0 ml-1.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <span className="truncate">点击分类即时切换展示</span>
          <button
            type="button"
            onClick={() => setMobileCategoryDrawerOpen(false)}
            className="px-3 py-1.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer"
          >
            收起
          </button>
        </div>
      </div>
    </div>
  );
};
