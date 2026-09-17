import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';

const BACKUP_DIR = path.resolve(__dirname, '../../backups');

export async function createDatabaseBackup(labId?: string | null, userId?: string | null): Promise<any> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${labId ? labId + '_' : 'system_'}${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  const tables = [
    'laboratories', 'branches', 'roles', 'permissions', 'role_permissions', 'users', 'user_branches',
    'subscription_plans', 'subscriptions', 'doctors', 'patients', 'test_categories', 'tests',
    'test_parameters', 'reference_ranges', 'test_prices', 'packages', 'package_tests',
    'test_orders', 'order_items', 'samples', 'sample_events', 'results', 'result_values',
    'reports', 'report_versions', 'report_templates', 'invoices', 'payments', 'refunds',
    'system_settings', 'laboratory_settings', 'branch_settings', 'audit_logs'
  ];

  const dump: Record<string, any[]> = {};

  for (const table of tables) {
    try {
      if (labId && ['patients', 'doctors', 'test_orders', 'samples', 'results', 'reports', 'invoices'].includes(table)) {
        dump[table] = await db.query(`SELECT * FROM ${table} WHERE lab_id = $1`, [labId]);
      } else {
        dump[table] = await db.query(`SELECT * FROM ${table}`);
      }
    } catch (e: any) {
      dump[table] = [];
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(dump, null, 2), 'utf8');
  const stats = fs.statSync(filePath);

  const backupId = `bk-${uuidv4().substring(0, 8)}`;
  await db.execute(
    `INSERT INTO backups (id, lab_id, filename, file_size_bytes, backup_type, status, created_by)
     VALUES ($1, $2, $3, $4, 'manual', 'completed', $5)`,
    [backupId, labId || null, filename, stats.size, userId || null]
  );

  return {
    id: backupId,
    filename,
    size_bytes: stats.size,
    created_at: new Date().toISOString(),
  };
}

export async function listBackups(labId?: string | null) {
  if (labId) {
    return await db.query(`SELECT * FROM backups WHERE lab_id = $1 ORDER BY created_at DESC`, [labId]);
  }
  return await db.query(`SELECT * FROM backups ORDER BY created_at DESC`);
}

export function getBackupFilePath(filename: string): string | null {
  const filePath = path.join(BACKUP_DIR, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}
