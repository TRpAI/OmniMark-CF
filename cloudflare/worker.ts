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
    'ALTER TABLE categories ADD COLUMN sortOrder INTEGER DEFAULT 0',
    'ALTER TABLE categories ADD COLUMN icon TEXT DEFAULT \'Folder\'',
    'ALTER TABLE bookmarks ADD COLUMN isPrivate INTEGER DEFAULT 0',
    'ALTER TABLE bookmarks ADD COLUMN isPinned INTEGER DEFAULT 0',
    'ALTER TABLE bookmarks ADD COLUMN inFeed INTEGER DEFAULT 0',
    'ALTER TABLE bookmarks ADD COLUMN feedCustomNote TEXT DEFAULT \'\'',
    'ALTER TABLE bookmarks ADD COLUMN feedHighlight INTEGER DEFAULT 0',
    'ALTER TABLE bookmarks ADD COLUMN clickCount INTEGER DEFAULT 0',
    'ALTER TABLE bookmarks ADD COLUMN sortOrder INTEGER DEFAULT 0',
    'ALTER TABLE bookmarks ADD COLUMN tags TEXT DEFAULT \'[]\'',
    'ALTER TABLE custom_pages ADD COLUMN isPrivate INTEGER DEFAULT 0',
    'ALTER TABLE custom_pages ADD COLUMN icon TEXT DEFAULT \'FileText\'',
    'ALTER TABLE custom_pages ADD COLUMN sortOrder INTEGER DEFAULT 0',
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

// 全局数据库就绪状态缓存
let isDbReady = false;
let dbInitPromise: Promise<void> | null = null;

