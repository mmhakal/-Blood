import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { Pool, PoolClient } from 'pg';
import Database from 'better-sqlite3';

dotenv.config();

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

class DatabaseManager {
  private pgPool: Pool | null = null;
  private sqliteDb: any | null = null;
  public isPostgres = false;
  private initialized = false;

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    const dbType = process.env.DB_TYPE || 'auto';

    if (dbType === 'postgres' || dbType === 'auto') {
      try {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'blood_lis_db',
          connectionTimeoutMillis: 3000,
        });

        // Test postgres connection
        const client = await pool.connect();
        client.release();
        this.pgPool = pool;
        this.isPostgres = true;
        this.initialized = true;
        console.log('✅ Connected to PostgreSQL database successfully.');
        return;
      } catch (err: any) {
        if (dbType === 'postgres') {
          console.error('❌ PostgreSQL connection error:', err.message);
          throw err;
        }
        console.warn('⚠️ PostgreSQL not reachable, initializing embedded SQLite relational database...');
      }
    }

    // Fallback to SQLite
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'blood_lis.db');
    this.sqliteDb = new Database(dbPath);
    this.sqliteDb.pragma('journal_mode = WAL');
    this.sqliteDb.pragma('foreign_keys = ON');
    this.isPostgres = false;
    this.initialized = true;
    console.log(`✅ Embedded Relational Database initialized at: ${dbPath}`);
  }

  // Map PostgreSQL $1, $2 parameter placeholders and repeated indexes to SQLite ? parameters
  private prepareSqlAndParams(sql: string, params: any[]): { sql: string; params: any[] } {
    if (this.isPostgres) {
      return { sql, params };
    }
    const sqliteParams: any[] = [];
    const sqliteSql = sql.replace(/\$(\d+)/g, (_, numStr) => {
      const idx = parseInt(numStr, 10) - 1;
      sqliteParams.push(params[idx]);
      return '?';
    });
    return { sql: sqliteSql, params: sqliteParams };
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    await this.initialize();

    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return res.rows as T[];
    } else if (this.sqliteDb) {
      const prepared = this.prepareSqlAndParams(sql, params);
      const stmt = this.sqliteDb.prepare(prepared.sql);
      return stmt.all(...prepared.params) as T[];
    }
    throw new Error('Database not initialized');
  }

  public async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  public async execute(sql: string, params: any[] = []): Promise<{ rowCount: number }> {
    await this.initialize();

    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return { rowCount: res.rowCount || 0 };
    } else if (this.sqliteDb) {
      const prepared = this.prepareSqlAndParams(sql, params);
      const stmt = this.sqliteDb.prepare(prepared.sql);
      const info = stmt.run(...prepared.params);
      return { rowCount: info.changes };
    }
    throw new Error('Database not initialized');
  }

  public async execScript(sql: string): Promise<void> {
    await this.initialize();

    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(sql);
    } else if (this.sqliteDb) {
      this.sqliteDb.exec(sql);
    }
  }

  public async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
    this.initialized = false;
  }
}

export const db = new DatabaseManager();
export default db;
