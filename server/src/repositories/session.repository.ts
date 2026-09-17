import { Session } from '../../../packages/shared/types';
import { jsonDb } from './json.repository';

export class SessionRepository {
  async create(session: Session): Promise<Session> {
    jsonDb.update((db) => {
      // Clean expired sessions
      const now = new Date().toISOString();
      db.sessions = db.sessions.filter((s) => s.expiresAt > now);
      db.sessions.push(session);
    });
    return session;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const db = jsonDb.read();
    const now = new Date().toISOString();
    return db.sessions.find((s) => s.tokenHash === tokenHash && s.expiresAt > now) || null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    jsonDb.update((db) => {
      db.sessions = db.sessions.filter((s) => s.tokenHash !== tokenHash);
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    jsonDb.update((db) => {
      db.sessions = db.sessions.filter((s) => s.userId !== userId);
    });
  }
}

export const sessionRepository = new SessionRepository();
