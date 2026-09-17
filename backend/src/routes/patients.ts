import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/patients/export - export patient registry to CSV
router.get('/export', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    if (!labId && req.user?.role_code !== 'super_admin') {
      res.status(400).json({ error: 'Laboratory context missing' });
      return;
    }

    const patients = await db.query(
      `SELECT p.patient_id_code, p.lab_number, p.name, p.age, p.age_unit, p.gender,
              p.mobile, p.alternate_mobile, p.email, p.blood_group, p.city, p.state,
              d.name as doctor_name, b.name as branch_name, p.status, p.created_at
       FROM patients p
       LEFT JOIN doctors d ON p.referring_doctor_id = d.id
       LEFT JOIN branches b ON p.branch_id = b.id
       WHERE p.lab_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC`,
      [labId]
    );

    const headers = ['Patient ID', 'Lab Number', 'Name', 'Age', 'Unit', 'Gender', 'Mobile', 'Alternate Mobile', 'Email', 'Blood Group', 'City', 'State', 'Referring Doctor', 'Branch', 'Status', 'Registered At'];
    const csvRows = [headers.join(',')];

    for (const p of patients) {
      csvRows.push([
        `"${p.patient_id_code || ''}"`,
        `"${p.lab_number || ''}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.age,
        `"${p.age_unit || 'years'}"`,
        `"${p.gender || ''}"`,
        `"${p.mobile || ''}"`,
        `"${p.alternate_mobile || ''}"`,
        `"${p.email || ''}"`,
        `"${p.blood_group || ''}"`,
        `"${p.city || ''}"`,
        `"${p.state || ''}"`,
        `"${(p.doctor_name || 'Self').replace(/"/g, '""')}"`,
        `"${(p.branch_name || '').replace(/"/g, '""')}"`,
        `"${p.status || 'active'}"`,
        `"${p.created_at || ''}"`
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="patients_export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvRows.join('\n'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients - search and list patients with server-side pagination & multi-filters
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const branchId = req.query.branch_id as string;
    const doctorId = req.query.doctor_id as string;
    const gender = req.query.gender as string;
    const status = req.query.status as string;
    const fromDate = req.query.from_date as string;
    const toDate = req.query.to_date as string;
    const search = req.query.search as string;

    const page = Math.max(1, parseInt(req.query.page as string || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '50')));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.deleted_at IS NULL';
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      whereClause += ` AND p.lab_id = $${params.length}`;
    }

    if (branchId) {
      params.push(branchId);
      whereClause += ` AND p.branch_id = $${params.length}`;
    }

    if (doctorId) {
      params.push(doctorId);
      whereClause += ` AND p.referring_doctor_id = $${params.length}`;
    }

    if (gender) {
      params.push(gender);
      whereClause += ` AND p.gender = $${params.length}`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND p.status = $${params.length}`;
    }

    if (fromDate) {
      params.push(fromDate);
      whereClause += ` AND DATE(p.created_at) >= DATE($${params.length})`;
    }

    if (toDate) {
      params.push(toDate);
      whereClause += ` AND DATE(p.created_at) <= DATE($${params.length})`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      whereClause += ` AND (
        LOWER(p.name) LIKE $${idx} OR
        LOWER(p.patient_id_code) LIKE $${idx} OR
        LOWER(p.mobile) LIKE $${idx} OR
        LOWER(COALESCE(p.lab_number, '')) LIKE $${idx} OR
        LOWER(COALESCE(p.email, '')) LIKE $${idx} OR
        LOWER(COALESCE(d.name, '')) LIKE $${idx} OR
        LOWER(COALESCE(b.name, '')) LIKE $${idx}
      )`;
    }

    // Total records count
    const countSql = `
      SELECT COUNT(*) as total
      FROM patients p
      LEFT JOIN doctors d ON p.referring_doctor_id = d.id
      LEFT JOIN branches b ON p.branch_id = b.id
      ${whereClause}
    `;
    const totalRes = await db.queryOne<{ total: number }>(countSql, params);
    const totalRecords = parseInt(totalRes?.total as any || '0');

    // Data query
    const dataSql = `
      SELECT p.*,
             d.name as doctor_name,
             b.name as branch_name,
             (SELECT COUNT(*) FROM test_orders WHERE patient_id = p.id) as total_orders,
             (SELECT MAX(created_at) FROM test_orders WHERE patient_id = p.id) as last_visit_date
      FROM patients p
      LEFT JOIN doctors d ON p.referring_doctor_id = d.id
      LEFT JOIN branches b ON p.branch_id = b.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const patients = await db.query(dataSql, params);

    res.json({
      data: patients,
      pagination: {
        page,
        limit,
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limit)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id - deep patient profile with comprehensive visit & billing history
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = req.params.id;
    const patient = await db.queryOne<any>(
      `SELECT p.*, d.name as doctor_name, d.clinic_hospital as doctor_clinic, b.name as branch_name
       FROM patients p
       LEFT JOIN doctors d ON p.referring_doctor_id = d.id
       LEFT JOIN branches b ON p.branch_id = b.id
       WHERE p.id = $1`,
      [patientId]
    );

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    // Tenant Isolation
    if (req.user?.role_code !== 'super_admin' && patient.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Cross-tenant patient access denied' });
      return;
    }

    // Diagnostic orders history
    const orders = await db.query(
      `SELECT o.*,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
              (SELECT report_number FROM reports WHERE order_id = o.id LIMIT 1) as report_number,
              (SELECT status FROM reports WHERE order_id = o.id LIMIT 1) as report_status,
              (SELECT id FROM reports WHERE order_id = o.id LIMIT 1) as report_id
       FROM test_orders o
       WHERE o.patient_id = $1
       ORDER BY o.created_at DESC`,
      [patientId]
    );

    // Clinical test parameters trend
    const recentResults = await db.query(
      `SELECT rv.value_numeric, rv.value_text, rv.flag, rv.unit, r.created_at, tp.name as param_name, t.name as test_name
       FROM result_values rv
       JOIN results r ON rv.result_id = r.id
       JOIN test_orders o ON r.order_id = o.id
       JOIN test_parameters tp ON rv.parameter_id = tp.id
       JOIN tests t ON r.test_id = t.id
       WHERE o.patient_id = $1
       ORDER BY r.created_at DESC LIMIT 50`,
      [patientId]
    );

    // Invoices and financial ledger
    const invoices = await db.query(
      `SELECT i.id, i.invoice_number, i.subtotal, i.discount, i.tax, i.net_total, i.paid, i.due, i.status, i.created_at
       FROM invoices i
       JOIN test_orders o ON i.order_id = o.id
       WHERE o.patient_id = $1
       ORDER BY i.created_at DESC`,
      [patientId]
    );

    // Relevant activity logs
    const activityLogs = await db.query(
      `SELECT id, action, entity_type, user_email, user_role, created_at, new_values
       FROM audit_logs
       WHERE (entity_type = 'patient' AND entity_id = $1)
          OR (entity_type = 'order' AND entity_id IN (SELECT id FROM test_orders WHERE patient_id = $1))
       ORDER BY created_at DESC LIMIT 20`,
      [patientId]
    );

    res.json({
      patient,
      orders,
      recentResults,
      invoices,
      activityLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients - register new patient with auto-generated ID & duplicate check
router.post('/', authenticateToken, requirePermission('create_patient'), async (req: AuthRequest, res: Response) => {
  const {
    name, age, age_unit, dob, gender, mobile, alternate_mobile, email,
    address, city, state, pincode, referring_doctor_id, clinic_hospital,
    blood_group, emergency_contact, remarks
  } = req.body;

  const labId = req.user?.lab_id;
  const branchId = req.body.branch_id || req.user?.branch_id;

  if (!name || !gender || !mobile || !labId) {
    res.status(400).json({ error: 'Patient name, gender, mobile number, and laboratory context are required' });
    return;
  }

  try {
    // Check for potential duplicate patient in same lab
    const duplicateCheck = await db.queryOne<{ id: string; name: string; patient_id_code: string }>(
      `SELECT id, name, patient_id_code FROM patients WHERE lab_id = $1 AND mobile = $2 AND deleted_at IS NULL LIMIT 1`,
      [labId, mobile.trim()]
    );

    // Configurable Patient ID Prefix
    const prefixSetting = await db.queryOne<{ value: string }>(
      `SELECT value FROM laboratory_settings WHERE lab_id = $1 AND key = 'patient_id_prefix'`,
      [labId]
    );
    const prefix = prefixSetting?.value || 'PID';

    const id = `pat-${uuidv4().substring(0, 8)}`;
    const countRes = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM patients WHERE lab_id = $1`, [labId]);
    const nextSeq = (parseInt(countRes?.count as any || '0') + 1).toString().padStart(6, '0');
    const year = new Date().getFullYear();

    const patientIdCode = `${prefix}-${year}-${nextSeq}`;
    const labNumber = `LAB-${year}-${(parseInt(countRes?.count as any || '0') + 1).toString().padStart(5, '0')}`;

    // Get active branch if not provided
    let assignedBranchId = branchId;
    if (!assignedBranchId) {
      const defaultBranch = await db.queryOne<{ id: string }>(
        `SELECT id FROM branches WHERE lab_id = $1 AND status = 'active' ORDER BY created_at ASC LIMIT 1`,
        [labId]
      );
      assignedBranchId = defaultBranch?.id;
    }

    if (!assignedBranchId) {
      res.status(400).json({ error: 'No active branch available for patient registration' });
      return;
    }

    await db.execute(
      `INSERT INTO patients (
        id, lab_id, branch_id, patient_id_code, lab_number, name, age, age_unit,
        dob, gender, mobile, alternate_mobile, email, address, city, state, pincode,
        referring_doctor_id, clinic_hospital, blood_group, emergency_contact, remarks,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'active', $23)`,
      [
        id, labId, assignedBranchId, patientIdCode, labNumber, name.trim(), parseInt(age, 10) || 0,
        age_unit || 'years', dob || null, gender, mobile.trim(), alternate_mobile || '',
        email || '', address || '', city || '', state || '', pincode || '',
        referring_doctor_id || null, clinic_hospital || '', blood_group || '',
        emergency_contact || '', remarks || '', req.user?.id || null
      ]
    );

    auditFromReq(req, 'CREATE_PATIENT', 'patient', id, null, { name, patient_id_code: patientIdCode, mobile });

    res.status(201).json({
      message: 'Patient registered successfully',
      id,
      patient_id_code: patientIdCode,
      lab_number: labNumber,
      duplicate_warning: duplicateCheck ? `Notice: Mobile ${mobile} is also registered under ${duplicateCheck.name} (${duplicateCheck.patient_id_code})` : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/patients/:id - update patient demographics
router.put('/:id', authenticateToken, requirePermission('create_patient'), async (req: AuthRequest, res: Response) => {
  const patientId = req.params.id;
  const {
    name, age, age_unit, dob, gender, mobile, alternate_mobile, email,
    address, city, state, pincode, referring_doctor_id, clinic_hospital,
    blood_group, emergency_contact, remarks, branch_id, status
  } = req.body;

  try {
    const patient = await db.queryOne<any>(`SELECT * FROM patients WHERE id = $1`, [patientId]);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    if (req.user?.role_code !== 'super_admin' && patient.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Tenant Security Violation: Cannot edit patient belonging to another laboratory.' });
      return;
    }

    await db.execute(
      `UPDATE patients
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           age_unit = COALESCE($3, age_unit),
           dob = COALESCE($4, dob),
           gender = COALESCE($5, gender),
           mobile = COALESCE($6, mobile),
           alternate_mobile = COALESCE($7, alternate_mobile),
           email = COALESCE($8, email),
           address = COALESCE($9, address),
           city = COALESCE($10, city),
           state = COALESCE($11, state),
           pincode = COALESCE($12, pincode),
           referring_doctor_id = COALESCE($13, referring_doctor_id),
           clinic_hospital = COALESCE($14, clinic_hospital),
           blood_group = COALESCE($15, blood_group),
           emergency_contact = COALESCE($16, emergency_contact),
           remarks = COALESCE($17, remarks),
           branch_id = COALESCE($18, branch_id),
           status = COALESCE($19, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $20`,
      [
        name, age ? parseInt(age, 10) : null, age_unit, dob, gender, mobile, alternate_mobile, email,
        address, city, state, pincode, referring_doctor_id, clinic_hospital,
        blood_group, emergency_contact, remarks, branch_id, status, patientId
      ]
    );

    auditFromReq(req, 'UPDATE_PATIENT', 'patient', patientId, patient, req.body);
    res.json({ message: 'Patient profile updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/patients/:id/status - activate or deactivate patient
router.patch('/:id/status', authenticateToken, requirePermission('create_patient'), async (req: AuthRequest, res: Response) => {
  const patientId = req.params.id;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    res.status(400).json({ error: 'Valid status (active or inactive) is required' });
    return;
  }

  try {
    const patient = await db.queryOne<any>(`SELECT * FROM patients WHERE id = $1`, [patientId]);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    if (req.user?.role_code !== 'super_admin' && patient.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Tenant Security Violation: Cross-tenant modification denied' });
      return;
    }

    await db.execute(`UPDATE patients SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, patientId]);
    auditFromReq(req, 'STATUS_CHANGE_PATIENT', 'patient', patientId, { status: patient.status }, { status });

    res.json({ message: `Patient status updated to '${status}'` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
