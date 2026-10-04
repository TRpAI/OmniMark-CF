import { Response } from 'express';
import { pageService } from '../services/page.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class PageController {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const isAuthenticated = Boolean(req.user);
      const pages = await pageService.list(isAuthenticated);
      res.json({ success: true, data: pages });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const isAuthenticated = Boolean(req.user);
      const page = await pageService.getById(id, isAuthenticated);
      if (!page) {
        res.status(404).json({ success: false, error: '页面不存在或无访问权限' });
        return;
      }
      res.json({ success: true, data: page });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await pageService.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pageService.update(id, req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await pageService.delete(id);
      res.json({ success: true, message: '页面已删除' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async reorder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({ success: false, error: '无效的数据格式' });
        return;
      }
      await pageService.reorder(items);
      res.json({ success: true, message: '页面排序已保存' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const pageController = new PageController();
