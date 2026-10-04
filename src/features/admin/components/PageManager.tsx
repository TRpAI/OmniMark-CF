import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  Lock,
  ArrowUp,
  ArrowDown,
  X,
  ExternalLink,
  BookOpen,
  Sparkles,
  Link as LinkIcon,
  Check,
} from 'lucide-react';
import { CustomPage } from '../../../../packages/shared/types';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { ICON_OPTIONS, renderCategoryIcon } from '../../../utils/iconMap';

export const PageManager: React.FC = () => {
  const { customPages, createCustomPage, updateCustomPage, deleteCustomPage, reorderCustomPages } =
    useBookmarkStore();
  const { showToast } = useUiStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<CustomPage | null>(null);
  const [deleteModalPage, setDeleteModalPage] = useState<CustomPage | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    icon: 'FileText',
    content: '',
    linkUrl: '',
    openInNewTab: true,
    isPrivate: false,
    sortOrder: 1,
  });

  const [pageType, setPageType] = useState<'content' | 'link'>('content');

  const openAddModal = () => {
    setEditingPage(null);
    setPageType('content');
    setFormData({
      title: '',
      slug: '',
      icon: 'FileText',
      content: '',
      linkUrl: '',
      openInNewTab: true,
      isPrivate: false,
      sortOrder: (customPages?.length || 0) + 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (page: CustomPage) => {
    setEditingPage(page);
    setPageType(page.linkUrl ? 'link' : 'content');
    setFormData({
      title: page.title,
      slug: page.slug || '',
      icon: page.icon || 'FileText',
      content: page.content || '',
      linkUrl: page.linkUrl || '',
      openInNewTab: page.openInNewTab ?? true,
      isPrivate: Boolean(page.isPrivate),
      sortOrder: page.sortOrder,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('请输入页面标题', 'error');
      return;
    }

    try {
      const payload = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        icon: formData.icon,
        content: pageType === 'content' ? formData.content : '',
        linkUrl: pageType === 'link' ? formData.linkUrl.trim() : '',
        openInNewTab: formData.openInNewTab,
        isPrivate: formData.isPrivate,
        sortOrder: Number(formData.sortOrder) || 1,
      };

      if (editingPage) {
        await updateCustomPage(editingPage.id, payload);
        showToast('自定义页面更新成功', 'success');
      } else {
        await createCustomPage(payload);
        showToast('自定义页面创建成功', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteModalPage) return;
    try {
      await deleteCustomPage(deleteModalPage.id);
      showToast('页面已成功删除', 'success');
      setDeleteModalPage(null);
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error');
    }
  };

  const movePage = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= customPages.length) return;

    const newPages = [...customPages];
    const temp = newPages[index];
    newPages[index] = newPages[targetIndex];
    newPages[targetIndex] = temp;

    const reordered = newPages.map((p, i) => ({ id: p.id, sortOrder: i + 1 }));
    try {
      await reorderCustomPages(reordered);
      showToast('页面排序已更新', 'success');
    } catch (err: any) {
      showToast(err.message || '排序失败', 'error');
    }
  };

  // Quick Markdown template applier
  const applyTemplate = (type: 'memo' | 'guide') => {
    if (type === 'memo') {
      setFormData((prev) => ({
        ...prev,
        title: prev.title || '日常备忘录',
        icon: 'Sparkles',
        content: `# 日常工作与开发备忘\n\n> 仅管理员可见的私密备忘录，随时随地记录关键链接与配置。\n\n### 常用服务器与端口\n- 生产服务: 192.168.1.100:3000\n- 测试数据库: 5432 (Postgres)\n\n### 关键工作备忘\n1. 每周五检查 OneDrive 增量备份状态\n2. 定期整理归档失效外部书签`,
        isPrivate: true,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        title: prev.title || '使用与收录指南',
        icon: 'BookOpen',
        content: `# OmniMark 导航使用与收录指南\n\n欢迎向我们提交优质网站与开发工具！\n\n### 收录标准\n- **稳定性**：域名长期稳定运行，无不良内容。\n- **实用性**：专注于开发者、AI 工具、效率神器与实用资讯。\n- **原创优先**：优质开源项目、原创博客与工具平台优先收录。`,
        isPrivate: false,
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>分类导航栏自定义页面</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-normal">
              {customPages?.length || 0} 个页面
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            在首页分类导航栏添加自定义文章页（如关于、使用说明、个人备忘）或外部直达链接，支持公开与私密访问
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>新建自定义页面</span>
        </button>
      </div>

      {/* Pages List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-xs">
        {(!customPages || customPages.length === 0) ? (
          <div className="py-12 px-4 text-center">
            <BookOpen className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              暂未创建任何自定义页面
            </p>
            <p className="text-xs text-zinc-400 mt-1 mb-4">
              点击上方按钮，即可在首页分类导航栏添加专属关于页、Markdown 备忘录或外部导航链接
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>立即新建</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {customPages.map((page, index) => (
              <div
                key={page.id}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
                    {renderCategoryIcon(page.icon || 'FileText', 'w-4 h-4')}
                  </div>

                  {/* Title & Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {page.title}
                      </span>
                      {page.isPrivate ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60">
                          <Lock className="w-2.5 h-2.5" />
                          <span>私密</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60">
                          <span>公开</span>
                        </span>
                      )}
                      {page.linkUrl ? (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-0.5 font-mono">
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>外部链接</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400">
                          内容页面 ({page.content?.length || 0} 字符)
                        </span>
                      )}
                    </div>
                    {page.slug && (
                      <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                        路径: /{page.slug}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <button
                    onClick={() => movePage(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                    title="上移"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => movePage(index, 'down')}
                    disabled={index === customPages.length - 1}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                    title="下移"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEditModal(page)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="编辑"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteModalPage(page)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {editingPage ? '编辑自定义页面' : '新建自定义页面'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Type Switcher */}
              <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
                <button
                  type="button"
                  onClick={() => setPageType('content')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    pageType === 'content'
                      ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Markdown 内容页面 (站内渲染)
                </button>
                <button
                  type="button"
                  onClick={() => setPageType('link')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    pageType === 'link'
                      ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  外部跳转链接 (点击直达)
                </button>
              </div>

              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    页面标题 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="如：关于本站、开发备忘、使用指南"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    URL 路径标识 (Slug)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="如：about, guide, notes"
                    className="w-full px-3 py-2 text-sm font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  页面图标
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  {ICON_OPTIONS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: item.name })}
                      className={`p-1.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        formData.icon === item.name
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                      title={item.name}
                    >
                      {renderCategoryIcon(item.name, 'w-4 h-4')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content vs Link */}
              {pageType === 'content' ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      页面正文 (支持 Markdown 排版)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-400">快速填入模板:</span>
                      <button
                        type="button"
                        onClick={() => applyTemplate('memo')}
                        className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                      >
                        私密备忘
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplate('guide')}
                        className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                      >
                        指南模板
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={8}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="# 页面标题&#10;&#10;输入 Markdown 格式正文内容，支持标题、列表、引用和加粗..."
                    className="w-full px-3 py-2 text-sm font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none leading-relaxed"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      目标跳转 URL *
                    </label>
                    <input
                      type="url"
                      required={pageType === 'link'}
                      value={formData.linkUrl}
                      onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                      placeholder="https://example.com/docs"
                      className="w-full px-3 py-2 text-sm font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="openInNewTab"
                      checked={formData.openInNewTab}
                      onChange={(e) => setFormData({ ...formData, openInNewTab: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                    <label htmlFor="openInNewTab" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      在新标签页中打开链接
                    </label>
                  </div>
                </div>
              )}

              {/* Visibility: Public vs Private Setting (公开与私密设置) */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      设置为私密页面
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    开启后该页面仅管理员登录后可见，未登录访客将完全隐藏此导航项与内容
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600 cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
                >
                  {editingPage ? '保存修改' : '确认创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h4 className="text-base font-bold text-zinc-900 dark:text-white">
              确认删除自定义页面？
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              确定要删除「{deleteModalPage.title}」吗？此操作将立即从分类导航栏移除该页面。
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteModalPage(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
