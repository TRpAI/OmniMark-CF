import React from 'react';
import {
  LayoutDashboard,
  Bookmark,
  Folder,
  Users,
  ArrowLeft,
  FileCode2,
  Cloud,
  Settings,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { useUiStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { Dashboard } from '../features/admin/components/Dashboard';
import { BookmarkManager } from '../features/admin/components/BookmarkManager';
import { CategoryManager } from '../features/admin/components/CategoryManager';
import { UserManager } from '../features/admin/components/UserManager';
import { ImportExport } from '../features/admin/components/ImportExport';
import { CloudflareGuide } from '../features/admin/components/CloudflareGuide';
import { SettingsManager } from '../features/admin/components/SettingsManager';

export const AdminPage: React.FC = () => {
  const { adminTab, setAdminTab, setCurrentView } = useUiStore();
  const { user } = useAuthStore();

  const navItems: {
    id: 'dashboard' | 'bookmarks' | 'categories' | 'users' | 'import-export' | 'cloudflare' | 'settings';
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[] = [
    { id: 'dashboard', label: '控制面板', icon: LayoutDashboard },
    { id: 'bookmarks', label: '书签管理', icon: Bookmark },
    { id: 'categories', label: '分类管理', icon: Folder },
    { id: 'users', label: '安全与密码', icon: Shield },
    { id: 'import-export', label: '导入与备份', icon: FileCode2 },
    { id: 'cloudflare', label: 'Cloudflare 部署', icon: Cloud, badge: 'D1/KV' },
    { id: 'settings', label: '全局设置', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('home')}
            className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="返回前台主页"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span>OmniMark 管理控制台</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50">
                v2.0 Refactored
              </span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              当前登录管理员：<span className="font-semibold text-zinc-800 dark:text-zinc-200">{user?.username}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>查看前台网站</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Grid: Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-1">
          <div className="p-1 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = adminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setAdminTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {adminTab === 'dashboard' && <Dashboard />}
          {adminTab === 'bookmarks' && <BookmarkManager />}
          {adminTab === 'categories' && <CategoryManager />}
          {adminTab === 'users' && <UserManager />}
          {adminTab === 'import-export' && <ImportExport />}
          {adminTab === 'cloudflare' && <CloudflareGuide />}
          {adminTab === 'settings' && <SettingsManager />}
        </div>
      </div>
    </div>
  );
};
