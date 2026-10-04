import { Router } from 'express';
import { pageController } from '../controllers/page.controller';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes (with optional auth for private page visibility)
router.get('/', optionalAuth, (req, res) => pageController.list(req, res));
router.get('/:id', optionalAuth, (req, res) => pageController.getById(req, res));

// Admin routes
router.post('/', requireAuth, (req, res) => pageController.create(req, res));
router.put('/:id', requireAuth, (req, res) => pageController.update(req, res));
router.delete('/:id', requireAuth, (req, res) => pageController.delete(req, res));
router.post('/batch/reorder', requireAuth, (req, res) => pageController.reorder(req, res));

export default router;
