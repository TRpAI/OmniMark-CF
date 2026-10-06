import React, { useState } from 'react';
import { Pin, ChevronDown, ChevronUp, ChevronRight, Lock } from 'lucide-react';
import { BookmarkCard } from './BookmarkCard';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { EmptyState } from '../../../components/EmptyState';
import { renderCategoryIcon } from '../../../utils/iconMap';

export const BookmarkGrid: React.FC = () => {
  const { bookmarks, categories, activeCategoryId, searchQuery, settings, setSearchQuery, setActiveCategory } =
    useBookmarkStore();

  // Local state for expanded categories in grouped mode
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  // Local state for expanded bookmarks in single category / search mode
  const [isExpandedSingle, setIsExpandedSingle] = useState(false);

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

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

  // Limits configured in backend settings
  const perCategoryLimit =
    settings.maxBookmarksPerCategory && settings.maxBookmarksPerCategory > 0
      ? settings.maxBookmarksPerCategory
      : 0;

  const totalLimit =
    settings.maxTotalBookmarks && settings.maxTotalBookmarks > 0
      ? settings.maxTotalBookmarks
      : 0;

  // Single category / search view bookmarks slicing
  const hasMoreSingle = totalLimit > 0 && filtered.length > totalLimit;
  const displayFiltered = hasMoreSingle && !isExpandedSingle
    ? filtered.slice(0, totalLimit)
    : filtered;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
      {/* 1. 常用置顶栏 (Quick Launch Bar: Icon + Title) */}
      {showPinnedSection && (
        <section className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-sky-50/60 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-sky-950/20 border border-indigo-100/80 dark:border-indigo-900/30">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="p-1 rounded-md bg-indigo-600 text-white shadow-xs">
              <Pin className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
              常用置顶
            </h2>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              ({pinnedBookmarks.length})
            </span>
          </div>
          {/* 常用置顶网格：与其它分类卡片样式完全保持一致 */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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

          const isExpanded = !!expandedCategories[cat.id];
          const hasMore = perCategoryLimit > 0 && catBookmarks.length > perCategoryLimit;
          const displayBookmarks = hasMore && !isExpanded
            ? catBookmarks.slice(0, perCategoryLimit)
            : catBookmarks;

          return (
            <section key={cat.id} id={`category-${cat.id}`} className="scroll-mt-24">
              <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 pb-2.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                    {renderCategoryIcon(cat.icon, 'w-4 h-4')}
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                    {cat.name}
                  </h2>
                  {cat.isPrivate && (
                    <span title="私密分类" className="p-0.5 text-amber-500/90 dark:text-amber-400/90 shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono shrink-0">
                    {catBookmarks.length}
                  </span>
                  {hasMore && !isExpanded && (
                    <span className="hidden sm:inline-block text-[11px] text-zinc-400">
                      (已显示前 {perCategoryLimit} 项)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasMore && (
                    <button
                      onClick={() => toggleCategoryExpand(cat.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>收起</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>展开全部 (+{catBookmarks.length - perCategoryLimit})</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveCategory(cat.id)}
                    title={`进入「${cat.name}」分类查看全部`}
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer group"
                  >
                    <span>更多</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* 移动端 2 列舒适胶囊网格 (和常用置顶样式完全统一，宽松舒适) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {displayBookmarks.map((bm) => (
                  <BookmarkCard key={bm.id} bookmark={bm} />
                ))}
              </div>

              {/* 展开更多 / 收起 底部快捷按钮 */}
              {hasMore && (
                <div className="mt-3.5 sm:mt-4 flex justify-center">
                  <button
                    onClick={() => toggleCategoryExpand(cat.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/90 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>收起部分书签 (保留前 {perCategoryLimit} 个)</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>展开查看剩余 {catBookmarks.length - perCategoryLimit} 个书签 (共 {catBookmarks.length} 个)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </section>
          );
        })
      ) : (
        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                {query
                  ? `搜索结果 (${filtered.length})`
                  : categories.find((c) => c.id === activeCategoryId)?.name || '全部书签'}
              </h2>
              {hasMoreSingle && !isExpandedSingle && (
                <span className="text-xs text-zinc-400">
                  (已显示前 {totalLimit} 项)
                </span>
              )}
            </div>

            {activeCategoryId !== 'all' && (
              <button
                onClick={() => setActiveCategory('all')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                &larr; 返回全部分类
              </button>
            )}
          </div>

          {/* 移动端 2 列舒适胶囊网格 (和常用置顶样式完全统一) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {displayFiltered.map((bm) => (
              <BookmarkCard key={bm.id} bookmark={bm} />
            ))}
          </div>

          {/* 单分类/搜索列表展开全部按钮 */}
          {hasMoreSingle && (
            <div className="mt-3.5 sm:mt-4 flex justify-center">
              <button
                onClick={() => setIsExpandedSingle(!isExpandedSingle)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
              >
                {isExpandedSingle ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>收起展示 (保留前 {totalLimit} 个)</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>展开剩余 {filtered.length - totalLimit} 个书签 (共 {filtered.length} 个)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
