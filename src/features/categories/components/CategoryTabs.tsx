import React from 'react';
import { Layers } from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { renderCategoryIcon } from '../../../utils/iconMap';

export const CategoryTabs: React.FC = () => {
  const { categories, activeCategoryId, setActiveCategory, bookmarks } = useBookmarkStore();

  const totalCount = bookmarks.length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-zinc-200/80 dark:border-zinc-800/80">
        {/* 'All' Tab */}
        <button
          onClick={() => setActiveCategory('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeCategoryId === 'all'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>全部书签</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
              activeCategoryId === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {/* Categories Tabs */}
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          // 计算当前分类下实际的书签数量（优先通过已加载的 bookmarks 进行动态实时计算）
          const actualCount = bookmarks.filter((b) => b.categoryId === cat.id).length;
          const displayCount = actualCount > 0 ? actualCount : (cat.count || 0);

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
              }`}
            >
              {renderCategoryIcon(cat.icon, 'w-4 h-4')}
              <span>{cat.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
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
      </div>
    </div>
  );
};
