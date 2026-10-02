import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Favicon fetch (public or admin)
router.get('/favicon', rateLimiter({ windowMs: 60 * 1000, max: 60 }), (req, res) => uploadController.getFavicon(req, res));

// Import / Export routes (Protected)
router.post('/import-json', requireAuth, (req, res) => uploadController.importJson(req, res));
router.post('/import-html', requireAuth, (req, res) => uploadController.importHtml(req, res));
router.get('/export-json', requireAuth, (req, res) => uploadController.exportJson(req, res));
router.get('/export-html', requireAuth, (req, res) => uploadController.exportHtml(req, res));
router.get('/export-d1-sql', requireAuth, (req, res) => uploadController.exportD1Sql(req, res));

// OneDrive Scheduled Incremental Backup routes (Protected)
router.get('/onedrive/config', requireAuth, (req, res) => uploadController.getOneDriveConfig(req, res));
router.post('/onedrive/config', requireAuth, (req, res) => uploadController.saveOneDriveConfig(req, res));
router.post('/onedrive/test', requireAuth, (req, res) => uploadController.testOneDrive(req, res));
router.post('/onedrive/backup', requireAuth, (req, res) => uploadController.triggerOneDriveBackup(req, res));
router.get('/onedrive/history', requireAuth, (req, res) => uploadController.getOneDriveHistory(req, res));

export default router;
