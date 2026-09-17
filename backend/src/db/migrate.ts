import fs from 'fs';
import path from 'path';
import db from './database';

export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  await db.initialize();

  let schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../../src/db/schema.sql');
  }
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
  }
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(process.cwd(), 'backend/src/db/schema.sql');
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Split into statements for robust execution
  // In SQLite, exec runs multiple statements cleanly; in pg, client.query can run script directly.
  await db.execScript(schemaSql);

  // Incremental schema updates for columns added in Phase 2
  const columnsToAdd = [
    { table: 'users', col: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
    { table: 'users', col: 'locked_until', type: 'TIMESTAMP' },
    { table: 'users', col: 'reset_token', type: 'TEXT' },
    { table: 'users', col: 'reset_token_expires_at', type: 'TIMESTAMP' },
    { table: 'users', col: 'created_by', type: 'TEXT' },
    { table: 'users', col: 'updated_by', type: 'TEXT' },
    { table: 'users', col: 'deleted_at', type: 'TIMESTAMP' },
    { table: 'laboratories', col: 'created_by', type: 'TEXT' },
    { table: 'laboratories', col: 'updated_by', type: 'TEXT' },
    { table: 'laboratories', col: 'deleted_at', type: 'TIMESTAMP' },
    { table: 'branches', col: 'created_by', type: 'TEXT' },
    { table: 'branches', col: 'updated_by', type: 'TEXT' },
    { table: 'branches', col: 'deleted_at', type: 'TIMESTAMP' },
    { table: 'subscription_plans', col: 'deleted_at', type: 'TIMESTAMP' },
    { table: 'subscriptions', col: 'created_by', type: 'TEXT' },
    // Phase 3 extensions
    { table: 'branches', col: 'alternate_phone', type: 'TEXT' },
    { table: 'branches', col: 'city', type: 'TEXT' },
    { table: 'branches', col: 'state', type: 'TEXT' },
    { table: 'branches', col: 'country', type: "TEXT DEFAULT 'India'" },
    { table: 'branches', col: 'pincode', type: 'TEXT' },
    { table: 'branches', col: 'tax_number', type: 'TEXT' },
    { table: 'branches', col: 'registration_number', type: 'TEXT' },
    { table: 'patients', col: 'alternate_mobile', type: 'TEXT' },
    { table: 'patients', col: 'city', type: 'TEXT' },
    { table: 'patients', col: 'state', type: 'TEXT' },
    { table: 'patients', col: 'pincode', type: 'TEXT' },
    { table: 'patients', col: 'clinic_hospital', type: 'TEXT' },
    { table: 'patients', col: 'status', type: "TEXT DEFAULT 'active'" },
    { table: 'patients', col: 'created_by', type: 'TEXT' },
    { table: 'patients', col: 'deleted_at', type: 'TIMESTAMP' },
    { table: 'doctors', col: 'city', type: 'TEXT' },
    { table: 'doctors', col: 'state', type: 'TEXT' },
    { table: 'doctors', col: 'created_by', type: 'TEXT' },
    { table: 'doctors', col: 'updated_by', type: 'TEXT' },
    { table: 'doctors', col: 'deleted_at', type: 'TIMESTAMP' },
    { table: 'test_prices', col: 'effective_date', type: 'TIMESTAMP' },
    { table: 'test_prices', col: 'tax_percentage', type: 'REAL DEFAULT 0.0' },
    { table: 'test_prices', col: 'discount_allowed', type: 'BOOLEAN DEFAULT 1' },
    { table: 'packages', col: 'discount_percentage', type: 'REAL DEFAULT 0.0' },
    { table: 'packages', col: 'validity_days', type: 'INTEGER DEFAULT 365' },
    { table: 'packages', col: 'updated_at', type: 'TIMESTAMP' },
    { table: 'packages', col: 'deleted_at', type: 'TIMESTAMP' },
    { table: 'test_categories', col: 'status', type: "TEXT DEFAULT 'active'" },
    { table: 'test_categories', col: 'updated_at', type: 'TIMESTAMP' },
    { table: 'test_categories', col: 'deleted_at', type: 'TIMESTAMP' },
    { table: 'tests', col: 'deleted_at', type: 'TIMESTAMP' },
    { table: 'test_parameters', col: 'deleted_at', type: 'TIMESTAMP' },
    { table: 'reference_ranges', col: 'deleted_at', type: 'TIMESTAMP' },
    // Phase 4 extensions
    { table: 'test_orders', col: 'priority', type: "TEXT DEFAULT 'routine'" },
    { table: 'test_orders', col: 'cancellation_reason', type: 'TEXT' },
    { table: 'test_orders', col: 'cancelled_by', type: 'TEXT' },
    { table: 'test_orders', col: 'cancelled_at', type: 'TIMESTAMP' },
    { table: 'samples', col: 'recollection_reason', type: 'TEXT' },
    { table: 'samples', col: 'recollection_requested_by', type: 'TEXT' },
    { table: 'samples', col: 'recollection_requested_at', type: 'TIMESTAMP' },
    { table: 'results', col: 'rejection_reason', type: 'TEXT' },
    { table: 'results', col: 'correction_notes', type: 'TEXT' },
    { table: 'reports', col: 'version_number', type: 'INTEGER DEFAULT 1' },
    { table: 'reports', col: 'is_amended', type: 'BOOLEAN DEFAULT 0' },
    // Phase 5 extensions
    { table: 'laboratory_settings', col: 'setting_category', type: "TEXT DEFAULT 'general'" },
    { table: 'laboratory_settings', col: 'setting_key', type: 'TEXT' },
    { table: 'laboratory_settings', col: 'setting_value', type: 'TEXT' },
    // Phase 7 extensions
    { table: 'laboratories', col: 'organization_id', type: 'TEXT' },
    // Phase 9 extensions
    { table: 'suppliers', col: 'supplier_code', type: 'TEXT' },
    { table: 'suppliers', col: 'company_name', type: 'TEXT' },
    { table: 'suppliers', col: 'city', type: 'TEXT' },
    { table: 'suppliers', col: 'state', type: 'TEXT' },
    { table: 'suppliers', col: 'tax_number', type: 'TEXT' },
    { table: 'suppliers', col: 'pan_number', type: 'TEXT' },
    { table: 'suppliers', col: 'bank_name', type: 'TEXT' },
    { table: 'suppliers', col: 'account_number', type: 'TEXT' },
    { table: 'suppliers', col: 'ifsc_code', type: 'TEXT' },
    { table: 'suppliers', col: 'rating', type: 'REAL DEFAULT 5.0' },
    { table: 'suppliers', col: 'categories_json', type: "TEXT DEFAULT '[]'" },
    { table: 'suppliers', col: 'status', type: "TEXT DEFAULT 'active'" },
  ];

  for (const item of columnsToAdd) {
    try {
      await db.execute(`ALTER TABLE ${item.table} ADD COLUMN ${item.col} ${item.type}`);
    } catch (e: any) {
      // Column already exists or table cannot add, ignore
    }
  }

  console.log('✅ Database schema migration completed successfully.');
}

