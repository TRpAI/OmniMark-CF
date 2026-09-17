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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
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
      'Content-Type': 'application/json',
    };

    try {
      // 1. Health check
      if (path === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', runtime: 'Cloudflare Workers (D1 + KV)' }), {
          headers: corsHeaders,
        });
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
          params.push(categoryId);
        }

        query += ' ORDER BY isPinned DESC, sortOrder ASC';
        const stmt = env.DB.prepare(query);
        const { results } = await stmt.bind(...params).all();

        const formatted = results.map((r: any) => ({
          ...r,
          tags: r.tags ? JSON.parse(r.tags) : [],
          isPinned: Boolean(r.isPinned),
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
        await env.DB.prepare('UPDATE bookmarks SET clickCount = clickCount + 1 WHERE id = ?').bind(id).run();
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
