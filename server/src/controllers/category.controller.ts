import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';

export class CategoryController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const categories = await categoryService.list();
      res.json({ success: true, data: categories });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await categoryService.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await categoryService.update(id, req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleteBookmarks = req.query.deleteBookmarks === 'true';
      await categoryService.delete(id, deleteBookmarks);
      res.json({ success: true, message: '分类已删除' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async reorder(req: Request, res: Response): Promise<void> {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({ success: false, error: 'items 必须是数组' });
        return;
      }
      await categoryService.reorder(items);
      res.json({ success: true, message: '分类排序已更新' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const categoryController = new CategoryController();
