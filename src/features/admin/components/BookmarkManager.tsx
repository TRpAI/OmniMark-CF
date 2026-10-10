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
  AlertTriangle,
  Lock,
  Rss,
  Flame,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckSquare,
  Square,
  Copy,
  Download,
  Unlock,
} from 'lucide-react';
import { Bookmark } from '../../../../packages/shared/types';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { uploadApi } from '../../../api/settings.api';
import { aiApi } from '../../../api/ai.api';

export const BookmarkManager: React.FC = () => {
  const {
    bookmarks,
    categories,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    batchDeleteBookmarks,
    batchUpdateBookmarks,
    reorderBookmarks,
  } = useBookmarkStore();
  const { showToast } = useUiStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private' | 'pinned' | 'feed'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isFetchingFavicon, setIsFetchingFavicon] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [deleteConfirmBm, setDeleteConfirmBm] = useState<Bookmark | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Batch selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchCategoryModalOpen, setIsBatchCategoryModalOpen] = useState(false);
  const [batchTargetCategory, setBatchTargetCategory] = useState<string>('');
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

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
    isPrivate: false,
    inFeed: false,
    feedCustomNote: '',
    feedHighlight: false,
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
      isPrivate: false,
      inFeed: false,
      feedCustomNote: '',
      feedHighlight: false,
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
      isPrivate: Boolean(bm.isPrivate),
      inFeed: Boolean(bm.inFeed),
      feedCustomNote: bm.feedCustomNote || '',
      feedHighlight: Boolean(bm.feedHighlight),
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

  const handleAiAutoFill = async () => {
    if (!formData.url.trim()) {
      showToast('请先输入网址链接', 'error');
      return;
    }
    setIsAiAnalyzing(true);
    try {
      const categoryNames = categories.map((c) => c.name);
      const res = await aiApi.analyzeSiteInfo(formData.url.trim(), categoryNames);

      let targetCatId = formData.categoryId || categories[0]?.id || '';
      if (res.suggestedCategory) {
        const matched = categories.find(
          (c) => c.name.toLowerCase() === res.suggestedCategory?.toLowerCase()
        );
        if (matched) targetCatId = matched.id;
      }

      setFormData((prev) => ({
        ...prev,
        title: res.title || prev.title,
        description: res.description || prev.description,
        tags: res.tags && res.tags.length > 0 ? res.tags.join(', ') : prev.tags,
        categoryId: targetCatId,
        favicon: res.favicon || prev.favicon,
      }));

      showToast('AI 已自动补齐网站标题、简介、标签与分类！', 'success');
    } catch (err: any) {
      showToast(err?.message || 'AI 分析失败，可手动填写', 'error');
    } finally {
      setIsAiAnalyzing(false);
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
      isPrivate: formData.isPrivate,
      inFeed: formData.inFeed,
      feedCustomNote: formData.feedCustomNote.trim(),
      feedHighlight: formData.feedHighlight,
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

  const handleToggleFeedQuick = async (bm: Bookmark, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const nextVal = !bm.inFeed;
      await updateBookmark(bm.id, { ...bm, inFeed: nextVal });
      showToast(nextVal ? `已将「${bm.title}」收录进快讯` : `已将「${bm.title}」移出快讯`, 'info');
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error');
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
      await updateBookmark(bm.id, { ...bm, isPinned: !bm.isPinned });
      showToast(bm.isPinned ? '已取消置顶' : '已设为置顶', 'success');
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const moveBookmark = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filtered.length) return;

    // Create a copy of the filtered array and swap items
    const reorderedList = [...filtered];
    const [movedItem] = reorderedList.splice(index, 1);
    reorderedList.splice(targetIndex, 0, movedItem);

    // Map new sequential sort orders (1, 2, 3...)
    const items = reorderedList.map((item, idx) => ({
      id: item.id,
      sortOrder: idx + 1,
      categoryId: item.categoryId,
    }));

    try {
      await reorderBookmarks(items);
      showToast('书签排位已更新', 'success');
    } catch (err: any) {
      showToast(err.message || '调整排位失败', 'error');
    }
  };

  // Filtered and sorted bookmarks (strictly ordered by sortOrder)
  const filtered = [...bookmarks]
    .filter((b) => {
      const matchesSearch =
        !search ||
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.url.toLowerCase().includes(search.toLowerCase()) ||
        (b.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchesCat = selectedCategory === 'all' || b.categoryId === selectedCategory;
      const matchesPrivacy =
        privacyFilter === 'all' ||
        (privacyFilter === 'public' && !b.isPrivate) ||
        (privacyFilter === 'private' && b.isPrivate) ||
        (privacyFilter === 'pinned' && b.isPinned) ||
        (privacyFilter === 'feed' && b.inFeed);
      return matchesSearch && matchesCat && matchesPrivacy;
    })
    .sort((a, b) => {
      const orderA = a.sortOrder ?? 9999;
      const orderB = b.sortOrder ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.id || '').localeCompare(b.id || '');
    });

  const isAllSelected = filtered.length > 0 && filtered.every((b) => selectedIds.includes(b.id));
  const isPartiallySelected = filtered.some((b) => selectedIds.includes(b.id)) && !isAllSelected;

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((b) => b.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setIsBatchDeleteModalOpen(true);
  };

  const confirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const count = selectedIds.length;
      await batchDeleteBookmarks(selectedIds);
      showToast(`成功删除 ${count} 个书签`, 'success');
      setSelectedIds([]);
      setIsBatchDeleteModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '批量删除失败', 'error');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchChangeCategory = () => {
    if (selectedIds.length === 0) return;
    setBatchTargetCategory(categories[0]?.id || '');
    setIsBatchCategoryModalOpen(true);
  };

  const confirmBatchChangeCategory = async () => {
    if (selectedIds.length === 0 || !batchTargetCategory) return;
    setIsBatchProcessing(true);
    try {
      const targetCat = categories.find((c) => c.id === batchTargetCategory);
      await batchUpdateBookmarks(selectedIds, { categoryId: batchTargetCategory });
      showToast(`成功将 ${selectedIds.length} 个书签移入分类「${targetCat?.name || ''}」`, 'success');
      setSelectedIds([]);
      setIsBatchCategoryModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '批量修改分类失败', 'error');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchTogglePin = async (isPinned: boolean) => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      await batchUpdateBookmarks(selectedIds, { isPinned });
      showToast(`已成功将 ${selectedIds.length} 个书签批量${isPinned ? '设为置顶' : '取消置顶'}`, 'success');
      setSelectedIds([]);
    } catch (err: any) {
      showToast(err.message || '批量置顶操作失败', 'error');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchToggleFeed = async (inFeed: boolean) => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      await batchUpdateBookmarks(selectedIds, { inFeed });
      showToast(`已成功将 ${selectedIds.length} 个书签批量${inFeed ? '加入快讯' : '移出快讯'}`, 'success');
      setSelectedIds([]);
    } catch (err: any) {
      showToast(err.message || '批量快讯操作失败', 'error');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchTogglePrivate = async (isPrivate: boolean) => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      await batchUpdateBookmarks(selectedIds, { isPrivate });
      showToast(`已将 ${selectedIds.length} 个书签批量设为${isPrivate ? '私密 (🔒)' : '公开'}`, 'success');
      setSelectedIds([]);
    } catch (err: any) {
      showToast(err.message || '批量权限调整失败', 'error');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchExportJson = () => {
    const selectedList = bookmarks.filter((b) => selectedIds.includes(b.id));
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `bookmarks_batch_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`已导出 ${selectedList.length} 个书签的 JSON 数据`, 'success');
  };

  const handleBatchCopyUrls = async () => {
    const selectedList = bookmarks.filter((b) => selectedIds.includes(b.id));
    const text = selectedList.map((b) => `${b.title} - ${b.url}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast(`已复制 ${selectedList.length} 个书签链接至剪贴板`, 'success');
    } catch {
      showToast('复制失败，请检查剪贴板权限', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col gap-3">
        {/* 1. 移动端窄屏：搜索框为独立一行 */}
        <div className="w-full">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索书签标题、网址或标签..."
              className="w-full pl-9.5 pr-8 py-2 text-sm rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 p-0.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. 筛选器与添加/批量操作按钮栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* 筛选器在移动端平分一行 */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none shadow-2xs truncate"
            >
              <option value="all">全部分类 ({bookmarks.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({bookmarks.filter((b) => b.categoryId === c.id).length})
                </option>
              ))}
            </select>

            {/* Privacy & Feature Filter */}
            <select
              value={privacyFilter}
              onChange={(e) => setPrivacyFilter(e.target.value as any)}
              className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none shadow-2xs truncate"
            >
              <option value="all">全部书签 ({bookmarks.length})</option>
              <option value="pinned">常用置顶 ({bookmarks.filter((b) => b.isPinned).length})</option>
              <option value="feed">快讯精选 ({bookmarks.filter((b) => b.inFeed).length})</option>
              <option value="public">仅公开书签</option>
              <option value="private">仅私密书签 (🔒)</option>
            </select>
          </div>

          {/* Action Buttons: 批量操作与添加新书签 */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 border ${
                  selectedIds.length > 0
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
                title="批量操作选中项"
              >
                <CheckSquare className="w-4 h-4" />
                <span>{selectedIds.length > 0 ? `已选 (${selectedIds.length})` : '批量操作'}</span>
              </button>
            )}

            <button
              onClick={openAddModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>添加新书签</span>
            </button>
          </div>
        </div>
      </div>

      {/* 批量操作胶囊工具栏：当有选中项时吸附展示 */}
      {selectedIds.length > 0 && (
        <div className="sticky top-18 z-30 p-2.5 sm:p-3 rounded-2xl bg-zinc-900/95 dark:bg-zinc-850/95 backdrop-blur-md text-white shadow-xl border border-zinc-700/60 transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Left: 计数与取消 */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>已选 {selectedIds.length} 项</span>
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-zinc-300 hover:text-white px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {isAllSelected ? '取消全选' : '全选所有'}
              </button>
            </div>

            {/* Right: 胶囊操作按钮组 */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* 更改分类 */}
              <button
                type="button"
                onClick={handleBatchChangeCategory}
                disabled={isBatchProcessing}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                title="批量更改分类"
              >
                <Folder className="w-3.5 h-3.5 text-indigo-400" />
                <span>分类</span>
              </button>

              {/* 设为置顶 */}
              <button
                type="button"
                onClick={() => handleBatchTogglePin(true)}
                disabled={isBatchProcessing}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-amber-300 transition-colors cursor-pointer"
                title="批量设为置顶"
              >
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                <span>置顶</span>
              </button>

              {/* 取消置顶 */}
              <button
                type="button"
                onClick={() => handleBatchTogglePin(false)}
                disabled={isBatchProcessing}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors cursor-pointer"
                title="批量取消置顶"
              >
                <span>取消置顶</span>
              </button>

              {/* 设为快讯 */}
              <button
                type="button"
                onClick={() => handleBatchToggleFeed(true)}
                disabled={isBatchProcessing}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-amber-300 transition-colors cursor-pointer"
                title="批量收录进快讯"
              >
                <Rss className="w-3.5 h-3.5 text-amber-400" />
                <span>入快讯</span>
              </button>

              {/* 移出快讯 */}
              <button
                type="button"
                onClick={() => handleBatchToggleFeed(false)}
                disabled={isBatchProcessing}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors cursor-pointer"
                title="批量移出快讯"
              >
                <span>出快讯</span>
              </button>

              {/* 设为私密 */}
              <button
                type="button"
                onClick={() => handleBatchTogglePrivate(true)}
                disabled={isBatchProcessing}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-rose-300 transition-colors cursor-pointer"
                title="批量设为私密"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>私密</span>
              </button>

              {/* 设为公开 */}
              <button
                type="button"
                onClick={() => handleBatchTogglePrivate(false)}
                disabled={isBatchProcessing}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-emerald-300 transition-colors cursor-pointer"
                title="批量设为公开"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>公开</span>
              </button>

              {/* 复制链接 */}
              <button
                type="button"
                onClick={handleBatchCopyUrls}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                title="复制选中书签标题与链接"
              >
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">复制</span>
              </button>

              {/* 导出 JSON */}
              <button
                type="button"
                onClick={handleBatchExportJson}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                title="导出选中项为 JSON"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">导出</span>
              </button>

              {/* 批量删除 */}
              <button
                type="button"
                onClick={handleBatchDelete}
                disabled={isBatchProcessing}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                title="批量彻底删除选中书签"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除</span>
              </button>

              {/* 清空选择 */}
              <button
                type="button"
                onClick={handleDeselectAll}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="清空已选"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookmarks Display: Mobile Compact Cards (< md) & Desktop Table (>= md) */}
      {/* 1. Mobile Compact Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            未找到相关书签
          </div>
        ) : (
          filtered.map((bm, index) => {
            const category = categories.find((c) => c.id === bm.categoryId);
            return (
              <div
                key={bm.id}
                className={`p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border transition-all space-y-2.5 ${
                  selectedIds.includes(bm.id)
                    ? 'border-indigo-450 dark:border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : 'border-zinc-200/80 dark:border-zinc-800/80 shadow-xs'
                }`}
              >
                {/* Top Row: Checkbox, Favicon, Rank, Title, Badges, Direct Link */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {/* Batch Selection Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => toggleSelect(bm.id, e)}
                      className="p-1 -ml-1 text-zinc-400 hover:text-indigo-600 cursor-pointer shrink-0 mt-0.5"
                      title={selectedIds.includes(bm.id) ? '取消勾选' : '勾选此项'}
                    >
                      {selectedIds.includes(bm.id) ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                      )}
                    </button>

                    {/* Rank Capsule Badge */}
                    <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 mt-0.5 shadow-2xs" title="排位序号">
                      #{bm.sortOrder || index + 1}
                    </span>

                    {/* Favicon */}
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                      {bm.favicon ? (
                        <img src={bm.favicon} alt="" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <Globe className="w-4 h-4 text-indigo-500" />
                      )}
                    </div>

                    {/* Title and Badges */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white break-words line-clamp-1">
                          {bm.title}
                        </h4>
                        {bm.isPinned && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/60" title="常用置顶">
                            置顶
                          </span>
                        )}
                        {bm.inFeed && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60" title="已加入站点快讯">
                            快讯
                          </span>
                        )}
                        {bm.isPrivate && (
                          <span className="p-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-500" title="私密书签">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 font-mono">
                        {bm.url.replace(/^https?:\/\//, '')}
                      </p>
                    </div>
                  </div>

                  {/* Direct Link Icon */}
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-full text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                    title="新窗口打开"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Middle Row: Category Pill & Tags */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  {/* Category Pill */}
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-200/60 dark:border-zinc-700/60 truncate max-w-[140px]">
                    <Folder className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">{category?.name || '未分类'}</span>
                  </span>

                  {/* Tags */}
                  {bm.tags && bm.tags.length > 0 && (
                    bm.tags.slice(0, 2).map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200/40 dark:border-zinc-700/40"
                      >
                        <Tag className="w-2.5 h-2.5 text-zinc-400" />
                        <span>{tag}</span>
                      </span>
                    ))
                  )}
                </div>

                {/* Bottom Row: 快速快捷操作栏 (全部采用胶囊按钮) */}
                <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-1.5">
                  {/* 排位上下移胶囊组 */}
                  <div className="inline-flex items-center rounded-full bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 p-0.5 shadow-2xs">
                    <button
                      onClick={() => moveBookmark(index, 'up')}
                      disabled={index === 0}
                      title="上移排位"
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                      <span>上移</span>
                    </button>
                    <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />
                    <button
                      onClick={() => moveBookmark(index, 'down')}
                      disabled={index === filtered.length - 1}
                      title="下移排位"
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                      <span>下移</span>
                    </button>
                  </div>

                  {/* 快捷操作胶囊按钮组 */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* 快讯胶囊按钮 */}
                    <button
                      onClick={(e) => handleToggleFeedQuick(bm, e)}
                      title={bm.inFeed ? '已收录进快讯 (点击移出)' : '点击收录进快讯'}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shadow-2xs cursor-pointer ${
                        bm.inFeed
                          ? 'bg-amber-500 text-white dark:bg-amber-600 font-semibold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/60'
                      }`}
                    >
                      <Rss className="w-3 h-3" />
                      <span>{bm.inFeed ? '已快讯' : '快讯'}</span>
                    </button>

                    {/* 置顶胶囊按钮 */}
                    <button
                      onClick={() => handleTogglePin(bm)}
                      title={bm.isPinned ? '已置顶 (点击取消)' : '点击置顶'}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shadow-2xs cursor-pointer ${
                        bm.isPinned
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80 font-semibold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/60'
                      }`}
                    >
                      <Pin className="w-3 h-3" />
                      <span>{bm.isPinned ? '已置顶' : '置顶'}</span>
                    </button>

                    {/* 编辑胶囊按钮 */}
                    <button
                      onClick={() => openEditModal(bm)}
                      title="编辑书签卡片"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/90 dark:text-indigo-300 dark:hover:bg-indigo-900 border border-indigo-200/70 dark:border-indigo-800/70 transition-all shadow-2xs cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>编辑</span>
                    </button>

                    {/* 删除胶囊按钮 */}
                    <button
                      onClick={() => setDeleteConfirmBm(bm)}
                      title="删除书签"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200/70 dark:border-rose-800/70 transition-all shadow-2xs cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table (>= md) */}
      <div className="hidden md:block rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPartiallySelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title={isAllSelected ? '取消全选' : '全选所有书签'}
                  />
                </th>
                <th className="py-3 px-3 w-16 text-center">排位</th>
                <th className="py-3 px-3 w-10 text-center">置顶</th>
                <th className="py-3 px-3 w-12 text-center">快讯</th>
                <th className="py-3 px-4">书签信息</th>
                <th className="py-3 px-4">所属分类</th>
                <th className="py-3 px-4">标签与速报</th>
                <th className="py-3 px-4 text-center">点击量</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400 text-sm">
                    未找到相关书签
                  </td>
                </tr>
              ) : (
                filtered.map((bm, index) => {
                  const category = categories.find((c) => c.id === bm.categoryId);
                  return (
                    <tr
                      key={bm.id}
                      className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group ${
                        selectedIds.includes(bm.id) ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Batch Selection Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(bm.id)}
                          onChange={(e) => toggleSelect(bm.id, e as any)}
                          className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Rank / Sort Order */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                            #{bm.sortOrder || index + 1}
                          </span>
                          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => moveBookmark(index, 'up')}
                              disabled={index === 0}
                              title="上移排位"
                              className="text-zinc-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer p-0.5"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveBookmark(index, 'down')}
                              disabled={index === filtered.length - 1}
                              title="下移排位"
                              className="text-zinc-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer p-0.5"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Pin Toggle */}
                      <td className="py-3.5 px-3 text-center">
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

                      {/* InFeed Toggle */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={(e) => handleToggleFeedQuick(bm, e)}
                          title={bm.inFeed ? '已加入快讯 (点击移出)' : '点击收录进快讯'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            bm.inFeed
                              ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                              : 'text-zinc-300 dark:text-zinc-600 hover:text-zinc-500'
                          }`}
                        >
                          <Rss className="w-4 h-4" />
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
                              {bm.inFeed && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 shrink-0">
                                  <span>快讯精选</span>
                                </span>
                              )}
                              {bm.isPrivate && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 shrink-0">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>私密</span>
                                </span>
                              )}
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
                            onClick={() => setDeleteConfirmBm(bm)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/50 backdrop-blur-sm animate-in fade-in">
          <div
            className="relative w-full max-w-lg p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3.5 sm:top-4 right-3.5 sm:right-4 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-4 pr-8">
              {editingBookmark ? '编辑书签卡片' : '添加新书签'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* URL with Auto-fetch */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  网址链接 (URL) *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAiAutoFill}
                      disabled={isAiAnalyzing || !formData.url.trim()}
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title="利用 Gemini AI 自动提取站点名称、简介、标签并推荐分类"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
                      <span>{isAiAnalyzing ? 'AI 提取中...' : '✨ AI 智能填写'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFetchFavicon}
                      disabled={isFetchingFavicon || !formData.url.trim()}
                      className="px-3.5 py-2 text-xs font-medium rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFavicon ? 'animate-spin' : ''}`} />
                      <span>抓取图标</span>
                    </button>
                  </div>
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

              {/* Category & Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                    排位序号 (越小排在越前面)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, sortOrder: Math.max(1, (Number(prev.sortOrder) || 1) - 1) }))}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold cursor-pointer shrink-0 transition-colors active:scale-95"
                      title="排位序号 -1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={formData.sortOrder}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setFormData({ ...formData, sortOrder: isNaN(val) ? 1 : Math.max(1, val) });
                      }}
                      className="w-full px-3 py-2 text-sm text-center font-mono font-bold rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, sortOrder: (Number(prev.sortOrder) || 0) + 1 }))}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold cursor-pointer shrink-0 transition-colors active:scale-95"
                      title="排位序号 +1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  展示策略与快讯配置
                </div>

                <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="inFeedCheck"
                    checked={formData.inFeed}
                    onChange={(e) => setFormData({ ...formData, inFeed: e.target.checked })}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="inFeedCheck" className="text-sm text-zinc-800 dark:text-zinc-200 cursor-pointer flex items-center gap-1.5">
                    <Rss className="w-3.5 h-3.5 text-amber-500" />
                    <span>加入「站点快讯」展示 (在前台快讯 Feed 流中呈现精美动态)</span>
                  </label>
                </div>

                {formData.inFeed && (
                  <div className="pl-6 space-y-3 pt-1 border-l-2 border-amber-200 dark:border-amber-900/60 ml-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="feedHighlightCheck"
                        checked={formData.feedHighlight}
                        onChange={(e) => setFormData({ ...formData, feedHighlight: e.target.checked })}
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="feedHighlightCheck" className="text-xs text-amber-900 dark:text-amber-300 cursor-pointer flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>标记为快讯头条 / 精选推荐</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        自定义快讯速报 / 解读 (可选)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.feedCustomNote}
                        onChange={(e) => setFormData({ ...formData, feedCustomNote: e.target.value })}
                        placeholder="例如：发布全新重大版本更新，重点优化了开发体验与构建性能..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrivateCheck"
                    checked={formData.isPrivate}
                    onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isPrivateCheck" className="text-sm text-zinc-800 dark:text-zinc-200 cursor-pointer flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>设为私密书签 (仅管理员登录后可见，未登录访客隐藏)</span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
                >
                  {editingBookmark ? '保存修改' : '确认添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-Risk Action Secondary Confirmation Modal */}
      {deleteConfirmBm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200/50 dark:border-red-900/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">高风险操作二次确认</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                确定要彻底删除书签 <strong className="text-zinc-800 dark:text-zinc-200">“{deleteConfirmBm.title}”</strong> 吗？
                此操作将立即从持久化存储中移除，不可恢复。
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmBm(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteBookmark(deleteConfirmBm.id);
                    showToast('书签已安全删除', 'success');
                    setDeleteConfirmBm(null);
                  } catch (err: any) {
                    showToast(err.message || '删除失败', 'error');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? '正在执行删除...' : '确认永久删除'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 批量调整分类模态框 */}
      {isBatchCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-900/40">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">批量调整书签分类</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                即将为选中的 <strong className="text-zinc-800 dark:text-zinc-200">{selectedIds.length}</strong> 个书签统一分配至新分类：
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                选择目标分类
              </label>
              <select
                value={batchTargetCategory}
                onChange={(e) => setBatchTargetCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchCategoryModalOpen(false)}
                disabled={isBatchProcessing}
                className="px-3.5 py-2 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isBatchProcessing || !batchTargetCategory}
                onClick={confirmBatchChangeCategory}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBatchProcessing ? '正在移动...' : `确认移动 (${selectedIds.length} 项)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除二次确认模态框 */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200/50 dark:border-red-900/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">高风险批量删除二次确认</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                确定要彻底删除已勾选的 <strong className="text-rose-600 dark:text-rose-400 font-bold">{selectedIds.length}</strong> 个书签吗？
                此操作将立即从持久化存储中清除，不可撤销。
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isBatchProcessing}
                className="px-3.5 py-2 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={confirmBatchDelete}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isBatchProcessing ? '正在批量删除...' : `确认删除 (${selectedIds.length} 项)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
