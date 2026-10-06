import React, { useState, useEffect } from 'react';
import { X, Lock, KeyRound, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../../stores/auth.store';
import { useUiStore } from '../../../stores/ui.store';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setLoginModalOpen, setCurrentView, showToast } = useUiStore();
  const { login, initAdminPassword, needsInit, checkAuthStatus, isLoading, error, clearError } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // 打开弹窗时自动探活管理员密码初始化状态
  useEffect(() => {
    if (isLoginModalOpen) {
      setPassword('');
      setConfirmPassword('');
      setLocalError(null);
      clearError();
      checkAuthStatus();
    }
  }, [isLoginModalOpen, checkAuthStatus, clearError]);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (needsInit) {
      if (!password || password.length < 6) {
        setLocalError('管理密码长度至少需 6 位字符');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('两次输入的密码不一致，请重新核对');
        return;
      }

      const ok = await initAdminPassword(password);
      if (ok) {
        setLoginModalOpen(false);
        setCurrentView('admin');
        showToast('管理密码初始化成功，已安全进入管理控制台', 'success');
      }
    } else {
      if (!password) {
        setLocalError('请输入管理密码');
        return;
      }
      const ok = await login(password);
      if (ok) {
        setLoginModalOpen(false);
        setCurrentView('admin');
        showToast('身份验证成功，已进入管理控制台', 'success');
      }
    }
  };

  const activeError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            clearError();
            setLocalError(null);
            setLoginModalOpen(false);
          }}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-colors ${
              needsInit
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
                : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50'
            }`}
          >
            {needsInit ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {needsInit ? '初始化管理员密码' : '管理员身份验证'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {needsInit
                ? '系统尚未设置管理密码，首次登入请设定专属安全密码'
                : '请输入管理密码以进入控制台'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {activeError && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200/60 dark:border-red-800/50">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{activeError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {needsInit ? '设置管理密码 (至少 6 位)' : '管理密码'}
            </label>
            <div className="relative flex items-center">
              <KeyRound className="absolute left-3.5 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={needsInit ? '请设置专属管理员密码' : '请输入管理通行密码'}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {needsInit && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                确认管理密码
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-2 py-3 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 transition-all cursor-pointer ${
              needsInit
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
            }`}
          >
            {isLoading ? (
              <span>{needsInit ? '正在初始化...' : '正在验证身份...'}</span>
            ) : (
              <>
                <span>{needsInit ? '完成初始化并进入后台' : '解禁并进入管理后台'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