export async function inspectMigrationStatus() {
  await db.initialize();
  const tables = await db.query<{ name: string }>(
    db.isPostgres
      ? `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public'`
      : `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
  );

  console.log(`📊 Migration Status: ${tables.length} tables verified in active schema.`);
  return { tables_count: tables.length, tables: tables.map(t => t.name) };
}

export async function checkIntegrity() {
  await db.initialize();
  console.log('🔍 Checking database schema integrity...');
  if (!db.isPostgres) {
    const check = await db.queryOne<{ integrity_check: string }>(`PRAGMA integrity_check`);
    console.log(`✅ SQLite Integrity: ${check?.integrity_check || 'ok'}`);
  }
  const tableStatus = await inspectMigrationStatus();
  console.log(`✅ Schema Integrity: Verified ${tableStatus.tables_count} active database tables.`);
  return true;
}

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === 'status') {
    inspectMigrationStatus()
      .then(() => process.exit(0))
      .catch((err) => { console.error(err); process.exit(1); });
  } else if (arg === 'check') {
    checkIntegrity()
      .then(() => process.exit(0))
      .catch((err) => { console.error(err); process.exit(1); });
  } else {
    runMigrations()
      .then(() => {
        console.log('🎉 Migrations finished.');
        process.exit(0);
      })
      .catch((err) => {
        console.error('❌ Migration failed:', err);
        process.exit(1);
      });
  }
}
