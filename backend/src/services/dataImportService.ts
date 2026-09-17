import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import Logger from './logger';

export type ImportEntity = 'patients' | 'doctors' | 'tests' | 'inventory';

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export interface ImportValidationResult {
  entity: ImportEntity;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors: ValidationError[];
  preview: any[];
  can_import: boolean;
}

export class DataImportService {
  /**
   * Parse CSV string into array of objects.
   */
  static parseCSV(csvContent: string): Record<string, string>[] {
    const lines = csvContent.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Handle simple CSV splitting
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      rows.push(obj);
    }

    return rows;
  }

  /**
   * Validate records before import.
   */
  static async validate(entity: ImportEntity, records: Record<string, any>[], labId: string): Promise<ImportValidationResult> {
    const errors: ValidationError[] = [];
    const preview = records.slice(0, 5);

    for (let idx = 0; idx < records.length; idx++) {
      const row = idx + 2; // 1-indexed including header
      const rec = records[idx];

      if (entity === 'patients') {
        if (!rec.name) errors.push({ row, field: 'name', value: rec.name, message: 'Patient name is mandatory' });
        if (!rec.gender) errors.push({ row, field: 'gender', value: rec.gender, message: 'Gender is mandatory' });
        if (!rec.dob && !rec.age) errors.push({ row, field: 'dob/age', value: null, message: 'Either DOB or Age is required' });
        if (rec.mobile && !/^\d{10}$/.test(rec.mobile.replace(/\D/g, ''))) {
          errors.push({ row, field: 'mobile', value: rec.mobile, message: 'Mobile must be a 10-digit number' });
        }
      } else if (entity === 'doctors') {
        if (!rec.name) errors.push({ row, field: 'name', value: rec.name, message: 'Doctor name is mandatory' });
        if (!rec.qualification) errors.push({ row, field: 'qualification', value: rec.qualification, message: 'Qualification is required' });
      } else if (entity === 'tests') {
        if (!rec.name) errors.push({ row, field: 'name', value: rec.name, message: 'Test name is mandatory' });
        if (!rec.code) errors.push({ row, field: 'code', value: rec.code, message: 'Test unique code is mandatory' });
        if (rec.base_price && isNaN(Number(rec.base_price))) {
          errors.push({ row, field: 'base_price', value: rec.base_price, message: 'Base price must be a valid numeric value' });
        }
      } else if (entity === 'inventory') {
        if (!rec.name) errors.push({ row, field: 'name', value: rec.name, message: 'Item name is mandatory' });
        if (!rec.code) errors.push({ row, field: 'code', value: rec.code, message: 'Item SKU/code is mandatory' });
        if (!rec.unit) errors.push({ row, field: 'unit', value: rec.unit, message: 'Unit (Vial/Pack/Kit) is mandatory' });
      }
    }

    const validRows = records.length - new Set(errors.map(e => e.row)).size;
    const invalidRows = records.length - validRows;

    return {
      entity,
      total_rows: records.length,
      valid_rows: validRows,
      invalid_rows: invalidRows,
      errors,
      preview,
      can_import: errors.length === 0
    };
  }

  /**
   * Execute verified import batch into database.
   */
  static async executeImport(entity: ImportEntity, records: Record<string, any>[], labId: string, userId?: string) {
    let importedCount = 0;

    for (const rec of records) {
      if (entity === 'patients') {
        const id = `pid-${uuidv4().substring(0, 8)}`;
        const code = rec.patient_id_code || `PID-${Date.now().toString().slice(-6)}`;
        let branchId = rec.branch_id;
        if (!branchId) {
          const defaultBranch = await db.queryOne<{ id: string }>(
            `SELECT id FROM branches WHERE lab_id = $1 AND status = 'active' ORDER BY created_at ASC LIMIT 1`,
            [labId]
          );
          branchId = defaultBranch?.id || 'branch-apex-main';
        }
        await db.execute(
          `INSERT INTO patients (id, lab_id, branch_id, name, patient_id_code, gender, dob, age, mobile, email, address, city)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            id,
            labId,
            branchId,
            rec.name,
            code,
            rec.gender || 'Male',
            rec.dob || null,
            rec.age ? Number(rec.age) : null,
            rec.mobile || '',
            rec.email || '',
            rec.address || '',
            rec.city || ''
          ]
        );
        importedCount++;
      } else if (entity === 'doctors') {
        const id = `doc-${uuidv4().substring(0, 8)}`;
        await db.execute(
          `INSERT INTO doctors (id, lab_id, name, qualification, specialization, mobile, email, clinic_hospital_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            labId,
            rec.name,
            rec.qualification || 'MBBS',
            rec.specialization || 'General Physician',
            rec.mobile || '',
            rec.email || '',
            rec.clinic_hospital_name || ''
          ]
        );
        importedCount++;
      } else if (entity === 'tests') {
        const id = `test-${uuidv4().substring(0, 8)}`;
        await db.execute(
          `INSERT INTO tests (id, lab_id, code, name, department, sample_type, base_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            labId,
            rec.code.trim().toUpperCase(),
            rec.name,
            rec.department || 'Hematology',
            rec.sample_type || 'Whole Blood',
            rec.base_price ? Number(rec.base_price) : 250.0
          ]
        );
        importedCount++;
      } else if (entity === 'inventory') {
        const id = `item-${uuidv4().substring(0, 8)}`;
        await db.execute(
          `INSERT INTO inventory_items (id, lab_id, code, name, unit, current_stock, min_stock)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            labId,
            rec.code.trim().toUpperCase(),
            rec.name,
            rec.unit || 'Pack',
            rec.current_stock ? Number(rec.current_stock) : 0,
            rec.min_stock ? Number(rec.min_stock) : 10
          ]
        );
        importedCount++;
      }
    }

    Logger.info(`Data migration imported ${importedCount} records for entity ${entity}`, {
      lab_id: labId,
      entity,
      imported_count: importedCount
    });

    return { imported_count: importedCount };
  }

  /**
   * Stream standard CSV templates for downloading.
   */
  static getTemplate(entity: ImportEntity): string {
    switch (entity) {
      case 'patients':
        return 'name,gender,dob,age,mobile,email,address,city\n"Rohan Deshmukh","Male","1988-04-12",38,"9899964201","rohan@example.com","Andheri East","Mumbai"\n';
      case 'doctors':
        return 'name,qualification,specialization,mobile,email,clinic_hospital_name\n"Dr. Arthur Henderson","MBBS, MD","Internal Medicine","9823456789","dr.arthur@hospital.com","Metro Care"\n';
      case 'tests':
        return 'code,name,department,sample_type,base_price\n"CBC","Complete Blood Count","Hematology","Whole Blood (EDTA)",350.00\n';
      case 'inventory':
        return 'code,name,unit,current_stock,min_stock\n"SYS-DIFF-500","Sysmex Cellpack DCL Diluent","Pack",45,10\n';
      default:
        return '';
    }
  }
}

export default DataImportService;
