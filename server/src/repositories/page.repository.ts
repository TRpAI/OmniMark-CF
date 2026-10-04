import { CustomPage } from '../../../packages/shared/types';
import { jsonDb } from './json.repository';

export class PageRepository {
  async findAll(): Promise<CustomPage[]> {
    const db = jsonDb.read();
    return [...(db.customPages || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findById(id: string): Promise<CustomPage | null> {
    const db = jsonDb.read();
    return (db.customPages || []).find((p) => p.id === id) || null;
  }

  async insert(page: CustomPage): Promise<CustomPage> {
    let result = page;
    jsonDb.update((db) => {
      if (!Array.isArray(db.customPages)) {
        db.customPages = [];
      }
      db.customPages.push(page);
      result = page;
    });
    return result;
  }

  async update(id: string, updates: Partial<CustomPage>): Promise<CustomPage | null> {
    let result: CustomPage | null = null;
    jsonDb.update((db) => {
      if (!Array.isArray(db.customPages)) {
        db.customPages = [];
      }
      const index = db.customPages.findIndex((p) => p.id === id);
      if (index !== -1) {
        db.customPages[index] = {
          ...db.customPages[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        result = db.customPages[index];
      }
    });
    return result;
  }

  async delete(id: string): Promise<boolean> {
    let deleted = false;
    jsonDb.update((db) => {
      if (!Array.isArray(db.customPages)) {
        db.customPages = [];
      }
      const initialLength = db.customPages.length;
      db.customPages = db.customPages.filter((p) => p.id !== id);
      deleted = db.customPages.length < initialLength;
    });
    return deleted;
  }

  async reorder(items: { id: string; sortOrder: number }[]): Promise<void> {
    jsonDb.update((db) => {
      if (!Array.isArray(db.customPages)) {
        db.customPages = [];
      }
      const orderMap = new Map(items.map((it) => [it.id, it.sortOrder]));
      for (const p of db.customPages) {
        if (orderMap.has(p.id)) {
          p.sortOrder = orderMap.get(p.id)!;
        }
      }
      db.customPages.sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }
}

export const pageRepository = new PageRepository();
