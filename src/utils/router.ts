/**
 * URL Hash & Storage Router Synchronization
 * Guarantees that refreshing the page stays on the current view, tab, or page.
 */

export interface AppRouteState {
  view: 'home' | 'admin';
  adminTab: 'dashboard' | 'bookmarks' | 'feed' | 'categories' | 'pages' | 'users' | 'import-export' | 'cloudflare' | 'settings';
  activePageId: string | null;
  activeCategoryId: string;
}

const STORAGE_KEY_ROUTE = 'omnimark_active_route_v2';

const VALID_ADMIN_TABS = [
  'dashboard',
  'bookmarks',
  'feed',
  'categories',
  'pages',
  'users',
  'import-export',
  'cloudflare',
  'settings',
] as const;

export function parseCurrentRoute(): AppRouteState {
  let view: 'home' | 'admin' = 'home';
  let adminTab: AppRouteState['adminTab'] = 'dashboard';
  let activePageId: string | null = null;
  let activeCategoryId = 'all';

  const rawHash = (typeof window !== 'undefined' ? window.location.hash : '').trim();
  const cleanHash = rawHash.replace(/^#\/?/, '').trim();

  // 1. Try parsing from URL Hash if valid non-empty hash exists
  if (cleanHash && cleanHash !== '/' && cleanHash !== 'home') {
    const parts = cleanHash.split('/').filter(Boolean);
    const firstPart = parts[0]?.toLowerCase();

    if (firstPart === 'admin') {
      view = 'admin';
      const secondPart = parts[1]?.toLowerCase();
      if (secondPart && (VALID_ADMIN_TABS as readonly string[]).includes(secondPart)) {
        adminTab = secondPart as AppRouteState['adminTab'];
      } else {
        adminTab = 'dashboard';
      }
    } else if (firstPart === 'feed' || cleanHash === 'site-feed') {
      view = 'home';
      activePageId = 'site-feed';
      activeCategoryId = 'all';
    } else if (firstPart === 'page') {
      view = 'home';
      activePageId = parts[1] || 'site-feed';
    } else if (firstPart === 'category') {
      view = 'home';
      activeCategoryId = parts[1] || 'all';
    }
  } else {
    // 2. Fallback to localStorage saved route (Crucial for iframe refresh or direct reload without hash)
    try {
      const savedStr = localStorage.getItem(STORAGE_KEY_ROUTE);
      if (savedStr) {
        const saved: Partial<AppRouteState> = JSON.parse(savedStr);
        if (saved.view === 'admin' || saved.view === 'home') {
          view = saved.view;
        }
        if (saved.adminTab && (VALID_ADMIN_TABS as readonly string[]).includes(saved.adminTab)) {
          adminTab = saved.adminTab;
        }
        if (saved.activePageId !== undefined) {
          activePageId = saved.activePageId;
        }
        if (saved.activeCategoryId) {
          activeCategoryId = saved.activeCategoryId;
        }
      }
    } catch {}
  }

  return { view, adminTab, activePageId, activeCategoryId };
}

export function buildRouteHash(state: AppRouteState): string {
  if (state.view === 'admin') {
    return `#/admin/${state.adminTab || 'dashboard'}`;
  }
  if (state.activePageId === 'site-feed') {
    return `#/feed`;
  }
  if (state.activePageId) {
    return `#/page/${state.activePageId}`;
  }
  if (state.activeCategoryId && state.activeCategoryId !== 'all') {
    return `#/category/${state.activeCategoryId}`;
  }
  return `#/`;
}

export function updateUrlAndStorage(state: Partial<AppRouteState>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = parseCurrentRoute();
    const next: AppRouteState = { ...current, ...state };

    // Persist full route state to localStorage
    try {
      localStorage.setItem(STORAGE_KEY_ROUTE, JSON.stringify(next));
    } catch {}

    // Synchronize window hash
    const newHash = buildRouteHash(next);
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  } catch (err) {
    console.warn('[Router] Failed to update route:', err);
  }
}
