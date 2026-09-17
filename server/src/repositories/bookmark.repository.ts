import { Bookmark } from '../../../packages/shared/types';
import { jsonDb } from './json.repository';

export class BookmarkRepository {
  async findAll(): Promise<Bookmark[]> {
    const db = jsonDb.read();
    return [...db.bookmarks].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return a.sortOrder - b.sortOrder;
    });
  }

  async findById(id: string): Promise<Bookmark | null> {
    const db = jsonDb.read();
    return db.bookmarks.find((b) => b.id === id) || null;
  }

  async findByCategoryId(categoryId: string): Promise<Bookmark[]> {
    const db = jsonDb.read();
    return db.bookmarks
      .filter((b) => b.categoryId === categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async insert(bookmark: Bookmark): Promise<Bookmark> {
    jsonDb.update((db) => {
      db.bookmarks.push(bookmark);
    });
    return bookmark;
  }

  async insertMany(bookmarks: Bookmark[]): Promise<Bookmark[]> {
    jsonDb.update((db) => {
      db.bookmarks.push(...bookmarks);
    });
    return bookmarks;
  }

  async update(id: string, updates: Partial<Bookmark>): Promise<Bookmark | null> {
    let updated: Bookmark | null = null;
    jsonDb.update((db) => {
      const index = db.bookmarks.findIndex((b) => b.id === id);
      if (index !== -1) {
        db.bookmarks[index] = {
          ...db.bookmarks[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        updated = db.bookmarks[index];
      }
    });
    return updated;
  }

  async incrementClick(id: string): Promise<number> {
    let newCount = 0;
    jsonDb.update((db) => {
      const item = db.bookmarks.find((b) => b.id === id);
      if (item) {
        item.clickCount = (item.clickCount || 0) + 1;
        newCount = item.clickCount;
      }
    });
    return newCount;
  }

  async delete(id: string): Promise<boolean> {
    let deleted = false;
    jsonDb.update((db) => {
      const initialLen = db.bookmarks.length;
      db.bookmarks = db.bookmarks.filter((b) => b.id !== id);
      deleted = db.bookmarks.length < initialLen;
    });
    return deleted;
  }

  async reorder(items: { id: string; sortOrder: number; categoryId?: string }[]): Promise<void> {
    jsonDb.update((db) => {
      const map = new Map(items.map((i) => [i.id, i]));
      db.bookmarks.forEach((b) => {
        const update = map.get(b.id);
        if (update) {
          b.sortOrder = update.sortOrder;
          if (update.categoryId) {
            b.categoryId = update.categoryId;
          }
          b.updatedAt = new Date().toISOString();
        }
      });
    });
  }

  async clearAll(): Promise<void> {
    jsonDb.update((db) => {
      db.bookmarks = [];
    });
  }
}

export const bookmarkRepository = new BookmarkRepository();
