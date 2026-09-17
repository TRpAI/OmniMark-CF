import React, { useState } from 'react';
import {
  Plus,
  Search,
  Pin,
  Edit2,
  Trash2,
  ExternalLink,
  Globe,
  Sparkles,
  Check,
  X,
  RefreshCw,
  Folder,
  Tag,
} from 'lucide-react';
import { Bookmark } from '../../../../packages/shared/types';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { uploadApi } from '../../../api/settings.api';

export const BookmarkManager: React.FC = () => {
  const { bookmarks, categories, createBookmark, updateBookmark, deleteBookmark } = useBookmarkStore();
  const { showToast } = useUiStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isFetchingFavicon, setIsFetchingFavicon] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    categoryId: '',
    description: '',
    favicon: '',
    tags: '',
    sortOrder: 1,
    isPinned: false,
  });

  const openAddModal = () => {
    setEditingBookmark(null);
    setFormData({
      title: '',
      url: '',
      categoryId: categories[0]?.id || '',
      description: '',
      favicon: '',
      tags: '',
      sortOrder: bookmarks.length + 1,
      isPinned: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (bm: Bookmark) => {
    setEditingBookmark(bm);
    setFormData({
      title: bm.title,
      url: bm.url,
      categoryId: bm.categoryId,
      description: bm.description || '',
      favicon: bm.favicon || '',
      tags: (bm.tags || []).join(', '),
      sortOrder: bm.sortOrder,
      isPinned: Boolean(bm.isPinned),
    });
    setIsModalOpen(true);
  };

  const handleFetchFavicon = async () => {
    if (!formData.url.trim()) {
      showToast('请先输入网址', 'error');
      return;
    }
    setIsFetchingFavicon(true);
    try {
      const res = await uploadApi.fetchFavicon(formData.url);
      if (res && res.favicon) {
        setFormData((prev) => ({ ...prev, favicon: res.favicon }));
        showToast('已自动获取到网站图标', 'success');
      } else {
        showToast('未检测到专用图标，已采用默认服务', 'info');
      }
    } catch {
      showToast('获取图标失败，可手动填写图标 URL', 'error');
    } finally {
      setIsFetchingFavicon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.url.trim()) {
      showToast('请填写标题和网址', 'error');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      url: formData.url.trim(),
      categoryId: formData.categoryId || categories[0]?.id,
      description: formData.description.trim(),
      favicon: formData.favicon.trim(),
      tags: formData.tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
      sortOrder: Number(formData.sortOrder) || 1,
      isPinned: formData.isPinned,
    };

    try {
      if (editingBookmark) {
        await updateBookmark(editingBookmark.id, payload);
        showToast('书签修改成功', 'success');
      } else {
        await createBookmark(payload);
        showToast('书签添加成功', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`确定要删除书签 "${title}" 吗？此操作不可恢复。`)) {
      try {
        await deleteBookmark(id);
        showToast('书签已删除', 'success');
      } catch (err: any) {
        showToast(err.message || '删除失败', 'error');
      }
    }
  };

  const handleTogglePin = async (bm: Bookmark) => {
    try {
      await updateBookmark(bm.id, { isPinned: !bm.isPinned });
      showToast(bm.isPinned ? '已取消置顶' : '已设为置顶', 'success');
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  // Filtered bookmarks
  const filtered = bookmarks.filter((b) => {
    const matchesSearch =
      !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.url.toLowerCase().includes(search.toLowerCase()) ||
      b.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || b.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索书签或标签..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none"
          >
            <option value="all">全部分类 ({bookmarks.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({bookmarks.filter((b) => b.categoryId === c.id).length})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>添加新书签</span>
        </button>
      </div>

      {/* Bookmarks Table/List */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12">置顶</th>
                <th className="py-3 px-4">书签信息</th>
                <th className="py-3 px-4">所属分类</th>
                <th className="py-3 px-4">标签</th>
                <th className="py-3 px-4 text-center">点击量</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 text-sm">
                    未找到相关书签
                  </td>
                </tr>
              ) : (
                filtered.map((bm) => {
                  const category = categories.find((c) => c.id === bm.categoryId);
                  return (
                    <tr
                      key={bm.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                    >
                      {/* Pin Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleTogglePin(bm)}
                          title={bm.isPinned ? '点击取消置顶' : '点击置顶'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            bm.isPinned
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                              : 'text-zinc-300 dark:text-zinc-600 hover:text-zinc-500'
                          }`}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                      </td>

                      {/* Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                            {bm.favicon ? (
                              <img src={bm.favicon} alt="" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <Globe className="w-4 h-4 text-indigo-500" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-md">
                            <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 truncate">
                              <span>{bm.title}</span>
                              <a
                                href={bm.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-400 hover:text-indigo-600"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <p className="text-xs text-zinc-400 truncate">{bm.url}</p>
                            {bm.description && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {bm.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                          <Folder className="w-3 h-3 text-zinc-400" />
                          <span>{category?.name || '默认分类'}</span>
                        </span>
                      </td>

                      {/* Tags */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {bm.tags && bm.tags.length > 0 ? (
                            bm.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px]"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-400 text-xs">-</span>
                          )}
                        </div>
                      </td>

                      {/* Click Count */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-zinc-500">
                        {bm.clickCount || 0}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(bm)}
                            className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(bm.id, bm.title)}
                            className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm animate-in fade-in">
          <div
            className="relative w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              {editingBookmark ? '编辑书签' : '添加新书签'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* URL with Auto-fetch */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  网址链接 (URL) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleFetchFavicon}
                    disabled={isFetchingFavicon}
                    className="px-3 py-2 text-xs font-medium rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFavicon ? 'animate-spin' : ''}`} />
                    <span>抓取图标</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  书签标题 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例如：GitHub 开源社区"
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Category & Pinned */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    所属分类 *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    排序权重 (越小越靠前)
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Favicon URL */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  图标 URL (可选，留空将使用默认服务)
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                    {formData.favicon ? (
                      <img src={formData.favicon} alt="" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Globe className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.favicon}
                    onChange={(e) => setFormData({ ...formData, favicon: e.target.value })}
                    placeholder="https://example.com/favicon.ico"
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  简介描述
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要介绍该站点的特色或功能..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none resize-none"
                />
              </div>

              {/* Tags & Pinned Switch */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  标签 (以英文或中文逗号隔开)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="例如：开发, 工具, API"
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPinnedCheck"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isPinnedCheck" className="text-sm text-zinc-800 dark:text-zinc-200 cursor-pointer">
                  设为首页置顶书签 (将在顶部常用区展示)
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  {editingBookmark ? '保存修改' : '确认添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
