import React, { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';
import { LoginModal } from './features/auth/components/LoginModal';
import { useAuthStore } from './stores/auth.store';
import { useBookmarkStore } from './stores/bookmark.store';
import { useUiStore } from './stores/ui.store';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const { checkAuth } = useAuthStore();
  const { loadInitialData } = useBookmarkStore();
  const { currentView, toasts, removeToast } = useUiStore();

  useEffect(() => {
    checkAuth();
    loadInitialData();
  }, [checkAuth, loadInitialData]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Navigation Header */}
      <Navbar />

      {/* Main View Area */}
      {currentView === 'admin' ? <AdminPage /> : <HomePage />}

      {/* Admin Login Modal */}
      <LoginModal />

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
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
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
