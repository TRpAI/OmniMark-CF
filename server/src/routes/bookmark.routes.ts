import { Router } from 'express';
import { bookmarkController } from '../controllers/bookmark.controller';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes (with optional auth for private bookmark access)
router.get('/', optionalAuth, (req, res) => bookmarkController.list(req, res));
router.get('/stats', optionalAuth, (req, res) => bookmarkController.getStats(req, res));
router.get('/:id', optionalAuth, (req, res) => bookmarkController.getById(req, res));
router.post('/:id/click', (req, res) => bookmarkController.recordClick(req, res));

// Protected admin routes
router.post('/batch/reorder', requireAuth, (req, res) => bookmarkController.reorder(req, res));
router.post('/batch/delete', requireAuth, (req, res) => bookmarkController.batchDelete(req, res));
router.post('/batch/update', requireAuth, (req, res) => bookmarkController.batchUpdate(req, res));
router.post('/', requireAuth, (req, res) => bookmarkController.create(req, res));
router.put('/:id', requireAuth, (req, res) => bookmarkController.update(req, res));
router.delete('/:id', requireAuth, (req, res) => bookmarkController.delete(req, res));

export default router;
