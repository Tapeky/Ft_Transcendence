import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async connect(dbPath: string = './db/ft_transcendence.db'): Promise<Database> {
    if (this.db) {
      return this.db;
    }

    try {
      const dbDir = path.dirname(dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });

      await this.db.exec('PRAGMA foreign_keys = ON;');

      return this.db;
    } catch (error) {
      throw error;
    }
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');

      await this.db.exec(schema);

      await this.seedIfEmpty();
    } catch (error) {
      throw error;
    }
  }

  private async seedIfEmpty(): Promise<void> {
    if (!this.db) return;

    const userCount = await this.db.get('SELECT COUNT(*) as count FROM users');

    if (userCount.count === 0) {
      await this.seedTestData();
    }
  }

  private async seedTestData(): Promise<void> {
    if (!this.db) return;

    const bcrypt = await import('bcrypt');
    const saltRounds = 12;

    const testUsers = [
      {
        username: 'admin',
        email: 'admin@transcendence.com',
        password: await bcrypt.hash('admin123', saltRounds),
        display_name: 'Administrateur',
        data_consent: true,
      },
      {
        username: 'player1',
        email: 'player1@test.com',
        password: await bcrypt.hash('player123', saltRounds),
        display_name: 'Joueur 1',
        data_consent: true,
      },
      {
        username: 'player2',
        email: 'player2@test.com',
        password: await bcrypt.hash('player123', saltRounds),
        display_name: 'Joueur 2',
        data_consent: true,
      },
    ];

    for (const user of testUsers) {
      await this.db.run(
        `
        INSERT INTO users (username, email, password_hash, display_name, data_consent)
        VALUES (?, ?, ?, ?, ?)
      `,
        [user.username, user.email, user.password, user.display_name, user.data_consent]
      );
    }
  }

  getDb(): Database {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.all(sql, params);
  }

  async queryOne(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.get(sql, params);
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.run(sql, params);
  }

  async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Database not connected');

    await this.db.exec('BEGIN TRANSACTION');
    try {
      const result = await callback(this.db);
      await this.db.exec('COMMIT');
      return result;
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  async vacuum(): Promise<void> {
    if (!this.db) return;
    await this.db.exec('VACUUM');
  }

  async analyze(): Promise<void> {
    if (!this.db) return;
    await this.db.exec('ANALYZE');
  }

  async cleanupExpiredTokens(): Promise<void> {
    if (!this.db) return;

    const result = await this.db.run(`
      DELETE FROM jwt_tokens 
      WHERE expires_at < datetime('now') OR revoked = true
    `);
  }

  async getStats(): Promise<any> {
    if (!this.db) throw new Error('Database not connected');

    const stats = await Promise.all([
      this.db.get('SELECT COUNT(*) as users FROM users'),
      this.db.get('SELECT COUNT(*) as tournaments FROM tournaments'),
      this.db.get('SELECT COUNT(*) as matches FROM matches'),
      this.db.get(
        'SELECT COUNT(*) as active_tokens FROM jwt_tokens WHERE expires_at > datetime("now") AND revoked = false'
      ),
    ]);

    return {
      users: stats[0].users,
      tournaments: stats[1].tournaments,
      matches: stats[2].matches,
      active_tokens: stats[3].active_tokens,
      timestamp: new Date().toISOString(),
    };
  }
}
