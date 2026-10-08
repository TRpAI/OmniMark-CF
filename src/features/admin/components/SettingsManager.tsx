import React, { useState, useEffect } from 'react';
import {
  Save,
  Plus,
  Trash2,
  Search,
  Check,
  RefreshCw,
  Globe,
  Server,
  LayoutGrid,
  Rss,
  Sparkles,
  Sliders,
  Bot,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cpu,
  Wand2,
  ChevronDown,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { useThemeStore } from '../../../stores/theme.store';
import { SearchEngine, AiProviderType } from '../../../../packages/shared/types';
import { DEFAULT_AI_PROVIDER_MODELS, DEFAULT_AI_BASE_URLS } from '../../../../packages/shared/constants';
import { apiClient } from '../../../api/client';
import { aiApi } from '../../../api/ai.api';

const AI_PROVIDERS: Array<{
  id: AiProviderType;
  name: string;
  badge: string;
  desc: string;
  defaultBaseUrl: string;
  iconBg: string;
}> = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: '官方推荐 / 极速',
    desc: 'Google 原生大模型，支持 Gemini 2.5 Flash / Pro，分析与提取极快',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    iconBg: 'bg-indigo-500 text-white',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek 深度求索',
    badge: '高性价比 / 强推理',
    desc: 'DeepSeek-V3 / DeepSeek-R1 满血版，代码与中文语义理解极佳',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    iconBg: 'bg-blue-600 text-white',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: '全球顶尖',
    desc: 'GPT-4o, GPT-4o-mini, o1, o3-mini 等全系列行业标杆大模型',
    defaultBaseUrl: 'https://api.openai.com/v1',
    iconBg: 'bg-emerald-600 text-white',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    badge: '卓越语感',
    desc: 'Claude 3.7 Sonnet, Claude 3.5 Haiku，超强长文本与精细总结',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    iconBg: 'bg-amber-600 text-white',
  },
  {
    id: 'custom',
    name: '自定义 / 兼容 OpenAI 协议',
    badge: '自建 / 聚合中转',
    desc: '支持 OneAPI, NewAPI, SiliconFlow, Ollama, Moonshot, Qwen 等任何中转或本地服务',
    defaultBaseUrl: 'https://api.openai.com/v1',
    iconBg: 'bg-purple-600 text-white',
  },
];

