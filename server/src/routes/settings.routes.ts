import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public read settings
router.get('/', (req, res) => settingsController.getSettings(req, res));

// Protected admin update
router.put('/', requireAuth, (req, res) => settingsController.updateSettings(req, res));

export default router;
