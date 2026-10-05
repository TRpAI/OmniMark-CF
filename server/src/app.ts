import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import bookmarkRoutes from './routes/bookmark.routes';
import categoryRoutes from './routes/category.routes';
import settingsRoutes from './routes/settings.routes';
import uploadRoutes from './routes/upload.routes';
import pageRoutes from './routes/page.routes';
import { securityHeaders } from './middleware/security.middleware';
import { jsonDb } from './repositories/json.repository';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(securityHeaders);

// Comprehensive Health check with real-time storage read & write verification
const handleHealth = (req: Request, res: Response) => {
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
};

app.get('/api/health', handleHealth);
app.get('/health', handleHealth);

// Self-healing / repair endpoint (supports both /api/health/repair and /health/repair, GET and POST)
const handleRepair = (req: Request, res: Response) => {
  const result = jsonDb.repairDatabase();
  const storageCheck = jsonDb.verifyStorageHealth();

  res.json({
    success: result.repaired,
    repaired: result.repaired,
    message: result.repaired ? '存储自愈与结构校验成功' : '存储无需修复，状态健康',
    data: {
      ...result,
      storage: storageCheck,
    },
  });
};

app.all('/api/health/repair', handleRepair);
app.all('/health/repair', handleRepair);
app.all('/repair', handleRepair);
app.all('/api/repair', handleRepair);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/pages', pageRoutes);
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
