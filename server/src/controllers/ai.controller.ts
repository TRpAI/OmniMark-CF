import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { bookmarkRepository } from '../repositories/bookmark.repository';
import { categoryRepository } from '../repositories/category.repository';

export class AiController {
  /**
   * POST /api/ai/site-info
   * 智能提取并补全站点简介、标题、标签与分类
   */
  async analyzeSiteInfo(req: Request, res: Response): Promise<void> {
    try {
      const { url, existingCategories } = req.body;
      if (!url) {
        res.status(400).json({ success: false, error: '请提供目标网址' });
        return;
      }

      let categoriesList = existingCategories;
      if (!categoriesList || !Array.isArray(categoriesList)) {
        const cats = await categoryRepository.findAll();
        categoriesList = cats.map(c => c.name);
      }

      const info = await aiService.analyzeSiteInfo(url, categoriesList);
      res.json({ success: true, data: info });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || '分析站点信息失败' });
    }
  }

  /**
   * POST /api/ai/site-summary
   * 对指定站点进行深度智能摘要生成
   */
  async generateSiteSummary(req: Request, res: Response): Promise<void> {
    try {
      const { url, title, description } = req.body;
      if (!url) {
        res.status(400).json({ success: false, error: '请提供目标网址' });
        return;
      }

      const summary = await aiService.generateSiteSummary(url, title, description);
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || '生成站点摘要失败' });
    }
  }

  /**
   * POST /api/ai/assistant
   * 全站书签智能寻宝 / 语义问答
   */
  async askAssistant(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.body;
      if (!query || !query.trim()) {
        res.status(400).json({ success: false, error: '请输入您的问题' });
        return;
      }

      const [bookmarks, categories] = await Promise.all([
        bookmarkRepository.findAll(),
        categoryRepository.findAll(),
      ]);

      const catMap = new Map<string, string>();
      for (const c of categories) {
        catMap.set(c.id, c.name);
      }

      const bookmarksContext = bookmarks.map(b => ({
        title: b.title,
        url: b.url,
        description: b.description,
        tags: b.tags,
        categoryName: catMap.get(b.categoryId) || '未分类',
      }));

      const result = await aiService.askAssistant(query, bookmarksContext);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || '智能助理处理异常' });
    }
  }
}

export const aiController = new AiController();
