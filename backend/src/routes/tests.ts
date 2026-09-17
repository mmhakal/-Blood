import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// ==========================================
// 1. CSV EXPORT & IMPORT ENGINE
// ==========================================

// GET /api/tests/export - export test catalog to CSV
router.get('/export', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const tests = await db.query(
      `SELECT t.code, t.name, t.department, tc.name as category_name, t.sample_type,
              t.container_type, t.method, t.turnaround_time_hours, t.base_price, t.status,
              tp.name as param_name, tp.short_name as param_code, tp.result_type, tp.unit,
              tp.decimal_precision, rr.gender as ref_gender, rr.normal_min, rr.normal_max,
              rr.critical_low, rr.critical_high, rr.text_range
       FROM tests t
       LEFT JOIN test_categories tc ON t.category_id = tc.id
       LEFT JOIN test_parameters tp ON t.id = tp.test_id
       LEFT JOIN reference_ranges rr ON tp.id = rr.parameter_id
       WHERE (t.lab_id = $1 OR t.lab_id IS NULL) AND t.deleted_at IS NULL
       ORDER BY t.code ASC, tp.display_order ASC`,
      [labId]
    );

    const headers = [
      'Test Code', 'Test Name', 'Department', 'Category', 'Sample Type',
      'Container', 'Method', 'TAT Hours', 'Base Price', 'Status',
      'Parameter Name', 'Parameter Code', 'Result Type', 'Unit', 'Precision',
      'Ref Gender', 'Normal Min', 'Normal Max', 'Critical Low', 'Critical High', 'Text Range'
    ];

    const csvRows = [headers.join(',')];

    for (const r of tests) {
      csvRows.push([
        `"${r.code || ''}"`,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${r.department || ''}"`,
        `"${r.category_name || ''}"`,
        `"${r.sample_type || ''}"`,
        `"${r.container_type || ''}"`,
        `"${(r.method || '').replace(/"/g, '""')}"`,
        r.turnaround_time_hours || 4,
        r.base_price || 0,
        `"${r.status || 'active'}"`,
        `"${(r.param_name || '').replace(/"/g, '""')}"`,
        `"${r.param_code || ''}"`,
        `"${r.result_type || 'numeric'}"`,
        `"${r.unit || ''}"`,
        r.decimal_precision ?? 2,
        `"${r.ref_gender || 'Both'}"`,
        r.normal_min ?? '',
        r.normal_max ?? '',
        r.critical_low ?? '',
        r.critical_high ?? '',
        `"${(r.text_range || '').replace(/"/g, '""')}"`
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="test_catalog_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvRows.join('\n'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/import - bulk import tests from CSV data
router.post('/import', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const { csv_data } = req.body;
  const labId = req.user?.lab_id;

  if (!csv_data || typeof csv_data !== 'string') {
    res.status(400).json({ error: 'Valid CSV string data is required in csv_data field' });
    return;
  }

  try {
    const lines = csv_data.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      res.status(400).json({ error: 'CSV file contains no data rows' });
      return;
    }

    const errors: string[] = [];
    let importedCount = 0;

    // Simple line parser handling double-quoted CSV fields
    const parseCsvLine = (text: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
          if (inQuotes && text[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          result.push(cur);
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur);
      return result.map(s => s.trim());
    };

    for (let idx = 1; idx < lines.length; idx++) {
      const cols = parseCsvLine(lines[idx]);
      if (cols.length < 2) continue;

      const [
        code, name, department, categoryName, sampleType,
        containerType, method, tatHours, basePrice, status,
        paramName, paramCode, resultType, unit, precision,
        refGender, normalMin, normalMax, criticalLow, criticalHigh, textRange
      ] = cols;

      if (!code || !name) {
        errors.push(`Row ${idx + 1}: Test Code and Test Name are mandatory.`);
        continue;
      }

      // Check if test already exists in this lab
      let testRecord = await db.queryOne<{ id: string }>(
        `SELECT id FROM tests WHERE (lab_id = $1 OR lab_id IS NULL) AND UPPER(code) = UPPER($2)`,
        [labId, code]
      );

      let testId = testRecord?.id;
      if (!testId) {
        testId = `test-${uuidv4().substring(0, 8)}`;
        await db.execute(
          `INSERT INTO tests (id, lab_id, code, name, department, sample_type, container_type, method, turnaround_time_hours, base_price, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            testId, labId, code.toUpperCase(), name, department || 'Clinical Pathology',
            sampleType || 'Whole Blood', containerType || 'Standard', method || '',
            parseInt(tatHours, 10) || 4, parseFloat(basePrice) || 500, status || 'active'
          ]
        );
      }

      // If parameter name is supplied, create parameter
      if (paramName) {
        const paramId = `param-${uuidv4().substring(0, 8)}`;
        await db.execute(
          `INSERT INTO test_parameters (id, test_id, name, short_name, result_type, unit, decimal_precision)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            paramId, testId, paramName, paramCode || paramName, resultType || 'numeric',
            unit || '', parseInt(precision, 10) || 2
          ]
        );

        // If reference range exists
        if (normalMin || normalMax || textRange) {
          const refId = `ref-${uuidv4().substring(0, 8)}`;
          await db.execute(
            `INSERT INTO reference_ranges (id, parameter_id, gender, normal_min, normal_max, critical_low, critical_high, text_range)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              refId, paramId, refGender || 'Both',
              normalMin ? parseFloat(normalMin) : null,
              normalMax ? parseFloat(normalMax) : null,
              criticalLow ? parseFloat(criticalLow) : null,
              criticalHigh ? parseFloat(criticalHigh) : null,
              textRange || null
            ]
          );
        }
      }

      importedCount++;
    }

    auditFromReq(req, 'IMPORT_TEST_CATALOG', 'test', null, null, { imported_rows: importedCount, error_count: errors.length });

    res.json({
      message: `Successfully processed ${importedCount} items`,
      imported_count: importedCount,
      errors
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. TEST CATEGORIES
// ==========================================

// GET /api/tests/categories - list test categories
router.get('/categories', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const categories = await db.query(
      `SELECT tc.*,
              (SELECT COUNT(*) FROM tests WHERE category_id = tc.id AND deleted_at IS NULL) as test_count
       FROM test_categories tc
       WHERE (tc.lab_id = $1 OR tc.lab_id IS NULL)
       ORDER BY tc.display_order ASC, tc.name ASC`,
      [labId]
    );
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/categories - create custom test category
router.post('/categories', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const { name, code, description, display_order } = req.body;
  const labId = req.user?.lab_id;

  if (!name || !code) {
    res.status(400).json({ error: 'Category name and code are required' });
    return;
  }

  try {
    const id = `cat-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO test_categories (id, lab_id, name, code, description, display_order, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [id, labId, name.trim(), code.trim().toUpperCase(), description || '', display_order || 0]
    );

    auditFromReq(req, 'CREATE_TEST_CATEGORY', 'test_category', id, null, { name, code });
    res.status(201).json({ message: 'Test category created successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tests/categories/:id - update category
router.put('/categories/:id', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const catId = req.params.id;
  const { name, code, description, display_order, status } = req.body;

  try {
    await db.execute(
      `UPDATE test_categories
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           display_order = COALESCE($4, display_order),
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [name, code ? code.toUpperCase() : null, description, display_order, status, catId]
    );

    res.json({ message: 'Test category updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tests/categories/:id - delete category
router.delete('/categories/:id', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const catId = req.params.id;
  try {
    await db.execute(`DELETE FROM test_categories WHERE id = $1`, [catId]);
    res.json({ message: 'Category deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. TEST MASTER & PRICING
// ==========================================

// GET /api/tests - list all tests with parameters, ranges, and branch pricing
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const branchId = req.query.branch_id as string || req.user?.branch_id;
    const categoryId = req.query.category_id as string;
    const sampleType = req.query.sample_type as string;
    const department = req.query.department as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let whereClause = 'WHERE (t.lab_id = $1 OR t.lab_id IS NULL) AND t.deleted_at IS NULL';
    const params: any[] = [labId, branchId];

    if (categoryId) {
      params.push(categoryId);
      whereClause += ` AND t.category_id = $${params.length}`;
    }

    if (sampleType) {
      params.push(sampleType);
      whereClause += ` AND t.sample_type = $${params.length}`;
    }

    if (department) {
      params.push(department);
      whereClause += ` AND t.department = $${params.length}`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND t.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      whereClause += ` AND (LOWER(t.name) LIKE $${idx} OR LOWER(t.code) LIKE $${idx} OR LOWER(t.department) LIKE $${idx})`;
    }

    const query = `
      SELECT t.*,
             tc.name as category_name,
             COALESCE(tp_branch.price, t.base_price) as effective_price,
             tp_branch.price as branch_override_price
      FROM tests t
      LEFT JOIN test_categories tc ON t.category_id = tc.id
      LEFT JOIN test_prices tp_branch ON t.id = tp_branch.test_id AND tp_branch.branch_id = $2
      ${whereClause}
      ORDER BY tc.display_order ASC, t.name ASC
    `;

    const tests = await db.query(query, params);

    // Populate parameters and reference ranges
    for (const test of tests) {
      const paramsList = await db.query(
        `SELECT tp.*,
                rr.id as range_id, rr.gender as ref_gender, rr.normal_min, rr.normal_max,
                rr.critical_low, rr.critical_high, rr.text_range
         FROM test_parameters tp
         LEFT JOIN reference_ranges rr ON tp.id = rr.parameter_id AND rr.deleted_at IS NULL
         WHERE tp.test_id = $1 AND tp.deleted_at IS NULL
         ORDER BY tp.display_order ASC`,
        [test.id]
      );
      test.parameters = paramsList;
    }

    res.json(tests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/:id - get single test with full parameters, ranges, and pricing overrides
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const testId = req.params.id;
    const test = await db.queryOne<any>(
      `SELECT t.*, tc.name as category_name
       FROM tests t
       LEFT JOIN test_categories tc ON t.category_id = tc.id
       WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [testId]
    );

    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    const parameters = await db.query(
      `SELECT * FROM test_parameters WHERE test_id = $1 AND deleted_at IS NULL ORDER BY display_order ASC`,
      [testId]
    );

    for (const p of parameters) {
      p.reference_ranges = await db.query(
        `SELECT * FROM reference_ranges WHERE parameter_id = $1 AND deleted_at IS NULL`,
        [p.id]
      );
    }

    const prices = await db.query(
      `SELECT tp.*, b.name as branch_name, b.code as branch_code
       FROM test_prices tp
       JOIN branches b ON tp.branch_id = b.id
       WHERE tp.test_id = $1`,
      [testId]
    );

    res.json({
      test,
      parameters,
      prices
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests - create new test with parameters and ranges
router.post('/', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const {
    name, code, category_id, department, sample_type, container_type,
    method, turnaround_time_hours, base_price, remarks, parameters
  } = req.body;
  const labId = req.user?.lab_id;

  if (!name || !code || !base_price || !labId) {
    res.status(400).json({ error: 'Test name, code, base price, and laboratory context are required' });
    return;
  }

  try {
    // Duplicate test code check in same lab
    const existing = await db.queryOne(
      `SELECT id FROM tests WHERE (lab_id = $1 OR lab_id IS NULL) AND UPPER(code) = UPPER($2) AND deleted_at IS NULL`,
      [labId, code.trim()]
    );
    if (existing) {
      res.status(409).json({ error: `Test code '${code.toUpperCase()}' already exists.` });
      return;
    }

    const testId = `test-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO tests (
        id, lab_id, category_id, code, name, department, sample_type,
        container_type, method, turnaround_time_hours, base_price, remarks, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')`,
      [
        testId, labId, category_id || null, code.trim().toUpperCase(), name.trim(),
        department || 'Clinical Pathology', sample_type || 'Whole Blood',
        container_type || 'Standard', method || '', parseInt(turnaround_time_hours, 10) || 4,
        parseFloat(base_price), remarks || ''
      ]
    );

    // Save parameters if provided
    if (Array.isArray(parameters)) {
      for (let i = 0; i < parameters.length; i++) {
        const p = parameters[i];
        const paramId = `param-${uuidv4().substring(0, 8)}`;
        await db.execute(
          `INSERT INTO test_parameters (
            id, test_id, name, short_name, result_type, unit, decimal_precision, default_value, method, display_order, remarks
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            paramId, testId, p.name.trim(), p.short_name || p.name, p.result_type || 'numeric',
            p.unit || '', p.decimal_precision ?? 2, p.default_value || '', p.method || '',
            i + 1, p.remarks || ''
          ]
        );

        if (p.normal_min !== undefined || p.normal_max !== undefined || p.text_range || p.critical_low !== undefined || p.critical_high !== undefined) {
          const refId = `ref-${uuidv4().substring(0, 8)}`;
          await db.execute(
            `INSERT INTO reference_ranges (
              id, parameter_id, gender, min_age_days, max_age_days, normal_min, normal_max, critical_low, critical_high, text_range, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              refId, paramId, p.gender || 'Both', p.min_age_days || 0, p.max_age_days || 43800,
              p.normal_min ?? null, p.normal_max ?? null, p.critical_low ?? null, p.critical_high ?? null,
              p.text_range || null, p.remarks || ''
            ]
          );
        }
      }
    }

    auditFromReq(req, 'CREATE_TEST', 'test', testId, null, { name, code: code.toUpperCase(), base_price });
    res.status(201).json({ message: 'Test created successfully', id: testId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tests/:id - update test
router.put('/:id', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const testId = req.params.id;
  const {
    name, code, category_id, department, sample_type, container_type,
    method, turnaround_time_hours, base_price, remarks, status
  } = req.body;

  try {
    const test = await db.queryOne<any>(`SELECT * FROM tests WHERE id = $1`, [testId]);
    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    if (req.user?.role_code !== 'super_admin' && test.lab_id && test.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Tenant Security Violation: Cannot edit test belonging to another laboratory.' });
      return;
    }

    await db.execute(
      `UPDATE tests
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           category_id = COALESCE($3, category_id),
           department = COALESCE($4, department),
           sample_type = COALESCE($5, sample_type),
           container_type = COALESCE($6, container_type),
           method = COALESCE($7, method),
           turnaround_time_hours = COALESCE($8, turnaround_time_hours),
           base_price = COALESCE($9, base_price),
           remarks = COALESCE($10, remarks),
           status = COALESCE($11, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12`,
      [
        name, code ? code.toUpperCase() : null, category_id, department, sample_type,
        container_type, method, turnaround_time_hours ? parseInt(turnaround_time_hours, 10) : null,
        base_price ? parseFloat(base_price) : null, remarks, status, testId
      ]
    );

    auditFromReq(req, 'UPDATE_TEST', 'test', testId, test, req.body);
    res.json({ message: 'Test updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tests/:id/status - activate or deactivate test
router.patch('/:id/status', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const testId = req.params.id;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    res.status(400).json({ error: 'Valid status (active or inactive) is required' });
    return;
  }

  try {
    await db.execute(`UPDATE tests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, testId]);
    auditFromReq(req, 'STATUS_CHANGE_TEST', 'test', testId, null, { status });
    res.json({ message: `Test status changed to '${status}'` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/:id/duplicate - clone test with parameters and ranges
router.post('/:id/duplicate', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const testId = req.params.id;
  const labId = req.user?.lab_id;

  try {
    const original = await db.queryOne<any>(`SELECT * FROM tests WHERE id = $1`, [testId]);
    if (!original) {
      res.status(404).json({ error: 'Original test not found' });
      return;
    }

    const newTestId = `test-${uuidv4().substring(0, 8)}`;
    const newCode = `${original.code}_COPY`;
    const newName = `${original.name} (Copy)`;

    await db.execute(
      `INSERT INTO tests (
        id, lab_id, category_id, code, name, department, sample_type,
        container_type, method, turnaround_time_hours, base_price, remarks, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')`,
      [
        newTestId, labId, original.category_id, newCode, newName,
        original.department, original.sample_type, original.container_type,
        original.method, original.turnaround_time_hours, original.base_price, original.remarks
      ]
    );

    // Duplicate parameters and reference ranges
    const params = await db.query(`SELECT * FROM test_parameters WHERE test_id = $1 AND deleted_at IS NULL`, [testId]);
    for (const p of params) {
      const newParamId = `param-${uuidv4().substring(0, 8)}`;
      await db.execute(
        `INSERT INTO test_parameters (
          id, test_id, name, short_name, result_type, unit, decimal_precision, default_value, method, display_order, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          newParamId, newTestId, p.name, p.short_name, p.result_type, p.unit,
          p.decimal_precision, p.default_value, p.method, p.display_order, p.remarks
        ]
      );

      const ranges = await db.query(`SELECT * FROM reference_ranges WHERE parameter_id = $1 AND deleted_at IS NULL`, [p.id]);
      for (const r of ranges) {
        const newRefId = `ref-${uuidv4().substring(0, 8)}`;
        await db.execute(
          `INSERT INTO reference_ranges (
            id, parameter_id, gender, min_age_days, max_age_days, normal_min, normal_max, critical_low, critical_high, text_range, remarks
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            newRefId, newParamId, r.gender, r.min_age_days, r.max_age_days,
            r.normal_min, r.normal_max, r.critical_low, r.critical_high, r.text_range, r.remarks
          ]
        );
      }
    }

    auditFromReq(req, 'DUPLICATE_TEST', 'test', newTestId, { source_id: testId }, { new_code: newCode });
    res.status(201).json({ message: 'Test duplicated successfully', id: newTestId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. TEST PARAMETERS & REFERENCE RANGES
// ==========================================

// GET /api/tests/:id/parameters - get parameters for test
router.get('/:id/parameters', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const testId = req.params.id;
    const parameters = await db.query(
      `SELECT * FROM test_parameters WHERE test_id = $1 AND deleted_at IS NULL ORDER BY display_order ASC`,
      [testId]
    );

    for (const p of parameters) {
      p.reference_ranges = await db.query(
        `SELECT * FROM reference_ranges WHERE parameter_id = $1 AND deleted_at IS NULL`,
        [p.id]
      );
    }

    res.json(parameters);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/:id/parameters - add parameter to test
router.post('/:id/parameters', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const testId = req.params.id;
  const { name, short_name, result_type, unit, decimal_precision, default_value, method, display_order, remarks } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Parameter name is required' });
    return;
  }

  try {
    const paramId = `param-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO test_parameters (
        id, test_id, name, short_name, result_type, unit, decimal_precision, default_value, method, display_order, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        paramId, testId, name.trim(), short_name || name, result_type || 'numeric',
        unit || '', decimal_precision ?? 2, default_value || '', method || '',
        display_order || 0, remarks || ''
      ]
    );

    auditFromReq(req, 'CREATE_PARAMETER', 'test_parameter', paramId, null, { test_id: testId, name });
    res.status(201).json({ message: 'Parameter added successfully', id: paramId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tests/parameters/:paramId - update parameter
router.put('/parameters/:paramId', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const paramId = req.params.paramId;
  const { name, short_name, result_type, unit, decimal_precision, default_value, method, display_order, remarks } = req.body;

  try {
    await db.execute(
      `UPDATE test_parameters
       SET name = COALESCE($1, name),
           short_name = COALESCE($2, short_name),
           result_type = COALESCE($3, result_type),
           unit = COALESCE($4, unit),
           decimal_precision = COALESCE($5, decimal_precision),
           default_value = COALESCE($6, default_value),
           method = COALESCE($7, method),
           display_order = COALESCE($8, display_order),
           remarks = COALESCE($9, remarks)
       WHERE id = $10`,
      [name, short_name, result_type, unit, decimal_precision, default_value, method, display_order, remarks, paramId]
    );

    auditFromReq(req, 'UPDATE_PARAMETER', 'test_parameter', paramId, null, req.body);
    res.json({ message: 'Parameter updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tests/parameters/:paramId - soft delete parameter
router.delete('/parameters/:paramId', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const paramId = req.params.paramId;
  try {
    await db.execute(`UPDATE test_parameters SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [paramId]);
    res.json({ message: 'Parameter removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/parameters/:paramId/reference-ranges
router.get('/parameters/:paramId/reference-ranges', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const paramId = req.params.paramId;
    const ranges = await db.query(
      `SELECT * FROM reference_ranges WHERE parameter_id = $1 AND deleted_at IS NULL ORDER BY min_age_days ASC`,
      [paramId]
    );
    res.json(ranges);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/parameters/:paramId/reference-ranges - add reference range
router.post('/parameters/:paramId/reference-ranges', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const paramId = req.params.paramId;
  const { gender, min_age_days, max_age_days, normal_min, normal_max, critical_low, critical_high, text_range, remarks } = req.body;

  try {
    const refId = `ref-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO reference_ranges (
        id, parameter_id, gender, min_age_days, max_age_days, normal_min, normal_max, critical_low, critical_high, text_range, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        refId, paramId, gender || 'Both', min_age_days || 0, max_age_days || 43800,
        normal_min ?? null, normal_max ?? null, critical_low ?? null, critical_high ?? null,
        text_range || null, remarks || ''
      ]
    );

    auditFromReq(req, 'CREATE_REFERENCE_RANGE', 'reference_range', refId, null, { parameter_id: paramId, gender, normal_min, normal_max });
    res.status(201).json({ message: 'Reference range added successfully', id: refId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tests/reference-ranges/:rangeId - update reference range
router.put('/reference-ranges/:rangeId', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const rangeId = req.params.rangeId;
  const { gender, min_age_days, max_age_days, normal_min, normal_max, critical_low, critical_high, text_range, remarks } = req.body;

  try {
    await db.execute(
      `UPDATE reference_ranges
       SET gender = COALESCE($1, gender),
           min_age_days = COALESCE($2, min_age_days),
           max_age_days = COALESCE($3, max_age_days),
           normal_min = $4,
           normal_max = $5,
           critical_low = $6,
           critical_high = $7,
           text_range = $8,
           remarks = COALESCE($9, remarks)
       WHERE id = $10`,
      [gender, min_age_days, max_age_days, normal_min ?? null, normal_max ?? null, critical_low ?? null, critical_high ?? null, text_range ?? null, remarks, rangeId]
    );

    auditFromReq(req, 'UPDATE_REFERENCE_RANGE', 'reference_range', rangeId, null, req.body);
    res.json({ message: 'Reference range updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tests/reference-ranges/:rangeId
router.delete('/reference-ranges/:rangeId', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const rangeId = req.params.rangeId;
  try {
    await db.execute(`UPDATE reference_ranges SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [rangeId]);
    res.json({ message: 'Reference range removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. BRANCH-SPECIFIC TEST PRICING
// ==========================================

// GET /api/tests/:id/prices - get branch prices
router.get('/:id/prices', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const testId = req.params.id;
    const prices = await db.query(
      `SELECT tp.*, b.name as branch_name, b.code as branch_code
       FROM test_prices tp
       JOIN branches b ON tp.branch_id = b.id
       WHERE tp.test_id = $1`,
      [testId]
    );
    res.json(prices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/:id/prices - set branch price override
router.post('/:id/prices', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const testId = req.params.id;
  const { branch_id, price, effective_date, tax_percentage, discount_allowed } = req.body;

  if (!branch_id || price === undefined) {
    res.status(400).json({ error: 'Branch ID and override price are required' });
    return;
  }

  try {
    const id = `tp-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO test_prices (id, test_id, branch_id, price, effective_date, tax_percentage, discount_allowed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (test_id, branch_id) DO UPDATE SET
         price = EXCLUDED.price,
         effective_date = EXCLUDED.effective_date,
         tax_percentage = EXCLUDED.tax_percentage,
         discount_allowed = EXCLUDED.discount_allowed`,
      [
        id, testId, branch_id, parseFloat(price),
        effective_date || new Date().toISOString(),
        tax_percentage !== undefined ? parseFloat(tax_percentage) : 0,
        discount_allowed !== undefined ? (discount_allowed ? 1 : 0) : 1
      ]
    );

    auditFromReq(req, 'UPDATE_TEST_PRICING', 'test_pricing', `${testId}_${branch_id}`, null, { test_id: testId, branch_id, price });
    res.status(201).json({ message: 'Branch-specific test pricing saved successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tests/:id/prices/:branchId - revert to default price
router.delete('/:id/prices/:branchId', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const { id: testId, branchId } = req.params;
  try {
    await db.execute(`DELETE FROM test_prices WHERE test_id = $1 AND branch_id = $2`, [testId, branchId]);
    auditFromReq(req, 'RESET_TEST_PRICING', 'test_pricing', `${testId}_${branchId}`, null, null);
    res.json({ message: 'Branch pricing override removed, reverted to base price' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. HEALTH PACKAGES MASTER
// ==========================================

// GET /api/tests/packages - list packages
router.get('/packages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const packages = await db.query(
      `SELECT p.* FROM packages p WHERE (p.lab_id = $1 OR p.lab_id IS NULL) AND p.deleted_at IS NULL ORDER BY p.name ASC`,
      [labId]
    );

    for (const pkg of packages) {
      const tests = await db.query(
        `SELECT t.id, t.name, t.code, t.base_price, t.sample_type
         FROM tests t
         JOIN package_tests pt ON t.id = pt.test_id
         WHERE pt.package_id = $1`,
        [pkg.id]
      );
      pkg.tests = tests;
      pkg.total_base_price = tests.reduce((sum: number, t: any) => sum + (t.base_price || 0), 0);
    }

    res.json(packages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tests/packages/:id - single package details
router.get('/packages/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const pkgId = req.params.id;
    const pkg = await db.queryOne<any>(`SELECT * FROM packages WHERE id = $1 AND deleted_at IS NULL`, [pkgId]);

    if (!pkg) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }

    const tests = await db.query(
      `SELECT t.id, t.name, t.code, t.base_price, t.sample_type, t.department
       FROM tests t
       JOIN package_tests pt ON t.id = pt.test_id
       WHERE pt.package_id = $1`,
      [pkgId]
    );
    pkg.tests = tests;
    pkg.total_base_price = tests.reduce((sum: number, t: any) => sum + (t.base_price || 0), 0);

    res.json(pkg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tests/packages - create test package
router.post('/packages', authenticateToken, requirePermission('manage_packages'), async (req: AuthRequest, res: Response) => {
  const { name, code, description, price, discount_percentage, validity_days, test_ids } = req.body;
  const labId = req.user?.lab_id;

  if (!name || !code || price === undefined || !Array.isArray(test_ids) || test_ids.length === 0) {
    res.status(400).json({ error: 'Package name, code, price, and at least one bundled test are required' });
    return;
  }

  try {
    const pkgId = `pkg-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO packages (id, lab_id, name, code, description, price, discount_percentage, validity_days, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
      [
        pkgId, labId, name.trim(), code.trim().toUpperCase(), description || '',
        parseFloat(price), parseFloat(discount_percentage) || 0, parseInt(validity_days, 10) || 365
      ]
    );

    for (const testId of test_ids) {
      await db.execute(
        `INSERT INTO package_tests (package_id, test_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [pkgId, testId]
      );
    }

    auditFromReq(req, 'CREATE_PACKAGE', 'package', pkgId, null, { name, code: code.toUpperCase(), price, tests_count: test_ids.length });
    res.status(201).json({ message: 'Package created successfully', id: pkgId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tests/packages/:id - update package
router.put('/packages/:id', authenticateToken, requirePermission('manage_packages'), async (req: AuthRequest, res: Response) => {
  const pkgId = req.params.id;
  const { name, code, description, price, discount_percentage, validity_days, status, test_ids } = req.body;

  try {
    await db.execute(
      `UPDATE packages
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           discount_percentage = COALESCE($5, discount_percentage),
           validity_days = COALESCE($6, validity_days),
           status = COALESCE($7, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        name, code ? code.toUpperCase() : null, description,
        price !== undefined ? parseFloat(price) : null,
        discount_percentage !== undefined ? parseFloat(discount_percentage) : null,
        validity_days !== undefined ? parseInt(validity_days, 10) : null,
        status, pkgId
      ]
    );

    if (Array.isArray(test_ids)) {
      await db.execute(`DELETE FROM package_tests WHERE package_id = $1`, [pkgId]);
      for (const tId of test_ids) {
        await db.execute(`INSERT INTO package_tests (package_id, test_id) VALUES ($1, $2)`, [pkgId, tId]);
      }
    }

    auditFromReq(req, 'UPDATE_PACKAGE', 'package', pkgId, null, req.body);
    res.json({ message: 'Package updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tests/packages/:id/status - toggle package status
router.patch('/packages/:id/status', authenticateToken, requirePermission('manage_packages'), async (req: AuthRequest, res: Response) => {
  const pkgId = req.params.id;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    res.status(400).json({ error: 'Valid status (active or inactive) is required' });
    return;
  }

  try {
    await db.execute(`UPDATE packages SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, pkgId]);
    res.json({ message: `Package status updated to '${status}'` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
