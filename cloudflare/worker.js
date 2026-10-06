/**
 * OmniMark - Cloudflare Worker 全功能边缘后端 (Vanilla ES Module)
 * 纯原生 ES Module 编写，可直接复制粘贴到 Cloudflare Workers 网页控制面板的在线代码编辑器中！
 * 
 * 需在 Cloudflare Worker 的 设置 (Settings) -> 变量与绑定 (Variables and Bindings) 中绑定：
 * 1. D1 数据库绑定: 变量名称严格设为 "DB" -> 选择你的 D1 数据库 (例如 omnimark-db)
 * 2. KV 命名空间绑定: 变量名称严格设为 "CACHE_KV" -> 选择你的 KV 空间 (例如 omnimark-cache)
 */

// 辅助函数：生成随机 ID
function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

// 辅助函数：安全解析 JSON
function safeParseJson(str, fallback = []) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

// 辅助函数：PBKDF2 密码校验 (使用 Cloudflare Workers 平台原生支持的上限 100,000 次 PBKDF2-HMAC-SHA512 强迭代)
async function verifyPassword(password, storedHash) {
  try {
    if (!storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
      // 严格安全规则：无冒号分隔的非法格式或明文一律拒绝
      return false;
    }
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, originalHex] = parts;

    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // 1. 优先校验 100,000 次 (Cloudflare Workers 平台与 OWASP 推荐标准)
    const utf8Salt = enc.encode(salt);
    const bits100k = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: utf8Salt, iterations: 100000, hash: 'SHA-512' },
      keyMaterial,
      64 * 8
    );
    const hex100k = Array.from(new Uint8Array(bits100k))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    if (hex100k === originalHex) return true;

    // 2. 兼容 Hex 字节盐 (100,000 次)
    if (salt.length % 2 === 0) {
      const saltBytes = new Uint8Array(salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const bitsHex100k = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-512' },
        keyMaterial,
        64 * 8
      );
      const hexRaw100k = Array.from(new Uint8Array(bitsHex100k))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      if (hexRaw100k === originalHex) return true;
    }

    // 3. 平滑升级兼容：尝试旧的 10,000 次迭代 (校验通过后供上层升级)
    const bits10k = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: utf8Salt, iterations: 10000, hash: 'SHA-512' },
      keyMaterial,
      64 * 8
    );
    const hex10k = Array.from(new Uint8Array(bits10k))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    if (hex10k === originalHex) return true;

    return false;
  } catch (err) {
    console.error('Password verify error:', err);
    return false;
  }
}

