import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// 限制频繁请求
const aiLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'AI 助手请求过于频繁，请稍后再试',
});

// 智能提取与整理站点信息
router.post('/site-info', aiLimiter, (req, res) => aiController.analyzeSiteInfo(req, res));

// 站点深度智能摘要
router.post('/site-summary', aiLimiter, (req, res) => aiController.generateSiteSummary(req, res));

// 智能问答与寻宝
router.post('/assistant', aiLimiter, (req, res) => aiController.askAssistant(req, res));

export default router;
