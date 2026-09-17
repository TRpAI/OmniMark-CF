import { Router } from 'express';
import { bookmarkController } from '../controllers/bookmark.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', (req, res) => bookmarkController.list(req, res));
router.get('/stats', (req, res) => bookmarkController.getStats(req, res));
router.get('/:id', (req, res) => bookmarkController.getById(req, res));
router.post('/:id/click', (req, res) => bookmarkController.recordClick(req, res));

// Protected admin routes
router.post('/', requireAuth, (req, res) => bookmarkController.create(req, res));
router.put('/:id', requireAuth, (req, res) => bookmarkController.update(req, res));
router.delete('/:id', requireAuth, (req, res) => bookmarkController.delete(req, res));
router.post('/batch/reorder', requireAuth, (req, res) => bookmarkController.reorder(req, res));

export default router;
