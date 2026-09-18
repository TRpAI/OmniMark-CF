import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Public auth routes
router.post(
  '/login',
  rateLimiter({ windowMs: 60 * 1000, max: 5, message: '登录尝试过于频繁，请 1 分钟后再试' }),
  (req, res) => authController.login(req, res)
);
router.post('/logout', (req, res) => authController.logout(req, res));

// Protected auth routes
router.get('/me', requireAuth, (req, res) => authController.me(req, res));
router.post(
  '/change-password',
  requireAuth,
  rateLimiter({ windowMs: 60 * 1000, max: 5, message: '密码修改操作过于频繁，请稍后再试' }),
  (req, res) => authController.changePassword(req, res)
);
router.get('/users', requireAuth, (req, res) => authController.listUsers(req, res));
router.post('/users', requireAuth, (req, res) => authController.createUser(req, res));
router.delete('/users/:id', requireAuth, (req, res) => authController.deleteUser(req, res));

export default router;
