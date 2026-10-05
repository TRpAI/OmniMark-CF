import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Sparkles,
  X,
  PlusSquare,
  Share,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

export const PWAInstallNavbarButton: React.FC = () => {
  const { isInstalled, openInstallGuide } = usePWAInstall();

  // If already installed or running as standalone, don't show the button
  if (isInstalled) {
    return null;
  }

  return (
    <button
      onClick={openInstallGuide}
      title="安装到手机/电脑桌面，支持独立运行与秒开"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs hover:shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
    >
      <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:-translate-y-0.5 transition-transform" />
      <span className="hidden sm:inline">安装到桌面</span>
      <span className="sm:hidden">安装App</span>
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
      </span>
    </button>
  );
};

export const PWAInstallBottomBanner: React.FC = () => {
  const { isInstalled, isMobile, showModal, setShowModal, openInstallGuide } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage for dismissal preference in current session
  useEffect(() => {
    const isDismissed = sessionStorage.getItem('omnimark_pwa_banner_dismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    sessionStorage.setItem('omnimark_pwa_banner_dismissed', 'true');
  };

  // Hide if already running standalone, dismissed, or desktop
  if (isInstalled || dismissed) {
    return (
      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    );
  }

  return (
    <>
      <div className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:inset-x-auto sm:right-5 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
        <div
          onClick={openInstallGuide}
          className="relative flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-zinc-900/95 dark:bg-zinc-800/95 text-white backdrop-blur-md shadow-2xl border border-white/15 cursor-pointer group hover:bg-zinc-900 transition-all ring-1 ring-black/5"
        >
          {/* Left: App Icon & Copy */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md border border-white/20">
              <Download className="w-5 h-5 text-white animate-bounce" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold truncate">安装 OmniMark App</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-zinc-950 font-black shrink-0">
                  秒开
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 dark:text-zinc-400 truncate">
                添加到手机桌面 · 无地址栏干扰 · 极速离线直达
              </p>
            </div>
          </div>

          {/* Right: Install CTA + Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openInstallGuide();
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1"
            >
              <span>安装</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDismiss}
              title="稍后提醒"
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
