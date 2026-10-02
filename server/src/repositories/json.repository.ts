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
  backupMeta?: {
    lastBackupAt?: string;
    lastIncrementalSync?: string;
    version?: number;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.resolve(DATA_DIR, 'db.json');
const DB_BACKUP_PATH = path.resolve(DATA_DIR, 'db.backup.json');

class JsonDatabase {
  private cache: DatabaseSchema | null = null;
  private isWriting = false;

  constructor() {
    this.ensureDb();
  }

  private getDefaultData(): DatabaseSchema {
    return {
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
      backupMeta: {
        lastBackupAt: new Date().toISOString(),
        version: 1,
      },
    };
  }

  private ensureDb(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(DB_PATH)) {
        // If backup exists, restore from backup
        if (fs.existsSync(DB_BACKUP_PATH)) {
          try {
            const backupContent = fs.readFileSync(DB_BACKUP_PATH, 'utf-8');
            const parsed = JSON.parse(backupContent) as DatabaseSchema;
            if (parsed && Array.isArray(parsed.bookmarks) && Array.isArray(parsed.categories)) {
              fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
              this.cache = parsed;
              return;
            }
          } catch (e) {
            console.warn('[JsonDatabase] Failed to restore from backup:', e);
          }
        }

        const initialData = this.getDefaultData();
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
        fs.writeFileSync(DB_BACKUP_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
        this.cache = initialData;
      }
    } catch (err) {
      console.error('[JsonDatabase] Failed to ensure database file:', err);
    }
  }

  public read(): DatabaseSchema {
    if (this.cache) {
      return this.cache;
    }
    try {
      this.ensureDb();
      if (!fs.existsSync(DB_PATH)) {
        throw new Error('Database file does not exist');
      }
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      if (!content || !content.trim()) {
        throw new Error('Database file is empty');
      }
      const parsed = JSON.parse(content) as DatabaseSchema;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.bookmarks)) {
        throw new Error('Invalid database schema structure');
      }
      this.cache = parsed;
      return this.cache;
    } catch (err) {
      console.error('[JsonDatabase] Error reading db.json, attempting recovery from backup:', err);
      // Try restoring from backup
      try {
        if (fs.existsSync(DB_BACKUP_PATH)) {
          const backupContent = fs.readFileSync(DB_BACKUP_PATH, 'utf-8');
          const backupParsed = JSON.parse(backupContent) as DatabaseSchema;
          if (backupParsed && Array.isArray(backupParsed.bookmarks)) {
            this.cache = backupParsed;
            // Write restored backup back to DB_PATH
            this.write(backupParsed);
            return this.cache;
          }
        }
      } catch (backupErr) {
        console.error('[JsonDatabase] Backup restore failed as well:', backupErr);
      }

      const defaultData = this.getDefaultData();
      this.cache = defaultData;
      return defaultData;
    }
  }

  public write(data: DatabaseSchema): void {
    this.cache = data;
    try {
      this.ensureDb();
      const tmpPath = `${DB_PATH}.tmp.${Date.now()}`;
      const jsonContent = JSON.stringify(data, null, 2);
      // Atomic write using temp file + rename
      fs.writeFileSync(tmpPath, jsonContent, 'utf-8');
      fs.renameSync(tmpPath, DB_PATH);

      // Keep backup file synchronized
      try {
        fs.writeFileSync(DB_BACKUP_PATH, jsonContent, 'utf-8');
      } catch (backupErr) {
        // Non-critical, ignore
      }
    } catch (err) {
      console.error('[JsonDatabase] Error writing to db.json:', err);
      // Fallback direct write
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
      } catch (fatalErr) {
        console.error('[JsonDatabase] Fatal: direct write failed:', fatalErr);
        throw fatalErr;
      }
    }
  }

  public update(updater: (db: DatabaseSchema) => void): DatabaseSchema {
    const db = this.read();
    updater(db);
    this.write(db);
    return db;
  }

  /**
   * Run full persistence verification for health checks
   */
  public verifyStorageHealth(): {
    healthy: boolean;
    path: string;
    bookmarksCount: number;
    categoriesCount: number;
    writeable: boolean;
    lastVerifiedAt: string;
    message?: string;
  } {
    try {
      this.ensureDb();
      const db = this.read();
      // Test writability
      fs.accessSync(DATA_DIR, fs.constants.W_OK | fs.constants.R_OK);
      fs.accessSync(DB_PATH, fs.constants.W_OK | fs.constants.R_OK);

      return {
        healthy: true,
        path: 'data/db.json',
        bookmarksCount: db.bookmarks?.length || 0,
        categoriesCount: db.categories?.length || 0,
        writeable: true,
        lastVerifiedAt: new Date().toISOString(),
        message: '数据持久层读写校验正常',
      };
    } catch (err: any) {
      return {
        healthy: false,
        path: 'data/db.json',
        bookmarksCount: this.cache?.bookmarks?.length || 0,
        categoriesCount: this.cache?.categories?.length || 0,
        writeable: false,
        lastVerifiedAt: new Date().toISOString(),
        message: `持久化存储异常: ${err?.message || '未知错误'}`,
      };
    }
  }

  /**
   * Auto-heal database integrity if users/categories are missing
   */
  public repairDatabase(): {
    repaired: boolean;
    message: string;
    bookmarksCount: number;
    categoriesCount: number;
  } {
    try {
      const db = this.read();
      let modified = false;

      if (!Array.isArray(db.users) || db.users.length === 0) {
        db.users = [
          {
            id: 'usr-admin-1',
            username: 'admin',
            passwordHash: hashPassword('admin123'),
            createdAt: new Date().toISOString(),
          },
        ];
        modified = true;
      }

      if (!Array.isArray(db.categories) || db.categories.length === 0) {
        db.categories = INITIAL_CATEGORIES;
        modified = true;
      }

      if (!Array.isArray(db.bookmarks) || db.bookmarks.length === 0) {
        db.bookmarks = INITIAL_BOOKMARKS;
        modified = true;
      }

      if (!db.settings) {
        db.settings = DEFAULT_SETTINGS;
        modified = true;
      }

      if (modified) {
        this.write(db);
      }

      return {
        repaired: true,
        message: '数据库自愈与校验完成，数据结构已恢复正常',
        bookmarksCount: db.bookmarks.length,
        categoriesCount: db.categories.length,
      };
    } catch (err: any) {
      return {
        repaired: false,
        message: `自愈失败: ${err?.message || '未知错误'}`,
        bookmarksCount: 0,
        categoriesCount: 0,
      };
    }
  }
}

export const jsonDb = new JsonDatabase();
