import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyPassword } from '../security/password';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      if (!password) {
        res.status(400).json({ success: false, error: '请输入管理密码' });
        return;
      }
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(username, password, ip, userAgent);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(401).json({ success: false, error: err.message || '登录验证失败' });
    }
  }

  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }
    const isDefaultPassword = verifyPassword('admin123', req.user.passwordHash);
    res.json({
      success: true,
      data: {
        id: req.user.id,
        username: req.user.username,
        createdAt: req.user.createdAt,
        isDefaultPassword,
      },
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);
      if (token) {
        await authService.logout(token);
      }
      res.json({ success: true, message: '已安全退出登录' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: '未认证' });
        return;
      }
      const { oldPassword, newPassword } = req.body;
      await authService.changePassword(req.user.id, oldPassword, newPassword);
      res.json({ success: true, message: '密码修改成功' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const users = await authService.listUsers();
      res.json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      const user = await authService.createUser(username, password);
      res.status(201).json({ success: true, data: user });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (req.user?.id === id) {
        res.status(400).json({ success: false, error: '不能删除当前正在登录的账号' });
        return;
      }
      await authService.deleteUser(id);
      res.json({ success: true, message: '用户已删除' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const authController = new AuthController();
