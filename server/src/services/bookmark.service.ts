import crypto from 'crypto';
import { bookmarkRepository } from '../repositories/bookmark.repository';
import { categoryRepository } from '../repositories/category.repository';
import { faviconService } from './favicon.service';
import { Bookmark, StatsData } from '../../../packages/shared/types';

export interface CreateBookmarkDTO {
  categoryId: string;
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  tags?: string[];
  sortOrder?: number;
  isPinned?: boolean;
}

export class BookmarkService {
  async list(filter?: { categoryId?: string; search?: string; isPinned?: boolean }): Promise<Bookmark[]> {
    let list = await bookmarkRepository.findAll();

    if (filter?.categoryId && filter.categoryId !== 'all') {
      list = list.filter((b) => b.categoryId === filter.categoryId);
    }

    if (filter?.isPinned !== undefined) {
      list = list.filter((b) => b.isPinned === filter.isPinned);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }

  async getById(id: string): Promise<Bookmark | null> {
    return bookmarkRepository.findById(id);
  }

  async create(data: CreateBookmarkDTO): Promise<Bookmark> {
    if (!data.title || !data.title.trim()) {
      throw new Error('书签标题不能为空');
    }
    if (!data.url || !data.url.trim()) {
      throw new Error('网址链接不能为空');
    }

    let url = data.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    // Auto resolve category if not valid
    let categoryId = data.categoryId;
    const cats = await categoryRepository.findAll();
    if (!categoryId || !cats.some((c) => c.id === categoryId)) {
      categoryId = cats[0]?.id || 'cat-default';
    }

    // Auto-fetch favicon if not provided
    let favicon = data.favicon;
    if (!favicon) {
      favicon = faviconService.getGoogleFavicon(url);
    }

    const all = await bookmarkRepository.findAll();
    const sortOrder = data.sortOrder ?? (all.length > 0 ? Math.max(...all.map((b) => b.sortOrder)) + 1 : 1);

    const newBookmark: Bookmark = {
      id: 'bm-' + crypto.randomUUID(),
      categoryId,
      title: data.title.trim(),
      url,
      description: data.description?.trim() || '',
      favicon,
      tags: Array.isArray(data.tags) ? data.tags.filter(Boolean) : [],
      clickCount: 0,
      sortOrder,
      isPinned: Boolean(data.isPinned),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return bookmarkRepository.insert(newBookmark);
  }

  async update(id: string, updates: Partial<CreateBookmarkDTO>): Promise<Bookmark> {
    const existing = await bookmarkRepository.findById(id);
    if (!existing) {
      throw new Error('书签不存在');
    }

    let url = updates.url;
    if (url) {
      url = url.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
    }

    const updated = await bookmarkRepository.update(id, {
      ...updates,
      ...(url ? { url } : {}),
    });

    if (!updated) {
      throw new Error('更新书签失败');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await bookmarkRepository.delete(id);
    if (!deleted) {
      throw new Error('书签未找到或已删除');
    }
  }

  async recordClick(id: string): Promise<number> {
    return bookmarkRepository.incrementClick(id);
  }

  async reorder(items: { id: string; sortOrder: number; categoryId?: string }[]): Promise<void> {
    await bookmarkRepository.reorder(items);
  }

  async getStats(): Promise<StatsData> {
    const bookmarks = await bookmarkRepository.findAll();
    const categories = await categoryRepository.findAll();
    const totalClicks = bookmarks.reduce((sum, b) => sum + (b.clickCount || 0), 0);
    const pinnedBookmarks = bookmarks.filter((b) => b.isPinned).length;
    const topBookmarks = [...bookmarks]
      .sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))
      .slice(0, 5);

    return {
      totalBookmarks: bookmarks.length,
      totalCategories: categories.length,
      totalClicks,
      pinnedBookmarks,
      topBookmarks,
    };
  }
}

export const bookmarkService = new BookmarkService();