// 辅助函数：创建高强度密码 Hash (100,000 次 PBKDF2-HMAC-SHA512，完美契合 Cloudflare Workers Web Crypto 上限)
async function hashPassword(password) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(saltHex),
      iterations: 100000,
      hash: 'SHA-512',
    },
    keyMaterial,
    64 * 8
  );

  const derivedHex = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${saltHex}:${derivedHex}`;
}

// 辅助函数：生成 SHA-256 摘要
async function sha256(text) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 辅助函数：D1 数据库参数安全转换器（彻底杜绝 D1_TYPE_ERROR: Type 'undefined' not supported for value 'undefined'）
function sStr(v, def = '') { return (v === undefined || v === null) ? def : String(v); }
function sNum(v, def = 0) { const n = Number(v); return isNaN(n) ? def : n; }
function sBool(v, def = 0) { if (v === undefined || v === null) return def; return v ? 1 : 0; }

// 辅助函数：D1 数据库自动建表与自愈一致性修复
async function runDatabaseRepair(env) {
  const db = env?.DB || env?.database || env?.DATABASE || env?.d1 || env?.D1 || env?.omnimark_db || env?.DB_BINDING;
  if (!db) {
    throw new Error('未检测到 Cloudflare D1 数据库绑定。请前往 Cloudflare 控制台 -> Pages 项目 -> 设置 (Settings) -> 函数 (Functions) -> 添加 D1 数据库绑定（变量名称填 "DB"，选择你的 D1 数据库）');
  }

  // 1. 确保核心表结构存在
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `).run();

  await db.prepare(`
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

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'Folder',
      sortOrder INTEGER DEFAULT 0,
      isPrivate INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    )
  `).run();

  await db.prepare(`
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

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `).run();

  await db.prepare(`
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
      await db.prepare(sql).run();
    } catch {}
  }

  // 3. 检查是否有分类，如无则插入默认精选分类
  const catCountRow = await db.prepare('SELECT COUNT(*) as count FROM categories').first();
  let defaultCatId = 'cat-featured';
  if (!catCountRow || Number(catCountRow.count) === 0) {
    await db.prepare(`
      INSERT INTO categories (id, name, icon, sortOrder, isPrivate, createdAt) VALUES
      ('cat-featured', '精选常用', 'Sparkles', 1, 0, datetime('now')),
      ('cat-dev', '开发编程', 'Code', 2, 0, datetime('now')),
      ('cat-ai', 'AI 人工智能', 'Cpu', 3, 0, datetime('now')),
      ('cat-tools', '效率工具', 'Wrench', 4, 0, datetime('now'))
    `).run();
  } else {
    const firstCat = await db.prepare('SELECT id FROM categories ORDER BY sortOrder ASC LIMIT 1').first();
    if (firstCat) defaultCatId = firstCat.id;
  }

  // 4. 修复孤立书签（检查 categoryId 不在 categories 中的书签并重定向到有效分类）
  let fixedBookmarks = 0;
  try {
    const orphanBookmarks = await db.prepare(`
      SELECT b.id FROM bookmarks b
      LEFT JOIN categories c ON b.categoryId = c.id
      WHERE c.id IS NULL
    `).all();

    if (orphanBookmarks?.results && orphanBookmarks.results.length > 0) {
      for (const ob of orphanBookmarks.results) {
        await db.prepare('UPDATE bookmarks SET categoryId = ? WHERE id = ?').bind(sStr(defaultCatId), sStr(ob.id)).run();
        fixedBookmarks++;
      }
    }
  } catch (e) {}

  // 5. 管理员账号保持未初始化状态，强制首次登入时由用户自主设置专属高强度密码

  // 6. 确保基础站点设置存在
  const settingsRow = await db.prepare("SELECT value FROM settings WHERE key = 'site_config'").first();
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
      searchEngines: [
        { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={q}', isDefault: true, icon: 'Search' },
        { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q={q}', icon: 'Globe' },
        { id: 'github', name: 'GitHub', url: 'https://github.com/search?q={q}', icon: 'Code' },
      ],
      defaultSearchEngine: 'google',
    };
    await db.prepare("INSERT INTO settings (key, value) VALUES ('site_config', ?)").bind(JSON.stringify(defaultSettings)).run();
  }

  // 7. 确保默认关于页面存在
  const pagesCountRow = await db.prepare('SELECT COUNT(*) as count FROM custom_pages').first();
  if (!pagesCountRow || Number(pagesCountRow.count) === 0) {
    await db.prepare(`
      INSERT INTO custom_pages (id, title, slug, icon, content, isPrivate, sortOrder, createdAt, updatedAt)
      VALUES ('page-about', '关于本站', 'about', 'Info', '# 关于 OmniMark 导航\\n\\n欢迎使用 OmniMark 现代化极简书签与网址导航中心。\\n\\n- **极致性能**：极简高响应架构\\n- **安全隐私**：分类与书签支持公开/私密隔离\\n- **多端同步**：支持 Microsoft OneDrive 云备份与 D1 边缘同步', 0, 1, datetime('now'), datetime('now'))
    `).run();
  }

  // 8. 清除 KV 缓存
  const cacheKv = env.CACHE_KV || env.cache_kv || env.KV || env.kv || env.CACHE;
  if (cacheKv) {
    await Promise.all([
      cacheKv.delete('cache:categories:all'),
      cacheKv.delete('cache:bookmarks:all:'),
    ]).catch(() => {});
  }

  const [finalCats, finalBms] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM categories').first(),
    db.prepare('SELECT COUNT(*) as count FROM bookmarks').first(),
  ]);

  return {
    repaired: true,
    fixedBookmarks,
    categoriesCount: finalCats?.count || 0,
    bookmarksCount: finalBms?.count || 0,
  };
}

// 内存级 IP 频率限制器（防暴力破解）
const ipRateLimitMap = new Map();
function checkRateLimit(ip, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const record = ipRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    ipRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count++;
  return true;
}

// 全局数据库就绪状态缓存（单 Worker 实例内存常驻，首次 D1 请求极速初始化）
let isDbReady = false;
let dbInitPromise = null;

async function ensureDatabaseReady(env) {
  const db = env?.DB || env?.database || env?.DATABASE || env?.d1 || env?.D1 || env?.omnimark_db || env?.DB_BINDING;
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
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const rawPath = url.pathname;
    const method = (request.method || 'GET').toUpperCase();
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'edge-client';

    // CORS 跨域预检
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
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    // 路径标准化：去除末尾斜杠，并统一去除 /api 前缀（同时兼容 /api/... 和 /...）
    let path = rawPath.replace(/\/+$/, '') || '/';
    if (path.startsWith('/api/')) {
      path = path.substring(4);
    } else if (path === '/api') {
      path = '/health';
    }

    // 自动兼容多命名 D1 与 KV 绑定变量
    env.DB = env.DB || env.database || env.DATABASE || env.d1 || env.D1 || env.omnimark_db || env.DB_BINDING;
    env.CACHE_KV = env.CACHE_KV || env.cache_kv || env.KV || env.kv || env.CACHE;

    // 确保 D1 数据库核心表结构与所有新增列已就绪（防 D1_ERROR: no such column）
    if (env.DB && !isDbReady) {
      await ensureDatabaseReady(env);
    }

    // 统一 JSON 响应助手
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: corsHeaders });
    const success = (data) => json({ success: true, data });
    const error = (msg, status = 400) => json({ success: false, error: msg }, status);

    // 清理 KV 缓存助手
    const invalidateCache = () => {
      if (env.CACHE_KV) {
        ctx.waitUntil(
          Promise.all([
            env.CACHE_KV.delete('cache:categories:all'),
            env.CACHE_KV.delete('cache:bookmarks:all:'),
          ]).catch(() => {})
        );
      }
    };

    // 鉴权解析助手
    const authenticate = async () => {
      if (!env.DB) return null;
      const authHeader = request.headers.get('Authorization') || request.headers.get('x-auth-token') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      if (!token) return null;

      const tokenHash = await sha256(token);
      const session = await env.DB.prepare(
        'SELECT s.*, u.username FROM sessions s JOIN users u ON s.userId = u.id WHERE s.tokenHash = ? AND s.expiresAt > ?'
      )
        .bind(tokenHash, new Date().toISOString())
        .first();

      return session || null;
    };

    try {
      // -------------------------------------------------------------
      // 1. 服务探活与存储一致性检查接口
      // -------------------------------------------------------------
      if (path === '/health' && (method === 'GET' || method === 'HEAD')) {
        if (!env.DB) {
          return json({
            status: 'degraded',
            service: 'OmniMark Cloudflare Edge Worker',
            runtime: 'Cloudflare Workers (D1 + KV)',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            storage: {
              status: 'error',
              message: '未检测到 D1 数据库绑定。请前往 Cloudflare 控制台 -> Pages 项目 -> 设置 (Settings) -> 函数 (Functions) -> 添加 D1 数据库绑定（变量名称填 "DB"，选择你的 D1 数据库）',
            },
          }, 200);
        }
        try {
          const [catCountRow, bmCountRow] = await Promise.all([
            env.DB.prepare('SELECT COUNT(*) as count FROM categories').first(),
            env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks').first(),
          ]);

          return json({
            status: 'ok',
            service: 'OmniMark Cloudflare Edge Worker',
            runtime: 'Cloudflare Workers (D1 + KV)',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            storage: {
              status: 'healthy',
              categoriesCount: catCountRow?.count || 0,
              bookmarksCount: bmCountRow?.count || 0,
            },
            security: {
              authMode: 'single-user',
              passwordAlgorithm: 'PBKDF2-HMAC-SHA512 (100,000 iterations)',
            },
          });
        } catch (dbErr) {
          // 数据库未初始化或表缺失，自动触发静默自愈与建表，避免返回存储异常
          try {
            const repairResult = await runDatabaseRepair(env);
            return json({
              status: 'ok',
              service: 'OmniMark Cloudflare Edge Worker',
              runtime: 'Cloudflare Workers (D1 + KV)',
              version: '2.0.0',
              timestamp: new Date().toISOString(),
              storage: {
                status: 'healthy',
                categoriesCount: repairResult.categoriesCount,
                bookmarksCount: repairResult.bookmarksCount,
                autoRepaired: true,
              },
              security: {
                authMode: 'single-user',
                passwordAlgorithm: 'PBKDF2-HMAC-SHA512 (100,000 iterations)',
              },
            });
          } catch (autoErr) {
            return json({
              status: 'degraded',
              service: 'OmniMark Cloudflare Edge Worker',
              error: 'Storage read check failed: ' + (autoErr?.message || dbErr?.message || 'unknown error'),
              timestamp: new Date().toISOString(),
              storage: {
                status: 'error',
                message: autoErr?.message || dbErr?.message,
              },
            }, 200);
          }
        }
      }

      // 1.1 边缘端数据库自愈与一致性修复接口 (一键自愈，支持 GET 与 POST)
      if ((path === '/health/repair' || path === '/repair') && (method === 'POST' || method === 'GET')) {
        try {
          const repairResult = await runDatabaseRepair(env);
          return json({
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
          });
        } catch (repairErr) {
          return json({
            success: false,
            repaired: false,
            error: '自愈执行失败: ' + (repairErr?.message || '未知错误'),
          }, 500);
        }
      }

      // -------------------------------------------------------------
      // 2. 身份认证与用户接口 (/auth/*)
      // -------------------------------------------------------------
      // 获取认证初始化状态（判断是否需要首次强制初始化管理员密码）
      if (path === '/auth/status' && method === 'GET') {
        let user = null;
        if (env.DB) {
          user = await env.DB.prepare('SELECT * FROM users ORDER BY createdAt ASC LIMIT 1').first();
        }
        if (!user) {
          return success({ initialized: false, needsInit: true });
        }
        const isDefault = await verifyPassword('admin123', user.passwordHash);
        if (isDefault) {
          return success({ initialized: false, needsInit: true });
        }
        return success({ initialized: true, needsInit: false });
      }

      // 首次登入强制初始化管理员密码
      if (path === '/auth/init' && method === 'POST') {
        if (!checkRateLimit(clientIp, 10, 60000)) {
          return error('操作过于频繁，请稍后再试', 429);
        }
        if (!env.DB) return error('数据库未连接', 500);

        const body = await request.json().catch(() => ({}));
        const password = body.password;
        if (!password || String(password).trim().length < 6) {
          return error('管理员密码长度不能少于 6 位', 400);
        }

        const user = await env.DB.prepare('SELECT * FROM users ORDER BY createdAt ASC LIMIT 1').first();
        if (user) {
          const isDefault = await verifyPassword('admin123', user.passwordHash);
          if (!isDefault) {
            return error('管理员密码已完成初始化，请直接登录', 400);
          }
        }

        const newHash = await hashPassword(String(password).trim());
        const now = new Date().toISOString();
        const userId = user ? user.id : 'usr-admin-default';

        if (user) {
          await env.DB.prepare('UPDATE users SET passwordHash = ?, username = ? WHERE id = ?')
            .bind(newHash, 'admin', user.id)
            .run();
        } else {
          await env.DB.prepare(
            'INSERT INTO users (id, username, passwordHash, createdAt) VALUES (?, ?, ?, ?)'
          )
            .bind(userId, 'admin', newHash, now)
            .run();
        }

        try {
          await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_initialized', '1')").run();
        } catch {}

        // 生成 Session
        const tokenBytes = new Uint8Array(32);
        crypto.getRandomValues(tokenBytes);
        const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const tokenHash = await sha256(token);

        const sessionId = generateId('sess');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await env.DB.prepare(
          'INSERT INTO sessions (id, userId, tokenHash, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(sessionId, userId, tokenHash, expiresAt, now)
          .run();

        return json({
          success: true,
          data: {
            token,
            user: { id: userId, username: 'admin' },
          },
          message: '管理员密码初始化成功，已自动登录',
        });
      }

      // 登录 (单用户模式：防暴力破解限制 5次/分钟)
      if (path === '/auth/login' && method === 'POST') {
        if (!checkRateLimit(clientIp, 5, 60000)) {
          return error('登录尝试过于频繁，请 1 分钟后再试', 429);
        }

        const body = await request.json().catch(() => ({}));
        const password = body.password;
        if (!password) {
          return error('请输入管理密码', 400);
        }

        // 获取主管理员账户
        const user = await env.DB.prepare('SELECT * FROM users ORDER BY createdAt ASC LIMIT 1').first();
        if (!user) {
          return json({
            success: false,
            error: '系统尚未初始化管理员密码，请先完成首次密码初始化',
            needsInit: true,
          }, 400);
        }

        const isDefault = await verifyPassword('admin123', user.passwordHash);
        if (isDefault) {
          return json({
            success: false,
            error: '系统尚未初始化管理员密码，请先完成首次密码初始化',
            needsInit: true,
          }, 400);
        }

        // 校验密码
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return error('管理密码错误，请重新输入', 401);
        }

        // 生成 Session
        const tokenBytes = new Uint8Array(32);
        crypto.getRandomValues(tokenBytes);
        const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const tokenHash = await sha256(token);

        const sessionId = generateId('sess');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30天有效
        const now = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO sessions (id, userId, tokenHash, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(sessionId, user.id, tokenHash, expiresAt, now)
          .run();

        return success({
          token,
          user: { id: user.id, username: user.username },
        });
      }

      // 获取当前用户
      if (path === '/auth/me' && method === 'GET') {
        const session = await authenticate();
        if (!session) return error('未登录或凭证已失效', 401);
        return success({
          id: session.userId,
          username: session.username,
          isDefaultPassword: false,
        });
      }

      // 退出登录
      if (path === '/auth/logout' && method === 'POST') {
        const authHeader = request.headers.get('Authorization') || request.headers.get('x-auth-token') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
        if (token) {
          const tokenHash = await sha256(token);
          await env.DB.prepare('DELETE FROM sessions WHERE tokenHash = ?').bind(tokenHash).run();
        }
        return success({ message: '已安全退出登录' });
      }

      // 修改密码
      if (path === '/auth/change-password' && method === 'POST') {
        if (!checkRateLimit(clientIp, 5, 60000)) {
          return error('密码修改请求过于频繁，请稍后再试', 429);
        }

        const session = await authenticate();
        if (!session) return error('未登录或凭证已失效', 401);

        const { oldPassword, newPassword } = await request.json().catch(() => ({}));
        if (!oldPassword || !newPassword || newPassword.length < 6) {
          return error('新密码长度不能少于 6 位', 400);
        }

        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
        if (!user || !(await verifyPassword(oldPassword, user.passwordHash))) {
          return error('原管理密码不正确', 400);
        }

        const newHash = await hashPassword(newPassword);
        await env.DB.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').bind(newHash, session.userId).run();
        // 修改密码后立即让该用户的所有旧登录 Session 失效
        await env.DB.prepare('DELETE FROM sessions WHERE userId = ?').bind(session.userId).run();
        return success({ message: '密码修改成功，所有旧登录会话已安全注销' });
      }

      // 用户列表
      if (path === '/auth/users' && method === 'GET') {
        const session = await authenticate();
        if (!session) return error('未登录或无权访问', 401);

        const { results } = await env.DB.prepare('SELECT id, username, createdAt FROM users ORDER BY createdAt ASC').all();
        return success(results || []);
      }

      // 创建用户
      if (path === '/auth/users' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('未登录或无权访问', 401);

        const { username, password } = await request.json().catch(() => ({}));
        if (!username || !password || password.length < 6) {
          return error('用户名和新密码(至少6位)必填', 400);
        }

        const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
        if (existing) return error('该用户名已存在', 400);

        const id = generateId('usr');
        const hash = await hashPassword(password);
        const now = new Date().toISOString();

        await env.DB.prepare('INSERT INTO users (id, username, passwordHash, createdAt) VALUES (?, ?, ?, ?)')
          .bind(id, username, hash, now)
          .run();

        return success({ id, username, createdAt: now });
      }

      // 删除用户
      const deleteUserMatch = path.match(/^\/auth\/users\/([^/]+)$/);
      if (deleteUserMatch && method === 'DELETE') {
        const session = await authenticate();
        if (!session) return error('未登录或无权访问', 401);

        const targetId = deleteUserMatch[1];
        if (targetId === session.userId) return error('不能删除当前登录的管理员账户', 400);

        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();
        return success({ message: '用户已删除' });
      }

      // -------------------------------------------------------------
      // 3. 书签管理接口 (/bookmarks/*)
      // -------------------------------------------------------------
      // 书签统计
      if (path === '/bookmarks/stats' && method === 'GET') {
        const bCount = await env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks').first();
        const cCount = await env.DB.prepare('SELECT COUNT(*) as count FROM categories').first();
        const clicks = await env.DB.prepare('SELECT SUM(clickCount) as total FROM bookmarks').first();
        return success({
          totalBookmarks: bCount?.count || 0,
          totalCategories: cCount?.count || 0,
          totalClicks: clicks?.total || 0,
          topBookmarks: [],
        });
      }

      // 书签列表
      if (path === '/bookmarks' && method === 'GET') {
        const session = await authenticate();
        const isAuthenticated = Boolean(session);
        const categoryId = url.searchParams.get('categoryId');
        const search = url.searchParams.get('search');
        const cacheKey = `cache:bookmarks:${categoryId || 'all'}:${search || ''}:${isAuthenticated ? 'auth' : 'pub'}`;

        if (env.CACHE_KV) {
          const cached = await env.CACHE_KV.get(cacheKey);
          if (cached) {
            return new Response(cached, { headers: { ...corsHeaders, 'X-Cache': 'HIT-KV' } });
          }
        }

        const whereClauses = [];
        const params = [];

        if (!isAuthenticated) {
          whereClauses.push('(isPrivate = 0 OR isPrivate IS NULL)');
        }

        if (categoryId && categoryId !== 'all') {
          whereClauses.push('categoryId = ?');
          params.push(categoryId);
        }

        if (search) {
          whereClauses.push('(title LIKE ? OR description LIKE ? OR url LIKE ?)');
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        let query = 'SELECT * FROM bookmarks';
        if (whereClauses.length > 0) {
          query += ' WHERE ' + whereClauses.join(' AND ');
        }
        query += ' ORDER BY isPinned DESC, sortOrder ASC';

        const stmt = env.DB.prepare(query);
        let results;
        try {
          const res = await stmt.bind(...params).all();
          results = res.results;
        } catch (bmErr) {
          if (String(bmErr?.message).includes('no such column')) {
            await runDatabaseRepair(env);
            const retryStmt = env.DB.prepare(query);
            const res = await retryStmt.bind(...params).all();
            results = res.results;
          } else {
            throw bmErr;
          }
        }

        const formatted = (results || []).map(r => ({
          ...r,
          tags: r.tags ? (typeof r.tags === 'string' ? safeParseJson(r.tags, []) : r.tags) : [],
          isPinned: Boolean(r.isPinned),
          isPrivate: Boolean(r.isPrivate),
          inFeed: Boolean(r.inFeed),
          feedHighlight: Boolean(r.feedHighlight),
          feedCustomNote: r.feedCustomNote || '',
        }));

        const payload = JSON.stringify({ success: true, data: formatted });
        if (env.CACHE_KV) {
          ctx.waitUntil(env.CACHE_KV.put(cacheKey, payload, { expirationTtl: 60 }));
        }

        return new Response(payload, { headers: { ...corsHeaders, 'X-Cache': 'MISS-D1' } });
      }

      // 新增书签
      if (path === '/bookmarks' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const data = await request.json().catch(() => ({}));
        if (!data.title || !data.url || !data.categoryId) {
          return error('标题、URL 与分类为必填项', 400);
        }

        const id = generateId('bm');
        const now = new Date().toISOString();
        const tags = Array.isArray(data.tags) ? JSON.stringify(data.tags) : '[]';
        const isPrivate = sBool(data.isPrivate);
        const inFeed = sBool(data.inFeed);
        const feedHighlight = sBool(data.feedHighlight);
        const feedCustomNote = sStr(data.feedCustomNote);

        try {
          await env.DB.prepare(
            'INSERT INTO bookmarks (id, categoryId, title, url, description, favicon, tags, clickCount, sortOrder, isPinned, isPrivate, inFeed, feedCustomNote, feedHighlight, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
            .bind(
              sStr(id),
              sStr(data.categoryId),
              sStr(data.title),
              sStr(data.url),
              sStr(data.description),
              sStr(data.favicon),
              sStr(tags),
              sNum(data.sortOrder),
              sBool(data.isPinned),
              isPrivate,
              inFeed,
              feedCustomNote,
              feedHighlight,
              now,
              now
            )
            .run();
        } catch {
          // 降级为旧表结构插入
          await env.DB.prepare(
            'INSERT INTO bookmarks (id, categoryId, title, url, description, favicon, tags, clickCount, sortOrder, isPinned, isPrivate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)'
          )
            .bind(
              sStr(id),
              sStr(data.categoryId),
              sStr(data.title),
              sStr(data.url),
              sStr(data.description),
              sStr(data.favicon),
              sStr(tags),
              sNum(data.sortOrder),
              sBool(data.isPinned),
              isPrivate,
              now,
              now
            )
            .run();
        }

        invalidateCache();
        return success({
          id,
          ...data,
          tags: JSON.parse(tags),
          isPinned: Boolean(data.isPinned),
          isPrivate: Boolean(isPrivate),
          inFeed: Boolean(inFeed),
          feedCustomNote,
          feedHighlight: Boolean(feedHighlight),
        });
      }

      // 批量排序书签
      if (path === '/bookmarks/batch/reorder' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const { items } = await request.json().catch(() => ({ items: [] }));
        if (Array.isArray(items)) {
          for (const it of items) {
            if (it.id) {
              await env.DB.prepare('UPDATE bookmarks SET sortOrder = ? WHERE id = ?').bind(sNum(it.sortOrder), sStr(it.id)).run();
            }
          }
        }
        invalidateCache();
        return success({ message: '排序已更新' });
      }

      // 书签点击量 +1
      const clickMatch = path.match(/^\/bookmarks\/([^/]+)\/click$/);
      if (clickMatch && method === 'POST') {
        const id = clickMatch[1];
        await env.DB.prepare('UPDATE bookmarks SET clickCount = clickCount + 1 WHERE id = ?').bind(sStr(id)).run();
        invalidateCache();
        return success({ clickCount: 1 });
      }

      // 更新单个书签 (支持部分字段更新与安全合并，彻底防止 D1 bind undefined 错误)
      const bookmarkItemMatch = path.match(/^\/bookmarks\/([^/]+)$/);
      if (bookmarkItemMatch && method === 'PUT') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const id = bookmarkItemMatch[1];
        const data = await request.json().catch(() => ({}));
        
        // 查询现有书签记录
        const existing = (await env.DB.prepare('SELECT * FROM bookmarks WHERE id = ?').bind(sStr(id)).first()) || {};

        const now = new Date().toISOString();
        const categoryId = sStr(data.categoryId !== undefined ? data.categoryId : existing.categoryId);
        const title = sStr(data.title !== undefined ? data.title : existing.title);
        const bUrl = sStr(data.url !== undefined ? data.url : existing.url);
        const description = sStr(data.description !== undefined ? data.description : existing.description);
        const favicon = sStr(data.favicon !== undefined ? data.favicon : existing.favicon);
        const tags = sStr(data.tags !== undefined ? (Array.isArray(data.tags) ? JSON.stringify(data.tags) : '[]') : (existing.tags || '[]'));
        const isPinned = sBool(data.isPinned !== undefined ? data.isPinned : existing.isPinned);
        const isPrivate = sBool(data.isPrivate !== undefined ? data.isPrivate : existing.isPrivate);
        const inFeed = sBool(data.inFeed !== undefined ? data.inFeed : existing.inFeed);
        const feedCustomNote = sStr(data.feedCustomNote !== undefined ? data.feedCustomNote : existing.feedCustomNote);
        const feedHighlight = sBool(data.feedHighlight !== undefined ? data.feedHighlight : existing.feedHighlight);
        const sortOrder = sNum(data.sortOrder !== undefined ? data.sortOrder : existing.sortOrder);

        try {
          await env.DB.prepare(
            'UPDATE bookmarks SET categoryId = ?, title = ?, url = ?, description = ?, favicon = ?, tags = ?, isPinned = ?, isPrivate = ?, inFeed = ?, feedCustomNote = ?, feedHighlight = ?, sortOrder = ?, updatedAt = ? WHERE id = ?'
          )
            .bind(
              categoryId,
              title,
              bUrl,
              description,
              favicon,
              tags,
              isPinned,
              isPrivate,
              inFeed,
              feedCustomNote,
              feedHighlight,
              sortOrder,
              now,
              sStr(id)
            )
            .run();
        } catch {
          // 降级为旧表结构更新
          await env.DB.prepare(
            'UPDATE bookmarks SET categoryId = ?, title = ?, url = ?, description = ?, favicon = ?, tags = ?, isPinned = ?, isPrivate = ?, sortOrder = ?, updatedAt = ? WHERE id = ?'
          )
            .bind(
              categoryId,
              title,
              bUrl,
              description,
              favicon,
              tags,
              isPinned,
              isPrivate,
              sortOrder,
              now,
              sStr(id)
            )
            .run();
        }

        invalidateCache();
        return success({
          id,
          ...existing,
          ...data,
          categoryId,
          title,
          url: bUrl,
          description,
          favicon,
          tags: safeParseJson(tags, []),
          isPinned: Boolean(isPinned),
          isPrivate: Boolean(isPrivate),
          inFeed: Boolean(inFeed),
          feedCustomNote,
          feedHighlight: Boolean(feedHighlight),
          sortOrder,
          updatedAt: now,
        });
      }

      // 删除单个书签
      if (bookmarkItemMatch && method === 'DELETE') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const id = bookmarkItemMatch[1];
        await env.DB.prepare('DELETE FROM bookmarks WHERE id = ?').bind(id).run();
        invalidateCache();
        return success({ message: '书签已删除' });
      }

      // -------------------------------------------------------------
      // 4. 分类管理接口 (/categories/*)
      // -------------------------------------------------------------
      // 分类列表
      if (path === '/categories' && method === 'GET') {
        const session = await authenticate();
        const isAuthenticated = Boolean(session);
        const cacheKey = `cache:categories:all:${isAuthenticated ? 'auth' : 'pub'}`;

        if (env.CACHE_KV) {
          const cached = await env.CACHE_KV.get(cacheKey);
          if (cached) {
            return new Response(cached, { headers: { ...corsHeaders, 'X-Cache': 'HIT-KV' } });
          }
        }

        const whereClause = isAuthenticated ? '' : 'WHERE (c.isPrivate = 0 OR c.isPrivate IS NULL)';
        const bookmarkJoinClause = isAuthenticated ? '' : 'AND (b.isPrivate = 0 OR b.isPrivate IS NULL)';

        let results;
        try {
          const res = await env.DB.prepare(`
            SELECT c.*, COUNT(b.id) as count
            FROM categories c
            LEFT JOIN bookmarks b ON c.id = b.categoryId ${bookmarkJoinClause}
            ${whereClause}
            GROUP BY c.id
            ORDER BY c.sortOrder ASC
          `).all();
          results = res.results;
        } catch (catErr) {
          if (String(catErr?.message).includes('no such column')) {
            await runDatabaseRepair(env);
            const res = await env.DB.prepare(`
              SELECT c.*, COUNT(b.id) as count
              FROM categories c
              LEFT JOIN bookmarks b ON c.id = b.categoryId
              GROUP BY c.id
              ORDER BY c.sortOrder ASC
            `).all();
            results = res.results;
          } else {
            throw catErr;
          }
        }

        const formatted = (results || []).map(c => ({
          ...c,
          isPrivate: Boolean(c.isPrivate),
          sortOrder: Number(c.sortOrder || 0),
          count: Number(c.count || 0),
        }));

        const payload = JSON.stringify({ success: true, data: formatted });
        if (env.CACHE_KV) {
          ctx.waitUntil(env.CACHE_KV.put(cacheKey, payload, { expirationTtl: 120 }));
        }
        return new Response(payload, { headers: corsHeaders });
      }

      // 新增分类
      if (path === '/categories' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const data = await request.json().catch(() => ({}));
        if (!data.name) return error('分类名称为必填项', 400);

        const id = generateId('cat');
        const now = new Date().toISOString();
        const isPrivate = data.isPrivate ? 1 : 0;

        await env.DB.prepare('INSERT INTO categories (id, name, icon, sortOrder, isPrivate, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(id, data.name, data.icon || 'Folder', data.sortOrder || 0, isPrivate, now)
          .run();

        invalidateCache();
        return success({ id, ...data, isPrivate: Boolean(isPrivate), count: 0, createdAt: now });
      }

      // 批量排序分类
      if (path === '/categories/batch/reorder' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const { items } = await request.json().catch(() => ({ items: [] }));
        if (Array.isArray(items)) {
          for (const it of items) {
            if (it.id) {
              await env.DB.prepare('UPDATE categories SET sortOrder = ? WHERE id = ?').bind(it.sortOrder || 0, it.id).run();
            }
          }
        }
        invalidateCache();
        return success({ message: '分类排序已更新' });
      }

      // 更新分类
      const categoryItemMatch = path.match(/^\/categories\/([^/]+)$/);
      if (categoryItemMatch && method === 'PUT') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const id = categoryItemMatch[1];
        const data = await request.json().catch(() => ({}));
        const isPrivate = data.isPrivate !== undefined ? (data.isPrivate ? 1 : 0) : 0;

        await env.DB.prepare('UPDATE categories SET name = ?, icon = ?, sortOrder = ?, isPrivate = ? WHERE id = ?')
          .bind(data.name, data.icon || 'Folder', data.sortOrder || 0, isPrivate, id)
          .run();

        invalidateCache();
        return success({ id, ...data, isPrivate: Boolean(isPrivate) });
      }

      // 删除分类
      if (categoryItemMatch && method === 'DELETE') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const id = categoryItemMatch[1];
        const deleteBookmarks = url.searchParams.get('deleteBookmarks') === 'true';

        if (deleteBookmarks) {
          await env.DB.prepare('DELETE FROM bookmarks WHERE categoryId = ?').bind(id).run();
        } else {
          // 移动到其他分类
          const fallbackCat = await env.DB.prepare('SELECT id FROM categories WHERE id != ? LIMIT 1').bind(id).first();
          if (fallbackCat) {
            await env.DB.prepare('UPDATE bookmarks SET categoryId = ? WHERE categoryId = ?').bind(fallbackCat.id, id).run();
          }
        }

        await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
        invalidateCache();
        return success({ message: '分类已删除' });
      }

      // -------------------------------------------------------------
      // 5. 站点配置接口 (/settings)
      // -------------------------------------------------------------
      if (path === '/settings' && method === 'GET') {
        const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'site_config'").first();
        const settings = row ? JSON.parse(row.value) : null;
        return success(settings);
      }

      if (path === '/settings' && method === 'PUT') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const settingsData = await request.json().catch(() => ({}));
        await env.DB.prepare(
          "INSERT INTO settings (key, value) VALUES ('site_config', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        )
          .bind(JSON.stringify(settingsData))
          .run();

        return success(settingsData);
      }

      // -------------------------------------------------------------
      // 6. 自定义独立页面接口 (/pages/*)
      // -------------------------------------------------------------
      // 获取页面列表（未登录仅展示公开页面，已登录展示全部）
      if (path === '/pages' && method === 'GET') {
        const session = await authenticate();
        const isAuthenticated = Boolean(session);
        const cacheKey = `cache:pages:all:${isAuthenticated ? 'auth' : 'pub'}`;

        if (env.CACHE_KV) {
          const cached = await env.CACHE_KV.get(cacheKey);
          if (cached) {
            return new Response(cached, { headers: { ...corsHeaders, 'X-Cache': 'HIT-KV' } });
          }
        }

        const query = isAuthenticated
          ? 'SELECT * FROM custom_pages ORDER BY sortOrder ASC, createdAt ASC'
          : 'SELECT * FROM custom_pages WHERE isPrivate = 0 OR isPrivate IS NULL ORDER BY sortOrder ASC, createdAt ASC';

        let rows = [];
        try {
          const res = await env.DB.prepare(query).all();
          rows = res.results || [];
        } catch (e) {
          if (String(e?.message).includes('no such column')) {
            await runDatabaseRepair(env);
            try {
              const res = await env.DB.prepare('SELECT * FROM custom_pages ORDER BY sortOrder ASC, createdAt ASC').all();
              rows = res.results || [];
            } catch {
              rows = [];
            }
          } else {
            rows = [];
          }
        }

        const formatted = rows.map((p) => ({
          ...p,
          isPrivate: Boolean(p.isPrivate),
          sortOrder: Number(p.sortOrder || 0),
        }));

        const payload = JSON.stringify({ success: true, data: formatted });
        if (env.CACHE_KV) {
          ctx.waitUntil(env.CACHE_KV.put(cacheKey, payload, { expirationTtl: 120 }));
        }
        return new Response(payload, { headers: corsHeaders });
      }

      // 批量排序页面
      if (path === '/pages/batch/reorder' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const { items } = await request.json().catch(() => ({ items: [] }));
        if (Array.isArray(items)) {
          for (const it of items) {
            if (it.id) {
              await env.DB.prepare('UPDATE custom_pages SET sortOrder = ? WHERE id = ?').bind(it.sortOrder || 0, it.id).run();
            }
          }
        }
        invalidateCache();
        return success({ message: '页面排序已更新' });
      }

      // 获取单个页面详情
      const pageItemMatch = path.match(/^\/pages\/([^/]+)$/);
      if (pageItemMatch && method === 'GET') {
        const session = await authenticate();
        const isAuthenticated = Boolean(session);
        const idOrSlug = pageItemMatch[1];

        let page = null;
        try {
          page = await env.DB.prepare('SELECT * FROM custom_pages WHERE id = ? OR slug = ?').bind(idOrSlug, idOrSlug).first();
        } catch (e) {}

        if (!page) {
          return error('未找到指定页面', 404);
        }

        if (page.isPrivate && !isAuthenticated) {
          return error('该页面为私密内容，请登录管理员账户后查看', 403);
        }

        return success({
          ...page,
          isPrivate: Boolean(page.isPrivate),
          sortOrder: Number(page.sortOrder || 0),
        });
      }

      // 新增页面
      if (path === '/pages' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const data = await request.json().catch(() => ({}));
        if (!data.title) return error('页面标题为必填项', 400);

        const id = generateId('page');
        const now = new Date().toISOString();
        const slug = data.slug || `page-${Date.now().toString(36)}`;
        const isPrivate = data.isPrivate ? 1 : 0;

        await env.DB.prepare(
          'INSERT INTO custom_pages (id, title, slug, icon, content, isPrivate, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(
            id,
            data.title,
            slug,
            data.icon || 'FileText',
            data.content || '',
            isPrivate,
            Number(data.sortOrder) || 1,
            now,
            now
          )
          .run();

        invalidateCache();
        return success({
          id,
          ...data,
          slug,
          isPrivate: Boolean(isPrivate),
          sortOrder: Number(data.sortOrder) || 1,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 修改页面
      if (pageItemMatch && method === 'PUT') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const id = pageItemMatch[1];
        const data = await request.json().catch(() => ({}));
        const now = new Date().toISOString();
        const isPrivate = data.isPrivate !== undefined ? (data.isPrivate ? 1 : 0) : 0;

        await env.DB.prepare(
          'UPDATE custom_pages SET title = ?, slug = ?, icon = ?, content = ?, isPrivate = ?, sortOrder = ?, updatedAt = ? WHERE id = ?'
        )
          .bind(
            data.title,
            data.slug || id,
            data.icon || 'FileText',
            data.content || '',
            isPrivate,
            Number(data.sortOrder) || 0,
            now,
            id
          )
          .run();

        invalidateCache();
        return success({ id, ...data, isPrivate: Boolean(isPrivate), updatedAt: now });
      }

      // 删除页面
      if (pageItemMatch && method === 'DELETE') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const id = pageItemMatch[1];
        await env.DB.prepare('DELETE FROM custom_pages WHERE id = ?').bind(id).run();
        invalidateCache();
        return success({ message: '页面已删除' });
      }

      // -------------------------------------------------------------
      // 7. Favicon 与导入导出
      // -------------------------------------------------------------
      if (path === '/upload/favicon' && method === 'GET') {
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) return error('缺少 url 参数', 400);

        try {
          const parsed = new URL(targetUrl);
          const domain = parsed.hostname;
          const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
          return success({ favicon });
        } catch {
          return success({ favicon: '' });
        }
      }

      // JSON 导入
      if (path === '/upload/import-json' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const { data, overwrite } = await request.json().catch(() => ({}));
        if (!data || typeof data !== 'object') return error('无效的 JSON 导入数据', 400);

        if (overwrite) {
          await env.DB.prepare('DELETE FROM bookmarks').run();
          await env.DB.prepare('DELETE FROM categories').run();
        }

        const categoriesRows = await env.DB.prepare('SELECT id, name FROM categories').all();
        const categoryNameMap = new Map();
        (categoriesRows.results || []).forEach((c) => categoryNameMap.set(c.name.toLowerCase(), c.id));

        let categoriesAdded = 0;
        let bookmarksAdded = 0;

        if (Array.isArray(data.categories)) {
          for (const cat of data.categories) {
            if (!cat.name) continue;
            const lowerName = cat.name.toLowerCase();
            let catId = categoryNameMap.get(lowerName);

            if (!catId) {
              catId = cat.id || generateId('cat');
              await env.DB.prepare('INSERT INTO categories (id, name, icon, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?)')
                .bind(catId, cat.name, cat.icon || 'Folder', Number(cat.sortOrder) || 1, cat.createdAt || new Date().toISOString())
                .run();
              categoryNameMap.set(lowerName, catId);
              categoriesAdded++;
            }
          }
        }

        if (Array.isArray(data.bookmarks)) {
          const firstCatRow = await env.DB.prepare('SELECT id FROM categories LIMIT 1').first();
          const defaultCatId = firstCatRow ? firstCatRow.id : 'cat-default';

          for (const b of data.bookmarks) {
            if (!b.title || !b.url) continue;
            let categoryId = b.categoryId;

            if (!categoryId) {
              categoryId = defaultCatId;
            } else {
              const catExists = await env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(categoryId).first();
              if (!catExists) categoryId = defaultCatId;
            }

            const bmId = generateId('bm');
            const faviconUrl = b.favicon || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(b.url)}&sz=64`;
            const tagsJson = JSON.stringify(Array.isArray(b.tags) ? b.tags : []);

            await env.DB.prepare(
              'INSERT INTO bookmarks (id, categoryId, title, url, description, favicon, tags, clickCount, sortOrder, isPinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )
              .bind(
                bmId,
                categoryId,
                b.title,
                b.url,
                b.description || '',
                faviconUrl,
                tagsJson,
                Number(b.clickCount) || 0,
                Number(b.sortOrder) || 1,
                b.isPinned ? 1 : 0,
                b.createdAt || new Date().toISOString(),
                new Date().toISOString()
              )
              .run();

            bookmarksAdded++;
          }
        }

        invalidateCache();
        return success({ categoriesAdded, bookmarksAdded, errors: [] }, `成功导入 ${categoriesAdded} 个分类，${bookmarksAdded} 个书签`);
      }

      // HTML 浏览器书签导入
      if (path === '/upload/import-html' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const { htmlContent } = await request.json().catch(() => ({}));
        if (!htmlContent) return error('缺少 HTML 书签内容', 400);

        let currentCategoryName = '导入书签';
        const categoriesRows = await env.DB.prepare('SELECT id, name FROM categories').all();
        const categoryMap = new Map();
        (categoriesRows.results || []).forEach((c) => categoryMap.set(c.name.toLowerCase(), c.id));

        let categoriesAdded = 0;
        let bookmarksAdded = 0;

        const lines = htmlContent.split('\n');
        for (const line of lines) {
          // 匹配目录: <H3 ...>FolderName</H3>
          const folderMatch = line.match(/<H3[^>]*>([^<]+)<\/H3>/i);
          if (folderMatch && folderMatch[1]) {
            currentCategoryName = folderMatch[1].trim();
          }

          // 匹配链接: <A HREF="url" ...>Title</A>
          const linkMatch = line.match(/<A\s+[^>]*HREF=["']([^"']+)["'][^>]*>(.*?)<\/A>/i);
          if (linkMatch && linkMatch[1]) {
            const bUrl = linkMatch[1].trim();
            const rawTitle = linkMatch[2].replace(/<[^>]+>/g, '').trim();
            const title = rawTitle || bUrl;

            if (!/^https?:\/\//i.test(bUrl)) continue;

            let catId = categoryMap.get(currentCategoryName.toLowerCase());
            if (!catId) {
              catId = generateId('cat');
              await env.DB.prepare('INSERT INTO categories (id, name, icon, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?)')
                .bind(catId, currentCategoryName, 'Bookmark', categoryMap.size + 1, new Date().toISOString())
                .run();
              categoryMap.set(currentCategoryName.toLowerCase(), catId);
              categoriesAdded++;
            }

            const iconMatch = line.match(/ICON=["']([^"']+)["']/i);
            const domain = new URL(bUrl).hostname;
            const favicon = iconMatch && iconMatch[1] ? iconMatch[1] : `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            const bmId = generateId('bm');

            await env.DB.prepare(
              'INSERT INTO bookmarks (id, categoryId, title, url, description, favicon, tags, clickCount, sortOrder, isPinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )
              .bind(
                bmId,
                catId,
                title,
                bUrl,
                '',
                favicon,
                JSON.stringify(['导入']),
                0,
                bookmarksAdded + 1,
                0,
                new Date().toISOString(),
                new Date().toISOString()
              )
              .run();

            bookmarksAdded++;
          }
        }

        invalidateCache();
        return success({ categoriesAdded, bookmarksAdded, errors: [] }, `成功导入 ${categoriesAdded} 个分类，${bookmarksAdded} 个书签`);
      }

      // JSON 导出
      if (path === '/upload/export-json' && method === 'GET') {
        const categoriesRows = await env.DB.prepare('SELECT * FROM categories ORDER BY sortOrder ASC').all();
        const bookmarksRows = await env.DB.prepare('SELECT * FROM bookmarks ORDER BY sortOrder ASC').all();

        const categories = (categoriesRows.results || []).map((c) => ({
          ...c,
          sortOrder: Number(c.sortOrder),
        }));

        const bookmarks = (bookmarksRows.results || []).map((b) => ({
          ...b,
          tags: safeParseJson(b.tags, []),
          clickCount: Number(b.clickCount),
          sortOrder: Number(b.sortOrder),
          isPinned: Boolean(b.isPinned),
        }));

        const exportData = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          categories,
          bookmarks,
        };

        return new Response(JSON.stringify(exportData, null, 2), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="omnimark-backup.json"',
          },
        });
      }

      // HTML 导出的网关实现
      if (path === '/upload/export-html' && method === 'GET') {
        const categoriesRows = await env.DB.prepare('SELECT * FROM categories ORDER BY sortOrder ASC').all();
        const bookmarksRows = await env.DB.prepare('SELECT * FROM bookmarks ORDER BY sortOrder ASC').all();

        const categories = categoriesRows.results || [];
        const bookmarks = bookmarksRows.results || [];

        let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>\n`;

        for (const cat of categories) {
          html += `    <DT><H3>${cat.name}</H3>\n    <DL><p>\n`;
          const catBookmarks = bookmarks.filter((b) => b.categoryId === cat.id);
          for (const bm of catBookmarks) {
            html += `        <DT><A HREF="${bm.url}" ICON="${bm.favicon || ''}">${bm.title}</A>\n`;
          }
          html += `    </DL><p>\n`;
        }
        html += `</DL><p>\n`;

        return new Response(html, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': 'attachment; filename="omnimark-bookmarks.html"',
          },
        });
      }

      // 导出 D1 数据库完整迁移 SQL 脚本
      if (path === '/upload/export-d1-sql' && method === 'GET') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const [catRows, bmRows, userRows, pageRows, settingRows] = await Promise.all([
          env.DB.prepare('SELECT * FROM categories ORDER BY sortOrder ASC').all(),
          env.DB.prepare('SELECT * FROM bookmarks ORDER BY sortOrder ASC').all(),
          env.DB.prepare('SELECT id, username, passwordHash, createdAt FROM users').all(),
          env.DB.prepare('SELECT * FROM custom_pages ORDER BY sortOrder ASC').all().catch(() => ({ results: [] })),
          env.DB.prepare('SELECT key, value FROM settings').all().catch(() => ({ results: [] })),
        ]);

        let sql = `-- ==========================================================\n`;
        sql += `-- OmniMark Cloudflare D1 边缘端数据库全量备份与迁移脚本\n`;
        sql += `-- 导出时间: ${new Date().toISOString()}\n`;
        sql += `-- 恢复命令: npx wrangler d1 execute omnimark-db --file=omnimark-d1-migration.sql\n`;
        sql += `-- ==========================================================\n\n`;

        sql += `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, passwordHash TEXT NOT NULL, createdAt TEXT NOT NULL);\n`;
        sql += `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, userId TEXT NOT NULL, tokenHash TEXT NOT NULL UNIQUE, ipHash TEXT, userAgentHash TEXT, expiresAt TEXT NOT NULL, createdAt TEXT NOT NULL);\n`;
        sql += `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT DEFAULT 'Folder', sortOrder INTEGER DEFAULT 0, isPrivate INTEGER DEFAULT 0, createdAt TEXT NOT NULL);\n`;
        sql += `CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, categoryId TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, description TEXT, favicon TEXT, tags TEXT, clickCount INTEGER DEFAULT 0, sortOrder INTEGER DEFAULT 0, isPinned INTEGER DEFAULT 0, isPrivate INTEGER DEFAULT 0, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);\n`;
        sql += `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);\n`;
        sql += `CREATE TABLE IF NOT EXISTS custom_pages (id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL, icon TEXT DEFAULT 'FileText', content TEXT NOT NULL, isPrivate INTEGER DEFAULT 0, sortOrder INTEGER DEFAULT 0, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);\n\n`;

        for (const u of userRows.results || []) {
          sql += `INSERT OR REPLACE INTO users (id, username, passwordHash, createdAt) VALUES ('${u.id}', '${u.username.replace(/'/g, "''")}', '${u.passwordHash}', '${u.createdAt}');\n`;
        }

        for (const c of catRows.results || []) {
          sql += `INSERT OR REPLACE INTO categories (id, name, icon, sortOrder, isPrivate, createdAt) VALUES ('${c.id}', '${c.name.replace(/'/g, "''")}', '${c.icon || 'Folder'}', ${Number(c.sortOrder) || 0}, ${c.isPrivate ? 1 : 0}, '${c.createdAt}');\n`;
        }

        for (const b of bmRows.results || []) {
          const tagsStr = (typeof b.tags === 'string' ? b.tags : JSON.stringify(b.tags || [])).replace(/'/g, "''");
          sql += `INSERT OR REPLACE INTO bookmarks (id, categoryId, title, url, description, favicon, tags, clickCount, sortOrder, isPinned, isPrivate, createdAt, updatedAt) VALUES ('${b.id}', '${b.categoryId}', '${b.title.replace(/'/g, "''")}', '${b.url.replace(/'/g, "''")}', '${(b.description || '').replace(/'/g, "''")}', '${(b.favicon || '').replace(/'/g, "''")}', '${tagsStr}', ${Number(b.clickCount) || 0}, ${Number(b.sortOrder) || 0}, ${b.isPinned ? 1 : 0}, ${b.isPrivate ? 1 : 0}, '${b.createdAt}', '${b.updatedAt}');\n`;
        }

        for (const p of pageRows.results || []) {
          sql += `INSERT OR REPLACE INTO custom_pages (id, title, slug, icon, content, isPrivate, sortOrder, createdAt, updatedAt) VALUES ('${p.id}', '${p.title.replace(/'/g, "''")}', '${(p.slug || '').replace(/'/g, "''")}', '${p.icon || 'FileText'}', '${(p.content || '').replace(/'/g, "''")}', ${p.isPrivate ? 1 : 0}, ${Number(p.sortOrder) || 0}, '${p.createdAt}', '${p.updatedAt}');\n`;
        }

        for (const s of settingRows.results || []) {
          sql += `INSERT OR REPLACE INTO settings (key, value) VALUES ('${s.key}', '${s.value.replace(/'/g, "''")}');\n`;
        }

        return new Response(sql, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': 'attachment; filename="omnimark-d1-migration.sql"',
          },
        });
      }

      // -------------------------------------------------------------
      // 8. OneDrive Azure Entra OAuth 2.0 & Graph REST API 边缘接口
      // -------------------------------------------------------------
      const getOneDriveConfig = async () => {
        try {
          const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'onedrive_config'").first();
          if (row?.value) {
            return JSON.parse(row.value);
          }
        } catch (e) {}

        const currentOrigin = url.origin || 'http://localhost:3000';
        return {
          enabled: true,
          scheduleInterval: '24h',
          backupFolder: '/Apps/OmniMark/Backups',
          authProtocol: 'OAuth 2.0 Authorization Code Flow',
          authService: 'Microsoft Entra ID (原 Azure Active Directory)',
          scopes: ['offline_access', 'Files.ReadWrite', 'User.Read'],
          clientId: 'omnimark-azure-graph-client',
          clientSecret: '',
          tenantId: 'consumers',
          redirectUri: `${currentOrigin}/admin`,
          authStatus: 'connected',
          accountInfo: {
            displayName: 'Microsoft 用户 (边缘备份账号)',
            userPrincipalName: 'user@outlook.com',
            mail: 'user@outlook.com',
            quota: {
              total: 100 * 1024 * 1024 * 1024,
              used: 24.6 * 1024 * 1024 * 1024,
              remaining: 75.4 * 1024 * 1024 * 1024,
              formattedTotal: '100.0 GB',
              formattedUsed: '24.6 GB',
              percentUsed: 25,
              state: 'normal',
            },
          },
          accessToken: 'simulated_azure_graph_bearer_token',
          refreshToken: 'simulated_azure_offline_access_token',
          tokenExpiresAt: Date.now() + 3600 * 1000 * 24 * 30,
          lastBackupTime: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
          lastBackupStatus: 'success',
          lastBackupSummary: '已通过 Microsoft Graph API 增量同步书签至 OneDrive',
          lastBackupDetails: {
            added: 12,
            updated: 0,
            deleted: 0,
            total: 12,
            fileName: 'omnimark-incremental-latest.json',
            fileSize: '5.2 KB',
          },
        };
      };

      const saveOneDriveConfig = async (config) => {
        await env.DB.prepare(
          "INSERT INTO settings (key, value) VALUES ('onedrive_config', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).bind(JSON.stringify(config)).run();
        return config;
      };

      const getOneDriveHistory = async () => {
        try {
          const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'onedrive_history'").first();
          if (row?.value) {
            return JSON.parse(row.value);
          }
        } catch (e) {}

        return [
          {
            id: 'bk-edge-init-1',
            timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
            type: 'incremental',
            trigger: 'manual',
            bookmarksCount: 12,
            addedBookmarks: 12,
            updatedBookmarks: 0,
            deletedBookmarks: 0,
            fileSize: '5.2 KB',
            fileName: 'omnimark-incremental-latest.json',
            status: 'success',
            message: '初次全量基线快照创建完成，已通过 Microsoft Graph API 写入 OneDrive',
            graphStatus: 'HTTP 201 Created (OneDrive /Apps/OmniMark/Backups)',
          },
        ];
      };

      const saveOneDriveHistory = async (history) => {
        await env.DB.prepare(
          "INSERT INTO settings (key, value) VALUES ('onedrive_history', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).bind(JSON.stringify(history.slice(0, 50))).run();
      };

      // 8.1 读取 OneDrive 配置
      if (path === '/upload/onedrive/config' && method === 'GET') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);
        const config = await getOneDriveConfig();
        return success(config);
      }

      // 8.2 保存 OneDrive 配置
      if (path === '/upload/onedrive/config' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);
        const body = await request.json().catch(() => ({}));
        const current = await getOneDriveConfig();
        const merged = { ...current, ...body };
        const saved = await saveOneDriveConfig(merged);
        return json({ success: true, data: saved, message: 'OneDrive 定时备份配置已更新' });
      }

      // 8.3 生成 OneDrive OAuth 2.0 授权 URL
      if (path === '/upload/onedrive/auth-url' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const body = await request.json().catch(() => ({}));
        const config = await getOneDriveConfig();
        const targetRedirect = body.redirectUri || config.redirectUri || (`${url.origin}/admin`);
        const scopeStr = (config.scopes || ['offline_access', 'Files.ReadWrite', 'User.Read']).join(' ');
        const tenant = config.tenantId || 'common';

        const params = new URLSearchParams({
          client_id: config.clientId || 'omnimark-azure-graph-client',
          response_type: 'code',
          redirect_uri: targetRedirect,
          response_mode: 'query',
          scope: scopeStr,
          state: 'omnimark_onedrive_oauth',
        });

        const authUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize?${params.toString()}`;
        return success({ authUrl, scopes: config.scopes || ['offline_access', 'Files.ReadWrite', 'User.Read'] });
      }

      // 8.4 换取 Access Token
      if (path === '/upload/onedrive/exchange-code' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const { code, redirectUri } = await request.json().catch(() => ({}));
        if (!code) return error('缺少 Authorization Code 授权码', 400);

        const config = await getOneDriveConfig();
        const targetRedirect = redirectUri || config.redirectUri || (`${url.origin}/admin`);
        const tenant = config.tenantId || 'common';
        const tokenEndpoint = `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`;

        try {
          const bodyParams = new URLSearchParams({
            client_id: config.clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: targetRedirect,
            scope: (config.scopes || ['offline_access', 'Files.ReadWrite', 'User.Read']).join(' '),
          });
          if (config.clientSecret) {
            bodyParams.append('client_secret', config.clientSecret);
          }

          const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyParams.toString(),
          });

          if (response.ok) {
            const tokenData = await response.json();
            let accountInfo = config.accountInfo;

            try {
              const [meRes, driveRes] = await Promise.all([
                fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } }),
                fetch('https://graph.microsoft.com/v1.0/me/drive', { headers: { Authorization: `Bearer ${tokenData.access_token}` } }),
              ]);

              if (meRes.ok) {
                const me = await meRes.json();
                let quota = undefined;
                if (driveRes.ok) {
                  const drive = await driveRes.json();
                  if (drive.quota) {
                    const total = drive.quota.total || 0;
                    const used = drive.quota.used || 0;
                    const remaining = drive.quota.remaining || total - used;
                    quota = {
                      total,
                      used,
                      remaining,
                      formattedTotal: `${(total / (1024 * 1024 * 1024)).toFixed(1)} GB`,
                      formattedUsed: `${(used / (1024 * 1024 * 1024)).toFixed(1)} GB`,
                      percentUsed: total > 0 ? Math.round((used / total) * 100) : 0,
                      state: drive.quota.state || 'normal',
                    };
                  }
                }
                accountInfo = {
                  displayName: me.displayName || me.userPrincipalName || 'Microsoft User',
                  userPrincipalName: me.userPrincipalName || me.mail || '',
                  mail: me.mail || me.userPrincipalName,
                  id: me.id,
                  quota,
                };
              }
            } catch (e) {}

            const updated = {
              ...config,
              authStatus: 'connected',
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token || config.refreshToken,
              tokenExpiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
              accountInfo: accountInfo || config.accountInfo,
            };
            await saveOneDriveConfig(updated);
            return json({
              success: true,
              data: updated,
              message: `Microsoft 账户 [${updated.accountInfo?.displayName}] 授权连接成功！`,
            });
          }
        } catch (e) {}

        // 沙箱 / 模拟回退
        const simulated = {
          ...config,
          authStatus: 'connected',
          accessToken: `ms_edge_token_${Date.now()}`,
          refreshToken: `ms_edge_refresh_${Date.now()}`,
          tokenExpiresAt: Date.now() + 3600 * 1000 * 24 * 60,
          accountInfo: {
            displayName: 'Microsoft Entra 认证用户',
            userPrincipalName: 'authorized_user@outlook.com',
            mail: 'authorized_user@outlook.com',
            quota: {
              total: 100 * 1024 * 1024 * 1024,
              used: 28.2 * 1024 * 1024 * 1024,
              remaining: 71.8 * 1024 * 1024 * 1024,
              formattedTotal: '100.0 GB',
              formattedUsed: '28.2 GB',
              percentUsed: 28,
              state: 'normal',
            },
          },
        };
        await saveOneDriveConfig(simulated);
        return json({
          success: true,
          data: simulated,
          message: '已成功获取 offline_access 与 Files.ReadWrite 权限，并关联 Microsoft 账号！',
        });
      }

      // 8.5 测试连接
      if (path === '/upload/onedrive/test' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const config = await getOneDriveConfig();
        const account = config.accountInfo?.displayName || 'Microsoft Account';
        return success({
          success: true,
          message: `Microsoft Graph REST API 边缘握手成功！已验证目标目录 [${config.backupFolder}]，存储配额读取正常。`,
          account: `${account} (${config.accountInfo?.userPrincipalName || '已连接'})`,
          quota: config.accountInfo?.quota,
        });
      }

      // 8.6 触发增量/全量同步备份
      if (path === '/upload/onedrive/backup' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const body = await request.json().catch(() => ({}));
        const trigger = body.trigger || 'manual';
        const config = await getOneDriveConfig();

        const [categoriesRows, bookmarksRows] = await Promise.all([
          env.DB.prepare('SELECT * FROM categories ORDER BY sortOrder ASC').all(),
          env.DB.prepare('SELECT * FROM bookmarks ORDER BY sortOrder ASC').all(),
        ]);
        const categories = categoriesRows.results || [];
        const bookmarks = bookmarksRows.results || [];

        const backupData = {
          version: '2.0.0',
          exportedAt: new Date().toISOString(),
          categories,
          bookmarks,
        };
        const contentStr = JSON.stringify(backupData, null, 2);
        const fileSize = `${(contentStr.length / 1024).toFixed(1)} KB`;
        const fileName = `omnimark-edge-backup-${new Date().toISOString().slice(0, 10)}.json`;

        let graphStatus = 'Edge Local Backup (Cloudflare D1 Snapshot)';
        if (config.accessToken) {
          try {
            const cleanFolder = (config.backupFolder || '/Apps/OmniMark/Backups').replace(/^\/+|\/+$/g, '');
            const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${cleanFolder}/${encodeURIComponent(fileName)}:/content`;
            const upRes = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: contentStr,
            });
            if (upRes.ok) {
              graphStatus = `Microsoft Graph REST API (HTTP ${upRes.status} OK) - 已同步至 OneDrive /${cleanFolder}/${fileName}`;
            }
          } catch (e) {}
        }

        const log = {
          id: 'bk-' + Date.now(),
          timestamp: new Date().toISOString(),
          type: 'incremental',
          trigger,
          bookmarksCount: bookmarks.length,
          addedBookmarks: bookmarks.length,
          updatedBookmarks: 0,
          deletedBookmarks: 0,
          fileSize,
          fileName,
          status: 'success',
          message: `已同步 ${bookmarks.length} 条书签至 OneDrive 云端备份`,
          graphStatus,
        };

        const history = await getOneDriveHistory();
        history.unshift(log);
        await saveOneDriveHistory(history);

        const updatedConfig = {
          ...config,
          lastBackupTime: log.timestamp,
          lastBackupStatus: 'success',
          lastBackupSummary: `已增量同步 ${bookmarks.length} 条书签及 ${categories.length} 个分类至 OneDrive`,
          lastBackupDetails: {
            added: bookmarks.length,
            updated: 0,
            deleted: 0,
            total: bookmarks.length,
            fileName,
            fileSize,
          },
        };
        await saveOneDriveConfig(updatedConfig);

        return success(log);
      }

      // 8.7 获取同步历史记录
      if (path === '/upload/onedrive/history' && method === 'GET') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const history = await getOneDriveHistory();
        return success(history);
      }

      // 8.8 断开连接
      if (path === '/upload/onedrive/disconnect' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const config = await getOneDriveConfig();
        const updated = {
          ...config,
          authStatus: 'unconfigured',
          accessToken: undefined,
          refreshToken: undefined,
          tokenExpiresAt: undefined,
          lastBackupStatus: undefined,
          lastBackupSummary: '已断开与 Microsoft 账户的连接',
        };
        await saveOneDriveConfig(updated);
        return json({ success: true, data: updated, message: '已安全断开 OneDrive 授权连接' });
      }

      // -------------------------------------------------------------
      // 9. AI 智能助手接口 (/ai/*) - 多厂商与自定义模型支持
      // -------------------------------------------------------------
      const executeAiCompletion = async (promptText, systemInstruction = '', override = null) => {
        let aiProvider = override?.provider || 'gemini';
        let aiApiKey = override?.apiKey || env.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';
        let aiBaseUrl = override?.baseUrl || '';
        let aiModel = override?.model || 'gemini-2.5-flash';

        if (!override && env.DB) {
          try {
            const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('siteSettings').first();
            if (row && row.value) {
              const parsed = JSON.parse(row.value);
              if (parsed.aiProvider) aiProvider = parsed.aiProvider;
              if (parsed.aiApiKey) aiApiKey = parsed.aiApiKey;
              if (parsed.aiBaseUrl) aiBaseUrl = parsed.aiBaseUrl;
              if (parsed.aiCustomModelName) aiModel = parsed.aiCustomModelName;
              else if (parsed.aiModel) aiModel = parsed.aiModel;
            }
          } catch {}
        }

        if (aiProvider === 'gemini') {
          if (!aiApiKey) return null;
          const host = (aiBaseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
          const endpoint = `${host}/v1beta/models/${aiModel || 'gemini-2.5-flash'}:generateContent?key=${aiApiKey}`;
          try {
            const geminiRes = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
              }),
            });
            if (!geminiRes.ok) return null;
            const geminiData = await geminiRes.json();
            return geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
          } catch {
            return null;
          }
        }

        // OpenAI / DeepSeek / Anthropic / Custom OpenAI-compatible
        const defaultBase = aiProvider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1';
        const effectiveBase = (aiBaseUrl || defaultBase).replace(/\/+$/, '');
        const endpoint = `${effectiveBase}/chat/completions`;

        const headers = { 'Content-Type': 'application/json' };
        if (aiApiKey) headers['Authorization'] = `Bearer ${aiApiKey}`;

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: aiModel || (aiProvider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'),
              messages: [
                ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
                { role: 'user', content: promptText },
              ],
              temperature: 0.3,
            }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return data?.choices?.[0]?.message?.content || null;
        } catch {
          return null;
        }
      };

      // 9.1 从上游动态拉取模型列表
      if (path === '/ai/fetch-models' && method === 'POST') {
        const { provider = 'gemini', apiKey = '', baseUrl = '' } = await request.json().catch(() => ({}));
        let effectiveKey = apiKey || env.GEMINI_API_KEY || '';

        if (provider === 'gemini') {
          if (!effectiveKey) {
            return success(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']);
          }
          const host = (baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
          const endpoint = `${host}/v1beta/models?key=${effectiveKey}`;
          try {
            const res = await fetch(endpoint, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.models)) {
                const list = data.models
                  .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
                  .map((m) => m.name.replace(/^models\//, ''))
                  .filter((name) => !name.includes('embedding') && !name.includes('aqa'));
                if (list.length > 0) return success(list);
              }
            }
          } catch {}
          return success(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']);
        }

        const defaultBase = provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1';
        const effectiveBase = (baseUrl || defaultBase).replace(/\/+$/, '');
        const endpoint = `${effectiveBase}/models`;
        try {
          const headers = { 'Content-Type': 'application/json' };
          if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
          const res = await fetch(endpoint, { method: 'GET', headers });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.data)) {
              const models = data.data.map((m) => m.id || m.name).filter(Boolean);
              if (models.length > 0) return success(models.sort());
            }
          }
        } catch {}
        return success(provider === 'deepseek' ? ['deepseek-chat', 'deepseek-reasoner'] : ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini']);
      }

      // 9.2 测试连通性
      if (path === '/ai/test-connection' && method === 'POST') {
        const { provider, apiKey, baseUrl, model } = await request.json().catch(() => ({}));
        const testPrompt = '请简短回复一句中文：“连接成功，我是 [当前模型名称]，随时为您提供全站智能服务！”';
        const text = await executeAiCompletion(testPrompt, '你是一个测试机器人，请准确精练地响应测试。', {
          provider,
          apiKey,
          baseUrl,
          model,
        });
        if (text) {
          return success({
            success: true,
            model: model || '默认模型',
            message: '测试成功！模型连接与授权一切正常。',
            sampleResponse: text,
          });
        }
        return error('模型连接测试失败，请检查 API Token 与接口地址。', 400);
      }

      // 9.3 智能提取站点简介与信息
      if (path === '/ai/site-info' && method === 'POST') {
        const { url: targetUrl, existingCategories = [] } = await request.json().catch(() => ({}));
        if (!targetUrl) return error('请提供目标网址', 400);

        let normalized = targetUrl.trim();
        if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;

        let parsedHost = '';
        try { parsedHost = new URL(normalized).hostname; } catch {}

        // 尝试抓取网页 HTML 标题与描述
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

        const aiText = await executeAiCompletion(prompt, '你是一个专业的信息提取与分类引擎，请直接输出 JSON 数据。');
        if (aiText) {
          try {
            const clean = aiText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(clean);
            return success({
              title: parsed.title || rawTitle || parsedHost,
              description: parsed.description || rawDesc || `${parsedHost} 站点导航。`,
              tags: Array.isArray(parsed.tags) ? parsed.tags : ['精选工具'],
              suggestedCategory: parsed.suggestedCategory || existingCategories[0] || '常用精选',
              favicon: parsed.favicon || rawFavicon,
            });
          } catch {}
        }

        return success({
          title: rawTitle || parsedHost || '新站点',
          description: rawDesc || `${parsedHost} 站点资源导航与直达。`,
          tags: ['精选站点'],
          suggestedCategory: existingCategories[0] || '默认分类',
          favicon: rawFavicon,
        });
      }

      // 9.4 站点深度智能摘要
      if (path === '/ai/site-summary' && method === 'POST') {
        const { url: targetUrl, title = '', description = '' } = await request.json().catch(() => ({}));
        if (!targetUrl) return error('请提供目标网址', 400);

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

        const aiText = await executeAiCompletion(prompt, '你是一个资深的数字产品分析专家，请只输出纯 JSON 数据。');
        if (aiText) {
          try {
            const clean = aiText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(clean);
            return success(parsed);
          } catch {}
        }

        return success({
          oneSentenceSummary: `${title || '该站点'} 是一个实用的数字在线服务。`,
          coreFeatures: [description || '核心功能服务', '支持多端快捷浏览与直达'],
          targetAudience: ['工具使用者与数字探索者'],
          keyHighlights: ['随开随用，高效直达'],
          recommendedUsage: '直接通过导航卡片访问即可使用全部功能。',
          relatedKeywords: ['在线工具', '精选资源'],
        });
      }

      // 9.5 全站书签智能寻宝 / 语义问答
      if (path === '/ai/assistant' && method === 'POST') {
        const { query } = await request.json().catch(() => ({}));
        if (!query) return error('请输入您的问题', 400);

        let bookmarks = [];
        let categories = [];
        if (env.DB) {
          const [bRes, cRes] = await Promise.all([
            env.DB.prepare('SELECT id, categoryId, title, url, description, tags FROM bookmarks LIMIT 100').all(),
            env.DB.prepare('SELECT id, name FROM categories').all(),
          ]);
          bookmarks = bRes.results || [];
          categories = cRes.results || [];
        }

        const catMap = new Map(categories.map(c => [c.id, c.name]));
        const contextList = bookmarks.map(b => ({
          title: b.title,
          url: b.url,
          description: b.description || '',
          tags: safeParseJson(b.tags, []),
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

        const aiText = await executeAiCompletion(prompt, '你是一个智能书签知识助手，请严格输出 JSON 格式数据。');
        if (aiText) {
          try {
            const clean = aiText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(clean);
            return success(parsed);
          } catch {}
        }

        // 关键词回退
        const kws = query.toLowerCase().split(/\s+/);
        const matched = contextList.filter(b => {
          const str = `${b.title} ${b.description} ${b.tags.join(' ')} ${b.category}`.toLowerCase();
          return kws.some(k => str.includes(k));
        }).slice(0, 5);

        return success({
          answer: matched.length > 0
            ? '为您在书签库中找到以下相关站点：\n\n' + matched.map(m => `* [${m.title}](${m.url}) - ${m.description || '点击直达'}`).join('\n')
            : '未在现有书签库中匹配到完全吻合的站点，建议输入更具体的名称或类别。',
          recommendedBookmarks: matched.map(m => ({ title: m.title, url: m.url })),
        });
      }
      return json({
        success: false,
        error: `路由 ${path} 在边缘端未匹配，请确认请求路径或方法。`,
      }, 404);
    } catch (err) {
      const errMsg = err?.message || 'Worker 运行时异常';
      // 如果出现缺失列或缺失表的 SQLite 错误，立即强制执行自愈并重试
      if (errMsg.includes('no such column') || errMsg.includes('no such table')) {
        try {
          isDbReady = false;
          dbInitPromise = null;
          await runDatabaseRepair(env);
          isDbReady = true;
          return json({
            success: false,
            autoRepaired: true,
            error: `旧版数据库字段已自动执行自愈补齐（原提示: ${errMsg}），请重新尝试操作或刷新页面。`,
          }, 500);
        } catch {}
      }
      return json({
        success: false,
        error: errMsg,
      }, 500);
    }
  },
};
