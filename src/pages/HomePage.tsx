import React from 'react';
import { SearchBar } from '../components/SearchBar';
import { CategoryTabs } from '../features/categories/components/CategoryTabs';
import { BookmarkGrid } from '../features/bookmarks/components/BookmarkGrid';
import { useBookmarkStore } from '../stores/bookmark.store';
import { Megaphone, Bookmark, Github, Cloud, Zap, Database } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { settings, isLoading } = useBookmarkStore();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      <main className="pb-16">
        {/* Optional Announcement Banner */}
        {settings.announcement && (
          <div className="w-full bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 py-2.5 px-4 text-center">
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm text-indigo-700 dark:text-indigo-300">
              <Megaphone className="w-4 h-4 shrink-0 text-indigo-500" />
              <span>{settings.announcement}</span>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="pt-10 pb-6 text-center px-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-2">
            {settings.title || 'OmniMark 站点导航'}
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
            {settings.subtitle || '高效、清爽、可自建的现代书签与导航系统'}
          </p>
        </section>

        {/* Search Engine & Filter Bar */}
        <SearchBar />

        {/* Category Navigation Pills */}
        <CategoryTabs />

        {/* Bookmarks Grid / Pinned Strip */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          </div>
        ) : (
          <BookmarkGrid />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 py-8 px-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {settings.logoText || 'OmniMark'}
            </span>
            <span>—</span>
            <span>{settings.footerText || 'Cloudflare Pages + Workers + D1 Powered'}</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400 dark:text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-sky-500" />
              <span>Pages</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Workers</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>D1 Database</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
