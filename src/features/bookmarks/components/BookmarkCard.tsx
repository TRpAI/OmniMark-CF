import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Pin, Eye, Globe } from 'lucide-react';
import { Bookmark } from '../../../../packages/shared/types';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';

interface BookmarkCardProps {
  bookmark: Bookmark;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark }) => {
  const { recordBookmarkClick, settings } = useBookmarkStore();
  const { showToast } = useUiStore();
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleOpenLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordBookmarkClick(bookmark.id);
    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(bookmark.url);
    setCopied(true);
    showToast('链接已复制到剪贴板', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  let hostname = '';
  try {
    hostname = new URL(bookmark.url).hostname.replace(/^www\./, '');
  } catch {
    hostname = bookmark.url;
  }

  return (
    <div
      onClick={handleOpenLink}
      className="group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Top section: Icon & Details */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3 min-w-0">
            {/* Favicon container */}
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50 group-hover:scale-105 transition-transform">
              {bookmark.favicon && !imgError ? (
                <img
                  src={bookmark.favicon}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-6 h-6 object-contain rounded"
                />
              ) : (
                <Globe className="w-5 h-5 text-indigo-500" />
              )}
            </div>

            {/* Title & Hostname */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {bookmark.title}
                </h3>
                {bookmark.isPinned && (
                  <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500/20" />
                )}
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                {hostname}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              title="复制网址"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleOpenLink}
              title="在新标签页打开"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Description */}
        {bookmark.description && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-3">
            {bookmark.description}
          </p>
        )}
      </div>

      {/* Bottom section: Tags & Clicks */}
      <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
          {bookmark.tags && bookmark.tags.length > 0 ? (
            bookmark.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-zinc-300 dark:text-zinc-600 text-[11px]">—</span>
          )}
        </div>

        {/* Click counter */}
        {settings.enableClickCounter && (
          <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-[11px] shrink-0">
            <Eye className="w-3 h-3" />
            <span>{bookmark.clickCount || 0}</span>
          </div>
        )}
      </div>
    </div>
  );
};
