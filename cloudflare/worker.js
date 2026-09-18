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

// 辅助函数：PBKDF2 密码校验 (使用 OWASP 推荐的 210,000 次 PBKDF2-HMAC-SHA512 迭代，无明文 fallback)
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

    // 1. 优先校验 210,000 次 (新标准)
    const utf8Salt = enc.encode(salt);
    const bits210k = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: utf8Salt, iterations: 210000, hash: 'SHA-512' },
      keyMaterial,
      64 * 8
    );
    const hex210k = Array.from(new Uint8Array(bits210k))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    if (hex210k === originalHex) return true;

    // 2. 兼容 Hex 字节盐 (210,000 次)
    if (salt.length % 2 === 0) {
      const saltBytes = new Uint8Array(salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const bitsHex210k = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: saltBytes, iterations: 210000, hash: 'SHA-512' },
        keyMaterial,
        64 * 8
      );
      const hexRaw210k = Array.from(new Uint8Array(bitsHex210k))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      if (hexRaw210k === originalHex) return true;
    }

    // 3. 平滑升级兼容：尝试旧的 10,000 次迭代 (校验通过后供上层异步升级成 210k)
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

// 辅助函数：创建高强度密码 Hash (210,000 次 PBKDF2-HMAC-SHA512)
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
      iterations: 210000,
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const rawPath = url.pathname;
    const method = request.method;
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

    // 路径标准化：同时兼容 /api/... 和 /... 两种请求格式
    const path = rawPath.startsWith('/api/') ? rawPath.substring(4) : rawPath;

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
      if (path === '/health' && method === 'GET') {
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
              passwordAlgorithm: 'PBKDF2-HMAC-SHA512 (210,000 iterations)',
            },
          });
        } catch (dbErr) {
          return json({
            status: 'degraded',
            service: 'OmniMark Cloudflare Edge Worker',
            error: 'Storage read check failed: ' + (dbErr?.message || 'unknown error'),
            timestamp: new Date().toISOString(),
          }, 500);
        }
      }

      // -------------------------------------------------------------
      // 2. 身份认证与用户接口 (/auth/*)
      // -------------------------------------------------------------
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

        // 获取主管理员账户（默认 admin 或首个账号）
        let user = await env.DB.prepare('SELECT * FROM users ORDER BY createdAt ASC LIMIT 1').first();

        // 如果数据库尚未初始化账号，自动补全首个主账号
        if (!user) {
          const freshHash = await hashPassword('admin123');
          const userId = 'usr-admin-default';
          await env.DB.prepare(
            'INSERT INTO users (id, username, passwordHash, createdAt) VALUES (?, ?, ?, ?)'
          )
            .bind(userId, 'admin', freshHash, new Date().toISOString())
            .run();

          user = { id: userId, username: 'admin', passwordHash: freshHash };
        }

        // 校验密码
        let isValid = await verifyPassword(password, user.passwordHash);

        // 如果默认 admin123 首次初始化，或验证通过后自动升级 Hash 为 210,000 次 OWASP 标准
        if (isValid) {
          const updatedHash = await hashPassword(password);
          await env.DB.prepare('UPDATE users SET passwordHash = ? WHERE id = ?')
            .bind(updatedHash, user.id)
            .run();
        } else {
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
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
        const isDefaultPassword = user ? await verifyPassword('admin123', user.passwordHash) : false;
        return success({
          id: session.userId,
          username: session.username,
          isDefaultPassword,
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
        const categoryId = url.searchParams.get('categoryId');
        const search = url.searchParams.get('search');
        const cacheKey = `cache:bookmarks:${categoryId || 'all'}:${search || ''}`;

        if (env.CACHE_KV) {
          const cached = await env.CACHE_KV.get(cacheKey);
          if (cached) {
            return new Response(cached, { headers: { ...corsHeaders, 'X-Cache': 'HIT-KV' } });
          }
        }

        let query = 'SELECT * FROM bookmarks';
        const params = [];

        if (categoryId && categoryId !== 'all') {
          query += ' WHERE categoryId = ?';
          params.push(categoryId);
        }

        query += ' ORDER BY isPinned DESC, sortOrder ASC';
        const stmt = env.DB.prepare(query);
        const { results } = await stmt.bind(...params).all();

        const formatted = (results || []).map(r => ({
          ...r,
          tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [],
          isPinned: Boolean(r.isPinned),
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

        await env.DB.prepare(
          'INSERT INTO bookmarks (id, categoryId, title, url, description, favicon, tags, clickCount, sortOrder, isPinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)'
        )
          .bind(
            id,
            data.categoryId,
            data.title,
            data.url,
            data.description || '',
            data.favicon || '',
            tags,
            data.sortOrder || 0,
            data.isPinned ? 1 : 0,
            now,
            now
          )
          .run();

        invalidateCache();
        return success({ id, ...data, tags: JSON.parse(tags), isPinned: Boolean(data.isPinned) });
      }

      // 批量排序书签
      if (path === '/bookmarks/batch/reorder' && method === 'POST') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const { items } = await request.json().catch(() => ({ items: [] }));
        if (Array.isArray(items)) {
          for (const it of items) {
            if (it.id) {
              await env.DB.prepare('UPDATE bookmarks SET sortOrder = ? WHERE id = ?').bind(it.sortOrder || 0, it.id).run();
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
        await env.DB.prepare('UPDATE bookmarks SET clickCount = clickCount + 1 WHERE id = ?').bind(id).run();
        invalidateCache();
        return success({ clickCount: 1 });
      }

      // 更新单个书签
      const bookmarkItemMatch = path.match(/^\/bookmarks\/([^/]+)$/);
      if (bookmarkItemMatch && method === 'PUT') {
        const session = await authenticate();
        if (!session) return error('请先登录', 401);

        const id = bookmarkItemMatch[1];
        const data = await request.json().catch(() => ({}));
        const now = new Date().toISOString();
        const tags = Array.isArray(data.tags) ? JSON.stringify(data.tags) : JSON.stringify([]);

        await env.DB.prepare(
          'UPDATE bookmarks SET categoryId = ?, title = ?, url = ?, description = ?, favicon = ?, tags = ?, isPinned = ?, sortOrder = ?, updatedAt = ? WHERE id = ?'
        )
          .bind(
            data.categoryId,
            data.title,
            data.url,
            data.description || '',
            data.favicon || '',
            tags,
            data.isPinned ? 1 : 0,
            data.sortOrder || 0,
            now,
            id
          )
          .run();

        invalidateCache();
        return success({ id, ...data });
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
        const cacheKey = 'cache:categories:all';
        if (env.CACHE_KV) {
          const cached = await env.CACHE_KV.get(cacheKey);
          if (cached) {
            return new Response(cached, { headers: { ...corsHeaders, 'X-Cache': 'HIT-KV' } });
          }
        }

        const { results } = await env.DB.prepare(`
          SELECT c.*, COUNT(b.id) as count
          FROM categories c
          LEFT JOIN bookmarks b ON c.id = b.categoryId
          GROUP BY c.id
          ORDER BY c.sortOrder ASC
        `).all();

        const payload = JSON.stringify({ success: true, data: results || [] });
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

        await env.DB.prepare('INSERT INTO categories (id, name, icon, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?)')
          .bind(id, data.name, data.icon || 'Folder', data.sortOrder || 0, now)
          .run();

        invalidateCache();
        return success({ id, ...data, count: 0, createdAt: now });
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

        await env.DB.prepare('UPDATE categories SET name = ?, icon = ?, sortOrder = ? WHERE id = ?')
          .bind(data.name, data.icon || 'Folder', data.sortOrder || 0, id)
          .run();

        invalidateCache();
        return success({ id, ...data });
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
      // 6. Favicon 与导入导出
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
      return json({
        success: false,
        error: `路由 ${path} 在边缘端未匹配，请确认请求路径或方法。`,
      }, 404);
    } catch (err) {
      return json({
        success: false,
        error: err.message || 'Worker 运行时异常',
      }, 500);
    }
  },
};
