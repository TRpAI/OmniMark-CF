import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  FileCode,
  FileText,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cloud,
  Clock,
  Check,
  ShieldCheck,
  Play,
  Settings,
  FolderGit2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { uploadApi, OneDriveConfig, BackupLog } from '../../../api/settings.api';
import { useBookmarkStore } from '../../../stores/bookmark.store';
import { useUiStore } from '../../../stores/ui.store';

export const ImportExport: React.FC = () => {
  const { loadInitialData, bookmarks, categories } = useBookmarkStore();
  const { showToast } = useUiStore();

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    categoriesAdded: number;
    bookmarksAdded: number;
    duplicatesSkipped?: number;
  } | null>(null);

  // OneDrive State
  const [oneDriveConfig, setOneDriveConfig] = useState<OneDriveConfig>({
    enabled: true,
    scheduleInterval: '24h',
    backupFolder: '/Apps/OmniMark/Backups',
    clientId: 'omnimark-client-ms-graph',
    tenantId: 'consumers',
    authStatus: 'connected',
    lastBackupTime: new Date().toISOString(),
    lastBackupStatus: 'success',
    lastBackupSummary: '已同步 11 条书签及 6 个分类至 OneDrive 云端',
  });
  const [backupHistory, setBackupHistory] = useState<BackupLog[]>([]);
  const [isSyncingOneDrive, setIsSyncingOneDrive] = useState(false);
  const [isTestingOneDrive, setIsTestingOneDrive] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  useEffect(() => {
    fetchOneDriveData();
  }, []);

  const fetchOneDriveData = async () => {
    try {
      const [cfg, hist] = await Promise.all([
        uploadApi.getOneDriveConfig().catch(() => null),
        uploadApi.getOneDriveHistory().catch(() => null),
      ]);
      if (cfg) setOneDriveConfig(cfg);
      if (hist && Array.isArray(hist)) setBackupHistory(hist);
    } catch {
      // ignore
    }
  };

  // HTML Bookmark file handler
  const handleHtmlFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const res: any = await uploadApi.importHtml(text);
      setImportResult(res);
      showToast('HTML 书签导入成功', 'success');
      await loadInitialData();
      // Auto trigger incremental backup after import
      uploadApi.triggerOneDriveBackup('auto_change').catch(() => null);
    } catch (err: any) {
      showToast(err.message || '导入失败，请检查文件格式', 'error');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  // JSON backup file handler
  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res: any = await uploadApi.importJson(parsed, false);
      setImportResult(res);
      showToast('JSON 数据导入成功', 'success');
      await loadInitialData();
      uploadApi.triggerOneDriveBackup('auto_change').catch(() => null);
    } catch (err: any) {
      showToast(err.message || 'JSON 解析失败', 'error');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  // Trigger manual incremental backup to OneDrive
  const handleTriggerIncrementalBackup = async () => {
    setIsSyncingOneDrive(true);
    setLastSyncResult(null);
    try {
      const res = await uploadApi.triggerOneDriveBackup('manual');
      setLastSyncResult(res.summary);
      showToast(res.summary || 'OneDrive 增量快照生成并同步成功', 'success');
      await fetchOneDriveData();
    } catch (err: any) {
      showToast(err.message || '增量备份执行异常', 'error');
    } finally {
      setIsSyncingOneDrive(false);
    }
  };

  // Test OneDrive connection
  const handleTestOneDrive = async () => {
    setIsTestingOneDrive(true);
    try {
      const res = await uploadApi.testOneDriveConnection();
      showToast(res.message || 'OneDrive 云存储连接正常', 'success');
    } catch (err: any) {
      showToast(err.message || 'OneDrive 连接探测失败', 'error');
    } finally {
      setIsTestingOneDrive(false);
    }
  };

  // Save OneDrive settings
  const handleSaveOneDriveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await uploadApi.saveOneDriveConfig(oneDriveConfig);
      showToast('OneDrive 定时增量备份设置已更新', 'success');
    } catch (err: any) {
      showToast(err.message || '保存设置失败', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. OneDrive Scheduled Incremental Backup (Highlight Card) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-purple-500/10 border border-sky-200 dark:border-sky-900/50 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  OneDrive 定时增量备份
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>云端已就绪</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                基于增量数据对比技术，仅同步变动书签与分类，自动保留历史快照并防止数据丢失
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleTestOneDrive}
              disabled={isTestingOneDrive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingOneDrive ? 'animate-spin' : ''}`} />
              <span>测试连接</span>
            </button>
            <button
              onClick={handleTriggerIncrementalBackup}
              disabled={isSyncingOneDrive}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${isSyncingOneDrive ? 'animate-spin' : ''}`} />
              <span>{isSyncingOneDrive ? '正在增量备份...' : '立即增量备份到 OneDrive'}</span>
            </button>
          </div>
        </div>

        {/* Sync Summary Result Banner */}
        {lastSyncResult && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{lastSyncResult}</span>
          </div>
        )}

        {/* Settings & Parameters Bar */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                备份计划与调度策略
              </span>
            </div>
            <button
              onClick={() => setShowConfigDetails(!showConfigDetails)}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {showConfigDetails ? '收起配置选项' : '自定义配置与密钥'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Toggle Enable */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
              <div>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">定时自动备份</span>
                <span className="text-[11px] text-zinc-400">后台定时轮询增量写入</span>
              </div>
              <input
                type="checkbox"
                checked={oneDriveConfig.enabled}
                onChange={(e) => setOneDriveConfig({ ...oneDriveConfig, enabled: e.target.checked })}
                className="w-4.5 h-4.5 text-sky-600 rounded cursor-pointer"
              />
            </div>

            {/* Interval Selector */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col justify-between">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">增量备份周期</span>
              <select
                value={oneDriveConfig.scheduleInterval}
                onChange={(e: any) => setOneDriveConfig({ ...oneDriveConfig, scheduleInterval: e.target.value })}
                className="w-full py-1 px-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="change">书签变更时实时自动增量备份 (推荐)</option>
                <option value="24h">每天凌晨 02:00 定时增量备份</option>
                <option value="12h">每 12 小时定时增量备份</option>
                <option value="6h">每 6 小时定时增量备份</option>
                <option value="1h">每 1 小时高频同步</option>
                <option value="manual">仅手动触发备份</option>
              </select>
            </div>

            {/* Folder path */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col justify-between">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">OneDrive 目标目录</span>
              <input
                type="text"
                value={oneDriveConfig.backupFolder}
                onChange={(e) => setOneDriveConfig({ ...oneDriveConfig, backupFolder: e.target.value })}
                placeholder="/Apps/OmniMark/Backups"
                className="w-full py-1 px-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Collapsible Advanced Credentials */}
          {showConfigDetails && (
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  Microsoft Azure / Graph Client ID
                </label>
                <input
                  type="text"
                  value={oneDriveConfig.clientId}
                  onChange={(e) => setOneDriveConfig({ ...oneDriveConfig, clientId: e.target.value })}
                  className="w-full py-1.5 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  Tenant ID (租户标识)
                </label>
                <input
                  type="text"
                  value={oneDriveConfig.tenantId}
                  onChange={(e) => setOneDriveConfig({ ...oneDriveConfig, tenantId: e.target.value })}
                  placeholder="consumers (个人版) 或组织 ID"
                  className="w-full py-1.5 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end pt-1">
                <button
                  onClick={handleSaveOneDriveConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-colors cursor-pointer"
                >
                  {isSavingConfig ? '正在保存...' : '保存 OneDrive 配置'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Backup Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold uppercase tracking-wider">最近增量备份历史</span>
            <span>共 {backupHistory.length} 次记录</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {backupHistory.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {log.message}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      快照: {log.fileName} · 体积: {log.fileSize}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {log.trigger === 'auto_change' ? '变动触发' : log.trigger === 'schedule' ? '定时任务' : '手动增量'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Overview Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
          数据导入与本地备份
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          支持从 Chrome、Edge、Safari、Firefox 导出书签一键导入，同时支持标准 JSON 备份恢复与浏览器 HTML 书签导出。
        </p>

        {importResult && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold text-sm">导入处理完成！</p>
              <p className="mt-0.5">
                成功新增 <span className="font-bold">{importResult.categoriesAdded}</span> 个分类，
                <span className="font-bold">{importResult.bookmarksAdded}</span> 条书签。
                {importResult.duplicatesSkipped ? (
                  <span className="ml-1 text-amber-700 dark:text-amber-400 font-medium">
                    (自动跳过 <span className="font-bold">{importResult.duplicatesSkipped}</span> 条已存在的重复网址)
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Two Columns: Import & Export */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                导入书签数据
              </h4>
              <p className="text-xs text-zinc-400">选择本地文件直接解析并追加导入</p>
            </div>
          </div>

          {/* Option 1: Chrome/Edge HTML */}
          <div className="p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-center hover:border-indigo-500 transition-colors">
            <FileText className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
              导入浏览器 HTML 书签文件
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 max-w-xs mx-auto">
              支持 Chrome、Edge、Firefox 导出的标准 Netscape Bookmark HTML 格式
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>选择 .html 书签文件</span>
              <input
                type="file"
                accept=".html,.htm"
                disabled={isImporting}
                onChange={handleHtmlFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Option 2: JSON Backup */}
          <div className="p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-center hover:border-indigo-500 transition-colors">
            <FileCode className="w-8 h-8 text-sky-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
              导入 OmniMark JSON 备份
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 max-w-xs mx-auto">
              恢复包含分类、书签和站点设置的完整 JSON 结构
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white text-xs font-semibold cursor-pointer shadow-sm transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>选择 .json 备份文件</span>
              <input
                type="file"
                accept=".json"
                disabled={isImporting}
                onChange={handleJsonFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Export section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                导出与本地备份
              </h4>
              <p className="text-xs text-zinc-400">
                当前共有 {categories.length} 个分类、{bookmarks.length} 条书签可供导出
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Export JSON */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
              <div>
                <h5 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  OmniMark JSON 完整快照
                </h5>
                <p className="text-xs text-zinc-400 mt-0.5">
                  包含所有书签、分类、标签及点击数数据
                </p>
              </div>
              <a
                href={uploadApi.getExportJsonUrl()}
                download="omnimark-backup.json"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出 JSON</span>
              </a>
            </div>

            {/* Export HTML */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
              <div>
                <h5 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  标准浏览器 HTML 书签文件
                </h5>
                <p className="text-xs text-zinc-400 mt-0.5">
                  可直接导入至 Chrome、Edge、Safari 或手机浏览器
                </p>
              </div>
              <a
                href={uploadApi.getExportHtmlUrl()}
                download="omnimark-bookmarks.html"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 text-xs font-medium shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出 HTML</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
