import fs from 'fs';
import path from 'path';
import { User, Session, Category, Bookmark, SiteSettings } from '../../../packages/shared/types';
import { INITIAL_CATEGORIES, INITIAL_BOOKMARKS, DEFAULT_SETTINGS } from '../../../packages/shared/constants';
import { hashPassword } from '../security/password';

export interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  categories: Category[];
  bookmarks: Bookmark[];
  settings: SiteSettings;
}

const DB_PATH = path.resolve(process.cwd(), 'data', 'db.json');

class JsonDatabase {
  private cache: DatabaseSchema | null = null;
  private isWriting = false;

  constructor() {
    this.ensureDb();
  }

  private ensureDb(): void {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(DB_PATH)) {
        const initialData: DatabaseSchema = {
          users: [
            {
              id: 'usr-admin-1',
              username: 'admin',
              passwordHash: hashPassword('admin123'),
              createdAt: new Date().toISOString(),
            },
          ],
          sessions: [],
          categories: INITIAL_CATEGORIES,
          bookmarks: INITIAL_BOOKMARKS,
          settings: DEFAULT_SETTINGS,
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
        this.cache = initialData;
      }
    } catch (err) {
      console.error('Failed to ensure database file:', err);
    }
  }

  public read(): DatabaseSchema {
    if (this.cache) {
      return this.cache;
    }
    try {
      this.ensureDb();
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      this.cache = JSON.parse(content) as DatabaseSchema;
      return this.cache;
    } catch (err) {
      console.error('Error reading db.json:', err);
      return {
        users: [],
        sessions: [],
        categories: INITIAL_CATEGORIES,
        bookmarks: INITIAL_BOOKMARKS,
        settings: DEFAULT_SETTINGS,
      };
    }
  }

  public write(data: DatabaseSchema): void {
    this.cache = data;
    try {
      this.ensureDb();
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing to db.json:', err);
    }
  }

  public update(updater: (db: DatabaseSchema) => void): DatabaseSchema {
    const db = this.read();
    updater(db);
    this.write(db);
    return db;
  }
}

export const jsonDb = new JsonDatabase();
