import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Share2,
  Globe,
  Lock,
  Pin,
  Calendar,
  MousePointerClick,
  ShieldCheck,
  Tag,
  X,
  Sparkles,
  ChevronRight,
  Loader2,
  Bot,
} from 'lucide-react';
import { Bookmark } from '../../../../packages/shared/types';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { renderCategoryIcon } from '../../../utils/iconMap';
import { aiApi, AiSiteSummaryResult } from '../../../api/ai.api';

export const BookmarkDetailModal: React.FC = () => {
  const {
    selectedBookmarkDetail,
    closeBookmarkDetail,
    recordBookmarkClick,
    categories,
    bookmarks,
    openBookmarkDetail,
    setActiveCategory,
  } = useBookmarkStore();
  const { showToast, openAiAssistantWithBookmark } = useUiStore();

  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [imgError, setImgError] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<AiSiteSummaryResult | null>(null);
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false);
  const [aiSummaryCopied, setAiSummaryCopied] = useState(false);

  // Reset AI summary when viewing a different bookmark
  useEffect(() => {
    setAiSummary(null);
    setAiSummaryCopied(false);
  }, [selectedBookmarkDetail?.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeBookmarkDetail();
      }
    };
    if (selectedBookmarkDetail) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedBookmarkDetail, closeBookmarkDetail]);

  if (!selectedBookmarkDetail) return null;

  const bookmark = selectedBookmarkDetail;
  const currentCategory = categories.find((c) => c.id === bookmark.categoryId);

  // Related bookmarks in same category (excluding current)
  const relatedBookmarks = bookmarks
    .filter((b) => b.categoryId === bookmark.categoryId && b.id !== bookmark.id)
    .slice(0, 4);

  let hostname = '';
  let protocol = 'https:';
  try {
    const parsed = new URL(bookmark.url);
    hostname = parsed.hostname;
    protocol = parsed.protocol;
  } catch {
    hostname = bookmark.url;
  }

  const isHttps = protocol === 'https:';

  const handleContinueVisit = () => {
    recordBookmarkClick(bookmark.id);
    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(bookmark.url);
      setCopied(true);
      showToast('站点链接已复制到剪贴板', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('复制失败，请手动长按复制', 'error');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: bookmark.title,
          text: bookmark.description || `推荐站点：${bookmark.title}`,
          url: bookmark.url,
        });
        showToast('分享成功', 'success');
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyUrl();
    }
  };

  const handleGoToCategory = () => {
    if (bookmark.categoryId) {
      setActiveCategory(bookmark.categoryId);
      closeBookmarkDetail();
    }
  };

  const handleGenerateAiSummary = async () => {
    setIsGeneratingAiSummary(true);
    try {
      const res = await aiApi.generateSiteSummary(bookmark.url, bookmark.title, bookmark.description || '');
      setAiSummary(res);
      showToast('AI 深度摘要已生成', 'success');
    } catch (err: any) {
      showToast(err?.message || '生成 AI 摘要失败，请重试', 'error');
    } finally {
      setIsGeneratingAiSummary(false);
    }
  };

  const handleCopyAiSummary = async () => {
    if (!aiSummary) return;
    const text = `【${bookmark.title}】AI 智能深度摘要\n` +
      `官网：${bookmark.url}\n` +
      `核心定位：${aiSummary.oneSentenceSummary}\n\n` +
      `核心功能：\n${aiSummary.coreFeatures.map((f) => `• ${f}`).join('\n')}\n\n` +
      `适用人群：\n${aiSummary.targetAudience.map((a) => `• ${a}`).join('\n')}\n\n` +
      `亮点特色：\n${aiSummary.keyHighlights.map((h) => `• ${h}`).join('\n')}\n\n` +
      `使用建议：${aiSummary.recommendedUsage}`;
    try {
      await navigator.clipboard.writeText(text);
      setAiSummaryCopied(true);
      showToast('AI 摘要已复制到剪贴板', 'success');
      setTimeout(() => setAiSummaryCopied(false), 2000);
    } catch {
      showToast('复制失败', 'error');
    }
  };

  const handleOpenInAiAssistant = () => {
    const bmId = bookmark.id;
    closeBookmarkDetail();
    openAiAssistantWithBookmark(bmId);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '未知时间';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(bookmark.url)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-zinc-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={closeBookmarkDetail}
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200/90 dark:border-zinc-800/90 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60">
          {/* Back Button */}
          <button
            onClick={closeBookmarkDetail}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回书签列表</span>
          </button>

          {/* Right Status Tags & Close */}
          <div className="flex items-center gap-2">
            {bookmark.isPinned && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                <Pin className="w-3 h-3 fill-amber-500/20" />
                <span>置顶常用</span>
              </span>
            )}

            {bookmark.isPrivate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                <Lock className="w-3 h-3" />
                <span>私密书签</span>
              </span>
            )}

            <button
              onClick={closeBookmarkDetail}
              title="关闭 (ESC)"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body Scroll Area */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Site Hero Information */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 pb-5 border-b border-zinc-100 dark:border-zinc-800/60">
            {/* Favicon Container */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs">
              {bookmark.favicon && !imgError ? (
                <img
                  src={bookmark.favicon}
                  alt={bookmark.title}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-lg"
                />
              ) : (
                <Globe className="w-8 h-8 text-indigo-500" />
              )}
            </div>

            {/* Title & Metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white break-words">
                  {bookmark.title}
                </h2>
              </div>

              {/* Hostname & URL */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {isHttps ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  )}
                  <span>{hostname}</span>
                </span>

                {/* Category Link Pill */}
                {currentCategory && (
                  <button
                    onClick={handleGoToCategory}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                  >
                    {renderCategoryIcon(currentCategory.icon, 'w-3 h-3')}
                    <span>{currentCategory.name}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Core Action CTA Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Continue to Visit Button (Primary CTA) */}
              <button
                onClick={handleContinueVisit}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-base shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <span>继续访问</span>
                <ExternalLink className="w-4.5 h-4.5" />
              </button>

              {/* 2. Secondary Action Row */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleCopyUrl}
                  title="复制站点链接"
                  className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copied ? '已复制' : '复制网址'}</span>
                </button>

                <button
                  onClick={() => setShowQrCode(!showQrCode)}
                  title="手机扫码访问"
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 px-3 rounded-2xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    showQrCode
                      ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>二维码</span>
                </button>

                <button
                  onClick={handleShare}
                  title="分享此站点"
                  className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>分享</span>
                </button>
              </div>
            </div>

            {/* Complete URL Display Card */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-mono text-zinc-600 dark:text-zinc-400 overflow-hidden">
              <span className="truncate flex-1 select-all">{bookmark.url}</span>
              <button
                onClick={handleCopyUrl}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-sans shrink-0 font-medium cursor-pointer"
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>

          {/* QR Code Section (Collapsible) */}
          {showQrCode && (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left animate-in fade-in duration-200">
              <div className="p-2 bg-white rounded-xl shadow-xs border border-zinc-200/80 shrink-0">
                <img
                  src={qrCodeUrl}
                  alt={`QR Code for ${bookmark.title}`}
                  className="w-32 h-32 object-contain"
                />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  手机扫码快速访问
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  使用手机相机或微信扫一扫上方二维码，即可在移动设备上立即打开该站点。
                </p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-3 h-3" />
                    <span>免输入快速跨端同步</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              站点简介
            </h3>
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/80 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {bookmark.description ? (
                <p className="whitespace-pre-wrap">{bookmark.description}</p>
              ) : (
                <p className="text-zinc-400 dark:text-zinc-500 italic">
                  该站点暂未填写详细描述。您可以点击上方的「继续访问」直接前往官网浏览完整内容。
                </p>
              )}
            </div>
          </div>

          {/* AI Smart Summary Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span>AI 智能深度摘要</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                      Gemini
                    </span>
                  </h3>
                </div>
              </div>

              {aiSummary && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyAiSummary}
                    className="text-xs text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    {aiSummaryCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{aiSummaryCopied ? '已复制' : '复制'}</span>
                  </button>
                  <button
                    onClick={handleGenerateAiSummary}
                    disabled={isGeneratingAiSummary}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    重新生成
                  </button>
                </div>
              )}
            </div>

            {aiSummary ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-indigo-200/70 dark:border-indigo-800/60 space-y-4 animate-in fade-in duration-200">
                {/* One sentence core positioning */}
                <div className="p-3.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-0.5">核心定位</p>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
                        {aiSummary.oneSentenceSummary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Core Features */}
                {aiSummary.coreFeatures && aiSummary.coreFeatures.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">主打功能与特性</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {aiSummary.coreFeatures.map((feat, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/50 dark:border-zinc-800/50 text-xs text-zinc-700 dark:text-zinc-300"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                          <span className="leading-relaxed">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target Audience & Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {aiSummary.targetAudience && aiSummary.targetAudience.length > 0 && (
                    <div className="p-3 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/40 dark:border-zinc-800/40">
                      <p className="text-[11px] font-semibold text-zinc-400 mb-1.5">适用人群 / 场景</p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiSummary.targetAudience.map((aud, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300"
                          >
                            {aud}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiSummary.keyHighlights && aiSummary.keyHighlights.length > 0 && (
                    <div className="p-3 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/40 dark:border-zinc-800/40">
                      <p className="text-[11px] font-semibold text-zinc-400 mb-1.5">特色亮点</p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiSummary.keyHighlights.map((hl, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-[11px] text-indigo-700 dark:text-indigo-300"
                          >
                            {hl}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommended Usage Tips */}
                {aiSummary.recommendedUsage && (
                  <div className="p-3 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <span className="font-semibold text-amber-700 dark:text-amber-400">高效使用建议：</span>
                    {aiSummary.recommendedUsage}
                  </div>
                )}

                {/* Action footer */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleOpenInAiAssistant}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer group"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>在全功能 AI 助手中对话寻宝</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-pink-50/30 dark:from-zinc-900/80 dark:via-zinc-900/60 dark:to-zinc-900/40 border border-dashed border-indigo-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      一键智能提炼站点深度摘要
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      利用 Gemini 自动提炼核心功能、适用人群、特色亮点与高效技巧
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleGenerateAiSummary}
                    disabled={isGeneratingAiSummary}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingAiSummary ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI 智能解读中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>立即智能解读</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleOpenInAiAssistant}
                    title="在 AI 智能助手面板中打开"
                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 transition-colors cursor-pointer"
                  >
                    <Bot className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tags Section */}
          {bookmark.tags && bookmark.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                标签分类
              </h3>
              <div className="flex flex-wrap gap-2">
                {bookmark.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60"
                  >
                    <Tag className="w-3 h-3 text-indigo-500" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-800/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <MousePointerClick className="w-3.5 h-3.5 text-indigo-500" />
                <span>访问热度</span>
              </div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                {bookmark.clickCount || 0} 次点击
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-800/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>收录时间</span>
              </div>
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                {formatDate(bookmark.createdAt)}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-800/50 space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                <span>安全连接</span>
              </div>
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                {isHttps ? 'HTTPS 加密传输' : 'HTTP 普通连接'}
              </p>
            </div>
          </div>

          {/* Related Bookmarks in same category */}
          {relatedBookmarks.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>同分类其他书签</span>
                {currentCategory && (
                  <button
                    onClick={handleGoToCategory}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline capitalize text-[11px] font-normal cursor-pointer flex items-center gap-0.5"
                  >
                    <span>查看全部</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {relatedBookmarks.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => openBookmarkDetail(rel)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-50 hover:bg-indigo-50/50 dark:bg-zinc-800/40 dark:hover:bg-indigo-950/30 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-indigo-300 dark:hover:border-indigo-800/60 transition-all cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50">
                      {rel.favicon ? (
                        <img
                          src={rel.favicon}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-4.5 h-4.5 object-contain rounded"
                        />
                      ) : (
                        <Globe className="w-4 h-4 text-indigo-500" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate flex-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {rel.title}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Action */}
        <div className="px-4 sm:px-6 py-3.5 bg-zinc-50/80 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
          <button
            onClick={closeBookmarkDetail}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            返回
          </button>
          <button
            onClick={handleContinueVisit}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <span>继续访问</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
