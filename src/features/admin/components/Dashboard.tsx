import React, { useEffect } from 'react';
import {
  Bookmark,
  Folder,
  Eye,
  Pin,
  Plus,
  ArrowUpRight,
  Database,
  Cloud,
  Zap,
  Server,
  FileCode2,
} from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';

export const Dashboard: React.FC = () => {
  const { stats, refreshStats, bookmarks, categories } = useBookmarkStore();
  const { setAdminTab } = useUiStore();

  useEffect(() => {
    refreshStats();
  }, []);

  const totalBookmarks = stats?.totalBookmarks ?? bookmarks.length;
  const totalCategories = stats?.totalCategories ?? categories.length;
  const totalClicks = stats?.totalClicks ?? bookmarks.reduce((sum, b) => sum + (b.clickCount || 0), 0);
  const pinnedCount = stats?.pinnedBookmarks ?? bookmarks.filter((b) => b.isPinned).length;
  const topBookmarks = stats?.topBookmarks ?? [...bookmarks].sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0)).slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Cloudflare Architecture Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm">
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloudflare Architecture Ready</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              OmniMark 分层重构版与 Cloudflare 协同体系
            </h2>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl">
              服务端分层：Controller &rarr; Service &rarr; Repository 模式。不仅可在当前 Node/Express 容器中极速运行，同时内置完整的 Cloudflare Pages (前端) + Workers (边缘) + D1 (关系数据库) + KV (缓存加速) 迁移套件。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setAdminTab('cloudflare')}
              className="px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-zinc-100 text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            >
              查看 D1 / KV 部署配置 &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Bookmarks */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              书签总数
            </p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
              {totalBookmarks}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Bookmark className="w-6 h-6" />
          </div>
        </div>

        {/* Total Categories */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              导航分类
            </p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
              {totalCategories}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Folder className="w-6 h-6" />
          </div>
        </div>

        {/* Total Clicks */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              总点击计数
            </p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
              {totalClicks}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Eye className="w-6 h-6" />
          </div>
        </div>

        {/* Pinned Bookmarks */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              置顶书签
            </p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
              {pinnedCount}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Pin className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Top Bookmarks */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                热门访问书签 (Top 5)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                根据前台用户点击量实时更新
              </p>
            </div>
            <button
              onClick={() => setAdminTab('bookmarks')}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              管理全部书签 &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {topBookmarks.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">暂无点击数据</p>
            ) : (
              topBookmarks.map((bm, index) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center font-bold text-sm text-zinc-400">
                      #{index + 1}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center overflow-hidden border border-zinc-200/60 dark:border-zinc-600">
                      {bm.favicon ? (
                        <img src={bm.favicon} alt="" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <Bookmark className="w-4 h-4 text-indigo-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {bm.title}
                      </h4>
                      <p className="text-xs text-zinc-400 truncate">{bm.url}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold">
                      {bm.clickCount} 次点击
                    </span>
                    <a
                      href={bm.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-zinc-400 hover:text-indigo-600 rounded-lg hover:bg-white dark:hover:bg-zinc-700"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & Architecture Info */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              快速快捷操作
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              常用管理功能入口
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => setAdminTab('bookmarks')}
                className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/70 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium transition-colors cursor-pointer text-left"
              >
                <Plus className="w-4 h-4" />
                <span>添加与管理书签</span>
              </button>
              <button
                onClick={() => setAdminTab('categories')}
                className="flex items-center gap-3 p-3 rounded-xl bg-sky-50/70 hover:bg-sky-100/70 dark:bg-sky-950/30 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-sm font-medium transition-colors cursor-pointer text-left"
              >
                <Folder className="w-4 h-4" />
                <span>分类管理与排序</span>
              </button>
              <button
                onClick={() => setAdminTab('import-export')}
                className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/70 hover:bg-purple-100/70 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-medium transition-colors cursor-pointer text-left"
              >
                <FileCode2 className="w-4 h-4" />
                <span>导入 / 导出书签与备份</span>
              </button>
              <button
                onClick={() => setAdminTab('cloudflare')}
                className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium transition-colors cursor-pointer text-left"
              >
                <Database className="w-4 h-4" />
                <span>生成 Cloudflare D1 SQL 迁移</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              当前运行模式
            </h4>
            <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center justify-between">
                <span>运行环境:</span>
                <span className="font-mono text-zinc-900 dark:text-white font-medium">Node.js + Express / Vite</span>
              </div>
              <div className="flex items-center justify-between">
                <span>数据库实现:</span>
                <span className="font-mono text-zinc-900 dark:text-white font-medium">JSON Repository (SQLite Ready)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cloudflare 适配:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">D1 + KV Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
