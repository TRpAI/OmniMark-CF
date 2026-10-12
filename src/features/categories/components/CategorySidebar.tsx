import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  Lock,
  LogOut,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { useAuthStore } from '../../../stores/auth.store';
import { renderCategoryIcon } from '../../../utils/iconMap';

export const CategorySidebar: React.FC = () => {
  const {
    categories,
    customPages,
    activeCategoryId,
    activePageId,
    setActiveCategory,
    setActivePage,
    bookmarks,
    settings,
  } = useBookmarkStore();

  const {
    isDesktopSidebarOpen,
    toggleDesktopSidebar,
    setCurrentView,
    setLoginModalOpen,
  } = useUiStore();

  const { isAuthenticated, logout } = useAuthStore();
  const [filterText, setFilterText] = useState('');

  const totalBookmarksCount = bookmarks.length;

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredPages = (customPages || []).filter((p) =>
    p.title.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleAdminAction = () => {
    if (isAuthenticated) {
      setCurrentView('admin');
    } else {
      setLoginModalOpen(true);
    }
  };

  const handleSelectPage = (page: typeof customPages[0]) => {
    if (page.linkUrl && page.openInNewTab) {
      window.open(page.linkUrl, '_blank', 'noopener,noreferrer');
    } else if (page.linkUrl) {
      window.location.href = page.linkUrl;
    } else {
      setActivePage(page.id);
    }
  };

  // 1. Collapsed Mini Rail Mode (w-14)
  if (!isDesktopSidebarOpen) {
    return (
      <aside
        aria-label="分类侧边栏紧凑模式"
        className="hidden lg:flex flex-col justify-between w-14 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md select-none z-20 py-3 items-center transition-all duration-300"
      >
        {/* Top: Expand Toggle */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            title="展开分类侧边栏"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

          {/* All Bookmarks icon */}
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            title={`全部书签 (${totalBookmarksCount})`}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
              activeCategoryId === 'all' && !activePageId
                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-4.5 h-4.5" />
          </button>

          {/* Site Feed icon */}
          {settings.enableSiteFeed !== false && (
            <button
              type="button"
              onClick={() => setActivePage('site-feed')}
              title="站点快讯 / 最新动态"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activePageId === 'site-feed'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Sparkles className="w-4.5 h-4.5 text-amber-500" />
            </button>
          )}

          {/* Category Icons */}
          <div className="flex flex-col items-center gap-1.5 w-full overflow-y-auto max-h-[55vh] scrollbar-none py-1">
            {categories.slice(0, 8).map((cat) => {
              const isActive = activeCategoryId === cat.id && !activePageId;
              const count = bookmarks.filter((b) => b.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  title={`${cat.name} (${count})`}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {renderCategoryIcon(cat.icon, 'w-4 h-4')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom: Admin Entrance */}
        <div className="flex flex-col items-center gap-2 w-full px-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={handleAdminAction}
            title={isAuthenticated ? '进入后台管理' : '管理员登录'}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {isAuthenticated ? (
              <Settings className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Lock className="w-4.5 h-4.5 text-zinc-400" />
            )}
          </button>
        </div>
      </aside>
    );
  }

  // 2. Expanded Sidebar Mode (w-64)
  return (
    <aside
      aria-label="分类与全站导航侧边栏"
      className="hidden lg:flex flex-col justify-between w-64 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md select-none z-20 transition-all duration-300"
    >
      {/* Top Header */}
      <div className="p-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <FolderOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white leading-none">
              分类导航
            </h3>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-none block">
              收录 {totalBookmarksCount} 个站点
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleDesktopSidebar}
          title="折叠侧边栏"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Input */}
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="快速过滤分类..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 border border-transparent focus:border-indigo-500/50 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Scrollable Navigation List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-1 scrollbar-thin">
        {/* 全部书签 */}
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            activeCategoryId === 'all' && !activePageId
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
          }`}
        >
          <div className="flex items-center gap-2.5 truncate">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">全部书签</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono shrink-0 ${
              activeCategoryId === 'all' && !activePageId
                ? 'bg-white/20 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
            }`}
          >
            {totalBookmarksCount}
          </span>
        </button>

        {/* 站点快讯 */}
        {settings.enableSiteFeed !== false && (
          <button
            type="button"
            onClick={() => setActivePage('site-feed')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activePageId === 'site-feed'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-xs'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">
                {settings.siteFeedTitle ? settings.siteFeedTitle.split(' ')[0] : '站点快讯'}
              </span>
            </div>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
          </button>
        )}

        {/* Section Divider: 分类 */}
        <div className="pt-2 pb-1 px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          主分类
        </div>

        {/* Category List */}
        {filteredCategories.map((cat) => {
          const isActive = activeCategoryId === cat.id && !activePageId;
          const count = bookmarks.filter((b) => b.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                {renderCategoryIcon(cat.icon, 'w-3.5 h-3.5 shrink-0')}
                <span className="truncate">{cat.name}</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono shrink-0 ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Section Divider: 单页与外链 (if any) */}
        {filteredPages.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              单页与外链
            </div>
            {filteredPages.map((page) => {
              const isActive = activePageId === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => handleSelectPage(page)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {renderCategoryIcon(page.icon || 'FileText', 'w-3.5 h-3.5 shrink-0')}
                    <span className="truncate">{page.title}</span>
                    {page.isPrivate && (
                      <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                    )}
                  </div>
                  {page.linkUrl ? (
                    <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Bottom Footer: 后台管理入口 */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/70 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleAdminAction}
            title={isAuthenticated ? '进入后台管理' : '管理员登录'}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer truncate"
          >
            {isAuthenticated ? (
              <>
                <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 animate-spin-slow" />
                <span className="truncate font-semibold">管理后台</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="已登录" />
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate font-semibold">管理后台</span>
              </>
            )}
          </button>

          {isAuthenticated && (
            <button
              type="button"
              onClick={() => logout()}
              title="退出登录"
              className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
