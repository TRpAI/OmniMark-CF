/**
 * OmniMark - Cloudflare Worker Backend (Vanilla ES Module)
 * 可直接在 Cloudflare 控制面板的在线代码编辑器中粘贴运行！
 * 
 * 需在 Worker 的 设置 (Settings) -> 变量与绑定 (Variables and Bindings) 中配置：
 * 1. D1 数据库绑定: 变量名称 "DB" -> 选择你的 D1 数据库 (如 omnimark-db)
 * 2. KV 命名空间绑定: 变量名称 "CACHE_KV" -> 选择你的 KV 空间 (如 omnimark-cache)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 跨域预检处理
    if (request.method === 'OPTIONS') {
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

    try {
      // 1. 服务探活接口
      if (path === '/api/health') {
        return new Response(JSON.stringify({ 
          status: 'ok', 
          service: 'OmniMark Cloudflare Edge Worker',
          runtime: 'Cloudflare Workers (D1 + KV)',
          timestamp: new Date().toISOString()
        }), {
          headers: corsHeaders,
        });
      }

      // 2. 书签列表 (支持 KV 缓存加速与 D1 查询)
      if (path === '/api/bookmarks' && request.method === 'GET') {
        const categoryId = url.searchParams.get('categoryId');
        const search = url.searchParams.get('search');
        const cacheKey = `cache:bookmarks:${categoryId || 'all'}:${search || ''}`;

        // 优先读取 KV 缓存
        if (env.CACHE_KV) {
          const cached = await env.CACHE_KV.get(cacheKey);
          if (cached) {
            return new Response(cached, {
              headers: { ...corsHeaders, 'X-Cache': 'HIT-KV' },
            });
          }
        }

        // D1 数据库查询
        let query = 'SELECT * FROM bookmarks';
        const params = [];

        if (categoryId && categoryId !== 'all') {
          query += ' WHERE categoryId = ?';
          params.push(categoryId);
        }

        query += ' ORDER BY isPinned DESC, sortOrder ASC';
        const stmt = env.DB.prepare(query);
        const { results } = await stmt.bind(...params).all();

        const formatted = (results || []).map((r) => ({
          ...r,
          tags: r.tags ? JSON.parse(r.tags) : [],
          isPinned: Boolean(r.isPinned),
        }));

        const responsePayload = JSON.stringify({ success: true, data: formatted });

        // 异步写入 KV 缓存 (有效时间 60 秒)
        if (env.CACHE_KV) {
          ctx.waitUntil(env.CACHE_KV.put(cacheKey, responsePayload, { expirationTtl: 60 }));
        }

        return new Response(responsePayload, {
          headers: { ...corsHeaders, 'X-Cache': 'MISS-D1' },
        });
      }

      // 3. 分类列表 (支持 KV 缓存)
      if (path === '/api/categories' && request.method === 'GET') {
        const cacheKey = 'cache:categories:all';
        if (env.CACHE_KV) {
          const cached = await env.CACHE_KV.get(cacheKey);
          if (cached) {
            return new Response(cached, { 
              headers: { ...corsHeaders, 'X-Cache': 'HIT-KV' } 
            });
          }
        }

        const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sortOrder ASC').all();
        const payload = JSON.stringify({ success: true, data: results || [] });

        if (env.CACHE_KV) {
          ctx.waitUntil(env.CACHE_KV.put(cacheKey, payload, { expirationTtl: 120 }));
        }
        return new Response(payload, { headers: corsHeaders });
      }

      // 4. 书签点击量统计 (+1) 并自动清理 KV 缓存
      const clickMatch = path.match(/^\/api\/bookmarks\/([^/]+)\/click$/);
      if (clickMatch && request.method === 'POST') {
        const id = clickMatch[1];
        await env.DB.prepare('UPDATE bookmarks SET clickCount = clickCount + 1 WHERE id = ?').bind(id).run();
        
        // 清理缓存
        if (env.CACHE_KV) {
          ctx.waitUntil(env.CACHE_KV.delete('cache:bookmarks:all:'));
        }
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // 5. 站点配置
      if (path === '/api/settings' && request.method === 'GET') {
        const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'site_config'").first();
        const settings = row ? JSON.parse(row.value) : null;
        return new Response(JSON.stringify({ success: true, data: settings }), { headers: corsHeaders });
      }

      // 其他接口路由
      return new Response(JSON.stringify({ 
        success: false, 
        error: `路由 ${path} 在边缘端未匹配，请确认请求方法或使用完整全功能后端。` 
      }), {
        status: 404,
        headers: corsHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: err.message || 'Worker 运行时异常' 
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
