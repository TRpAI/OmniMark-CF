import React, { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';
import { Footer } from './components/Footer';
import { LoginModal } from './features/auth/components/LoginModal';
import { AiAssistantDrawer } from './features/ai/components/AiAssistantDrawer';
import { PWAInstallBottomBanner } from './components/PWAInstallBanner';
import { useAuthStore } from './stores/auth.store';
import { useBookmarkStore } from './stores/bookmark.store';
import { useUiStore } from './stores/ui.store';
import { useThemeStore } from './stores/theme.store';
import { parseCurrentRoute, buildRouteHash } from './utils/router';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const { checkAuth } = useAuthStore();
  const { loadInitialData, setActiveCategory, setActivePage } = useBookmarkStore();
  const { currentView, setCurrentView, setAdminTab, toasts, removeToast } = useUiStore();
  const { resolvedTheme } = useThemeStore();

  useEffect(() => {
    checkAuth();
    loadInitialData();

    // 1. Initial Route Synchronization: If hash is empty (e.g. iframe refresh), restore hash from storage
    const initialRoute = parseCurrentRoute();
    if (initialRoute.view === 'admin') {
      setCurrentView('admin');
      if (initialRoute.adminTab) setAdminTab(initialRoute.adminTab);
    } else {
      setCurrentView('home');
      if (initialRoute.activePageId) {
        setActivePage(initialRoute.activePageId);
      } else if (initialRoute.activeCategoryId) {
        setActiveCategory(initialRoute.activeCategoryId);
      }
    }

    const targetHash = buildRouteHash(initialRoute);
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      if (targetHash && targetHash !== '#/') {
        window.history.replaceState(null, '', targetHash);
      }
    }

    // 2. Browser Navigation & Hashchange Event Listener
    const handleHashChange = () => {
      const route = parseCurrentRoute();
      if (route.view === 'admin') {
        setCurrentView('admin');
        if (route.adminTab) setAdminTab(route.adminTab);
      } else {
        setCurrentView('home');
        if (route.activePageId) {
          setActivePage(route.activePageId);
        } else if (route.activeCategoryId) {
          setActiveCategory(route.activeCategoryId);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [checkAuth, loadInitialData, setCurrentView, setAdminTab, setActiveCategory, setActivePage]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Navigation Header */}
      <Navbar />

      {/* Main View Area */}
      <main className="flex-1 w-full pb-16 sm:pb-20">
        {currentView === 'admin' ? <AdminPage /> : <HomePage />}
      </main>

      {/* Admin Login Modal */}
      <LoginModal />

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer />

      {/* PWA Install Bottom Floating Banner & Modal */}
      <PWAInstallBottomBanner />

      {/* 统一全局页脚 (前台与管理后台保持完全一致) */}
      <Footer className="fixed bottom-0 left-0 right-0 z-30" />

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => {
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl shadow-xl border text-sm animate-in slide-in-from-bottom-3 duration-200 ${
                toast.type === 'success'
                  ? 'bg-emerald-900/90 text-white border-emerald-700/80 backdrop-blur-md'
                  : toast.type === 'error'
                  ? 'bg-red-900/90 text-white border-red-700/80 backdrop-blur-md'
                  : 'bg-zinc-900/90 text-white border-zinc-700/80 backdrop-blur-md'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
                <span className="leading-snug">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
