import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', (req, res) => categoryController.list(req, res));

// Protected admin routes
router.post('/', requireAuth, (req, res) => categoryController.create(req, res));
router.put('/:id', requireAuth, (req, res) => categoryController.update(req, res));
router.delete('/:id', requireAuth, (req, res) => categoryController.delete(req, res));
router.post('/batch/reorder', requireAuth, (req, res) => categoryController.reorder(req, res));

export default router;
