import { URL } from 'url';
import { isSafeUrl } from '../security/ssrf';

export class FaviconService {
  getGoogleFavicon(url: string, sz = 128): string {
    try {
      const parsed = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=${sz}`;
    } catch {
      return '';
    }
  }

  async resolveFavicon(url: string): Promise<string> {
    if (!url || !isSafeUrl(url)) {
      return '';
    }

    try {
      const parsed = new URL(url);
      const origin = parsed.origin;
      const defaultIco = `${origin}/favicon.ico`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OmniMark/1.0; +https://github.com/TRpAI/OmniMark)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        // Look for <link rel="icon" ...> or <link rel="shortcut icon" ...>
        const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ||
                          html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i) ||
                          html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i);
        if (iconMatch && iconMatch[1]) {
          const href = iconMatch[1].trim();
          if (href.startsWith('http://') || href.startsWith('https://')) {
            return href;
          }
          if (href.startsWith('//')) {
            return `${parsed.protocol}${href}`;
          }
          if (href.startsWith('/')) {
            return `${origin}${href}`;
          }
          return `${origin}/${href}`;
        }
      }

      // Check if direct /favicon.ico works
      return this.getGoogleFavicon(url);
    } catch {
      return this.getGoogleFavicon(url);
    }
  }
}

export const faviconService = new FaviconService();
