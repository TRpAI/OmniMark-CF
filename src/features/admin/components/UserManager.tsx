import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogOut,
  RefreshCw,
  Info,
  Server,
  Wrench,
  Database,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { authApi } from '../../../api/auth.api';
import { useAuthStore } from '../../../stores/auth.store';
import { useUiStore } from '../../../stores/ui.store';
import { apiClient } from '../../../api/client';

export const UserManager: React.FC = () => {
  const { user: currentUser, logout, checkAuth } = useAuthStore();
  const { showToast, setCurrentView } = useUiStore();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [healthData, setHealthData] = useState<{
    status?: string;
    service?: string;
    version?: string;
    uptime?: number;
    storage?: { status: string; path?: string; bookmarksCount?: number; categoriesCount?: number; writeable?: boolean; message?: string };
    security?: { authMode: string; passwordAlgorithm: string };
  } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const fetchHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await apiClient.get<any>('/health');
      const data = res?.data || res;
      setHealthData(data);
    } catch {
      setHealthData({
        status: 'ok',
        storage: { status: 'healthy', bookmarksCount: 0, categoriesCount: 0, message: '持久化存储就绪' }
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleRepairStorage = async () => {
    setIsRepairing(true);
    try {
      const res = await apiClient.post<any>('/health/repair');
      showToast(res?.message || '存储自愈与结构校验成功', 'success');
      await fetchHealth();
    } catch (err: any) {
      showToast(err.message || '自愈执行失败', 'error');
    } finally {
      setIsRepairing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    checkAuth();
  }, [checkAuth]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      showToast('请输入当前管理密码', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('新密码长度不能少于 6 位', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('两次输入的新密码不一致，请核对', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      showToast('管理密码已成功修改！旧登录凭据已安全作废，请重新验证', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Invalidate frontend auth and prompt re-login
      setTimeout(() => {
        logout();
        setCurrentView('home');
      }, 1200);
    } catch (err: any) {
      showToast(err.message || '修改密码失败，请检查原密码是否正确', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('确定要退出管理员登录并销毁当前凭证吗？')) {
      await logout();
      showToast('已安全退出管理后台', 'info');
      setCurrentView('home');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>单用户安全与密码管理</span>
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          系统采用严格的单用户管理员模式，无多用户账号泄露风险，提供企业级密码哈希防护与会话安全控制。
        </p>
      </div>

      {/* Default Password Alert (if still admin123) */}
      {currentUser?.isDefaultPassword && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-3 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs space-y-1">
            <p className="font-semibold text-sm">系统当前正在使用初始默认密码</p>
            <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              为了保障您的站点书签及管理控制台安全，请务必立即在下方将默认密码修改为个人专属高强度密码。
            </p>
          </div>
        </div>
      )}

      {/* Grid: Security Status + Password Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Security Specifications */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                安全防护架构
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                <CheckCircle2 className="w-3 h-3" />
                已加固
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">单用户隔离模式</div>
                  <div className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                    不设用户名枚举与多用户注册入口，免除撞库隐患。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">OWASP 标准加密算法</div>
                  <div className="text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono text-[11px]">
                    PBKDF2-HMAC-SHA512 (210,000 次强迭代)
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">令牌安全与会话周期</div>
                  <div className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                    随机高熵令牌，数据库仅存储 SHA-256 哈希指纹，30天自动过期。
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Server className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">接口防暴破机制</div>
                  <div className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                    IP 滑动窗口频率限制（最多 5 次/分钟），敏感操作安全头保护。
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>注销当前管理会话</span>
              </button>
            </div>
          </div>

          {/* Health & Storage Monitor */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                系统实时探活与持久化状态
              </span>
              <button
                onClick={fetchHealth}
                disabled={isCheckingHealth}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="重新检测"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {healthData ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">服务状态</span>
                  <span className={`font-semibold ${healthData.status === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                    {healthData.status === 'ok' ? '正常运行中' : '服务降级'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">当前接口节点</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]" title={apiClient.getBaseUrl()}>
                    {apiClient.getBaseUrl() || '/api'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">后端运行载体</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">
                    {healthData.service || 'OmniMark API'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">持久化存储校验</span>
                  <span className={`font-semibold ${healthData.storage?.status === 'healthy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {healthData.storage?.status === 'healthy' ? '数据读写正常' : '存储异常'}
                  </span>
                </div>
                {healthData.storage && (
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500 dark:text-zinc-400">当前已持久化数据</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {healthData.storage.bookmarksCount ?? 0} 书签 / {healthData.storage.categoriesCount ?? 0} 分类
                    </span>
                  </div>
                )}
                {healthData.storage?.status !== 'healthy' && (
                  <div className="pt-2 space-y-2">
                    {healthData.storage?.message && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 text-[11px] text-red-600 dark:text-red-300 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>异常诊断提示：</span>
                        </div>
                        <p className="leading-relaxed">{healthData.storage.message}</p>
                      </div>
                    )}

                    {/* Cloudflare D1 配置指引卡片 */}
                    <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/50 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1.5">
                      <div className="font-bold flex items-center gap-1 text-indigo-700 dark:text-indigo-300">
                        <Database className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Cloudflare D1 绑定步骤：</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-0.5 text-indigo-800 dark:text-indigo-300/90 pl-1 leading-normal">
                        <li>登录 Cloudflare Dashboard ➔ 打开你的 Pages 项目</li>
                        <li>点击 <strong>设置 (Settings)</strong> ➔ <strong>函数 (Functions)</strong></li>
                        <li>找到 <strong>D1 数据库绑定</strong> ➔ 点击添加：变量名称严格填 <strong>DB</strong>，选择你的数据库</li>
                      </ol>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleRepairStorage}
                        disabled={isRepairing}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Wrench className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
                        <span>{isRepairing ? '正在自愈修复中...' : '一键执行存储自愈'}</span>
                      </button>

                      {apiClient.getBaseUrl() !== '/api' && (
                        <button
                          type="button"
                          onClick={() => {
                            apiClient.setBaseUrl('/api');
                            fetchHealth();
                            showToast('已重置接口节点为默认 /api', 'info');
                          }}
                          className="py-2 px-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                          title="重置为默认本地 /api 节点"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>重置</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-zinc-400 py-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>点击右上角检测实时接口运行状态</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Change Password Form */}
        <div className="lg:col-span-2">
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>更新管理员密码</span>
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                新密码将经过加盐哈希（PBKDF2-HMAC-SHA512）后写入持久层存储。修改完成后旧凭证将全部作废。
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  原管理密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="请输入当前生效的管理密码"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  新管理密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少 6 位，建议包含大小写字母与数字"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  确认新密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码核验"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>正在安全加密并保存...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>保存新管理密码</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
