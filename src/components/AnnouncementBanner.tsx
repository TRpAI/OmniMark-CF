import React, { useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { useBookmarkStore } from '../stores/bookmark.store';

export const AnnouncementBanner: React.FC = () => {
  const { settings } = useBookmarkStore();
  const [isDismissed, setIsDismissed] = useState(false);

  const announcement = settings.announcement?.trim();

  if (!announcement || isDismissed) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="relative flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-xs sm:text-sm text-indigo-950 dark:text-indigo-100 shadow-2xs backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white shadow-2xs shrink-0">
            <Megaphone className="w-3 h-3" />
            <span>站点公告</span>
          </span>
          <span className="truncate sm:whitespace-normal font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
            {announcement}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          title="关闭公告"
          aria-label="关闭站点公告"
          className="p-1 rounded-lg text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
