import { Category } from '../../../packages/shared/types';
import { jsonDb } from './json.repository';

export class CategoryRepository {
  async findAll(): Promise<Category[]> {
    const db = jsonDb.read();
    return [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findById(id: string): Promise<Category | null> {
    const db = jsonDb.read();
    return db.categories.find((c) => c.id === id) || null;
  }

  async insert(category: Category): Promise<Category> {
    jsonDb.update((db) => {
      db.categories.push(category);
    });
    return category;
  }

  async insertMany(categories: Category[]): Promise<Category[]> {
    jsonDb.update((db) => {
      db.categories.push(...categories);
    });
    return categories;
  }

  async update(id: string, updates: Partial<Category>): Promise<Category | null> {
    let updated: Category | null = null;
    jsonDb.update((db) => {
      const index = db.categories.findIndex((c) => c.id === id);
      if (index !== -1) {
        db.categories[index] = { ...db.categories[index], ...updates };
        updated = db.categories[index];
      }
    });
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    let deleted = false;
    jsonDb.update((db) => {
      const initialLen = db.categories.length;
      db.categories = db.categories.filter((c) => c.id !== id);
      deleted = db.categories.length < initialLen;
    });
    return deleted;
  }

  async reorder(items: { id: string; sortOrder: number }[]): Promise<void> {
    jsonDb.update((db) => {
      const map = new Map(items.map((i) => [i.id, i.sortOrder]));
      db.categories.forEach((c) => {
        const order = map.get(c.id);
        if (order !== undefined) {
          c.sortOrder = order;
        }
      });
    });
  }

  async clearAll(): Promise<void> {
    jsonDb.update((db) => {
      db.categories = [];
    });
  }
}

export const categoryRepository = new CategoryRepository();
