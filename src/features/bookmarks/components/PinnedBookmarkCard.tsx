import React, { useState } from 'react';
import { Globe, Lock } from 'lucide-react';
import { Bookmark } from '../../../../packages/shared/types';
import { useBookmarkStore } from '../../../stores/bookmark.store';

interface PinnedBookmarkCardProps {
  bookmark: Bookmark;
}

export const PinnedBookmarkCard: React.FC<PinnedBookmarkCardProps> = ({ bookmark }) => {
  const { openBookmarkDetail } = useBookmarkStore();
  const [imgError, setImgError] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openBookmarkDetail(bookmark);
  };

  return (
    <div
      onClick={handleClick}
      title={`${bookmark.title}\n${bookmark.url}${bookmark.isPrivate ? ' (私密书签)' : ''}\n点击查看站点详情`}
      className="group flex items-center gap-3 px-3.5 py-3 sm:px-4 sm:py-3 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden select-none min-h-[52px]"
    >
      {/* Site Icon */}
      <div className="w-8 h-8 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/90 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200/60 dark:border-zinc-700/60 group-hover:scale-105 transition-transform">
        {bookmark.favicon && !imgError ? (
          <img
            src={bookmark.favicon}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-5 h-5 object-contain rounded"
          />
        ) : (
          <Globe className="w-4.5 h-4.5 text-indigo-500" />
        )}
      </div>

      {/* Site Name Only */}
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate flex-1 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {bookmark.title}
      </span>

      {/* Private Lock Indicator */}
      {bookmark.isPrivate && (
        <span title="私密书签，仅管理登录可见" className="shrink-0 p-0.5 text-amber-500/90 dark:text-amber-400/90">
          <Lock className="w-3.5 h-3.5" />
        </span>
      )}
    </div>
  );
};
