import React from 'react';
import { Pin } from 'lucide-react';
import { BookmarkCard } from './BookmarkCard';
import { PinnedBookmarkCard } from './PinnedBookmarkCard';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { EmptyState } from '../../../components/EmptyState';
import { renderCategoryIcon } from '../../../utils/iconMap';

export const BookmarkGrid: React.FC = () => {
  const { bookmarks, categories, activeCategoryId, searchQuery, settings, setSearchQuery, setActiveCategory } =
    useBookmarkStore();

  // Filter & Rank bookmarks
  const query = searchQuery.toLowerCase().trim();

  let filtered = bookmarks;
  if (query) {
    const scored = bookmarks
      .map((b) => {
        let score = 0;
        const titleLower = b.title.toLowerCase();
        const descLower = (b.description || '').toLowerCase();
        const urlLower = b.url.toLowerCase();
        const tags = b.tags || [];

        // 1. 标题匹配 (最高权重 100+)
        if (titleLower === query) score += 200;
        else if (titleLower.startsWith(query)) score += 150;
        else if (titleLower.includes(query)) score += 100;

        // 2. 标签匹配 (高权重 60+)
        if (tags.some((t) => t.toLowerCase() === query)) score += 80;
        else if (tags.some((t) => t.toLowerCase().includes(query))) score += 60;

        // 3. 描述匹配 (中等权重 30+)
        if (descLower.includes(query)) score += 30;

        // 4. 网址匹配 (低权重 10+)
        if (urlLower.includes(query)) score += 10;

        return { bookmark: b, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    filtered = scored.map((item) => item.bookmark);
  }

  // If specific category is selected
  if (activeCategoryId !== 'all' && !query) {
    filtered = filtered.filter((b) => b.categoryId === activeCategoryId);
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        title={query ? `未找到包含 "${searchQuery}" 的书签` : '此分类下暂无书签'}
        description={
          query
            ? '尝试缩短搜索词，或按回车使用搜索引擎查找全网内容'
            : '您可以登录管理后台为此分类添加第一条书签，或从浏览器导入 HTML 书签'
        }
        onReset={query ? () => setSearchQuery('') : () => setActiveCategory('all')}
        resetText={query ? '清除搜索词' : '查看全部书签'}
      />
    );
  }

  // Pinned bookmarks (Only show in 'all' view when not actively searching)
  const pinnedBookmarks = filtered.filter((b) => b.isPinned);
  const showPinnedSection =
    settings.enablePinnedSection && activeCategoryId === 'all' && !query && pinnedBookmarks.length > 0;

  // If active category is 'all' and not searching, show grouped by categories
  const showGrouped = activeCategoryId === 'all' && !query;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-8">
      {/* 1. 常用置顶栏 (Quick Launch Bar: Icon + Title) */}
      {showPinnedSection && (
        <section className="p-2 sm:p-4.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-sky-50/60 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-sky-950/20 border border-indigo-100/80 dark:border-indigo-900/30">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
            <div className="p-0.5 sm:p-1 rounded bg-indigo-600 text-white shadow-xs">
              <Pin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
              常用置顶
            </h2>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500">
              ({pinnedBookmarks.length})
            </span>
          </div>
          {/* Quick-Launch Grid: 移动端 2 列紧凑胶囊网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2.5">
            {pinnedBookmarks.map((bm) => (
              <PinnedBookmarkCard key={`pinned-${bm.id}`} bookmark={bm} />
            ))}
          </div>
        </section>
      )}

      {/* 2. Grouped By Categories OR Filtered List */}
      {showGrouped ? (
        categories.map((cat) => {
          const catBookmarks = filtered.filter((b) => b.categoryId === cat.id);
          if (catBookmarks.length === 0) return null;

          return (
            <section key={cat.id} id={`category-${cat.id}`} className="scroll-mt-24">
              <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3.5 pb-1 sm:pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                    {renderCategoryIcon(cat.icon, 'w-3.5 h-3.5 sm:w-4 sm:h-4')}
                  </div>
                  <h2 className="text-xs sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                    {cat.name}
                  </h2>
                  <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono shrink-0">
                    {catBookmarks.length}
                  </span>
                </div>

                <button
                  onClick={() => setActiveCategory(cat.id)}
                  className="text-[11px] sm:text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0"
                >
                  仅看此分类 &rarr;
                </button>
              </div>

              {/* 移动端 2 列紧凑胶囊网格 (和常用置顶样式完全统一) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-4">
                {catBookmarks.map((bm) => (
                  <BookmarkCard key={bm.id} bookmark={bm} />
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <section>
          <div className="flex items-center justify-between mb-2 sm:mb-4 pb-1 sm:pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
            <h2 className="text-xs sm:text-base font-bold text-zinc-900 dark:text-white">
              {query
                ? `搜索结果 (${filtered.length})`
                : categories.find((c) => c.id === activeCategoryId)?.name || '全部书签'}
            </h2>
          </div>
          {/* 移动端 2 列紧凑胶囊网格 (和常用置顶样式完全统一) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-4">
            {filtered.map((bm) => (
              <BookmarkCard key={bm.id} bookmark={bm} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
