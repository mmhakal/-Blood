/**
 * BaseRepository — Foundation for Module Database Boundaries
 * 
 * Enforces:
 * - One Module -> One Database Table Owner
 * - Repositories may only execute write operations (INSERT, UPDATE, DELETE) against tables they own.
 * - Multi-tenant isolation context.
 */

import db from '../db/database';
import Logger from '../services/logger';

export abstract class BaseRepository {
  public abstract readonly moduleName: string;
  public abstract readonly tablesOwned: string[];

  /**
   * Validates whether a given table name belongs to this repository's module boundary.
   */
  public ownsTable(tableName: string): boolean {
    const cleanTable = tableName.trim().toLowerCase();
    return this.tablesOwned.map(t => t.toLowerCase()).includes(cleanTable);
  }

  /**
   * Enforces that a mutating query only targets tables owned by this module.
   */
  protected validateTableAccess(targetTable: string, operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT'): void {
    if (operation !== 'SELECT' && !this.ownsTable(targetTable)) {
      const err = `ARCHITECTURAL BOUNDARY VIOLATION: Module '${this.moduleName}' cannot perform ${operation} on table '${targetTable}'. It is owned by another module.`;
      Logger.error(`[RepositoryBoundaryViolation] ${err}`, {
        module: this.moduleName,
        targetTable,
        operation
      });
      throw new Error(err);
    }
  }

  /**
   * Execute raw SQL with parameter binding.
   */
  public async execute(sql: string, params: any[] = []): Promise<any> {
    return db.execute(sql, params);
  }

  /**
   * Query multiple rows with parameter binding.
   */
  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return db.query<T>(sql, params);
  }

  /**
   * Query single row with parameter binding.
   */
  public async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    return db.queryOne<T>(sql, params);
  }
}

export default BaseRepository;
