import { Request, Response } from 'express';
import { faviconService } from '../services/favicon.service';
import { importService } from '../services/import.service';
import { exportService } from '../services/export.service';

export class UploadController {
  async getFavicon(req: Request, res: Response): Promise<void> {
    try {
      const url = req.query.url as string;
      if (!url) {
        res.status(400).json({ success: false, error: 'url 参数缺失' });
        return;
      }
      const faviconUrl = await faviconService.resolveFavicon(url);
      res.json({ success: true, data: { favicon: faviconUrl } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async importJson(req: Request, res: Response): Promise<void> {
    try {
      const { data, overwrite } = req.body;
      const result = await importService.importJson(data, overwrite);
      res.json({ success: true, data: result, message: `成功导入 ${result.categoriesAdded} 个分类，${result.bookmarksAdded} 个书签` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async importHtml(req: Request, res: Response): Promise<void> {
    try {
      const { htmlContent } = req.body;
      if (!htmlContent) {
        res.status(400).json({ success: false, error: '缺少 HTML 书签内容' });
        return;
      }
      const result = await importService.importHtmlBookmarks(htmlContent);
      res.json({ success: true, data: result, message: `成功导入 ${result.categoriesAdded} 个分类，${result.bookmarksAdded} 个书签` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async exportJson(req: Request, res: Response): Promise<void> {
    try {
      const json = await exportService.exportJson();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="omnimark-backup.json"');
      res.send(json);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async exportHtml(req: Request, res: Response): Promise<void> {
    try {
      const html = await exportService.exportHtml();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="omnimark-bookmarks.html"');
      res.send(html);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async exportD1Sql(req: Request, res: Response): Promise<void> {
    try {
      const sql = await exportService.exportD1Sql();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="omnimark-d1-migration.sql"');
      res.send(sql);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const uploadController = new UploadController();
