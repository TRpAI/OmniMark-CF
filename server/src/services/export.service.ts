import { bookmarkRepository } from '../repositories/bookmark.repository';
import { categoryRepository } from '../repositories/category.repository';
import { settingsRepository } from '../repositories/settings.repository';

export class ExportService {
  async exportJson(): Promise<string> {
    const categories = await categoryRepository.findAll();
    const bookmarks = await bookmarkRepository.findAll();
    const settings = await settingsRepository.getSettings();

    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      categories,
      bookmarks,
      settings,
    };

    return JSON.stringify(data, null, 2);
  }

  async exportHtml(): Promise<string> {
    const categories = await categoryRepository.findAll();
    const bookmarks = await bookmarkRepository.findAll();

    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>OmniMark Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

    for (const cat of categories) {
      const catBookmarks = bookmarks.filter((b) => b.categoryId === cat.id);
      html += `    <DT><H3>${escapeHtml(cat.name)}</H3>\n    <DL><p>\n`;
      for (const bm of catBookmarks) {
        const iconAttr = bm.favicon ? ` ICON="${escapeHtml(bm.favicon)}"` : '';
        html += `        <DT><A HREF="${escapeHtml(bm.url)}"${iconAttr}>${escapeHtml(bm.title)}</A>\n`;
      }
      html += `    </DL><p>\n`;
    }

    html += `</DL><p>\n`;
    return html;
  }

  async exportD1Sql(): Promise<string> {
    const categories = await categoryRepository.findAll();
    const bookmarks = await bookmarkRepository.findAll();
    const settings = await settingsRepository.getSettings();

    let sql = `-- Cloudflare D1 Database Export for OmniMark
-- Run with: npx wrangler d1 execute omnimark-db --remote --file=export.sql

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Folder',
  sortOrder INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL
);

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
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Categories Data
`;

    for (const cat of categories) {
      sql += `INSERT OR REPLACE INTO categories (id, name, icon, sortOrder, createdAt) VALUES (${escapeSql(cat.id)}, ${escapeSql(cat.name)}, ${escapeSql(cat.icon)}, ${cat.sortOrder}, ${escapeSql(cat.createdAt)});\n`;
    }

    sql += `\n-- Bookmarks Data\n`;
    for (const b of bookmarks) {
      const tagsJson = JSON.stringify(b.tags || []);
      sql += `INSERT OR REPLACE INTO bookmarks (id, categoryId, title, url, description, favicon, tags, clickCount, sortOrder, isPinned, createdAt, updatedAt) VALUES (${escapeSql(b.id)}, ${escapeSql(b.categoryId)}, ${escapeSql(b.title)}, ${escapeSql(b.url)}, ${escapeSql(b.description)}, ${escapeSql(b.favicon || '')}, ${escapeSql(tagsJson)}, ${b.clickCount || 0}, ${b.sortOrder || 0}, ${b.isPinned ? 1 : 0}, ${escapeSql(b.createdAt)}, ${escapeSql(b.updatedAt)});\n`;
    }

    sql += `\n-- Site Settings Data\n`;
    sql += `INSERT OR REPLACE INTO settings (key, value) VALUES ('site_config', ${escapeSql(JSON.stringify(settings))});\n`;

    return sql;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

export const exportService = new ExportService();
