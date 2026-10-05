import React, { useState, useMemo } from 'react';
import {
  Rss,
  Sparkles,
  Search,
  Check,
  X,
  ExternalLink,
  Flame,
  Globe,
  Tag,
  Save,
  Layers,
  Pin,
  Edit3,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Bookmark, Category } from '../../../../packages/shared/types';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { renderCategoryIcon } from '../../../utils/iconMap';

export const FeedManager: React.FC = () => {
  const { bookmarks, categories, settings, updateBookmark, updateSettings } = useBookmarkStore();
  const { showToast, setCurrentView } = useUiStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'included' | 'excluded' | 'pinned'>('all');
  const [editingNoteBm, setEditingNoteBm] = useState<Bookmark | null>(null);
  const [customNoteText, setCustomNoteText] = useState('');
  const [customHighlight, setCustomHighlight] = useState(false);
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);

  // Global feed settings
  const [feedTitle, setFeedTitle] = useState(settings.siteFeedTitle || '站点快讯 & 动态精选');
  const [feedSubtitle, setFeedSubtitle] = useState(
    settings.siteFeedSubtitle || '聚合精选站点的最新资讯、架构升级与功能演进动态'
  );
  const [enableSiteFeed, setEnableSiteFeed] = useState(settings.enableSiteFeed ?? true);

  // Determine if a bookmark is included in feed
  const isBookmarkInFeed = (bm: Bookmark) => {
    if (bm.inFeed === true) return true;
    if (settings.feedBookmarkIds && settings.feedBookmarkIds.includes(bm.id)) return true;
    return false;
  };

  const feedBookmarksCount = useMemo(() => {
    return bookmarks.filter(isBookmarkInFeed).length;
  }, [bookmarks, settings.feedBookmarkIds]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Filtered list
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bm) => {
      // Category filter
      if (selectedCategory !== 'all' && bm.categoryId !== selectedCategory) {
        return false;
      }
      // Status filter
      const inFeed = isBookmarkInFeed(bm);
      if (filterMode === 'included' && !inFeed) return false;
      if (filterMode === 'excluded' && inFeed) return false;
      if (filterMode === 'pinned' && !bm.isPinned) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchTitle = bm.title.toLowerCase().includes(q);
        const matchUrl = bm.url.toLowerCase().includes(q);
        const matchDesc = (bm.description || '').toLowerCase().includes(q);
        const matchTags = (bm.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchUrl && !matchDesc && !matchTags) return false;
      }
      return true;
    });
  }, [bookmarks, selectedCategory, filterMode, search, settings.feedBookmarkIds]);

  // Toggle single bookmark in/out of feed
  const handleToggleFeed = async (bm: Bookmark, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentInFeed = isBookmarkInFeed(bm);
    const newInFeed = !currentInFeed;

    // Update bookmark inFeed property
    try {
      await updateBookmark(bm.id, {
        ...bm,
        inFeed: newInFeed,
      });

      // Also update settings.feedBookmarkIds to keep in sync
      const currentIds = new Set(settings.feedBookmarkIds || []);
      if (newInFeed) {
        currentIds.add(bm.id);
      } else {
        currentIds.delete(bm.id);
      }
      await updateSettings({
        feedBookmarkIds: Array.from(currentIds),
      });

      showToast(
        newInFeed ? `已将「${bm.title}」加入站点快讯展示` : `已将「${bm.title}」从站点快讯移除`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || '更新快讯配置失败', 'error');
    }
  };

  // Batch toggle all pinned bookmarks
  const handleBatchIncludePinned = async () => {
    try {
      const pinned = bookmarks.filter((b) => b.isPinned);
      const pinnedIds = pinned.map((b) => b.id);
      const newIds = new Set([...(settings.feedBookmarkIds || []), ...pinnedIds]);

      for (const bm of pinned) {
        if (!bm.inFeed) {
          await updateBookmark(bm.id, { ...bm, inFeed: true });
        }
      }

      await updateSettings({
        feedBookmarkIds: Array.from(newIds),
      });

      showToast(`已成功将 ${pinned.length} 个常用置顶站点批量加入快讯`, 'success');
    } catch (err: any) {
      showToast(err.message || '批量配置失败', 'error');
    }
  };

  // Batch enable all in current filter
  const handleBatchIncludeFiltered = async () => {
    try {
      const idsToAdd = filteredBookmarks.map((b) => b.id);
      const currentIds = new Set(settings.feedBookmarkIds || []);
      idsToAdd.forEach((id) => currentIds.add(id));

      for (const bm of filteredBookmarks) {
        if (!bm.inFeed) {
          await updateBookmark(bm.id, { ...bm, inFeed: true });
        }
      }

      await updateSettings({
        feedBookmarkIds: Array.from(currentIds),
      });

      showToast(`已将当前筛选的 ${filteredBookmarks.length} 个站点加入快讯`, 'success');
    } catch (err: any) {
      showToast(err.message || '批量配置失败', 'error');
    }
  };

  // Batch clear all from feed
  const handleBatchClearFeed = async () => {
    if (!window.confirm('确定要清空快讯页面的所有收录站点吗？')) return;
    try {
      for (const bm of bookmarks) {
        if (bm.inFeed) {
          await updateBookmark(bm.id, { ...bm, inFeed: false });
        }
      }
      await updateSettings({
        feedBookmarkIds: [],
      });
      showToast('已清空快讯收录站点', 'info');
    } catch (err: any) {
      showToast(err.message || '清空失败', 'error');
    }
  };

  // Open custom note editor
  const handleOpenNoteModal = (bm: Bookmark, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteBm(bm);
    setCustomNoteText(bm.feedCustomNote || '');
    setCustomHighlight(Boolean(bm.feedHighlight));
  };

  // Save custom note
  const handleSaveNote = async () => {
    if (!editingNoteBm) return;
    try {
      await updateBookmark(editingNoteBm.id, {
        ...editingNoteBm,
        feedCustomNote: customNoteText.trim(),
        feedHighlight: customHighlight,
        inFeed: true, // Automatically enable if customized
      });

      const currentIds = new Set(settings.feedBookmarkIds || []);
      currentIds.add(editingNoteBm.id);
      await updateSettings({
        feedBookmarkIds: Array.from(currentIds),
      });

      showToast(`已保存「${editingNoteBm.title}」的快讯定制动态`, 'success');
      setEditingNoteBm(null);
    } catch (err: any) {
      showToast(err.message || '保存失败', 'error');
    }
  };

  // Save global feed settings
  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGlobal(true);
    try {
      await updateSettings({
        siteFeedTitle: feedTitle.trim(),
        siteFeedSubtitle: feedSubtitle.trim(),
        enableSiteFeed,
      });
      showToast('快讯页面全局设置已保存', 'success');
    } catch (err: any) {
      showToast(err.message || '保存设置失败', 'error');
    } finally {
      setIsSavingGlobal(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Overview Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 text-white shadow-xl relative overflow-hidden border border-indigo-800/40">
        <div className="absolute -right-10 -top-10 w-52 h-52 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-indigo-200">
              <Rss className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>站点快讯动态配置中心</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              精选快讯站点与动态策略
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/80 max-w-xl">
              在前台「站点快讯」页面中，仅展示此处开启的书签站点。支持自定义速报解读、头条高亮与批量排布。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[100px]">
              <div className="text-2xl font-black text-amber-300">{feedBookmarksCount}</div>
              <div className="text-[11px] text-indigo-200 font-medium">当前收录站点</div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[100px]">
              <div className="text-2xl font-black text-white">{bookmarks.length}</div>
              <div className="text-[11px] text-indigo-200 font-medium">总书签库</div>
            </div>
            <button
              onClick={() => {
                setCurrentView('home');
              }}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>前台快讯预览</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Global Feed Settings (Collapsible / Compact Card) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">快讯页面全局配置</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                自定义前台快讯 Tab 显示状态与页面文案
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveGlobalSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              快讯页面主标题
            </label>
            <input
              type="text"
              value={feedTitle}
              onChange={(e) => setFeedTitle(e.target.value)}
              placeholder="例如：站点快讯 & 动态精选"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              快讯副标题与描述
            </label>
            <input
              type="text"
              value={feedSubtitle}
              onChange={(e) => setFeedSubtitle(e.target.value)}
              placeholder="例如：聚合精选站点的最新资讯..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 flex items-center h-[38px] px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={enableSiteFeed}
                  onChange={(e) => setEnableSiteFeed(e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>在前台导航栏显示快讯 Tab</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSavingGlobal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50 h-[38px]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingGlobal ? '保存中...' : '保存设置'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Site Selection & Curation Studio */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-5">
        {/* Toolbar & Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Chips */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/50">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              全部书签 ({bookmarks.length})
            </button>
            <button
              onClick={() => setFilterMode('included')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'included'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>已加入快讯 ({feedBookmarksCount})</span>
            </button>
            <button
              onClick={() => setFilterMode('excluded')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterMode === 'excluded'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              未加入 ({bookmarks.length - feedBookmarksCount})
            </button>
            <button
              onClick={() => setFilterMode('pinned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                filterMode === 'pinned'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Pin className="w-3 h-3 text-amber-500" />
              <span>仅常用置顶</span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索站点名称/网址/标签..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Batch Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>快捷排布工具：</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBatchIncludePinned}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-700 border border-indigo-200 dark:border-indigo-800/60 font-semibold text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer shadow-xs"
            >
              ⚡ 一键将全部常用置顶加入快讯
            </button>
            <button
              onClick={handleBatchIncludeFiltered}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-700 border border-indigo-200 dark:border-indigo-800/60 font-semibold text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer shadow-xs"
            >
              ✓ 将当前筛选站点全部收录
            </button>
            <button
              onClick={handleBatchClearFeed}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-zinc-200 dark:border-zinc-700 font-medium text-rose-600 dark:text-rose-400 transition-colors cursor-pointer shadow-xs"
            >
              清空快讯收录
            </button>
          </div>
        </div>

        {/* Site List / Grid */}
        {filteredBookmarks.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
              <Rss className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              没有找到符合条件的书签站点
            </p>
            <p className="text-xs text-zinc-400">请尝试更换搜索词或筛选条件</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredBookmarks.map((bm) => {
              const inFeed = isBookmarkInFeed(bm);
              const cat = categoryMap.get(bm.categoryId);

              return (
                <div
                  key={bm.id}
                  className={`group relative p-4 rounded-2xl border transition-all ${
                    inFeed
                      ? 'bg-white dark:bg-zinc-900 border-indigo-300 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-500/20'
                      : 'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Top Bar: Icon + Title + Switch */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                        {bm.favicon ? (
                          <img
                            src={bm.favicon}
                            alt=""
                            className="w-5 h-5 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Globe className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                            {bm.title}
                          </h4>
                          {bm.isPinned && (
                            <span title="常用置顶" className="shrink-0 text-amber-500">
                              <Pin className="w-3 h-3" />
                            </span>
                          )}
                          {bm.feedHighlight && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold shrink-0">
                              头条
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>{cat?.name || '默认分类'}</span>
                          <span>•</span>
                          <span className="truncate">{bm.url.replace(/^https?:\/\//, '')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      onClick={(e) => handleToggleFeed(bm, e)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        inFeed ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                      title={inFeed ? '点击从快讯中移除' : '点击加入快讯展示'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          inFeed ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Description or Custom Note */}
                  <div className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 mb-3 min-h-[32px]">
                    {bm.feedCustomNote ? (
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        【定制速报】{bm.feedCustomNote}
                      </span>
                    ) : (
                      bm.description || '暂无站点描述'
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          inFeed
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {inFeed ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>{inFeed ? '快讯已展示' : '未收录'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenNoteModal(bm, e)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                        title="自定义快讯动态内容"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{bm.feedCustomNote ? '修改速报' : '定制动态'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Custom Note & Highlight Editor Modal */}
      {editingNoteBm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    定制「{editingNoteBm.title}」快讯速报
                  </h3>
                  <p className="text-xs text-zinc-500">
                    在前台快讯页面中展示该站点的最新版本解读或头条资讯
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingNoteBm(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  自定义快讯速报 / 动态解读
                </label>
                <textarea
                  rows={3}
                  value={customNoteText}
                  onChange={(e) => setCustomNoteText(e.target.value)}
                  placeholder="例如：近日发布重大版本更新，重构了底层编译器并带来 3 倍构建速度提升..."
                  className="w-full p-3 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  若留空，系统将根据书签描述与标签智能生成高保真动态文章。
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-amber-900 dark:text-amber-200 select-none">
                  <input
                    type="checkbox"
                    checked={customHighlight}
                    onChange={(e) => setCustomHighlight(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>在前台快讯中标记为「热门头条 / 精选推荐」</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingNoteBm(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
              >
                保存定制
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
