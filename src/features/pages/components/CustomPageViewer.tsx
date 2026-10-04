import React from 'react';
import { ArrowLeft, Edit3, Lock, Calendar, ExternalLink } from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useAuthStore } from '../../../stores/auth.store';
import { useUiStore } from '../../../stores/ui.store';
import { renderCategoryIcon } from '../../../utils/iconMap';

export const CustomPageViewer: React.FC = () => {
  const { customPages, activePageId, setActivePage, setActiveCategory } = useBookmarkStore();
  const { isAuthenticated } = useAuthStore();
  const { setCurrentView, setAdminTab } = useUiStore();

  const page = customPages.find((p) => p.id === activePageId);

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-500 dark:text-zinc-400 mb-4">未找到该自定义页面或已被删除</p>
        <button
          onClick={() => setActiveCategory('all')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>返回全部书签</span>
        </button>
      </div>
    );
  }

  // Simple Markdown renderer
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // H1
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mt-6 mb-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            {line.substring(2)}
          </h1>
        );
      }
      // H2
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mt-5 mb-2.5">
            {line.substring(3)}
          </h2>
        );
      }
      // H3
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-base sm:text-lg font-semibold text-zinc-800 dark:text-zinc-200 mt-4 mb-2">
            {line.substring(4)}
          </h3>
        );
      }
      // Blockquote
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="pl-3.5 py-1 my-2 border-l-3 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-zinc-700 dark:text-zinc-300 italic text-sm rounded-r-lg">
            {line.substring(2)}
          </blockquote>
        );
      }
      // Bullet list
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-sm text-zinc-700 dark:text-zinc-300 my-1 leading-relaxed">
            {line.substring(2)}
          </li>
        );
      }
      // Number list
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={idx} className="ml-5 list-decimal text-sm text-zinc-700 dark:text-zinc-300 my-1 leading-relaxed">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      // Regular paragraph
      return (
        <p key={idx} className="text-sm text-zinc-700 dark:text-zinc-300 my-1.5 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <button
          onClick={() => setActiveCategory('all')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回全部书签</span>
        </button>

        {isAuthenticated && (
          <button
            onClick={() => {
              setCurrentView('admin');
              setAdminTab('pages');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-zinc-700 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>管理/编辑页面</span>
          </button>
        )}
      </div>

      {/* Main Page Article Card */}
      <article className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        {/* Header */}
        <header className="mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              {renderCategoryIcon(page.icon || 'FileText', 'w-5 h-5')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  {page.title}
                </h1>
                {page.isPrivate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                    <Lock className="w-3 h-3" />
                    <span>私密页面</span>
                  </span>
                )}
              </div>
              {page.slug && (
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  /{page.slug}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>更新于 {new Date(page.updatedAt || page.createdAt).toLocaleDateString()}</span>
            </span>
            {page.linkUrl && (
              <a
                href={page.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>跳转外部链接</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="prose dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200">
          {page.content ? (
            renderMarkdown(page.content)
          ) : (
            <p className="text-zinc-400 italic text-sm">此页面暂无详细正文内容</p>
          )}
        </div>
      </article>
    </div>
  );
};
