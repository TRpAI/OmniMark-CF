import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { User } from '../../../packages/shared/types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);

  if (!token) {
    res.status(401).json({ success: false, error: '请先登录以进行管理操作' });
    return;
  }

  try {
    const user = await authService.validateToken(token);
    if (!user) {
      res.status(401).json({ success: false, error: '登录状态已失效，请重新登录' });
      return;
    }
    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message || '鉴权失败' });
  }
}
