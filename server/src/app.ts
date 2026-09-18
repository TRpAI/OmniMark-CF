import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import bookmarkRoutes from './routes/bookmark.routes';
import categoryRoutes from './routes/category.routes';
import settingsRoutes from './routes/settings.routes';
import uploadRoutes from './routes/upload.routes';
import { securityHeaders } from './middleware/security.middleware';

import { bookmarkRepository } from './repositories/bookmark.repository';
import { categoryRepository } from './repositories/category.repository';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(securityHeaders);

// Health check with data persistence verification
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const [bookmarks, categories] = await Promise.all([
      bookmarkRepository.findAll(),
      categoryRepository.findAll(),
    ]);

    res.json({
      status: 'ok',
      service: 'OmniMark API',
      version: '2.0.0',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      storage: {
        status: 'healthy',
        bookmarksCount: bookmarks.length,
        categoriesCount: categories.length,
      },
      security: {
        authMode: 'single-user',
        passwordAlgorithm: 'PBKDF2-HMAC-SHA512 (210,000 iterations)',
      },
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'degraded',
      service: 'OmniMark API',
      timestamp: new Date().toISOString(),
      error: 'Storage read verification failed: ' + (err?.message || 'unknown error'),
    });
  }
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
