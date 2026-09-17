import { Request, Response } from 'express';
import { bookmarkService } from '../services/bookmark.service';

export class BookmarkController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId, search, isPinned } = req.query;
      const bookmarks = await bookmarkService.list({
        categoryId: categoryId ? String(categoryId) : undefined,
        search: search ? String(search) : undefined,
        isPinned: isPinned !== undefined ? isPinned === 'true' : undefined,
      });
      res.json({ success: true, data: bookmarks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bookmark = await bookmarkService.getById(id);
      if (!bookmark) {
        res.status(404).json({ success: false, error: '书签未找到' });
        return;
      }
      res.json({ success: true, data: bookmark });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await bookmarkService.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await bookmarkService.update(id, req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await bookmarkService.delete(id);
      res.json({ success: true, message: '书签已删除' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async recordClick(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const clicks = await bookmarkService.recordClick(id);
      res.json({ success: true, data: { clickCount: clicks } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async reorder(req: Request, res: Response): Promise<void> {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({ success: false, error: 'items 必须是数组' });
        return;
      }
      await bookmarkService.reorder(items);
      res.json({ success: true, message: '书签排序已更新' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await bookmarkService.getStats();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const bookmarkController = new BookmarkController();
