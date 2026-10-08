import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (mode: ThemeMode) => void;
  cycleTheme: () => void;
}

const STORAGE_KEY = 'omnimark_theme';

const getInitialMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'auto';
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (saved === 'light' || saved === 'dark' || saved === 'auto') {
    return saved;
  }
  return 'auto';
};

const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyThemeToDOM = (resolved: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Sync mobile browser status bar / theme-color meta tag
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolved === 'dark' ? '#090d16' : '#4f46e5');
  }
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialMode = getInitialMode();
  const initialResolved = resolveTheme(initialMode);
  applyThemeToDOM(initialResolved);

  // Set up system media query listener
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const currentMode = get().mode;
      if (currentMode === 'auto') {
        const nextResolved = resolveTheme('auto');
        applyThemeToDOM(nextResolved);
        set({ resolvedTheme: nextResolved });
      }
    };
    mediaQuery.addEventListener('change', handler);
  }

  return {
    mode: initialMode,
    resolvedTheme: initialResolved,

    setTheme: (mode: ThemeMode) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, mode);
      }
      const resolved = resolveTheme(mode);
      applyThemeToDOM(resolved);
      set({ mode, resolvedTheme: resolved });
    },

    cycleTheme: () => {
      const current = get().mode;
      const next: ThemeMode = current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto';
      get().setTheme(next);
    },
  };
});
