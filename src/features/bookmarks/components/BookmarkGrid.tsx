import React from 'react';
import { Pin, Sparkles, Folder } from 'lucide-react';
import { BookmarkCard } from './BookmarkCard';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { EmptyState } from '../../../components/EmptyState';
import { renderCategoryIcon } from '../../../utils/iconMap';

export const BookmarkGrid: React.FC = () => {
  const { bookmarks, categories, activeCategoryId, searchQuery, settings, setSearchQuery, setActiveCategory } =
    useBookmarkStore();

  // Filter bookmarks
  const query = searchQuery.toLowerCase().trim();

  let filtered = bookmarks;
  if (query) {
    filtered = filtered.filter(
      (b) =>
        b.title.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query) ||
        b.tags.some((t) => t.toLowerCase().includes(query))
    );
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      {/* 1. Pinned / Quick Launch Bar */}
      {showPinnedSection && (
        <section className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-sky-50/60 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-sky-950/20 border border-indigo-100/80 dark:border-indigo-900/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1 rounded-lg bg-indigo-600 text-white shadow-sm">
              <Pin className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
              常用置顶站点
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ({pinnedBookmarks.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pinnedBookmarks.map((bm) => (
              <BookmarkCard key={`pinned-${bm.id}`} bookmark={bm} />
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
              <div className="flex items-center justify-between gap-3 mb-4 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {renderCategoryIcon(cat.icon, 'w-4 h-4')}
                  </div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    {cat.name}
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                    {catBookmarks.length}
                  </span>
                </div>

                <button
                  onClick={() => setActiveCategory(cat.id)}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  仅看此分类 &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {catBookmarks.map((bm) => (
                  <BookmarkCard key={bm.id} bookmark={bm} />
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <section>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {query
                ? `搜索结果 (${filtered.length})`
                : categories.find((c) => c.id === activeCategoryId)?.name || '书签列表'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((bm) => (
              <BookmarkCard key={bm.id} bookmark={bm} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
