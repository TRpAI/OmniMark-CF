import React from 'react';
import {
  X,
  Smartphone,
  Share,
  PlusSquare,
  Sparkles,
  Download,
  CheckCircle2,
  ExternalLink,
  Zap,
  ShieldCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { BrandLogo } from './BrandLogo';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isIOS, isWechat, hasNativePrompt, install } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xl p-5 sm:p-7 overflow-hidden space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background decorative gradient */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
          title="关闭"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Emblem */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 shadow-lg shadow-indigo-600/30 flex items-center justify-center shrink-0 border border-white/20 p-2">
            <BrandLogo size="lg" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mb-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>PWA 网页应用</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
              安装 OmniMark 到手机桌面
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              像原生 App 一样独立运行 · 极速离线秒开 · 零地址栏干扰
            </p>
          </div>
        </div>

        {/* Highlight Benefits Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex items-start gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">离线极速秒开</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                Service Worker 强劲缓存
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex items-start gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">独立全屏体验</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                沉浸式无边框原生视效
              </p>
            </div>
          </div>
        </div>

        {/* Guided Steps Content */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {isWechat ? '微信安装指引' : isIOS ? 'iOS Safari 安装指引' : 'Android / Chrome 安装指引'}
          </div>

          {/* 1. WeChat Environment Notice */}
          {isWechat ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs text-amber-900 dark:text-amber-200">
              <div className="font-bold flex items-center gap-1.5">
                <span>⚠️ 检测到当前处于微信内置浏览器中：</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-300 pl-1">
                <li>点击微信右上角的 <strong>「···」</strong> 菜单按钮</li>
                <li>在弹出面板中选择 <strong>「在浏览器打开」</strong> (Safari 或 Chrome)</li>
                <li>在系统浏览器中即可一键完成添加到桌面</li>
              </ol>
            </div>
          ) : isIOS ? (
            /* 2. iOS Safari Step-by-Step */
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="text-xs space-y-1 min-w-0 flex-1">
                  <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>点击 Safari 底部栏的</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs">
                      <Share className="w-3.5 h-3.5" />
                      <span>分享</span>
                    </span>
                    <span>图标</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    （iPad 在顶部工具栏，iPhone 在屏幕底端居中位置）
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="text-xs space-y-1 min-w-0 flex-1">
                  <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                    <span>在弹出菜单中向下滚动，找到并点击</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 font-bold shadow-2xs">
                      <PlusSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>添加到主屏幕</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    英文系统为「Add to Home Screen」
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="text-xs space-y-1 min-w-0 flex-1">
                  <div className="font-bold text-zinc-900 dark:text-white">
                    点击右上角的「添加」确认
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    即可在手机桌面上看到专属的 OmniMark App 图标，随时点击极速秒开！
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* 3. Android / Chrome / Desktop */
            <div className="space-y-3">
              {hasNativePrompt ? (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-2 text-indigo-950 dark:text-indigo-200">
                  <div className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>系统已检测到支持一键直接安装：</span>
                  </div>
                  <p className="text-indigo-800 dark:text-indigo-300 text-[11px] leading-relaxed">
                    点击下方「立即安装」按钮，浏览器将自动弹出系统级安装确认框，确认后即可生成桌面独立 App。
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        点击浏览器右上角菜单按钮（三点图标 ⋮）
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        选择「添加到主屏幕」或「安装应用」
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors cursor-pointer text-center"
          >
            暂不安装
          </button>

          {!isIOS && !isWechat && (
            <button
              type="button"
              onClick={install}
              className="flex-1.5 inline-flex items-center justify-center gap-2 py-3 px-5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>立即安装到桌面</span>
            </button>
          )}

          {(isIOS || isWechat) && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1.5 inline-flex items-center justify-center gap-2 py-3 px-5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-md transition-all cursor-pointer"
            >
              <span>我知道了</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
