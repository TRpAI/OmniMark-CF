import React, { useState, useEffect, useMemo } from 'react';
import {
  Rss,
  Sparkles,
  ExternalLink,
  Clock,
  Flame,
  Search,
  RotateCw,
  ThumbsUp,
  Tag,
  ArrowLeft,
  LayoutGrid,
  List,
  Calendar,
  Share2,
  Check,
  Globe,
  Newspaper,
  Compass,
  ArrowUpRight,
  TrendingUp,
  X,
  Layers,
} from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { feedApi, RealFeedItem } from '../../../api/feed.api';

export const SiteFeedViewer: React.FC = () => {
  const {
    bookmarks,
    categories,
    settings,
    searchQuery,
    setSearchQuery,
    setActiveCategory,
    openBookmarkDetail,
    recordBookmarkClick,
  } = useBookmarkStore();
  const { showToast } = useUiStore();

  const [realItems, setRealItems] = useState<RealFeedItem[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [feedSearch, setFeedSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline' | 'compact'>('cards');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [likedArticles, setLikedArticles] = useState<Record<string, boolean>>({});
  const [savedArticles, setSavedArticles] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch real, authentic news on component mount
  const fetchRealFeed = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const items = await feedApi.getLiveFeed(forceRefresh);
      if (Array.isArray(items) && items.length > 0) {
        setRealItems(items);
      }
    } catch (err: any) {
      console.warn('Failed to fetch real live feed:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRealFeed(false);
  }, []);

  // Curated list of sources from the real fetched items
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    realItems.forEach((item) => {
      if (item.source) set.add(item.source);
    });
    return Array.from(set);
  }, [realItems]);

  const activeSearchQuery = (feedSearch || searchQuery || '').trim().toLowerCase();

  // Filtered real feed items based on search query and source filter
  const filteredFeed = useMemo(() => {
    return realItems.filter((item) => {
      // Source filter
      if (selectedSource !== 'all' && item.source !== selectedSource) {
        return false;
      }

      // Search filter across real title, summary, source, and tags
      if (activeSearchQuery) {
        const matchTitle = (item.title || '').toLowerCase().includes(activeSearchQuery);
        const matchSummary = (item.summary || '').toLowerCase().includes(activeSearchQuery);
        const matchSource = (item.source || '').toLowerCase().includes(activeSearchQuery);
        const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(activeSearchQuery));
        if (!matchTitle && !matchSummary && !matchSource && !matchTags) return false;
      }

      return true;
    });
  }, [realItems, selectedSource, activeSearchQuery]);

  const handleRefresh = async () => {
    await fetchRealFeed(true);
    showToast('已拉取并同步最新真实资讯与科技动态', 'success');
  };

  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedArticles((prev) => {
      const next = !prev[id];
      showToast(next ? '已点赞该动态' : '已取消点赞', 'info');
      return { ...prev, [id]: next };
    });
  };

  const handleToggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedArticles((prev) => {
      const next = !prev[id];
      showToast(next ? '已加入动态收藏夹' : '已移出收藏夹', 'info');
      return { ...prev, [id]: next };
    });
  };

  const handleCopyLink = (url: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('真实文章链接已复制到剪贴板', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVisitUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* ========================================================= */}
      {/* 1. 站点快讯页面专属顶部搜索栏 (Prominent Top Search Bar) */}
      {/* ========================================================= */}
      <section className="w-full">
        <div className="relative w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-md p-2 sm:p-2.5 transition-all">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3.5 sm:left-4.5 w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 pointer-events-none" />
            <input
              type="text"
              value={feedSearch || searchQuery}
              onChange={(e) => {
                setFeedSearch(e.target.value);
                setSearchQuery(e.target.value);
              }}
              placeholder="在站点快讯中搜索真实技术动态、开源资讯、源站点或标签..."
              className="w-full pl-10 sm:pl-13 pr-24 sm:pr-28 py-2.5 sm:py-3.5 text-xs sm:text-sm rounded-xl sm:rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
            <div className="absolute right-2 sm:right-3 flex items-center gap-1.5">
              {(feedSearch || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setFeedSearch('');
                    setSearchQuery('');
                  }}
                  className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  title="清空搜索"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                {filteredFeed.length} 篇
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. Header Banner & Filter Dashboard */}
      {/* ========================================================= */}
      <section className="relative p-5 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 text-white shadow-xl overflow-hidden border border-indigo-800/40">
        {/* Background glow effects */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>实时联网 · 真实技术快讯与头条</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {settings.siteFeedTitle || '站点动态 & 实时快讯'}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 max-w-xl leading-relaxed">
              {settings.siteFeedSubtitle ||
                '直连全球开源社区、官方工程博客与真实技术资讯源，杜绝编造内容，提供权威、即时的第一手情报。'}
            </p>
          </div>

          {/* Quick Action Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveCategory('all')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium backdrop-blur-md border border-white/15 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回书签列表</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-500/30 transition-all cursor-pointer ${
                isRefreshing ? 'opacity-80' : ''
              }`}
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? '同步实时中...' : '刷新最新快讯'}</span>
            </button>
          </div>
        </div>

        {/* Source Pills & Layout Mode Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Source Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedSource('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedSource === 'all'
                  ? 'bg-white text-indigo-950 font-bold shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              全部来源 ({realItems.length})
            </button>

            {availableSources.map((source) => {
              const count = realItems.filter((i) => i.source === source).length;
              const isSelected = selectedSource === source;

              return (
                <button
                  key={source}
                  onClick={() => setSelectedSource(source)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-white text-indigo-950 font-bold shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{source}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-100 text-indigo-900' : 'bg-white/20'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Layout Toggle */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <span className="text-xs text-indigo-200/80 hidden sm:inline">排版视图：</span>
            <div className="flex items-center bg-white/10 p-0.5 rounded-xl border border-white/15">
              <button
                onClick={() => setViewMode('cards')}
                title="杂志卡片流"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white/25 text-white shadow-xs' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                title="时间线瀑布流"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'timeline' ? 'bg-white/25 text-white shadow-xs' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                title="极简速报列表"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'compact' ? 'bg-white/25 text-white shadow-xs' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. Real News Stream Content */}
      {/* ========================================================= */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">正在实时连接全球科技源，获取最新资讯动态...</p>
        </div>
      ) : filteredFeed.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-8 space-y-3">
          <Newspaper className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-1" />
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            未找到匹配的真实快讯
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            尝试更换搜索词，或重置来源分类
          </p>
          <button
            onClick={() => {
              setSelectedSource('all');
              setFeedSearch('');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer hover:bg-indigo-700"
          >
            重置筛选条件
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* View Mode 1: Magazine Editorial Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredFeed.map((item) => {
            const isLiked = likedArticles[item.id];
            const isSaved = savedArticles[item.id];

            return (
              <article
                key={item.id}
                onClick={(e) => handleVisitUrl(item.url, e)}
                className="group flex flex-col justify-between rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden cursor-pointer"
              >
                <div className="p-5 sm:p-6 space-y-3.5">
                  {/* Source Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200/60 dark:border-zinc-700/60">
                        {item.sourceFavicon ? (
                          <img
                            src={item.sourceFavicon}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-4.5 h-4.5 object-contain rounded"
                          />
                        ) : (
                          <Globe className="w-4 h-4 text-indigo-500" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {item.source}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.isHot && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                          <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>热点</span>
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {item.relativeTime}
                      </span>
                    </div>
                  </div>

                  {/* Real Headline */}
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Real Excerpt / Summary */}
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                    {item.summary}
                  </p>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {item.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        >
                          <Tag className="w-2.5 h-2.5 text-zinc-400" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="px-5 sm:px-6 py-3 bg-zinc-50/70 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleToggleLike(item.id, e)}
                      className={`inline-flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer ${
                        isLiked ? 'text-indigo-600 font-bold' : ''
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-indigo-600' : ''}`} />
                      <span>{(item.likes || 12) + (isLiked ? 1 : 0)}</span>
                    </button>

                    <button
                      onClick={(e) => handleCopyLink(item.url, item.id, e)}
                      title="复制文章原文链接"
                      className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer p-1"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>原文直达</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : viewMode === 'timeline' ? (
        /* View Mode 2: Timeline Waterfall Stream */
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
          {filteredFeed.map((item) => (
            <div key={item.id} className="relative group">
              {/* Timeline Indicator Dot */}
              <div className="absolute -left-6 sm:-left-8 top-4 w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-indigo-600 group-hover:scale-125 transition-transform" />

              <div
                onClick={(e) => handleVisitUrl(item.url, e)}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-400 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      {item.source}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">·</span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {item.publishedAt}
                    </span>
                  </div>

                  <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
                </div>

                <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </h4>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.summary}
                </p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {item.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[10px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* View Mode 3: Compact News Ticker List */
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden shadow-xs">
          {filteredFeed.map((item) => (
            <div
              key={item.id}
              onClick={(e) => handleVisitUrl(item.url, e)}
              className="p-3.5 sm:p-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.sourceFavicon ? (
                    <img src={item.sourceFavicon} alt="" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {item.source}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 hidden sm:block">
                    {item.summary}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 text-xs text-zinc-400">
                <span className="font-mono text-[11px]">{item.relativeTime}</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
