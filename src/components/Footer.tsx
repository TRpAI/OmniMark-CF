import React from 'react';
import { Cloud, Zap, Database, ShieldCheck } from 'lucide-react';
import { useBookmarkStore } from '../stores/bookmark.store';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const { settings } = useBookmarkStore();

  return (
    <footer
      className={`border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] sm:py-3 px-4 text-center text-xs text-zinc-400 dark:text-zinc-500 shadow-xs transition-colors shrink-0 ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand info */}
        <div className="flex items-center gap-2">
          <BrandLogo size="sm" />
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {settings.logoText || 'OmniMark'}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            · 现代书签与导航系统
          </span>
        </div>

        {/* Minimalist Tech & Status Icons with Tooltips */}
        <div className="flex items-center gap-3">
          <span
            title="云端多端同步与边缘加速"
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-help"
          >
            <Cloud className="w-4 h-4 text-sky-500" />
          </span>
          <span
            title="毫秒级极速响应"
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-help"
          >
            <Zap className="w-4 h-4 text-amber-500" />
          </span>
          <span
            title="本地原子与云端增量存储"
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-help"
          >
            <Database className="w-4 h-4 text-emerald-500" />
          </span>
          <span
            title="安全运行与访问控制"
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-help"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </span>
        </div>
      </div>
    </footer>
  );
};
