import React from 'react';
import { Layers, Lock, ExternalLink, Sparkles, Rss } from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { renderCategoryIcon } from '../../../utils/iconMap';

export const CategoryTabs: React.FC = () => {
  const { categories, customPages, activeCategoryId, activePageId, setActiveCategory, setActivePage, bookmarks } =
    useBookmarkStore();

  const totalCount = bookmarks.length;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-4 sm:mb-8">
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 sm:pb-2 scrollbar-none border-b border-zinc-200/80 dark:border-zinc-800/80">
        {/* 'All' Tab */}
        <button
          onClick={() => setActiveCategory('all')}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeCategoryId === 'all' && !activePageId
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>全部书签</span>
          <span
            className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full font-mono font-medium ${
              activeCategoryId === 'all' && !activePageId
                ? 'bg-white/20 text-white'
                : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {/* 站点快讯 / 最新动态 Feed Tab (精美聚合动态) */}
        <button
          onClick={() => setActivePage('site-feed')}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer relative group ${
            activePageId === 'site-feed'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activePageId === 'site-feed' ? 'text-amber-300' : 'text-amber-500'}`} />
          <span>站点快讯</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5 shrink-0" />

        {/* Categories Tabs */}
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id && !activePageId;
          const actualCount = bookmarks.filter((b) => b.categoryId === cat.id).length;
          const displayCount = actualCount > 0 ? actualCount : (cat.count || 0);

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
              }`}
            >
              {renderCategoryIcon(cat.icon, 'w-3.5 h-3.5 sm:w-4 sm:h-4')}
              <span>{cat.name}</span>
              {cat.isPrivate && (
                <span title="私密分类" className="p-0.5 text-amber-500/90 dark:text-amber-400/90">
                  <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </span>
              )}
              <span
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full font-mono font-medium ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {displayCount}
              </span>
            </button>
          );
        })}

        {/* Custom Pages Tabs (分类导航栏自定义页面) */}
        {customPages && customPages.length > 0 && (
          <>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />
            {customPages.map((page) => {
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
                  onClick={handleClick}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                  }`}
                >
                  {renderCategoryIcon(page.icon || 'FileText', 'w-3.5 h-3.5 sm:w-4 sm:h-4')}
                  <span>{page.title}</span>
                  {page.isPrivate && (
                    <span title="私密页面" className="p-0.5 text-amber-500/90 dark:text-amber-400/90">
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </span>
                  )}
                  {page.linkUrl && (
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};
