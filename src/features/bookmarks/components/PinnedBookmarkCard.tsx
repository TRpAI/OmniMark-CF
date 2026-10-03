import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { Bookmark } from '../../../../packages/shared/types';
import { useBookmarkStore } from '../../../stores/bookmark.store';

interface PinnedBookmarkCardProps {
  bookmark: Bookmark;
}

export const PinnedBookmarkCard: React.FC<PinnedBookmarkCardProps> = ({ bookmark }) => {
  const { recordBookmarkClick } = useBookmarkStore();
  const [imgError, setImgError] = useState(false);

  const handleOpenLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordBookmarkClick(bookmark.id);
    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={handleOpenLink}
      title={`${bookmark.title}\n${bookmark.url}`}
      className="group flex items-center gap-1.5 sm:gap-2.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden select-none"
    >
      {/* Site Icon */}
      <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50 group-hover:scale-105 transition-transform">
        {bookmark.favicon && !imgError ? (
          <img
            src={bookmark.favicon}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 object-contain rounded"
          />
        ) : (
          <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-500" />
        )}
      </div>

      {/* Site Name Only */}
      <span className="text-[11px] sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {bookmark.title}
      </span>
    </div>
  );
};