export async function ensureDatabaseReady(env: Env) {
  const db: any = (env as any)?.DB || (env as any)?.database || (env as any)?.DATABASE || (env as any)?.d1 || (env as any)?.D1 || (env as any)?.omnimark_db || (env as any)?.DB_BINDING;
  if (!db) return;
  if (isDbReady) return;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        await runDatabaseRepair(env);
        isDbReady = true;
      } catch (err) {
        console.error('Auto migration failed on init:', err);
        dbInitPromise = null;
      }
    })();
  }
  await dbInitPromise;
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

    // 自动兼容多命名 D1 与 KV 绑定变量
    env.DB = (env as any).DB || (env as any).database || (env as any).DATABASE || (env as any).d1 || (env as any).D1 || (env as any).omnimark_db || (env as any).DB_BINDING;
    env.CACHE_KV = (env as any).CACHE_KV || (env as any).cache_kv || (env as any).KV || (env as any).kv || (env as any).CACHE;

    // 自动自愈检查表结构与字段（防 D1_ERROR: no such column）
    if (env.DB && !isDbReady) {
      await ensureDatabaseReady(env);
    }

    try {
      // 1. Health check (with auto-repair on uninitialized DB)
      if (path === '/health' && (method === 'GET' || method === 'HEAD')) {
        if (!env.DB) {
          return new Response(JSON.stringify({
            status: 'degraded',
            service: 'OmniMark Cloudflare Edge Worker',
            runtime: 'Cloudflare Workers (D1 + KV)',
            version: '2.0.0',
            storage: {
              status: 'error',
              message: '未检测到 D1 数据库绑定。请前往 Cloudflare 控制台 -> Pages 项目 -> 设置 (Settings) -> 函数 (Functions) -> 添加 D1 数据库绑定（变量名称严格填 "DB"，选择你的 D1 数据库）',
            },
          }), { headers: corsHeaders });
        }
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
        let results: any[] = [];
        try {
          const res: any = await stmt.bind(...params).all();
          results = res.results || [];
        } catch (bmErr: any) {
          if (String(bmErr?.message).includes('no such column')) {
            await runDatabaseRepair(env);
            const retryStmt = env.DB.prepare(query);
            const res: any = await retryStmt.bind(...params).all();
            results = res.results || [];
          } else {
            throw bmErr;
          }
        }

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

      // 6. AI 智能助手接口 (/api/ai/*)
      const callGeminiRest = async (promptText: string) => {
        const apiKey = (env as any).GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);
        if (!apiKey) return null;
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
              }),
            }
          );
          if (!geminiRes.ok) return null;
          const geminiData: any = await geminiRes.json();
          return geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch {
          return null;
        }
      };

      if ((path === '/api/ai/site-info' || path === '/ai/site-info') && request.method === 'POST') {
        const { url: targetUrl, existingCategories = [] } = (await request.json().catch(() => ({}))) as any;
        if (!targetUrl) return new Response(JSON.stringify({ success: false, error: '请提供目标网址' }), { status: 400, headers: corsHeaders });

        let normalized = targetUrl.trim();
        if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
        let parsedHost = '';
        try { parsedHost = new URL(normalized).hostname; } catch {}

        let rawTitle = '';
        let rawDesc = '';
        let rawFavicon = `https://www.google.com/s2/favicons?domain=${parsedHost}&sz=128`;
        try {
          const fetchRes = await fetch(normalized, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OmniMarkEdge/2.0)' },
          });
          if (fetchRes.ok) {
            const html = await fetchRes.text();
            const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (tm) rawTitle = tm[1].trim();
            const dm = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
            if (dm) rawDesc = dm[1].trim();
          }
        } catch {}

        const prompt = `你是一个专业的互联网网站分析与信息架构专家。请针对以下网址，提炼并生成最适合收录进导航书签系统的中文信息：
目标网址: ${normalized}
域名: ${parsedHost}
网页抓取标题: ${rawTitle || '无'}
网页抓取描述: ${rawDesc || '无'}
现有分类列表: ${JSON.stringify(existingCategories)}

请以严格的纯 JSON 格式输出（不要添加任何 markdown 代码块标记）：
{
  "title": "简练通用的站点名称（如 'GitHub', 'Figma 设计工具'，30字以内）",
  "description": "50~100字左右的高质量中文简介，概括核心定位与主打功能",
  "tags": ["3到5个精炼中文标签"],
  "suggestedCategory": "从现有分类列表中选择最契合的一项；若无完全契合的，给出中文分类建议",
  "favicon": "${rawFavicon}"
}`;

        const aiText = await callGeminiRest(prompt);
        if (aiText) {
          try {
            const clean = aiText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(clean);
            return new Response(JSON.stringify({
              success: true,
              data: {
                title: parsed.title || rawTitle || parsedHost,
                description: parsed.description || rawDesc || `${parsedHost} 站点导航。`,
                tags: Array.isArray(parsed.tags) ? parsed.tags : ['精选工具'],
                suggestedCategory: parsed.suggestedCategory || existingCategories[0] || '常用精选',
                favicon: parsed.favicon || rawFavicon,
              },
            }), { headers: corsHeaders });
          } catch {}
        }

        return new Response(JSON.stringify({
          success: true,
          data: {
            title: rawTitle || parsedHost || '新站点',
            description: rawDesc || `${parsedHost} 站点资源导航与直达。`,
            tags: ['精选站点'],
            suggestedCategory: existingCategories[0] || '默认分类',
            favicon: rawFavicon,
          },
        }), { headers: corsHeaders });
      }

      if ((path === '/api/ai/site-summary' || path === '/ai/site-summary') && request.method === 'POST') {
        const { url: targetUrl, title = '', description = '' } = (await request.json().catch(() => ({}))) as any;
        if (!targetUrl) return new Response(JSON.stringify({ success: false, error: '请提供目标网址' }), { status: 400, headers: corsHeaders });

        const prompt = `你是一个资深的数字产品评测专家。请针对以下网站进行深入、客观的智能摘要与功能解读：
网址: ${targetUrl}
标题: ${title}
已知简介: ${description}

请以严格的纯 JSON 格式输出（不要添加 markdown 代码块）：
{
  "oneSentenceSummary": "精炼的一句话核心定位（25~45字）",
  "coreFeatures": ["核心特性1", "核心特性2", "核心特性3", "核心特性4"],
  "targetAudience": ["适用人群或典型工作场景1", "适用场景2"],
  "keyHighlights": ["亮点或差异化特色1", "差异化特色2"],
  "recommendedUsage": "高效使用建议或操作小窍门（50~80字）",
  "relatedKeywords": ["标签1", "标签2", "标签3", "标签4"]
}`;

        const aiText = await callGeminiRest(prompt);
        if (aiText) {
          try {
            const clean = aiText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(clean);
            return new Response(JSON.stringify({ success: true, data: parsed }), { headers: corsHeaders });
          } catch {}
        }

        return new Response(JSON.stringify({
          success: true,
          data: {
            oneSentenceSummary: `${title || '该站点'} 是一个实用的数字在线服务。`,
            coreFeatures: [description || '核心功能服务', '支持多端快捷浏览与直达'],
            targetAudience: ['工具使用者与数字探索者'],
            keyHighlights: ['随开随用，高效直达'],
            recommendedUsage: '直接通过导航卡片访问即可使用全部功能。',
            relatedKeywords: ['在线工具', '精选资源'],
          },
        }), { headers: corsHeaders });
      }

      if ((path === '/api/ai/assistant' || path === '/ai/assistant') && request.method === 'POST') {
        const { query } = (await request.json().catch(() => ({}))) as any;
        if (!query) return new Response(JSON.stringify({ success: false, error: '请输入您的问题' }), { status: 400, headers: corsHeaders });

        let bookmarks: any[] = [];
        let categories: any[] = [];
        if (env.DB) {
          const [bRes, cRes]: any = await Promise.all([
            env.DB.prepare('SELECT id, categoryId, title, url, description, tags FROM bookmarks LIMIT 100').all(),
            env.DB.prepare('SELECT id, name FROM categories').all(),
          ]);
          bookmarks = bRes.results || [];
          categories = cRes.results || [];
        }

        const catMap = new Map(categories.map((c: any) => [c.id, c.name]));
        const contextList = bookmarks.map((b: any) => ({
          title: b.title,
          url: b.url,
          description: b.description || '',
          tags: b.tags ? JSON.parse(b.tags) : [],
          category: catMap.get(b.categoryId) || '未分类',
        }));

        const prompt = `你是一个智能书签知识库助理。用户提问: "${query}"
用户收藏夹（共 ${contextList.length} 项）:
${JSON.stringify(contextList, null, 2)}

请按要求回答：优先从书签库中寻找匹配工具，附带 Markdown 链接格式 [站点名](URL)，并给出清晰理由。
纯 JSON 输出（不带 markdown 块）：
{
  "answer": "排版精美 Markdown 文本回答",
  "recommendedBookmarks": [{ "title": "站点名称", "url": "网址" }]
}`;

        const aiText = await callGeminiRest(prompt);
        if (aiText) {
          try {
            const clean = aiText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(clean);
            return new Response(JSON.stringify({ success: true, data: parsed }), { headers: corsHeaders });
          } catch {}
        }

        const kws = query.toLowerCase().split(/\s+/);
        const matched = contextList.filter((b: any) => {
          const str = `${b.title} ${b.description} ${b.tags.join(' ')} ${b.category}`.toLowerCase();
          return kws.some((k: string) => str.includes(k));
        }).slice(0, 5);

        return new Response(JSON.stringify({
          success: true,
          data: {
            answer: matched.length > 0
              ? '为您在书签库中找到以下相关站点：\n\n' + matched.map((m: any) => `* [${m.title}](${m.url}) - ${m.description || '点击直达'}`).join('\n')
              : '未在现有书签库中匹配到完全吻合的站点，建议输入更具体的名称或类别。',
            recommendedBookmarks: matched.map((m: any) => ({ title: m.title, url: m.url })),
          },
        }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: false, error: 'Endpoint not implemented in Worker preview' }), {
        status: 404,
        headers: corsHeaders,
      });
    } catch (err: any) {
      const errMsg = err?.message || 'Worker 运行时异常';
      if (errMsg.includes('no such column') || errMsg.includes('no such table')) {
        try {
          isDbReady = false;
          dbInitPromise = null;
          await runDatabaseRepair(env);
          isDbReady = true;
          return new Response(JSON.stringify({
            success: false,
            autoRepaired: true,
            error: `旧版数据库字段已自动补齐自愈（原提示: ${errMsg}），请重新尝试或刷新页面。`,
          }), { status: 500, headers: corsHeaders });
        } catch {}
      }
      return new Response(JSON.stringify({ success: false, error: errMsg }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
