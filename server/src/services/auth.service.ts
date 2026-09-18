import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository';
import { sessionRepository } from '../repositories/session.repository';
import { verifyPassword, hashPassword } from '../security/password';
import { generateToken, hashToken, hashIdentifier } from '../security/token';
import { User, Session } from '../../../packages/shared/types';

export class AuthService {
  async login(username: string | undefined, password: string, ip?: string, userAgent?: string): Promise<{ token: string; user: { id: string; username: string } }> {
    let users = await userRepository.findAll();
    let user = users[0];

    // 如果指定了 username 则优先查找，找不到再退回主管理员账号
    if (username && username.trim()) {
      const found = await userRepository.findByUsername(username.trim());
      if (found) user = found;
    }

    if (!user) {
      // 若数据库尚无账号，自动创建首个单用户主账号
      const defaultHash = hashPassword('admin123');
      user = await userRepository.create({
        id: 'usr-admin-default',
        username: 'admin',
        passwordHash: defaultHash,
        createdAt: new Date().toISOString(),
      });
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('管理密码错误，请重新输入');
    }

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    const session: Session = {
      id: 'sess-' + crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      ipHash: ip ? hashIdentifier(ip) : undefined,
      userAgentHash: userAgent ? hashIdentifier(userAgent) : undefined,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    await sessionRepository.create(session);

    return {
      token: rawToken,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }

  async validateToken(token: string): Promise<User | null> {
    if (!token) return null;
    const tokenHash = hashToken(token);
    const session = await sessionRepository.findByTokenHash(tokenHash);
    if (!session) return null;

    return userRepository.findById(session.userId);
  }

  async logout(token: string): Promise<void> {
    if (!token) return;
    const tokenHash = hashToken(token);
    await sessionRepository.deleteByTokenHash(tokenHash);
  }

  async changePassword(userId: string, oldPass: string, newPass: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('管理员账户不存在');
    }
    if (!verifyPassword(oldPass, user.passwordHash)) {
      throw new Error('原管理密码不正确');
    }
    if (!newPass || newPass.length < 6) {
      throw new Error('新密码长度不能少于 6 位');
    }
    const newHash = hashPassword(newPass);
    await userRepository.updatePassword(userId, newHash);
    // 强制注销该用户的所有旧登录会话，保障安全性
    await sessionRepository.deleteByUserId(userId);
  }

  async listUsers(): Promise<{ id: string; username: string; createdAt: string }[]> {
    const users = await userRepository.findAll();
    return users.map((u) => ({ id: u.id, username: u.username, createdAt: u.createdAt }));
  }

  async createUser(username: string, password: string): Promise<{ id: string; username: string }> {
    const existing = await userRepository.findByUsername(username);
    if (existing) {
      throw new Error('用户名已存在');
    }
    if (!username || username.trim().length < 3) {
      throw new Error('用户名长度至少 3 位');
    }
    if (!password || password.length < 6) {
      throw new Error('密码长度至少 6 位');
    }

    const newUser: User = {
      id: 'usr-' + crypto.randomUUID(),
      username: username.trim(),
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    await userRepository.create(newUser);
    return { id: newUser.id, username: newUser.username };
  }

  async deleteUser(id: string): Promise<void> {
    const deleted = await userRepository.delete(id);
    if (!deleted) {
      throw new Error('删除用户失败，系统必须保留至少一个管理员账户');
    }
    await sessionRepository.deleteByUserId(id);
  }
}

export const authService = new AuthService();
