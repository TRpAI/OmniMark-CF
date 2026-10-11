import fs from 'fs';
import path from 'path';
import { bookmarkRepository } from '../repositories/bookmark.repository';

export interface RealFeedItem {
  id: string;
  source: string;
  sourceUrl: string;
  sourceFavicon?: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  relativeTime: string;
  tags: string[];
  readTime?: string;
  views?: number;
  likes?: number;
  isHot?: boolean;
  isFeatured?: boolean;
}

const CACHE_FILE_PATH = path.resolve(process.cwd(), 'data', 'feed-cache.json');
let cachedFeedItems: RealFeedItem[] = [];
let lastFetchedTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / (60 * 1000));
    if (minutes < 5) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    return dateStr.slice(0, 10);
  } catch {
    return '近期更新';
  }
}

function cleanHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseXmlFeed(xmlText: string, sourceName: string, sourceUrl: string, favicon: string, defaultTags: string[] = ['科技动态']): RealFeedItem[] {
  const items: RealFeedItem[] = [];
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || xmlText.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const itemXml of itemMatches.slice(0, 8)) {
    const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
    const title = cleanHtml((titleMatch?.[1] || titleMatch?.[2] || '').trim());
    if (!title) continue;

    const linkMatch =
      itemXml.match(/<link[^>]*href=["']([^"']+)["']/i) ||
      itemXml.match(/<link[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
    const url = (linkMatch?.[1] || linkMatch?.[2] || sourceUrl).trim();

    const descMatch =
      itemXml.match(/<description[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i) ||
      itemXml.match(/<summary[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/summary>/i) ||
      itemXml.match(/<content[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/content>/i);
    const summary = cleanHtml((descMatch?.[1] || descMatch?.[2] || '').slice(0, 240));

    const dateMatch =
      itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
      itemXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
      itemXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
    const pubDateStr = dateMatch?.[1]?.trim() || new Date().toISOString();
    const dateObj = new Date(pubDateStr);
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

    const tags: string[] = [];
    const catMatches = itemXml.match(/<category[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/category>/gi) || [];
    for (const catXml of catMatches.slice(0, 3)) {
      const c = cleanHtml(catXml.replace(/<\/?category[^>]*>/gi, ''));
      if (c && c.length < 20) tags.push(c);
    }

    items.push({
      id: `feed-${Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`,
      source: sourceName,
      sourceUrl,
      sourceFavicon: favicon,
      title,
      summary: summary || `${sourceName} 最新官方动态与真实资讯。`,
      url,
      publishedAt: validDate.toISOString().replace('T', ' ').slice(0, 16),
      relativeTime: formatRelativeTime(validDate.toISOString()),
      tags: tags.length > 0 ? tags : defaultTags,
      readTime: '3 分钟阅读',
      views: Math.floor(Math.random() * 300 + 100),
      likes: Math.floor(Math.random() * 40 + 10),
      isHot: items.length === 0,
      isFeatured: items.length === 0,
    });
  }

  return items;
}

export class FeedService {
  constructor() {
    this.loadDiskCache();
  }

  private loadDiskCache(): void {
    try {
      if (fs.existsSync(CACHE_FILE_PATH)) {
        const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedFeedItems = parsed;
          lastFetchedTime = Date.now() - 60000; // ready
        }
      }
    } catch (e) {
      console.warn('[FeedService] Failed to load disk feed cache:', e);
    }
  }

  private saveDiskCache(items: RealFeedItem[]): void {
    try {
      const dir = path.dirname(CACHE_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(items, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[FeedService] Failed to save disk feed cache:', e);
    }
  }

  async getLiveFeed(forceRefresh = false): Promise<RealFeedItem[]> {
    const now = Date.now();
    if (!forceRefresh && cachedFeedItems.length > 0 && now - lastFetchedTime < CACHE_TTL_MS) {
      return cachedFeedItems;
    }

    const aggregated: RealFeedItem[] = [];

    // 1. Fetch real Sspai (少数派) live RSS (高质量中文科技生活与数字工具)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const res = await fetch('https://sspai.com/feed', {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const xml = await res.text();
        const parsed = parseXmlFeed(
          xml,
          '少数派',
          'https://sspai.com',
          'https://sspai.com/favicon.ico',
          ['生产力', '数字生活', '科技数码']
        );
        aggregated.push(...parsed);
      }
    } catch (e) {
      console.warn('[FeedService] Sspai fetch notice:', (e as any)?.message);
    }

    // 2. Fetch real V2EX hot topics public API (热门程序员技术社区)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const res = await fetch('https://www.v2ex.com/api/topics/hot.json', {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const v2Topics = (await res.json()) as any[];
        if (Array.isArray(v2Topics)) {
          for (const item of v2Topics.slice(0, 8)) {
            if (!item.title) continue;
            const pubDate = item.created ? new Date(item.created * 1000).toISOString() : new Date().toISOString();
            aggregated.push({
              id: `v2ex-${item.id}`,
              source: 'V2EX',
              sourceUrl: 'https://www.v2ex.com',
              sourceFavicon: 'https://www.v2ex.com/favicon.ico',
              title: item.title,
              summary: cleanHtml(item.content || `回复：${item.replies || 0} 条 · 节点：${item.node?.title || '技术探讨'}`),
              url: item.url || `https://www.v2ex.com/t/${item.id}`,
              publishedAt: pubDate.replace('T', ' ').slice(0, 16),
              relativeTime: formatRelativeTime(pubDate),
              tags: [item.node?.title || '开发者', '技术社区', '热议'],
              readTime: '3 分钟阅读',
              views: (item.replies || 5) * 35 + 120,
              likes: item.replies || 8,
              isHot: (item.replies || 0) > 20,
              isFeatured: (item.replies || 0) > 40,
            });
          }
        }
      }
    } catch (e) {
      console.warn('[FeedService] V2EX fetch notice:', (e as any)?.message);
    }

    // 3. Fetch real Ruan Yifeng (阮一峰的网络日志与科技爱好者周刊) Atom RSS
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const res = await fetch('https://www.ruanyifeng.com/blog/atom.xml', {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const xml = await res.text();
        const parsed = parseXmlFeed(
          xml,
          '阮一峰网络日志',
          'https://www.ruanyifeng.com/blog/',
          'https://www.ruanyifeng.com/favicon.ico',
          ['科技周刊', '前沿见解', '编程随想']
        );
        aggregated.push(...parsed);
      }
    } catch (e) {
      console.warn('[FeedService] Ruan Yifeng fetch notice:', (e as any)?.message);
    }

    // 4. Fetch real Hacker News top tech stories via Algolia API
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const hnRes = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=8', {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      clearTimeout(timeout);

      if (hnRes.ok) {
        const hnData = (await hnRes.json()) as any;
        if (Array.isArray(hnData.hits)) {
          for (const hit of hnData.hits) {
            if (!hit.title) continue;
            const itemUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
            const pubDate = hit.created_at || new Date().toISOString();
            aggregated.push({
              id: `hn-${hit.objectID}`,
              source: 'Hacker News',
              sourceUrl: 'https://news.ycombinator.com',
              sourceFavicon: 'https://news.ycombinator.com/favicon.ico',
              title: hit.title,
              summary: `全球热度：${hit.points || 0} Points · 社区讨论：${hit.num_comments || 0} 条 · 作者：${hit.author || '社区'}`,
              url: itemUrl,
              publishedAt: pubDate.replace('T', ' ').slice(0, 16),
              relativeTime: formatRelativeTime(pubDate),
              tags: ['科技突破', '开源项目', '前沿情报'],
              readTime: '4 分钟速览',
              views: (hit.points || 10) * 15,
              likes: hit.points || 15,
              isHot: (hit.points || 0) > 100,
              isFeatured: (hit.points || 0) > 200,
            });
          }
        }
      }
    } catch (e) {
      console.warn('[FeedService] HackerNews fetch notice:', (e as any)?.message);
    }

    // 5. Fetch real GitHub Blog official announcements RSS
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const ghRes = await fetch('https://github.blog/feed/', {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      clearTimeout(timeout);

      if (ghRes.ok) {
        const ghXml = await ghRes.text();
        const parsed = parseXmlFeed(
          ghXml,
          'GitHub Blog',
          'https://github.blog',
          'https://github.githubassets.com/favicons/favicon.png',
          ['GitHub', '开源生态', '工程架构']
        );
        aggregated.push(...parsed);
      }
    } catch (e) {
      console.warn('[FeedService] GitHub Blog fetch notice:', (e as any)?.message);
    }

    // 6. Fetch real Dev.to top technical articles
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const devRes = await fetch('https://dev.to/api/articles?per_page=6', {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      clearTimeout(timeout);

      if (devRes.ok) {
        const devData = (await devRes.json()) as any[];
        if (Array.isArray(devData)) {
          for (const article of devData) {
            if (!article.title || !article.url) continue;
            const pubDate = article.published_at || new Date().toISOString();
            aggregated.push({
              id: `devto-${article.id}`,
              source: 'Dev.to Community',
              sourceUrl: 'https://dev.to',
              sourceFavicon: 'https://dev.to/favicon.ico',
              title: article.title,
              summary: cleanHtml(article.description || '技术开发者社区热门实战解析与架构分享。'),
              url: article.url,
              publishedAt: pubDate.replace('T', ' ').slice(0, 16),
              relativeTime: formatRelativeTime(pubDate),
              tags: Array.isArray(article.tag_list) && article.tag_list.length > 0 ? article.tag_list.slice(0, 3) : ['Web架构', '代码实战'],
              readTime: `${article.reading_time_minutes || 4} 分钟阅读`,
              views: (article.positive_reactions_count || 10) * 22,
              likes: article.positive_reactions_count || 24,
              isHot: (article.positive_reactions_count || 0) > 30,
              isFeatured: false,
            });
          }
        }
      }
    } catch (e) {
      console.warn('[FeedService] Dev.to fetch notice:', (e as any)?.message);
    }

    // 7. Incorporate real user bookmark entries configured with inFeed
    try {
      const allBookmarks = await bookmarkRepository.findAll();
      const inFeedBookmarks = allBookmarks.filter((b) => b.inFeed || b.feedCustomNote);

      for (const bm of inFeedBookmarks) {
        const updateDate = bm.updatedAt || bm.createdAt || new Date().toISOString();
        aggregated.push({
          id: `bm-feed-${bm.id}`,
          source: bm.title,
          sourceUrl: bm.url,
          sourceFavicon: bm.favicon,
          title: bm.feedCustomNote ? `【站长精选】${bm.title}：${bm.feedCustomNote.slice(0, 40)}` : `【精选收录】${bm.title}`,
          summary: bm.feedCustomNote || bm.description || `${bm.title} 核心网址收录与动态跟踪。`,
          url: bm.url,
          publishedAt: updateDate.replace('T', ' ').slice(0, 16),
          relativeTime: formatRelativeTime(updateDate),
          tags: bm.tags && bm.tags.length > 0 ? bm.tags.slice(0, 3) : ['精选站点', '优质导航'],
          readTime: '2 分钟直达',
          views: (bm.clickCount || 0) + 180,
          likes: Math.floor((bm.clickCount || 0) * 0.4) + 20,
          isHot: Boolean(bm.feedHighlight || bm.isPinned),
          isFeatured: Boolean(bm.feedHighlight),
        });
      }
    } catch (e) {
      console.warn('[FeedService] Failed to load in-feed bookmarks:', (e as any)?.message);
    }

    // Sort by publication time (newest first)
    aggregated.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    if (aggregated.length > 0) {
      cachedFeedItems = aggregated;
      lastFetchedTime = now;
      this.saveDiskCache(aggregated);
      return aggregated;
    }

    // If network was completely unavailable on this call, fall back to cached real items
    if (cachedFeedItems.length > 0) {
      return cachedFeedItems;
    }

    return [];
  }
}

export const feedService = new FeedService();
