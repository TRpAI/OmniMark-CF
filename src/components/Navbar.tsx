import React from 'react';
import { Compass, Settings, LogOut, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';
import { useBookmarkStore } from '../stores/bookmark.store';
import { BrandLogo } from './BrandLogo';
import { PWAInstallNavbarButton } from './PWAInstallBanner';
import { ThemeSwitcher } from './ThemeSwitcher';

export const Navbar: React.FC = () => {
  const { isAuthenticated, logout } = useAuthStore();
  const { currentView, setCurrentView, setLoginModalOpen, toggleAiAssistant } = useUiStore();
  const { settings } = useBookmarkStore();

  const handleAdminAction = () => {
    if (currentView === 'admin') {
      setCurrentView('home');
    } else if (isAuthenticated) {
      setCurrentView('admin');
    } else {
      setLoginModalOpen(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <div
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
          title="返回主页"
        >
          <BrandLogo size="md" className="group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                {settings.logoText || 'OmniMark'}
              </span>
              <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50">
                Hub
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:block leading-none mt-0.5">
              现代书签与导航管理
            </p>
          </div>
        </div>

        {/* Right: AI Assistant + PWA Install + Management Access */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* AI Assistant Button */}
          <button
            onClick={() => toggleAiAssistant()}
            title="AI 智能助手 (智能摘要 · 信息提炼 · 全站寻宝)"
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:via-purple-500/20 hover:to-pink-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs hover:shadow-sm transition-all cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:rotate-12 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">AI 助手</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallNavbarButton />

          {/* Theme Switcher: 明亮 / 暗黑 / 自动切换 */}
          <ThemeSwitcher />

          {/* Single Unified Admin/Home Toggle Button */}
          <button
            onClick={handleAdminAction}
            title={currentView === 'admin' ? '返回前台导航' : isAuthenticated ? '管理后台' : '管理员登录'}
            className={`inline-flex items-center justify-center gap-2 p-2 sm:px-3.5 sm:py-2 text-sm font-medium rounded-xl transition-all cursor-pointer ${
              currentView === 'admin'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm hover:opacity-90'
                : 'bg-zinc-100/90 hover:bg-zinc-200/90 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60'
            }`}
          >
            {currentView === 'admin' ? (
              <>
                <Compass className="w-5 h-5 sm:w-4 sm:h-4 text-sky-400 dark:text-sky-600" />
                <span className="hidden sm:inline">返回主页</span>
              </>
            ) : isAuthenticated ? (
              <>
                <Settings className="w-5 h-5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
                <span className="hidden sm:inline">管理后台</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500 dark:text-zinc-400" />
                <span className="hidden sm:inline">管理后台</span>
              </>
            )}
          </button>

          {/* Quick Logout button when authenticated */}
          {isAuthenticated && (
            <button
              onClick={() => logout()}
              title="退出管理模式"
              className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
