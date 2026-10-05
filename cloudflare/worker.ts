/**
 * OmniMark - Cloudflare Worker Backend
 * Bindings required in wrangler.toml:
 * - [[d1_databases]]: binding = "DB"
 * - [[kv_namespaces]]: binding = "CACHE_KV"
 */

export interface D1Database {
  prepare: (query: string) => any;
  dump?: () => Promise<ArrayBuffer>;
  batch?: (statements: any[]) => Promise<any[]>;
  exec?: (query: string) => Promise<any>;
}

export interface KVNamespace {
  get: (key: string, type?: string) => Promise<any>;
  put: (key: string, value: any, options?: { expirationTtl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export interface ExecutionContext {
  waitUntil: (promise: Promise<any>) => void;
  passThroughOnException: () => void;
}

export interface Env {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  JWT_SECRET?: string;
}

function sStr(v: any, def = ''): string { return (v === undefined || v === null) ? def : String(v); }
function sNum(v: any, def = 0): number { const n = Number(v); return isNaN(n) ? def : n; }
function sBool(v: any, def = 0): number { if (v === undefined || v === null) return def; return v ? 1 : 0; }

export async function runDatabaseRepair(env: Env) {
  if (!env || !env.DB) {
    throw new Error('未检测到 D1 数据库绑定，请在 Cloudflare Worker 设置中将 D1 变量名绑定为 "DB"');
  }

  // 1. 确保核心表结构存在
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      tokenHash TEXT NOT NULL UNIQUE,
      ipHash TEXT,
      userAgentHash TEXT,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'Folder',
      sortOrder INTEGER DEFAULT 0,
      isPrivate INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      favicon TEXT,
      tags TEXT,
      clickCount INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      isPinned INTEGER DEFAULT 0,
      isPrivate INTEGER DEFAULT 0,
      inFeed INTEGER DEFAULT 0,
      feedCustomNote TEXT DEFAULT '',
      feedHighlight INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS custom_pages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      icon TEXT DEFAULT 'FileText',
      content TEXT NOT NULL,
      isPrivate INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `).run();

  // 2. 字段兼容性自愈（向历史旧版表无缝补齐新增字段）
  const alterColumns = [
    'ALTER TABLE categories ADD COLUMN isPrivate INTEGER DEFAULT 0',
    'ALTER TABLE bookmarks ADD COLUMN isPrivate INTEGER DEFAULT 0',
    'ALTER TABLE bookmarks ADD COLUMN inFeed INTEGER DEFAULT 0',
    'ALTER TABLE bookmarks ADD COLUMN feedCustomNote TEXT DEFAULT \'\'',
    'ALTER TABLE bookmarks ADD COLUMN feedHighlight INTEGER DEFAULT 0',
    'ALTER TABLE custom_pages ADD COLUMN isPrivate INTEGER DEFAULT 0',
  ];
  for (const sql of alterColumns) {
    try {
      await env.DB.prepare(sql).run();
    } catch {}
  }

  // 3. 检查是否有分类，如无则插入默认精选分类
  const catCountRow: any = await env.DB.prepare('SELECT COUNT(*) as count FROM categories').first();
  let defaultCatId = 'cat-featured';
  if (!catCountRow || Number(catCountRow.count) === 0) {
    await env.DB.prepare(`
      INSERT INTO categories (id, name, icon, sortOrder, isPrivate, createdAt) VALUES
      ('cat-featured', '精选常用', 'Sparkles', 1, 0, datetime('now')),
      ('cat-dev', '开发编程', 'Code', 2, 0, datetime('now')),
      ('cat-ai', 'AI 人工智能', 'Cpu', 3, 0, datetime('now')),
      ('cat-tools', '效率工具', 'Wrench', 4, 0, datetime('now'))
    `).run();
  } else {
    const firstCat: any = await env.DB.prepare('SELECT id FROM categories ORDER BY sortOrder ASC LIMIT 1').first();
    if (firstCat) defaultCatId = firstCat.id;
  }

  // 4. 修复孤立书签
  let fixedBookmarks = 0;
  try {
    const orphanBookmarks: any = await env.DB.prepare(`
      SELECT b.id FROM bookmarks b
      LEFT JOIN categories c ON b.categoryId = c.id
      WHERE c.id IS NULL
    `).all();

    if (orphanBookmarks?.results && orphanBookmarks.results.length > 0) {
      for (const ob of orphanBookmarks.results) {
        await env.DB.prepare('UPDATE bookmarks SET categoryId = ? WHERE id = ?').bind(sStr(defaultCatId), sStr(ob.id)).run();
        fixedBookmarks++;
      }
    }
  } catch (e) {}

  // 5. 确保基础站点设置存在
  const settingsRow: any = await env.DB.prepare("SELECT value FROM settings WHERE key = 'site_config'").first();
  if (!settingsRow) {
    const defaultSettings = {
      title: 'OmniMark 导航',
      subtitle: '现代、快速、可迁移的极简书签与网址导航中心',
      logoText: 'OmniMark',
      footerText: 'Powered by OmniMark · 高性能原子存储与现代化边缘部署',
      announcement: '',
      enableClickCounter: true,
      enablePinnedSection: true,
      enableSiteFeed: true,
      siteFeedTitle: '站点动态 & 精选快讯',
      siteFeedSubtitle: '全站精选优质站点实时动态，按分类轻松探索',
      maxBookmarksPerCategory: 0,
      maxTotalBookmarks: 0,
    };
    await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('site_config', ?)").bind(JSON.stringify(defaultSettings)).run();
  }

  // 6. 清除 KV 缓存
  if (env.CACHE_KV) {
    await Promise.all([
      env.CACHE_KV.delete('cache:categories:all'),
      env.CACHE_KV.delete('cache:bookmarks:all:'),
    ]).catch(() => {});
  }

  const [finalCats, finalBms]: any = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as count FROM categories').first(),
    env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks').first(),
  ]);

  return {
    repaired: true,
    fixedBookmarks,
    categoriesCount: finalCats?.count || 0,
    bookmarksCount: finalBms?.count || 0,
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const rawPath = url.pathname;
    const method = (request.method || 'GET').toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-auth-token',
        },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8',
    };

    // 路径标准化：去除末尾斜杠，并统一去除 /api 前缀
    let path = rawPath.replace(/\/+$/, '') || '/';
    if (path.startsWith('/api/')) {
      path = path.substring(4);
    } else if (path === '/api') {
      path = '/health';
    }

    try {
      // 1. Health check (with auto-repair on uninitialized DB)
      if (path === '/health' && (method === 'GET' || method === 'HEAD')) {
        try {
          const [catCountRow, bmCountRow]: any = await Promise.all([
            env.DB.prepare('SELECT COUNT(*) as count FROM categories').first(),
            env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks').first(),
          ]);

          return new Response(JSON.stringify({
            status: 'ok',
            service: 'OmniMark Cloudflare Edge Worker',
            runtime: 'Cloudflare Workers (D1 + KV)',
            version: '2.0.0',
            storage: {
              status: 'healthy',
              categoriesCount: catCountRow?.count || 0,
              bookmarksCount: bmCountRow?.count || 0,
            },
          }), { headers: corsHeaders });
        } catch {
          const rep = await runDatabaseRepair(env);
          return new Response(JSON.stringify({
            status: 'ok',
            service: 'OmniMark Cloudflare Edge Worker',
            runtime: 'Cloudflare Workers (D1 + KV)',
            version: '2.0.0',
            storage: {
              status: 'healthy',
              categoriesCount: rep.categoriesCount,
              bookmarksCount: rep.bookmarksCount,
              autoRepaired: true,
            },
          }), { headers: corsHeaders });
        }
      }

      // 1.1 Self-healing repair endpoint (supports both POST and GET)
      if ((path === '/health/repair' || path === '/repair') && (method === 'POST' || method === 'GET')) {
        try {
          const repairResult = await runDatabaseRepair(env);
          return new Response(JSON.stringify({
            success: true,
            repaired: true,
            message: '边缘端 D1 数据库自愈成功：表结构与新字段已校验补齐，孤立书签已重定向，缓存已更新',
            data: {
              repaired: true,
              fixedBookmarks: repairResult.fixedBookmarks,
              categoriesCount: repairResult.categoriesCount,
              bookmarksCount: repairResult.bookmarksCount,
              storage: {
                healthy: true,
                status: 'healthy',
                runtime: 'Cloudflare Workers (D1 + KV)',
              },
            },
          }), { headers: corsHeaders });
        } catch (repairErr: any) {
          return new Response(JSON.stringify({
            success: false,
            repaired: false,
            error: '自愈执行失败: ' + (repairErr?.message || '未知错误'),
          }), { status: 500, headers: corsHeaders });
        }
      }

      // 2. Bookmarks list with KV Cache Acceleration
      if (path === '/api/bookmarks' && request.method === 'GET') {
        const categoryId = url.searchParams.get('categoryId');
        const search = url.searchParams.get('search');
        const cacheKey = `cache:bookmarks:${categoryId || 'all'}:${search || ''}`;

        // Try KV Cache first
        if (env.CACHE_KV) {
          const cached = await env.CACHE_KV.get(cacheKey);
          if (cached) {
            return new Response(cached, {
              headers: { ...corsHeaders, 'X-Cache': 'HIT-KV' },
            });
          }
        }

        // D1 Database query
        let query = 'SELECT * FROM bookmarks';
        const params: any[] = [];

        if (categoryId && categoryId !== 'all') {
          query += ' WHERE categoryId = ?';
          params.push(sStr(categoryId));
        }

        query += ' ORDER BY isPinned DESC, sortOrder ASC';
        const stmt = env.DB.prepare(query);
        const { results } = await stmt.bind(...params).all();

        const formatted = (results || []).map((r: any) => ({
          ...r,
          tags: r.tags ? JSON.parse(r.tags) : [],
          isPinned: Boolean(r.isPinned),
          isPrivate: Boolean(r.isPrivate),
          inFeed: Boolean(r.inFeed),
          feedHighlight: Boolean(r.feedHighlight),
        }));

        const responsePayload = JSON.stringify({ success: true, data: formatted });

        // Save to KV with 60s TTL
        if (env.CACHE_KV) {
          ctx.waitUntil(env.CACHE_KV.put(cacheKey, responsePayload, { expirationTtl: 60 }));
        }

        return new Response(responsePayload, {
          headers: { ...corsHeaders, 'X-Cache': 'MISS-D1' },
        });
      }

      // 3. Categories list
      if (path === '/api/categories' && request.method === 'GET') {
        const cacheKey = 'cache:categories:all';
        if (env.CACHE_KV) {
          const cached = await env.CACHE_KV.get(cacheKey);
          if (cached) return new Response(cached, { headers: { ...corsHeaders, 'X-Cache': 'HIT-KV' } });
        }

        const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sortOrder ASC').all();
        const payload = JSON.stringify({ success: true, data: results });

        if (env.CACHE_KV) {
          ctx.waitUntil(env.CACHE_KV.put(cacheKey, payload, { expirationTtl: 120 }));
        }
        return new Response(payload, { headers: corsHeaders });
      }

      // 4. Record Click
      const clickMatch = path.match(/^\/api\/bookmarks\/([^/]+)\/click$/);
      if (clickMatch && request.method === 'POST') {
        const id = clickMatch[1];
        await env.DB.prepare('UPDATE bookmarks SET clickCount = clickCount + 1 WHERE id = ?').bind(sStr(id)).run();
        // Invalidate cache
        if (env.CACHE_KV) {
          ctx.waitUntil(env.CACHE_KV.delete('cache:bookmarks:all:'));
        }
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // 5. Settings
      if (path === '/api/settings' && request.method === 'GET') {
        const row: any = await env.DB.prepare("SELECT value FROM settings WHERE key = 'site_config'").first();
        const settings = row ? JSON.parse(row.value) : null;
        return new Response(JSON.stringify({ success: true, data: settings }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: false, error: 'Endpoint not implemented in Worker preview' }), {
        status: 404,
        headers: corsHeaders,
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
