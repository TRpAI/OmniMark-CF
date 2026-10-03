import React from 'react';
import { Layers } from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { renderCategoryIcon } from '../../../utils/iconMap';

export const CategoryTabs: React.FC = () => {
  const { categories, activeCategoryId, setActiveCategory, bookmarks } = useBookmarkStore();

  const totalCount = bookmarks.length;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-4 sm:mb-8">
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 sm:pb-2 scrollbar-none border-b border-zinc-200/80 dark:border-zinc-800/80">
        {/* 'All' Tab */}
        <button
          onClick={() => setActiveCategory('all')}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeCategoryId === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>全部书签</span>
          <span
            className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full font-mono font-medium ${
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
      </div>
    </div>
  );
};
