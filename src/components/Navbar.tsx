import React from 'react';
import { Bookmark, ShieldCheck, Compass, LogIn, LogOut, LayoutGrid, Settings, Sparkles } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';
import { useBookmarkStore } from '../stores/bookmark.store';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { currentView, setCurrentView, setLoginModalOpen } = useUiStore();
  const { settings } = useBookmarkStore();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <div
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <Bookmark className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
                {settings.logoText || 'OmniMark'}
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/50">
                CF D1/KV Ready
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
              站点导航与书签系统
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentView === 'admin' ? (
            <button
              onClick={() => setCurrentView('home')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <Compass className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              返回前台导航
            </button>
          ) : (
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setCurrentView('admin');
                } else {
                  setLoginModalOpen(true);
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/90 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>管理后台</span>
            </button>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hidden md:inline">
                {user?.username}
              </span>
              <button
                onClick={() => logout()}
                title="退出登录"
                className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>登录</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
