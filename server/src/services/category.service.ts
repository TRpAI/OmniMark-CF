import crypto from 'crypto';
import { categoryRepository } from '../repositories/category.repository';
import { bookmarkRepository } from '../repositories/bookmark.repository';
import { Category } from '../../../packages/shared/types';

export interface CreateCategoryDTO {
  name: string;
  icon?: string;
  sortOrder?: number;
}

export class CategoryService {
  async list(): Promise<(Category & { count: number })[]> {
    const categories = await categoryRepository.findAll();
    const bookmarks = await bookmarkRepository.findAll();

    const countMap: Record<string, number> = {};
    for (const b of bookmarks) {
      countMap[b.categoryId] = (countMap[b.categoryId] || 0) + 1;
    }

    return categories.map((c) => ({
      ...c,
      count: countMap[c.id] || 0,
    }));
  }

  async create(data: CreateCategoryDTO): Promise<Category> {
    if (!data.name || !data.name.trim()) {
      throw new Error('分类名称不能为空');
    }

    const categories = await categoryRepository.findAll();
    const sortOrder = data.sortOrder ?? (categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder)) + 1 : 1);

    const newCategory: Category = {
      id: 'cat-' + crypto.randomUUID(),
      name: data.name.trim(),
      icon: data.icon?.trim() || 'Folder',
      sortOrder,
      createdAt: new Date().toISOString(),
    };

    return categoryRepository.insert(newCategory);
  }

  async update(id: string, data: Partial<CreateCategoryDTO>): Promise<Category> {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new Error('分类不存在');
    }

    const updated = await categoryRepository.update(id, data);
    if (!updated) {
      throw new Error('更新分类失败');
    }
    return updated;
  }

  async delete(id: string, deleteAssociatedBookmarks = false): Promise<void> {
    const categories = await categoryRepository.findAll();
    if (categories.length <= 1) {
      throw new Error('系统至少需要保留一个分类');
    }

    const bookmarks = await bookmarkRepository.findAll();
    const associated = bookmarks.filter((b) => b.categoryId === id);

    if (deleteAssociatedBookmarks) {
      for (const b of associated) {
        await bookmarkRepository.delete(b.id);
      }
    } else {
      // Reassign to another category
      const targetCat = categories.find((c) => c.id !== id);
      if (targetCat) {
        for (const b of associated) {
          await bookmarkRepository.update(b.id, { categoryId: targetCat.id });
        }
      }
    }

    await categoryRepository.delete(id);
  }

  async reorder(items: { id: string; sortOrder: number }[]): Promise<void> {
    await categoryRepository.reorder(items);
  }
}

export const categoryService = new CategoryService();