export const SettingsManager: React.FC = () => {
  const { settings, updateSettings, loadInitialData, bookmarks } = useBookmarkStore();
  const { showToast, setAdminTab } = useUiStore();
  const { mode: themeMode, setTheme: setThemeMode } = useThemeStore();

  const [apiUrl, setApiUrl] = useState(apiClient.getBaseUrl());
  const [formData, setFormData] = useState({
    title: settings.title || 'OmniMark 站点导航',
    subtitle: settings.subtitle || '高效、清爽、可自建的现代书签与导航系统',
    logoText: settings.logoText || 'OmniMark',
    footerText: settings.footerText || 'OmniMark 现代书签与导航管理系统',
    announcement: settings.announcement || '',
    enablePinnedSection: settings.enablePinnedSection ?? true,
    enableClickCounter: settings.enableClickCounter ?? true,
    enableSiteFeed: settings.enableSiteFeed ?? true,
    siteFeedTitle: settings.siteFeedTitle || '站点快讯 & 动态精选',
    siteFeedSubtitle: settings.siteFeedSubtitle || '聚合精选站点的最新资讯、架构升级与功能演进动态',
    defaultSearchEngineId: settings.defaultSearchEngineId || 'google',
    maxBookmarksPerCategory: settings.maxBookmarksPerCategory ?? 0,
    maxTotalBookmarks: settings.maxTotalBookmarks ?? 0,
  });

  // AI 智能设置状态
  const initialProvider = settings.aiProvider || 'gemini';
  const getInitialModel = (prov: string, currentModel?: string) => {
    if (prov === 'gemini') {
      if (!currentModel || currentModel.includes('2.5-flash') || currentModel.includes('2.0-flash') || currentModel.includes('1.5-flash')) {
        return 'gemini-3.5-flash';
      }
      return currentModel;
    }
    if (prov === 'deepseek') return currentModel || 'deepseek-chat';
    return currentModel || 'gpt-4o-mini';
  };

  const [aiProvider, setAiProvider] = useState<AiProviderType>(initialProvider);
  const [aiApiKey, setAiApiKey] = useState<string>(settings.aiApiKey || '');
  const [aiBaseUrl, setAiBaseUrl] = useState<string>(settings.aiBaseUrl || DEFAULT_AI_BASE_URLS[initialProvider] || '');
  const [aiModel, setAiModel] = useState<string>(getInitialModel(initialProvider, settings.aiModel));
  const [aiCustomModelName, setAiCustomModelName] = useState<string>(settings.aiCustomModelName || '');
  const [isCustomModel, setIsCustomModel] = useState<boolean>(Boolean(settings.aiCustomModelName));
  const [availableModels, setAvailableModels] = useState<string[]>(
    settings.aiCustomModels && settings.aiCustomModels.length > 0
      ? settings.aiCustomModels
      : DEFAULT_AI_PROVIDER_MODELS[initialProvider] || DEFAULT_AI_PROVIDER_MODELS.gemini
  );

  const [showApiKey, setShowApiKey] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    sampleResponse?: string;
  } | null>(null);

  const [engines, setEngines] = useState<SearchEngine[]>(settings.searchEngines || []);
  const [newEngine, setNewEngine] = useState({
    id: '',
    name: '',
    searchUrl: '',
    placeholder: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      title: settings.title || 'OmniMark 站点导航',
      subtitle: settings.subtitle || '高效、清爽、可自建的现代书签与导航系统',
      logoText: settings.logoText || 'OmniMark',
      footerText: settings.footerText || 'OmniMark 现代书签与导航管理系统',
      announcement: settings.announcement || '',
      enablePinnedSection: settings.enablePinnedSection ?? true,
      enableClickCounter: settings.enableClickCounter ?? true,
      enableSiteFeed: settings.enableSiteFeed ?? true,
      siteFeedTitle: settings.siteFeedTitle || '站点快讯 & 动态精选',
      siteFeedSubtitle: settings.siteFeedSubtitle || '聚合精选站点的最新资讯、架构升级与功能演进动态',
      defaultSearchEngineId: settings.defaultSearchEngineId || 'google',
      maxBookmarksPerCategory: settings.maxBookmarksPerCategory ?? 0,
      maxTotalBookmarks: settings.maxTotalBookmarks ?? 0,
    });

    const currentProvider = settings.aiProvider || 'gemini';
    setAiProvider(currentProvider);
    setAiApiKey(settings.aiApiKey || '');
    setAiBaseUrl(settings.aiBaseUrl || DEFAULT_AI_BASE_URLS[currentProvider] || '');
    setAiModel(getInitialModel(currentProvider, settings.aiModel));
    setAiCustomModelName(settings.aiCustomModelName || '');
    setIsCustomModel(Boolean(settings.aiCustomModelName));
    setAvailableModels(
      settings.aiCustomModels && settings.aiCustomModels.length > 0
        ? settings.aiCustomModels
        : DEFAULT_AI_PROVIDER_MODELS[currentProvider] || DEFAULT_AI_PROVIDER_MODELS.gemini
    );

    setEngines(settings.searchEngines || []);
  }, [settings]);

  const handleProviderSelect = (newProvider: AiProviderType) => {
    setAiProvider(newProvider);
    const defaultUrl = DEFAULT_AI_BASE_URLS[newProvider] || 'https://api.openai.com/v1';
    setAiBaseUrl(defaultUrl);

    const defaultList = DEFAULT_AI_PROVIDER_MODELS[newProvider] || DEFAULT_AI_PROVIDER_MODELS.openai;
    setAvailableModels(defaultList);
    setAiModel(defaultList[0] || 'gemini-3.5-flash');
    setTestResult(null);
  };

  const handleFetchUpstreamModels = async () => {
    setIsFetchingModels(true);
    setTestResult(null);
    try {
      const models = await aiApi.fetchUpstreamModels(aiProvider, aiApiKey.trim(), aiBaseUrl.trim());
      if (models && models.length > 0) {
        setAvailableModels(models);
        if (!models.includes(aiModel) && !isCustomModel) {
          setAiModel(models[0]);
        }
        showToast(`🎉 成功从上游获取到 ${models.length} 个可用模型！`, 'success');
      } else {
        showToast('上游未返回模型列表，已保留默认预设', 'info');
      }
    } catch (err: any) {
      showToast(err?.message || '从上游获取模型列表失败，请检查 API Token 和 Base URL', 'error');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    setTestResult(null);
    const effectiveModel = isCustomModel ? aiCustomModelName.trim() : aiModel;
    if (isCustomModel && !effectiveModel) {
      showToast('请输入自定义模型名称后再测试', 'error');
      setIsTestingAi(false);
      return;
    }

    try {
      const res = await aiApi.testConnection(
        aiProvider,
        aiApiKey.trim(),
        aiBaseUrl.trim(),
        effectiveModel
      );
      setTestResult({
        success: true,
        message: res.message || '模型连接正常！',
        sampleResponse: res.sampleResponse,
      });
      showToast('✅ AI 模型连通性测试通过！', 'success');
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || '连接失败，请检查 Token 授权与接口地址配置。',
      });
      showToast(err?.message || '测试失败', 'error');
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        ...formData,
        searchEngines: engines,
        // AI 智能设置持久化保存
        aiProvider,
        aiApiKey: aiApiKey.trim(),
        aiBaseUrl: aiBaseUrl.trim(),
        aiModel: isCustomModel ? (aiCustomModelName.trim() || aiModel) : aiModel,
        aiCustomModelName: isCustomModel ? aiCustomModelName.trim() : '',
        aiCustomModels: availableModels,
      });
      showToast('站点设置及 AI 智能模型配置已成功保存！', 'success');
    } catch (err: any) {
      showToast(err.message || '保存失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEngine = () => {
    if (!newEngine.name.trim() || !newEngine.searchUrl.trim()) {
      showToast('请填写搜索引擎名称和搜索 URL', 'error');
      return;
    }
    const id = newEngine.id.trim() || newEngine.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const engineToAdd: SearchEngine = {
      id,
      name: newEngine.name.trim(),
      searchUrl: newEngine.searchUrl.trim(),
      placeholder: newEngine.placeholder.trim() || `在 ${newEngine.name} 搜索...`,
      icon: 'Search',
    };
    setEngines([...engines, engineToAdd]);
    setNewEngine({ id: '', name: '', searchUrl: '', placeholder: '' });
    showToast('已添加搜索引擎，记得点击保存', 'info');
  };

  const handleDeleteEngine = (id: string) => {
    if (engines.length <= 1) {
      showToast('至少保留一个搜索引擎', 'error');
      return;
    }
    setEngines(engines.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            全局站点设置
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            自定义站点标题、AI 智能助手模型供应源与 API Token、特色栏目以及搜索引擎配置
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ========================================================= */}
        {/* 1. AI 智能助手与大模型多厂商配置 (重点功能) */}
        {/* ========================================================= */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-indigo-200/80 dark:border-indigo-900/50 shadow-sm space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>AI 智能助手与大模型配置</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                    多厂商支持 · 动态选模
                  </span>
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  驱动全站智能摘要、书签添加自动提取、语义搜索寻宝与 AI 问答
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFetchUpstreamModels}
                disabled={isFetchingModels}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 transition-all cursor-pointer disabled:opacity-50"
                title="填入 API Token 后，点击自动从服务商拉取当前账号可用的最新模型列表"
              >
                {isFetchingModels ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>{isFetchingModels ? '正在从上游获取...' : '🔍 从上游自动获取模型'}</span>
              </button>
            </div>
          </div>

          {/* 1.1 Provider Cards Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              选择 AI 服务提供商 / 架构协议
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {AI_PROVIDERS.map((provider) => {
                const isSelected = aiProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleProviderSelect(provider.id)}
                    className={`relative text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-zinc-50/70 dark:bg-zinc-800/50 border-zinc-200/80 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-900 dark:text-white">
                          {provider.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}>
                        {provider.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {provider.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1.2 API Key / Token Input */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-500" />
                  <span>API Token / API Key</span>
                  <span className="text-zinc-400 font-normal">
                    {aiProvider === 'gemini' ? '(留空将默认使用运行环境内置密钥)' : '(必填)'}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showApiKey ? '隐藏密钥' : '显示明文'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={aiApiKey}
                  onChange={(e) => {
                    setAiApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder={
                    aiProvider === 'gemini'
                      ? 'AIzaSy... (留空时将自动使用服务端配置的 GEMINI_API_KEY)'
                      : aiProvider === 'deepseek'
                      ? 'sk-...'
                      : aiProvider === 'anthropic'
                      ? 'sk-ant-...'
                      : 'sk-...'
                  }
                  className="w-full pl-3.5 pr-10 py-2 text-sm font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* 1.3 Base URL Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                API 接口基础地址 (Base URL)
              </label>
              <input
                type="text"
                value={aiBaseUrl}
                onChange={(e) => {
                  setAiBaseUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder={DEFAULT_AI_BASE_URLS[aiProvider] || 'https://api.openai.com/v1'}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
              />
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                支持直连官方接口、反向代理、OneAPI / NewAPI / SiliconFlow / Ollama 等兼容 OpenAI 协议的自定义中转节点。
              </p>
            </div>

            {/* 1.4 Model Selector & Custom Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Select from available/fetched models */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                    <span>选择模型 (已发现 {availableModels.length} 个)</span>
                  </label>
                </div>
                <select
                  disabled={isCustomModel}
                  value={aiModel}
                  onChange={(e) => {
                    setAiModel(e.target.value);
                    setTestResult(null);
                  }}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none disabled:opacity-40"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Model Toggle & Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    <span>手动指定自定义模型名称</span>
                  </label>
                  <label className="inline-flex items-center gap-1 text-[11px] text-zinc-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCustomModel}
                      onChange={(e) => {
                        setIsCustomModel(e.target.checked);
                        setTestResult(null);
                      }}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>启用自定义</span>
                  </label>
                </div>
                <input
                  type="text"
                  disabled={!isCustomModel}
                  value={aiCustomModelName}
                  onChange={(e) => {
                    setAiCustomModelName(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="例如 deepseek-ai/DeepSeek-V3, qwen-max, o1-preview"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none disabled:opacity-40"
                />
              </div>
            </div>

            {/* 1.5 Test Connection & Diagnostic Box */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestAiConnection}
                  disabled={isTestingAi}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isTestingAi ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isTestingAi ? '正在连接测试...' : '🧪 测试当前模型连通性'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`flex-1 w-full sm:w-auto p-3 rounded-xl text-xs flex items-start gap-2 animate-in fade-in ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.sampleResponse && (
                      <p className="mt-1 text-[11px] font-mono opacity-90 break-words bg-black/5 dark:bg-white/5 p-1.5 rounded-lg">
                        响应内容：{testResult.sampleResponse}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. 基础信息与界面外观配置 */}
        {/* ========================================================= */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span>基础信息与界面外观</span>
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">支持明亮、暗黑与系统自动适配</span>
          </h4>

          {/* 色彩主题模式选择 */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              色彩显示模式 (全局生效)
            </label>
            <div className="grid grid-cols-3 gap-2.5 max-w-lg">
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>明亮模式</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>暗黑模式</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('auto')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  themeMode === 'auto'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <Laptop className="w-4 h-4 text-sky-500" />
                <span>自动切换</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">
              设置为「自动切换」时，网站将实时跟随用户的操作系统或浏览器深色模式偏好自适应变换。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                网站标题
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Logo 品牌文本
              </label>
              <input
                type="text"
                value={formData.logoText}
                onChange={(e) => setFormData({ ...formData, logoText: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              副标题 / 口号
            </label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              页脚说明文本
            </label>
            <input
              type="text"
              value={formData.footerText}
              onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              顶部全站公告条 (留空则不显示)
            </label>
            <textarea
              rows={2}
              value={formData.announcement}
              onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
              placeholder="输入需要向访客广播的公告或使用提示..."
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. 首页书签展示数量上限限制 */}
        {/* ========================================================= */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                首页书签展示数量与限制
              </h4>
            </div>
            <span className="text-xs text-zinc-400">目前全站共有 {bookmarks.length} 个书签</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                每个分类默认最多展示书签数
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={formData.maxBookmarksPerCategory}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxBookmarksPerCategory: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                设置为 <code className="font-mono text-indigo-600">0</code> 表示不限制（展示该分类下全部书签）。
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                首页总展示书签数上限
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={formData.maxTotalBookmarks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxTotalBookmarks: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                设置为 <code className="font-mono text-indigo-600">0</code> 表示不限制（展示全部书签）。
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. 站点快讯 Feed 设置 */}
        {/* ========================================================= */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Rss className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                站点快讯 & 动态 Feed 配置
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setAdminTab('feed')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>前往快讯排布中心 ›</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  在前台分类导航中展示「站点快讯」Tab
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  开启后访客与管理员可在前台一键切换到类似 RSS 的精选动态速报页面
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.enableSiteFeed}
                onChange={(e) => setFormData({ ...formData, enableSiteFeed: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  快讯页面主标题
                </label>
                <input
                  type="text"
                  value={formData.siteFeedTitle}
                  onChange={(e) => setFormData({ ...formData, siteFeedTitle: e.target.value })}
                  placeholder="站点快讯 & 动态精选"
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  快讯副标题与介绍
                </label>
                <input
                  type="text"
                  value={formData.siteFeedSubtitle}
                  onChange={(e) => setFormData({ ...formData, siteFeedSubtitle: e.target.value })}
                  placeholder="聚合精选站点的最新资讯..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. 前台功能开关 */}
        {/* ========================================================= */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">
            前台功能开关
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  首页“常用置顶站点”展示栏
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  开启后将在首页顶部自动聚合所有标记为“置顶”的高频书签
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.enablePinnedSection}
                onChange={(e) => setFormData({ ...formData, enablePinnedSection: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  书签访问点击计数器
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  在前台卡片及管理后台显示每个书签的累计点击热度
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.enableClickCounter}
                onChange={(e) => setFormData({ ...formData, enableClickCounter: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 6. 搜索栏引擎列表 */}
        {/* ========================================================= */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">
            搜索栏引擎列表
          </h4>

          <div className="space-y-2">
            {engines.map((eng) => (
              <div
                key={eng.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {eng.name}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      ({eng.id})
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate max-w-sm sm:max-w-md">
                    {eng.searchUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteEngine(eng.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    title="删除此搜索引擎"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add custom engine mini-form */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              添加自定义搜索引擎：
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="引擎名称 (如 DuckDuckGo)"
                value={newEngine.name}
                onChange={(e) => setNewEngine({ ...newEngine, name: e.target.value })}
                className="px-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
              />
              <input
                type="text"
                placeholder="搜索 URL (例如 https://duckduckgo.com/?q=)"
                value={newEngine.searchUrl}
                onChange={(e) => setNewEngine({ ...newEngine, searchUrl: e.target.value })}
                className="px-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none sm:col-span-2"
              />
            </div>
            <button
              type="button"
              onClick={handleAddEngine}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>加入搜索引擎列表</span>
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end sticky bottom-4 z-20">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:-translate-y-0.5 disabled:opacity-60 transition-all cursor-pointer"
          >
            <Save className="w-4.5 h-4.5" />
            <span>{isSaving ? '正在保存全部设置...' : '保存所有全局与 AI 设置'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
