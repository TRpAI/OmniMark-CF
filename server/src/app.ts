import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import bookmarkRoutes from './routes/bookmark.routes';
import categoryRoutes from './routes/category.routes';
import settingsRoutes from './routes/settings.routes';
import uploadRoutes from './routes/upload.routes';
import { securityHeaders } from './middleware/security.middleware';
import { jsonDb } from './repositories/json.repository';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(securityHeaders);

// Comprehensive Health check with real-time storage read & write verification
app.get('/api/health', (req: Request, res: Response) => {
  const storageCheck = jsonDb.verifyStorageHealth();

  const healthPayload = {
    status: storageCheck.healthy ? 'ok' : 'degraded',
    service: 'OmniMark API (Node.js + JSON Engine)',
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    storage: {
      status: storageCheck.healthy ? 'healthy' : 'error',
      path: storageCheck.path,
      bookmarksCount: storageCheck.bookmarksCount,
      categoriesCount: storageCheck.categoriesCount,
      writeable: storageCheck.writeable,
      lastVerifiedAt: storageCheck.lastVerifiedAt,
      message: storageCheck.message,
    },
    security: {
      authMode: 'single-user',
      passwordAlgorithm: 'PBKDF2-HMAC-SHA512 (210,000 iterations)',
    },
  };

  // Return both envelope and direct properties for high compatibility
  res.json({
    success: storageCheck.healthy,
    data: healthPayload,
    ...healthPayload,
  });
});

// Self-healing / repair endpoint
app.post('/api/health/repair', (req: Request, res: Response) => {
  const result = jsonDb.repairDatabase();
  const storageCheck = jsonDb.verifyStorageHealth();

  res.json({
    success: result.repaired,
    data: {
      ...result,
      storage: storageCheck,
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || '内部服务器错误',
  });
});

export default app;
