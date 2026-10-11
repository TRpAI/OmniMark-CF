import { Router, Request, Response } from 'express';
import { feedService } from '../services/feed.service';

const router = Router();

router.get('/real', async (req: Request, res: Response) => {
  try {
    const force = req.query.refresh === 'true';
    const items = await feedService.getLiveFeed(force);
    res.json({
      success: true,
      data: items,
      total: items.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || '获取实时快讯失败',
    });
  }
});

router.get('/live', async (req: Request, res: Response) => {
  try {
    const force = req.query.refresh === 'true';
    const items = await feedService.getLiveFeed(force);
    res.json({
      success: true,
      data: items,
      total: items.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || '获取实时快讯失败',
    });
  }
});

export default router;
