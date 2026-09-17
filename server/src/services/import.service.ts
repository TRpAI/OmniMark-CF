import crypto from 'crypto';
import { bookmarkRepository } from '../repositories/bookmark.repository';
import { categoryRepository } from '../repositories/category.repository';
import { Bookmark, Category } from '../../../packages/shared/types';
import { faviconService } from './favicon.service';

export interface ImportResult {
  categoriesAdded: number;
  bookmarksAdded: number;
  errors: string[];
}

export class ImportService {
  async importJson(jsonData: any, overwrite = false): Promise<ImportResult> {
    const result: ImportResult = { categoriesAdded: 0, bookmarksAdded: 0, errors: [] };

    if (!jsonData || typeof jsonData !== 'object') {
      throw new Error('无效的 JSON 导入数据');
    }

    if (overwrite) {
      await bookmarkRepository.clearAll();
      await categoryRepository.clearAll();
    }

    const currentCategories = await categoryRepository.findAll();
    const categoryNameMap = new Map<string, string>();
    currentCategories.forEach((c) => categoryNameMap.set(c.name.toLowerCase(), c.id));

    // Import Categories
    if (Array.isArray(jsonData.categories)) {
      for (const cat of jsonData.categories) {
        if (!cat.name) continue;
        const lowerName = cat.name.toLowerCase();
        let catId = categoryNameMap.get(lowerName);

        if (!catId) {
          const newCat: Category = {
            id: cat.id || 'cat-' + crypto.randomUUID(),
            name: cat.name,
            icon: cat.icon || 'Folder',
            sortOrder: Number(cat.sortOrder) || currentCategories.length + 1,
            createdAt: cat.createdAt || new Date().toISOString(),
          };
          await categoryRepository.insert(newCat);
          categoryNameMap.set(lowerName, newCat.id);
          catId = newCat.id;
          result.categoriesAdded++;
        }
      }
    }

    // Import Bookmarks
    if (Array.isArray(jsonData.bookmarks)) {
      const defaultCatId = (await categoryRepository.findAll())[0]?.id || 'cat-default';

      for (const b of jsonData.bookmarks) {
        if (!b.title || !b.url) continue;

        let categoryId = b.categoryId;
        if (!categoryId || !(await categoryRepository.findById(categoryId))) {
          categoryId = defaultCatId;
        }

        const newBookmark: Bookmark = {
          id: 'bm-' + crypto.randomUUID(),
          categoryId,
          title: b.title,
          url: b.url,
          description: b.description || '',
          favicon: b.favicon || faviconService.getGoogleFavicon(b.url),
          tags: Array.isArray(b.tags) ? b.tags : [],
          clickCount: Number(b.clickCount) || 0,
          sortOrder: Number(b.sortOrder) || 1,
          isPinned: Boolean(b.isPinned),
          createdAt: b.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await bookmarkRepository.insert(newBookmark);
        result.bookmarksAdded++;
      }
    }

    return result;
  }

  async importHtmlBookmarks(htmlContent: string): Promise<ImportResult> {
    const result: ImportResult = { categoriesAdded: 0, bookmarksAdded: 0, errors: [] };

    let currentCategoryName = '导入书签';
    const categories = await categoryRepository.findAll();
    const categoryMap = new Map<string, string>();
    categories.forEach((c) => categoryMap.set(c.name.toLowerCase(), c.id));

    // Regex to scan headings and links
    const lines = htmlContent.split('\n');

    for (const line of lines) {
      // Check folder/category: <H3 ...>FolderName</H3>
      const folderMatch = line.match(/<H3[^>]*>([^<]+)<\/H3>/i);
      if (folderMatch && folderMatch[1]) {
        currentCategoryName = folderMatch[1].trim();
      }

      // Check bookmark: <A HREF="url" ... ICON="favicon">Title</A>
      const linkMatch = line.match(/<A\s+[^>]*HREF=["']([^"']+)["'][^>]*>(.*?)<\/A>/i);
      if (linkMatch && linkMatch[1]) {
        const url = linkMatch[1].trim();
        const rawTitle = linkMatch[2].replace(/<[^>]+>/g, '').trim();
        const title = rawTitle || url;

        // Skip non-http URLs like place: or javascript:
        if (!/^https?:\/\//i.test(url)) {
          continue;
        }

        // Check if category exists or create it
        let catId = categoryMap.get(currentCategoryName.toLowerCase());
        if (!catId) {
          const newCat: Category = {
            id: 'cat-' + crypto.randomUUID(),
            name: currentCategoryName,
            icon: 'Bookmark',
            sortOrder: (await categoryRepository.findAll()).length + 1,
            createdAt: new Date().toISOString(),
          };
          await categoryRepository.insert(newCat);
          categoryMap.set(currentCategoryName.toLowerCase(), newCat.id);
          catId = newCat.id;
          result.categoriesAdded++;
        }

        // Icon match if present in line
        const iconMatch = line.match(/ICON=["']([^"']+)["']/i);
        const favicon = iconMatch && iconMatch[1] ? iconMatch[1] : faviconService.getGoogleFavicon(url);

        const newBookmark: Bookmark = {
          id: 'bm-' + crypto.randomUUID(),
          categoryId: catId,
          title,
          url,
          description: '',
          favicon,
          tags: ['导入'],
          clickCount: 0,
          sortOrder: result.bookmarksAdded + 1,
          isPinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await bookmarkRepository.insert(newBookmark);
        result.bookmarksAdded++;
      }
    }

    return result;
  }
}

export const importService = new ImportService();
