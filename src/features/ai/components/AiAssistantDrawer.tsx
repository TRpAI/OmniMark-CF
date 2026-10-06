import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Bot,
  Search,
  ExternalLink,
  Copy,
  Check,
  Send,
  Loader2,
  FileText,
  Compass,
  ArrowRight,
  BookmarkPlus,
  Tag,
  Folder,
  Globe,
} from 'lucide-react';
import { useUiStore } from '../../../stores/ui.store';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useAuthStore } from '../../../stores/auth.store';
import { aiApi, AiSiteSummaryResult, AiSiteInfoResult } from '../../../api/ai.api';

export const AiAssistantDrawer: React.FC = () => {
  const { isAiAssistantOpen, setAiAssistantOpen, aiTargetBookmarkId, showToast } = useUiStore();
  const { bookmarks, categories, createBookmark } = useBookmarkStore();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'intake'>('summary');

  // Tab 1: Summary state
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string>('');
  const [customSummaryUrl, setCustomSummaryUrl] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState<AiSiteSummaryResult | null>(null);
  const [summaryTargetInfo, setSummaryTargetInfo] = useState<{ title: string; url: string } | null>(null);
  const [summaryCopied, setSummaryCopied] = useState(false);

  // Tab 2: Chat state
  const [chatQuery, setChatQuery] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; recommended?: Array<{ title: string; url: string }> }>
  >([
    {
      role: 'assistant',
      text: '您好！我是 OmniMark 的 AI 智能助理。我可以帮您在当前书签库中精准寻宝、推荐特定场景的工具，或者解答您对各类数字站点的疑问。请问今天想寻找什么？',
    },
  ]);

  // Tab 3: Intake state
  const [intakeUrl, setIntakeUrl] = useState('');
  const [isIntaking, setIsIntaking] = useState(false);
  const [intakeResult, setIntakeResult] = useState<AiSiteInfoResult | null>(null);
  const [isSavingIntake, setIsSavingIntake] = useState(false);

  // Auto-load bookmark when opened with target ID
  useEffect(() => {
    if (isAiAssistantOpen && aiTargetBookmarkId) {
      setSelectedBookmarkId(aiTargetBookmarkId);
      setActiveTab('summary');
      const bm = bookmarks.find((b) => b.id === aiTargetBookmarkId);
      if (bm) {
        handleGenerateSummary(bm);
      }
    }
  }, [isAiAssistantOpen, aiTargetBookmarkId]);

  if (!isAiAssistantOpen) return null;

  // Handle Generate Summary
  const handleGenerateSummary = async (overrideBm?: { url: string; title: string; description?: string }) => {
    let targetUrl = overrideBm ? overrideBm.url : '';
    let targetTitle = overrideBm ? overrideBm.title : '';
    let targetDesc = overrideBm ? overrideBm.description || '' : '';

    if (!overrideBm) {
      if (selectedBookmarkId) {
        const bm = bookmarks.find((b) => b.id === selectedBookmarkId);
        if (bm) {
          targetUrl = bm.url;
          targetTitle = bm.title;
          targetDesc = bm.description || '';
        }
      } else if (customSummaryUrl.trim()) {
        targetUrl = customSummaryUrl.trim();
        targetTitle = targetUrl;
      }
    }

    if (!targetUrl) {
      showToast('请选择书签或输入目标网址', 'error');
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryResult(null);
    setSummaryTargetInfo({ title: targetTitle, url: targetUrl });

    try {
      const res = await aiApi.generateSiteSummary(targetUrl, targetTitle, targetDesc);
      setSummaryResult(res);
      showToast('AI 深度摘要已生成', 'success');
    } catch (err: any) {
      showToast(err.message || '生成摘要失败，请重试', 'error');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Copy Summary
  const handleCopySummary = async () => {
    if (!summaryResult) return;
    const text = `【${summaryTargetInfo?.title}】智能摘要\n` +
      `网址：${summaryTargetInfo?.url}\n` +
      `定位：${summaryResult.oneSentenceSummary}\n\n` +
      `核心功能：\n${summaryResult.coreFeatures.map(f => `• ${f}`).join('\n')}\n\n` +
      `适用人群：\n${summaryResult.targetAudience.map(a => `• ${a}`).join('\n')}\n\n` +
      `使用建议：${summaryResult.recommendedUsage}`;

    try {
      await navigator.clipboard.writeText(text);
      setSummaryCopied(true);
      showToast('摘要已复制到剪贴板', 'success');
      setTimeout(() => setSummaryCopied(false), 2000);
    } catch {
      showToast('复制失败', 'error');
    }
  };

  // Handle Chat Submit
  const handleSendChat = async (queryToSend?: string) => {
    const q = (queryToSend || chatQuery).trim();
    if (!q || isAnswering) return;

    setChatMessages((prev) => [...prev, { role: 'user', text: q }]);
    setChatQuery('');
    setIsAnswering(true);

    try {
      const res = await aiApi.askAssistant(q);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.answer,
          recommended: res.recommendedBookmarks,
        },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `抱歉，在查找相关书签时遇到了一点问题：${err?.message || '请稍后再试'}。`,
        },
      ]);
    } finally {
      setIsAnswering(false);
    }
  };

  // Handle Intake Analyze
  const handleIntakeAnalyze = async () => {
    if (!intakeUrl.trim()) {
      showToast('请输入要解析收录的网址', 'error');
      return;
    }

    setIsIntaking(true);
    setIntakeResult(null);

    try {
      const categoriesNames = categories.map((c) => c.name);
      const res = await aiApi.analyzeSiteInfo(intakeUrl.trim(), categoriesNames);
      setIntakeResult(res);
      showToast('AI 智能分析完成，可一键保存入库', 'success');
    } catch (err: any) {
      showToast(err.message || '分析网址失败', 'error');
    } finally {
      setIsIntaking(false);
    }
  };

  // Save intake result directly to bookmarks
  const handleSaveIntakeToBookmarks = async () => {
    if (!intakeResult || !intakeUrl.trim()) return;

    let targetCatId = categories[0]?.id || 'cat-featured';
    if (intakeResult.suggestedCategory) {
      const matchedCat = categories.find((c) => c.name.toLowerCase() === intakeResult.suggestedCategory?.toLowerCase());
      if (matchedCat) targetCatId = matchedCat.id;
    }

    setIsSavingIntake(true);
    try {
      await createBookmark({
        title: intakeResult.title,
        url: intakeUrl.trim(),
        categoryId: targetCatId,
        description: intakeResult.description,
        favicon: intakeResult.favicon,
        tags: intakeResult.tags,
        sortOrder: bookmarks.length + 1,
        isPinned: false,
        isPrivate: false,
      });

      showToast(`已成功收录「${intakeResult.title}」至书签库！`, 'success');
      setIntakeUrl('');
      setIntakeResult(null);
    } catch (err: any) {
      showToast(err.message || '保存书签失败', 'error');
    } finally {
      setIsSavingIntake(false);
    }
  };

  const samplePrompts = [
    '帮我推荐几个开发与编程相关的优秀工具',
    '有哪些关于设计、配色或图标的优质站点？',
    '我想找能够提升工作效率的工具',
    '书签里有哪些人工智能或大模型资源？',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-y-0 right-0 max-w-full flex pl-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-screen max-w-md sm:max-w-lg bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">AI 智能助手</h2>
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/40">
                    Gemini 3.8
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  智能站点摘要 · 信息提炼 · 全库寻宝问答
                </p>
              </div>
            </div>
            <button
              onClick={() => setAiAssistantOpen(false)}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Control Tabs */}
          <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
            <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-medium">
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>智能摘要</span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>全库寻宝</span>
              </button>
              <button
                onClick={() => setActiveTab('intake')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'intake'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>快速收录</span>
              </button>
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* ----------------- TAB 1: 智能深度摘要 ----------------- */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      选择书签进行摘要
                    </label>
                    <select
                      value={selectedBookmarkId}
                      onChange={(e) => {
                        setSelectedBookmarkId(e.target.value);
                        if (e.target.value) setCustomSummaryUrl('');
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    >
                      <option value="">-- 从已有书签库中选择 --</option>
                      {bookmarks.map((bm) => (
                        <option key={bm.id} value={bm.id}>
                          {bm.title} ({bm.url})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <span className="text-[11px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2 z-10">或者输入任意外部网址</span>
                    <div className="absolute inset-x-0 h-px bg-zinc-200 dark:border-zinc-700" />
                  </div>

                  <div className="space-y-1.5">
                    <input
                      type="url"
                      value={customSummaryUrl}
                      onChange={(e) => {
                        setCustomSummaryUrl(e.target.value);
                        if (e.target.value) setSelectedBookmarkId('');
                      }}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => handleGenerateSummary()}
                    disabled={isGeneratingSummary || (!selectedBookmarkId && !customSummaryUrl.trim())}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {isGeneratingSummary ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI 正在研读网页并提取核心摘要...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>生成智能深度摘要</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Summary Output */}
                {summaryResult && summaryTargetInfo && (
                  <div className="space-y-3.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="min-w-0 pr-2">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                          {summaryTargetInfo.title}
                        </h4>
                        <a
                          href={summaryTargetInfo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-zinc-400 hover:text-indigo-600 flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{summaryTargetInfo.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                      <button
                        onClick={handleCopySummary}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="复制完整摘要"
                      >
                        {summaryCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{summaryCopied ? '已复制' : '复制'}</span>
                      </button>
                    </div>

                    {/* One sentence summary */}
                    <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40 text-xs">
                      <span className="font-semibold text-indigo-900 dark:text-indigo-200 block mb-1">
                        核心定位
                      </span>
                      <p className="text-indigo-800 dark:text-indigo-300/90 leading-relaxed">
                        {summaryResult.oneSentenceSummary}
                      </p>
                    </div>

                    {/* Core Features */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        核心功能与特性
                      </span>
                      <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300 pl-4 list-disc">
                        {summaryResult.coreFeatures.map((feat, idx) => (
                          <li key={idx} className="leading-relaxed">{feat}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Target Audience */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-sky-600" />
                        适用人群与场景
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {summaryResult.targetAudience.map((aud, idx) => (
                          <span
                            key={idx}
                            className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md"
                          >
                            {aud}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Recommended Usage */}
                    <div className="space-y-1 text-xs">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        操作建议与技巧
                      </span>
                      <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {summaryResult.recommendedUsage}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ----------------- TAB 2: 全库寻宝问答 ----------------- */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full space-y-4">
                {/* Messages stream */}
                <div className="space-y-3.5">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[90%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 rounded-bl-none border border-zinc-200/60 dark:border-zinc-700/60'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Direct recommended link cards */}
                        {msg.recommended && msg.recommended.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-1.5">
                            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                              直达推荐站点：
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.recommended.map((rec, rIdx) => (
                                <a
                                  key={rIdx}
                                  href={rec.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:underline shadow-2xs"
                                >
                                  <span>{rec.title}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isAnswering && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>正在检索全库书签并组织解答...</span>
                    </div>
                  )}
                </div>

                {/* Sample prompts */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] text-zinc-400">快捷提问启发：</span>
                  <div className="flex flex-wrap gap-1.5">
                    {samplePrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChat(p)}
                        className="text-left text-[11px] px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input box */}
                <div className="sticky bottom-0 pt-2 bg-white dark:bg-zinc-900">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChat();
                    }}
                    className="relative flex items-center"
                  >
                    <input
                      type="text"
                      value={chatQuery}
                      onChange={(e) => setChatQuery(e.target.value)}
                      placeholder="问点什么，例如：帮我找找矢量图标工具..."
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="submit"
                      disabled={!chatQuery.trim() || isAnswering}
                      className="absolute right-1.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ----------------- TAB 3: 快速网址智能解析与收录 ----------------- */}
            {activeTab === 'intake' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      输入网址以自动提炼资料
                    </label>
                    <input
                      type="url"
                      required
                      value={intakeUrl}
                      onChange={(e) => setIntakeUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleIntakeAnalyze}
                    disabled={isIntaking || !intakeUrl.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {isIntaking ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI 智能解析网页标题、简介与标签中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI 智能提取站点信息</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Intake Preview Result */}
                {intakeResult && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0">
                        {intakeResult.favicon ? (
                          <img src={intakeResult.favicon} alt="" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <Globe className="w-5 h-5 text-indigo-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                          {intakeResult.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 truncate">{intakeUrl}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        AI 提炼简介：
                      </span>
                      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        {intakeResult.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                        <Folder className="w-3.5 h-3.5 text-indigo-500" />
                        建议分类：
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                        {intakeResult.suggestedCategory}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-zinc-400" />
                        匹配标签：
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {intakeResult.tags.map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {isAuthenticated ? (
                      <button
                        onClick={handleSaveIntakeToBookmarks}
                        disabled={isSavingIntake}
                        className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 disabled:opacity-50 cursor-pointer transition-all"
                      >
                        {isSavingIntake ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>正在存入书签库...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>一键添加到书签库</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 text-amber-800 dark:text-amber-300 text-xs text-center">
                        提示：登录管理员账户后可直接一键入库，当前可复制上方内容手工添加。
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
