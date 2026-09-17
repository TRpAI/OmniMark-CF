-- ==========================================================
-- OmniMark Cloudflare D1 Migration: 0001_init_d1.sql
-- Run with: npx wrangler d1 execute omnimark-db --local --file=data/migrations/0001_init_d1.sql
-- Production: npx wrangler d1 execute omnimark-db --remote --file=data/migrations/0001_init_d1.sql
-- ==========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  tokenHash TEXT NOT NULL UNIQUE,
  ipHash TEXT,
  userAgentHash TEXT,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Folder',
  sortOrder INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL
);

-- 4. Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  categoryId TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  favicon TEXT,
  tags TEXT, -- JSON array string, e.g. ["AI", "Tools"]
  clickCount INTEGER DEFAULT 0,
  sortOrder INTEGER DEFAULT 0,
  isPinned INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
);

-- 5. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for ultra-fast queries
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(categoryId);
CREATE INDEX IF NOT EXISTS idx_bookmarks_pinned ON bookmarks(isPinned);
CREATE INDEX IF NOT EXISTS idx_bookmarks_sort ON bookmarks(sortOrder);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(tokenHash);

-- Initial Categories
INSERT OR IGNORE INTO categories (id, name, icon, sortOrder, createdAt) VALUES
('cat-featured', '精选常用', 'Sparkles', 1, datetime('now')),
('cat-dev', '开发编程', 'Code', 2, datetime('now')),
('cat-ai', 'AI 人工智能', 'Cpu', 3, datetime('now')),
('cat-design', '设计与素材', 'Palette', 4, datetime('now')),
('cat-cloud', '云与基础设施', 'Cloud', 5, datetime('now')),
('cat-tools', '效率工具', 'Wrench', 6, datetime('now'));

-- Initial Default Admin (admin / admin123)
INSERT OR IGNORE INTO users (id, username, passwordHash, createdAt) VALUES
('usr-admin-1', 'admin', 'c6218d6a8b7921dc8074d283626e2e58:36cb68205f31952a20f92b7c6c449c4d98939c3e98f4806a7f53f93ce0d2bf5538e12ec68285514f7b6b23b3f2f81944883907e15fe2b70fcfbc5c477960d70a', datetime('now'));
