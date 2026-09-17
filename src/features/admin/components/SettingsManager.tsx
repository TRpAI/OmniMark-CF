import React, { useState } from 'react';
import { Save, Plus, Trash2, Search, Check, RefreshCw } from 'lucide-react';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';
import { SearchEngine } from '../../../../packages/shared/types';

export const SettingsManager: React.FC = () => {
  const { settings, updateSettings } = useBookmarkStore();
  const { showToast } = useUiStore();

  const [formData, setFormData] = useState({
    title: settings.title || 'OmniMark 站点导航',
    subtitle: settings.subtitle || '高效、清爽、可自建的现代书签与导航系统',
    logoText: settings.logoText || 'OmniMark',
    footerText: settings.footerText || 'OmniMark - Cloudflare Pages + Workers + D1 Powered',
    announcement: settings.announcement || '',
    enablePinnedSection: settings.enablePinnedSection ?? true,
    enableClickCounter: settings.enableClickCounter ?? true,
    defaultSearchEngineId: settings.defaultSearchEngineId || 'google',
  });

  const [engines, setEngines] = useState<SearchEngine[]>(settings.searchEngines || []);
  const [newEngine, setNewEngine] = useState({
    id: '',
    name: '',
    searchUrl: '',
    placeholder: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        ...formData,
        searchEngines: engines,
      });
      showToast('站点设置保存成功', 'success');
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
            自定义站点标题、页脚、首页特色栏目以及搜索引擎配置
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Settings */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">
            基础信息配置
          </h4>

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
              公告提示 (可选，将在首页顶部显示)
            </label>
            <input
              type="text"
              value={formData.announcement}
              onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
              placeholder="例如：欢迎访问 OmniMark 导航，点击右上角管理后台可自行添加自定义书签"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              页脚说明文字
            </label>
            <input
              type="text"
              value={formData.footerText}
              onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
            />
          </div>
        </div>

        {/* Feature Toggles */}
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

        {/* Search Engine Config */}
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
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-60 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? '正在保存...' : '保存所有设置'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
