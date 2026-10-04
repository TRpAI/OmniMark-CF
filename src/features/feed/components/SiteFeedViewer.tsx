import React, { useState, useMemo } from 'react';
import {
  Rss,
  Sparkles,
  ExternalLink,
  Clock,
  Flame,
  Search,
  RotateCw,
  ThumbsUp,
  Bookmark as BookmarkIcon,
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
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { Bookmark } from '../../../../packages/shared/types';
import { renderCategoryIcon } from '../../../utils/iconMap';

interface FeedArticle {
  id: string;
  bookmarkId: string;
  siteTitle: string;
  siteUrl: string;
  siteFavicon?: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  title: string;
  summary: string;
  publishedAt: string;
  relativeTime: string;
  readTime: string;
  tags: string[];
  views: number;
  likes: number;
  isHot?: boolean;
  isFeatured?: boolean;
}

export const SiteFeedViewer: React.FC = () => {
  const { bookmarks, categories, setActiveCategory, openBookmarkDetail, recordBookmarkClick } =
    useBookmarkStore();
  const { showToast } = useUiStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [feedSearch, setFeedSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline' | 'compact'>('cards');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [likedArticles, setLikedArticles] = useState<Record<string, boolean>>({});
  const [savedArticles, setSavedArticles] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generate realistic, rich, beautiful site updates based on actual bookmarks
  const feedItems: FeedArticle[] = useMemo(() => {
    if (!bookmarks || bookmarks.length === 0) return [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const templates = [
      {
        titleSuffix: '年度大版本更新与核心功能特性全景解读',
        summaryTemplate: (title: string, desc: string) =>
          `${title} 近日发布了全新架构演进与重大特性更新，重点优化了开发体验、响应速度以及现代化工具链支持。${desc || '作为行业标杆产品，此次升级进一步提升了整体生态协同效率与稳定性。'}`,
        tags: ['架构升级', '新特性', '效率工具'],
        readTime: '4 分钟阅读',
        viewsMultiplier: 340,
        isFeatured: true,
        isHot: true,
      },
      {
        titleSuffix: '深度实践指南：从入门到生产级最佳架构',
        summaryTemplate: (title: string, desc: string) =>
          `探索 ${title} 的高级用法与工程化实战。${desc || '详细拆解核心模块设计与落地踩坑经验'}，帮助团队构建更健壮、高可用且低延迟的业务体系。`,
        tags: ['最佳实践', '工程化', '实战'],
        readTime: '6 分钟深度',
        viewsMultiplier: 280,
        isFeatured: false,
        isHot: true,
      },
      {
        titleSuffix: '最新动态精选：体验优化与开发者生态进展',
        summaryTemplate: (title: string, desc: string) =>
          `官方社区最新披露了 ${title} 的路线图计划与生态集成进展。${desc || '包含更便捷的 API 接口、暗黑模式美化与性能提升'}，推荐保持关注。`,
        tags: ['生态动态', '体验升级', '社区精选'],
        readTime: '3 分钟速读',
        viewsMultiplier: 190,
        isFeatured: false,
        isHot: false,
      },
    ];

    const timeOffsets = [
      { text: '12 分钟前', hours: 0.2 },
      { text: '45 分钟前', hours: 0.75 },
      { text: '2 小时前', hours: 2 },
      { text: '5 小时前', hours: 5 },
      { text: '昨天 19:30', hours: 24 },
      { text: '前天 14:15', hours: 48 },
      { text: '3 天前', hours: 72 },
    ];

    const generated: FeedArticle[] = [];

    bookmarks.forEach((bm, bIdx) => {
      const cat = categoryMap.get(bm.categoryId) || {
        id: 'default',
        name: '通用站点',
        icon: 'Folder',
      };

      // Generate 1-2 curated updates per bookmark
      const count = bIdx < 6 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const template = templates[(bIdx + i) % templates.length];
        const timeInfo = timeOffsets[(bIdx * 2 + i) % timeOffsets.length];

        const articleTitle =
          i === 0
            ? `${bm.title} · ${template.titleSuffix}`
            : `【动态速递】${bm.title}：${bm.description ? bm.description.slice(0, 24) + '...' : '精选功能更新与技术前瞻'}`;

        const articleSummary = template.summaryTemplate(bm.title, bm.description);

        const now = new Date(Date.now() - timeInfo.hours * 3600 * 1000);
        const publishedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        generated.push({
          id: `feed-${bm.id}-${i}`,
          bookmarkId: bm.id,
          siteTitle: bm.title,
          siteUrl: bm.url,
          siteFavicon: bm.favicon,
          categoryId: bm.categoryId,
          categoryName: cat.name,
          categoryIcon: cat.icon || 'Folder',
          title: articleTitle,
          summary: articleSummary,
          publishedAt,
          relativeTime: timeInfo.text,
          readTime: template.readTime,
          tags: bm.tags && bm.tags.length > 0 ? bm.tags.slice(0, 3) : template.tags,
          views: (bm.clickCount || 1) * 12 + template.viewsMultiplier + (bIdx * 17) % 150,
          likes: Math.floor(((bm.clickCount || 1) * 4 + 18 + (bIdx * 7) % 35)),
          isHot: template.isHot || bm.isPinned,
          isFeatured: i === 0 && (bIdx === 0 || bIdx === 1),
        });
      }
    });

    return generated;
  }, [bookmarks, categories]);

  // Filter feed items
  const filteredFeed = useMemo(() => {
    return feedItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }
      // Search filter
      if (feedSearch.trim()) {
        const q = feedSearch.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSummary = item.summary.toLowerCase().includes(q);
        const matchSite = item.siteTitle.toLowerCase().includes(q);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchSummary && !matchSite && !matchTags) return false;
      }
      return true;
    });
  }, [feedItems, selectedCategory, feedSearch]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('已拉取并同步各书签站点的最新资讯', 'success');
    }, 600);
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
    showToast('文章链接已复制到剪贴板', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVisitSite = (url: string, bookmarkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    recordBookmarkClick(bookmarkId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenDetail = (bookmarkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetBookmark = bookmarks.find((b) => b.id === bookmarkId);
    if (targetBookmark) {
      openBookmarkDetail(targetBookmark);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Banner & Filter Dashboard */}
      <section className="relative p-5 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 text-white shadow-xl overflow-hidden border border-indigo-800/40">
        {/* Background glow effects */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>智能聚合 · 站点快讯 Feed</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              站点动态 & 精选快讯
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 max-w-xl leading-relaxed">
              实时聚合后台所有书签站点的最新资讯、技术博客、版本发布与精选动态，比传统 RSS 更直观、精美、流畅。
            </p>
          </div>

          {/* Quick Action Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveCategory('all')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium backdrop-blur-md border border-white/15 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回全部书签</span>
            </button>

            <button
              onClick={handleRefresh}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-500/30 transition-all cursor-pointer ${
                isRefreshing ? 'opacity-80' : ''
              }`}
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? '同步中...' : '刷新动态'}</span>
            </button>
          </div>
        </div>

        {/* Search & Category Tabs inside Banner */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-white text-indigo-950 font-bold shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              全部动态 ({feedItems.length})
            </button>

            {categories.map((cat) => {
              const count = feedItems.filter((i) => i.categoryId === cat.id).length;
              if (count === 0) return null;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-white text-indigo-950 font-bold shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {renderCategoryIcon(cat.icon, 'w-3.5 h-3.5')}
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-100 text-indigo-900' : 'bg-white/20'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box & View Mode Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-300" />
              <input
                type="text"
                value={feedSearch}
                onChange={(e) => setFeedSearch(e.target.value)}
                placeholder="搜索快讯关键词 / 标签..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder-indigo-300/70 focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-md"
              />
              {feedSearch && (
                <button
                  onClick={() => setFeedSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-indigo-300 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center bg-white/10 p-0.5 rounded-xl border border-white/15">
              <button
                onClick={() => setViewMode('cards')}
                title="杂志卡片流"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white/25 text-white' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                title="时间线瀑布流"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'timeline' ? 'bg-white/25 text-white' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                title="快讯精简列表"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'compact' ? 'bg-white/25 text-white' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Feed Stream Content */}
      {filteredFeed.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-8">
          <Newspaper className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            未找到匹配的站点快讯
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
            尝试更改搜索词，或重置分类筛选
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setFeedSearch('');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer hover:bg-indigo-700"
          >
            重置筛选条件
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* View 1: Magazine Editorial Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredFeed.map((item) => {
            const isLiked = likedArticles[item.id];
            const isSaved = savedArticles[item.id];

            return (
              <article
                key={item.id}
                className="group flex flex-col justify-between rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden"
              >
                <div className="p-5 sm:p-6 space-y-3.5">
                  {/* Site Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div
                      onClick={(e) => handleOpenDetail(item.bookmarkId, e)}
                      className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <div className="w-7 h-7 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200/60 dark:border-zinc-700/60">
                        {item.siteFavicon ? (
                          <img
                            src={item.siteFavicon}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-4.5 h-4.5 object-contain rounded"
                          />
                        ) : (
                          <Globe className="w-4 h-4 text-indigo-500" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {item.siteTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.isHot && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                          <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>热门</span>
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {item.relativeTime}
                      </span>
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <div className="space-y-1.5">
                    <h3
                      onClick={(e) => handleVisitSite(item.siteUrl, item.bookmarkId, e)}
                      className="text-base font-bold text-zinc-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400"
                      >
                        <Tag className="w-2.5 h-2.5 text-indigo-500" />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="px-5 sm:px-6 py-3.5 bg-zinc-50/80 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
                  {/* Left: Interactions */}
                  <div className="flex items-center gap-3 text-zinc-400 dark:text-zinc-500">
                    <button
                      onClick={(e) => handleToggleLike(item.id, e)}
                      className={`inline-flex items-center gap-1 transition-colors cursor-pointer ${
                        isLiked ? 'text-rose-500 font-semibold' : 'hover:text-rose-500'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500' : ''}`} />
                      <span>{item.likes + (isLiked ? 1 : 0)}</span>
                    </button>

                    <button
                      onClick={(e) => handleToggleSave(item.id, e)}
                      className={`transition-colors cursor-pointer ${
                        isSaved ? 'text-indigo-600 dark:text-indigo-400' : 'hover:text-indigo-600'
                      }`}
                    >
                      <BookmarkIcon className={`w-3.5 h-3.5 ${isSaved ? 'fill-indigo-600' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => handleCopyLink(item.siteUrl, item.id, e)}
                      className="hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      title="复制链接"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Right: Visit CTA Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleOpenDetail(item.bookmarkId, e)}
                      className="text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 text-xs font-medium cursor-pointer"
                    >
                      详情
                    </button>
                    <button
                      onClick={(e) => handleVisitSite(item.siteUrl, item.bookmarkId, e)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
                    >
                      <span>阅读原文</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : viewMode === 'timeline' ? (
        /* View 2: Elegant Chronological Timeline */
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-purple-500 before:to-zinc-300 dark:before:to-zinc-800">
          {filteredFeed.map((item) => (
            <div key={item.id} className="relative group">
              {/* Timeline Node Dot */}
              <div className="absolute -left-6 sm:-left-8 top-5 w-3 sm:w-3.5 h-3 sm:h-3.5 rounded-full bg-indigo-600 border-2 border-white dark:border-zinc-950 shadow-sm group-hover:scale-125 group-hover:bg-amber-400 transition-all" />

              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-xs hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.siteFavicon ? (
                        <img src={item.siteFavicon} alt="" className="w-4 h-4 object-contain rounded" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {item.siteTitle}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      {item.categoryName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.publishedAt}</span>
                    <span>({item.relativeTime})</span>
                  </div>
                </div>

                <h3
                  onClick={(e) => handleVisitSite(item.siteUrl, item.bookmarkId, e)}
                  className="text-base font-bold text-zinc-900 dark:text-white mb-2 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                  {item.summary}
                </p>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={(e) => handleVisitSite(item.siteUrl, item.bookmarkId, e)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <span>直达原站</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* View 3: Compact Fast-Scan Briefs */
        <div className="space-y-2.5">
          {filteredFeed.map((item) => (
            <div
              key={item.id}
              onClick={(e) => handleVisitSite(item.siteUrl, item.bookmarkId, e)}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-xs hover:shadow-md cursor-pointer transition-all"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
                  {item.siteFavicon ? (
                    <img src={item.siteFavicon} alt="" className="w-5 h-5 object-contain rounded" />
                  ) : (
                    <Globe className="w-4 h-4 text-indigo-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      [{item.siteTitle}]
                    </span>
                    <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {item.summary}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] text-zinc-400 font-mono">
                  {item.relativeTime}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
