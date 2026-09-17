import { User } from '../../../packages/shared/types';
import { jsonDb } from './json.repository';

export class UserRepository {
  async findByUsername(username: string): Promise<User | null> {
    const db = jsonDb.read();
    return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  async findById(id: string): Promise<User | null> {
    const db = jsonDb.read();
    return db.users.find((u) => u.id === id) || null;
  }

  async findAll(): Promise<User[]> {
    const db = jsonDb.read();
    return db.users;
  }

  async create(user: User): Promise<User> {
    jsonDb.update((db) => {
      db.users.push(user);
    });
    return user;
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    let success = false;
    jsonDb.update((db) => {
      const u = db.users.find((user) => user.id === id);
      if (u) {
        u.passwordHash = passwordHash;
        success = true;
      }
    });
    return success;
  }

  async delete(id: string): Promise<boolean> {
    let success = false;
    jsonDb.update((db) => {
      if (db.users.length <= 1) {
        return; // Prevent deleting the last remaining admin
      }
      const initial = db.users.length;
      db.users = db.users.filter((u) => u.id !== id);
      success = db.users.length < initial;
    });
    return success;
  }
}

export const userRepository = new UserRepository();
