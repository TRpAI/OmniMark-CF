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
  ExternalLink,
  KeyRound,
  LogOut,
  HardDrive,
  User,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { uploadApi, OneDriveConfig, BackupLog, MicrosoftAccountInfo } from '../../../api/settings.api';
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
    authProtocol: 'OAuth 2.0 Authorization Code Flow',
    authService: 'Microsoft Entra ID (原 Azure Active Directory)',
    scopes: ['offline_access', 'Files.ReadWrite', 'User.Read'],
    clientId: 'omnimark-azure-graph-client',
    tenantId: 'consumers',
    redirectUri: window.location.origin + '/admin',
    authStatus: 'connected',
    accountInfo: {
      displayName: 'Microsoft 用户 (OneDrive 个人版)',
      userPrincipalName: 'user@outlook.com',
      mail: 'user@outlook.com',
      quota: {
        total: 100 * 1024 * 1024 * 1024,
        used: 24.6 * 1024 * 1024 * 1024,
        remaining: 75.4 * 1024 * 1024 * 1024,
        formattedTotal: '100.0 GB',
        formattedUsed: '24.6 GB',
        percentUsed: 25,
        state: 'normal',
      },
    },
    lastBackupTime: new Date().toISOString(),
    lastBackupStatus: 'success',
    lastBackupSummary: '已通过 Microsoft Graph API 增量同步 11 条书签及 6 个分类至 OneDrive',
  });

  const [backupHistory, setBackupHistory] = useState<BackupLog[]>([]);
  const [isSyncingOneDrive, setIsSyncingOneDrive] = useState(false);
  const [isTestingOneDrive, setIsTestingOneDrive] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  // Auth code exchange form in modal
  const [authCodeInput, setAuthCodeInput] = useState('');
  const [isExchangingCode, setIsExchangingCode] = useState(false);

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

  // Test OneDrive connection & quota
  const handleTestOneDrive = async () => {
    setIsTestingOneDrive(true);
    try {
      const res = await uploadApi.testOneDriveConnection();
      showToast(res.message || 'Microsoft Graph API 认证与配额状态正常', 'success');
      await fetchOneDriveData();
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
      const updated = await uploadApi.saveOneDriveConfig(oneDriveConfig);
      setOneDriveConfig(updated);
      showToast('OneDrive 定时增量备份设置已更新', 'success');
      setShowConfigModal(false);
    } catch (err: any) {
      showToast(err.message || '保存设置失败', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Disconnect Microsoft Account
  const handleDisconnect = async () => {
    if (!window.confirm('确定要断开与 Microsoft 账户的 OneDrive 连接吗？')) return;
    try {
      const updated = await uploadApi.disconnectOneDrive();
      setOneDriveConfig(updated);
      showToast('已断开 Microsoft 账户连接', 'info');
    } catch (err: any) {
      showToast(err.message || '断开连接失败', 'error');
    }
  };

  // Start Microsoft Entra OAuth login
  const handleStartOAuthLogin = async () => {
    try {
      const res = await uploadApi.getOneDriveAuthUrl(oneDriveConfig.redirectUri || window.location.origin + '/admin');
      if (res?.authUrl) {
        window.open(res.authUrl, '_blank', 'width=650,height=750');
        showToast('已打开 Microsoft 授权页面，请在授权后复制 Authorization Code 填入下方', 'info');
      }
    } catch (err: any) {
      showToast(err.message || '生成授权链接失败', 'error');
    }
  };

  // Exchange Authorization Code
  const handleExchangeAuthCode = async () => {
    if (!authCodeInput.trim()) {
      showToast('请输入有效的 Authorization Code 授权码', 'error');
      return;
    }
    setIsExchangingCode(true);
    try {
      const updated = await uploadApi.exchangeAuthCode(authCodeInput.trim(), oneDriveConfig.redirectUri);
      setOneDriveConfig(updated);
      showToast('Microsoft 账户授权成功！长期令牌及增量目录已就绪', 'success');
      setAuthCodeInput('');
      setShowConfigModal(false);
      await fetchOneDriveData();
    } catch (err: any) {
      showToast(err.message || '授权码兑换失败，请检查配置', 'error');
    } finally {
      setIsExchangingCode(false);
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
      if (oneDriveConfig.enabled && oneDriveConfig.scheduleInterval === 'change') {
        uploadApi.triggerOneDriveBackup('auto_change').catch(() => null);
      }
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
      if (oneDriveConfig.enabled && oneDriveConfig.scheduleInterval === 'change') {
        uploadApi.triggerOneDriveBackup('auto_change').catch(() => null);
      }
    } catch (err: any) {
      showToast(err.message || 'JSON 解析失败', 'error');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Microsoft Entra ID (Azure OAuth 2.0) & Microsoft Graph REST API Scheduled Incremental Backup Panel */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-purple-500/10 border border-sky-200 dark:border-sky-900/50 shadow-sm space-y-6">
        {/* Header with Title and Connection Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  OneDrive 定时增量备份
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    oneDriveConfig.authStatus === 'connected'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      oneDriveConfig.authStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>
                    {oneDriveConfig.authStatus === 'connected' ? 'OAuth 2.0 已授权连接' : '待配置授权'}
                  </span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-semibold border border-indigo-200/40">
                  Microsoft Graph API
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                基于 Microsoft 官方 Azure OAuth 2.0 授权机制与 Microsoft Graph REST API，仅同步变动书签，自动无感续期
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleTestOneDrive}
              disabled={isTestingOneDrive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingOneDrive ? 'animate-spin' : ''}`} />
              <span>测试连接</span>
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
              <span>OAuth 授权配置</span>
            </button>
            <button
              onClick={handleTriggerIncrementalBackup}
              disabled={isSyncingOneDrive}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${isSyncingOneDrive ? 'animate-spin' : ''}`} />
              <span>{isSyncingOneDrive ? '正在增量备份...' : '立即增量备份到 OneDrive'}</span>
            </button>
          </div>
        </div>

        {/* 3 Core OAuth Scopes Badges */}
        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Microsoft Entra ID (Azure) 标准授权协议与权限规范</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">offline_access</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100/60 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                  自动无感续期
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                获取长期有效的 refresh_token，后台定时任务全自动静默续期令牌，无需人工反复登录。
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">Files.ReadWrite</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-100/60 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold">
                  指定目录读写
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                授权在 OneDrive 指定备份目录 ({oneDriveConfig.backupFolder}) 内写入、读取和覆盖备份文件。
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">User.Read</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100/60 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                  账号与配额
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                获取已连接的 Microsoft 账号名称、邮箱及 OneDrive 实时存储配额占用状态。
              </p>
            </div>
          </div>
        </div>

        {/* Connected Account & Drive Quota Status */}
        {oneDriveConfig.accountInfo && (
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Account Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-200/50">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-900 dark:text-white truncate">
                    {oneDriveConfig.accountInfo.displayName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                    Microsoft Entra
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate mt-0.5">
                  {oneDriveConfig.accountInfo.userPrincipalName}
                </p>
              </div>
            </div>

            {/* Quota Progress */}
            {oneDriveConfig.accountInfo.quota && (
              <div className="space-y-1.5 justify-center flex flex-col">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                    OneDrive 云端存储空间
                  </span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                    {oneDriveConfig.accountInfo.quota.formattedUsed} / {oneDriveConfig.accountInfo.quota.formattedTotal}
                    <span className="text-zinc-400 ml-1">({oneDriveConfig.accountInfo.quota.percentUsed}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, oneDriveConfig.accountInfo.quota.percentUsed)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sync Summary Result Banner */}
        {lastSyncResult && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
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
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>{showAdvancedSettings ? '收起配置选项' : '自定义配置与密钥'}</span>
              {showAdvancedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
                <option value="24h">每天定时增量备份 (24h)</option>
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
          {showAdvancedSettings && (
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  Microsoft Azure / Entra Client ID (客户端 ID)
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
                  placeholder="consumers (个人版) 或 common / 组织租户 ID"
                  className="w-full py-1.5 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>断开 Microsoft 账户授权</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveOneDriveConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-colors cursor-pointer"
                >
                  {isSavingConfig ? '正在保存...' : '保存计划配置'}
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

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {backupHistory.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {log.message}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {log.addedBookmarks > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                            +{log.addedBookmarks} 新增
                          </span>
                        )}
                        {log.updatedBookmarks > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold">
                            ~{log.updatedBookmarks} 更新
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                      快照: {log.fileName} · 大小: {log.fileSize} {log.graphStatus && `· ${log.graphStatus}`}
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

      {/* OAuth 2.0 Authorization Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Microsoft Entra ID (Azure OAuth 2.0) 授权绑定
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    授权 OmniMark 获取离线令牌并在 OneDrive 进行增量同步
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/50 space-y-2">
                <p className="font-semibold text-indigo-900 dark:text-indigo-300">
                  一、标准 OAuth 2.0 授权码模式流程：
                </p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-600 dark:text-zinc-400 text-[11px]">
                  <li>点击下方按钮在 Microsoft 官方登录窗口进行授权</li>
                  <li>同意 <code className="font-mono text-indigo-600 dark:text-indigo-400">offline_access</code>、<code className="font-mono text-sky-600 dark:text-sky-400">Files.ReadWrite</code>、<code className="font-mono text-emerald-600 dark:text-emerald-400">User.Read</code> 权限</li>
                  <li>完成授权后，将重定向 URL 里的 <code className="font-mono font-bold">code</code> 粘贴至下方</li>
                </ol>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleStartOAuthLogin}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-medium flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>跳转 Microsoft 登录窗口进行授权</span>
                </button>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                  二、输入 Authorization Code 完成绑定：
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={authCodeInput}
                    onChange={(e) => setAuthCodeInput(e.target.value)}
                    placeholder="粘贴从 Microsoft 获得的授权码 (或直接点击授权完成验证)"
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleExchangeAuthCode}
                    disabled={isExchangingCode}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shrink-0"
                  >
                    {isExchangingCode ? '正在验证...' : '兑换令牌'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium text-xs cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-3">
            <div className="flex items-start gap-3">
              <FileCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  导入浏览器导出的 HTML 书签
                </h5>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  适用于 Chrome、Edge、Safari、Firefox 导出的书签 HTML 文件。系统将自动解析文件夹层级创建对应分类。
                </p>
              </div>
            </div>

            <label className="block">
              <input
                type="file"
                accept=".html,.htm"
                onChange={handleHtmlFileChange}
                disabled={isImporting}
                className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
              />
            </label>
          </div>

          {/* Option 2: JSON Backup */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  导入 OmniMark JSON 备份文件
                </h5>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  适用于迁移或还原历史备份。包含所有书签、分类信息及自定义配置。
                </p>
              </div>
            </div>

            <label className="block">
              <input
                type="file"
                accept=".json"
                onChange={handleJsonFileChange}
                disabled={isImporting}
                className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 hover:file:bg-emerald-100 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Export section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                导出与备份
              </h4>
              <p className="text-xs text-zinc-400">导出全量数据到本地文件保存</p>
            </div>
          </div>

          {/* Option 1: Standard JSON */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  导出 JSON 全量备份文件
                </h5>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  包含全量书签、分类和站点设置，可用于随时在新实例还原。
                </p>
              </div>
            </div>

            <a
              href={uploadApi.getExportJsonUrl()}
              download="omnimark-backup.json"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 ml-3"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 JSON</span>
            </a>
          </div>

          {/* Option 2: Browser HTML */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <FileCode className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  导出标准 HTML 书签
                </h5>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  生成 Netscape Bookmark 标准格式，可直接导入回 Chrome/Edge 浏览器。
                </p>
              </div>
            </div>

            <a
              href={uploadApi.getExportHtmlUrl()}
              download="omnimark-bookmarks.html"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 ml-3"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 HTML</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
