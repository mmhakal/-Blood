import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/doctors - list doctors with search & filters
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const search = req.query.search as string;
    const status = req.query.status as string;

    let query = `
      SELECT d.*,
             (SELECT COUNT(*) FROM test_orders WHERE referring_doctor_id = d.id) as referral_count,
             (SELECT COUNT(*) FROM patients WHERE referring_doctor_id = d.id) as patient_count
      FROM doctors d
      WHERE d.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND d.lab_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND d.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      query += ` AND (
        LOWER(d.name) LIKE $${idx} OR
        LOWER(COALESCE(d.specialization, '')) LIKE $${idx} OR
        LOWER(COALESCE(d.clinic_hospital, '')) LIKE $${idx} OR
        LOWER(COALESCE(d.phone, '')) LIKE $${idx} OR
        LOWER(COALESCE(d.registration_number, '')) LIKE $${idx}
      )`;
    }

    query += ` ORDER BY d.name ASC`;

    const doctors = await db.query(query, params);
    res.json(doctors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctors/:id - single doctor details with referred patients & orders
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const docId = req.params.id;
    const doctor = await db.queryOne<any>(`SELECT * FROM doctors WHERE id = $1 AND deleted_at IS NULL`, [docId]);

    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    if (req.user?.role_code !== 'super_admin' && doctor.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Tenant Security Violation: Cross-tenant doctor access denied' });
      return;
    }

    // Referred patients
    const patients = await db.query(
      `SELECT id, patient_id_code, lab_number, name, age, gender, mobile, created_at
       FROM patients
       WHERE referring_doctor_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 50`,
      [docId]
    );

    // Referred orders
    const orders = await db.query(
      `SELECT o.id, o.order_number, o.created_at, o.status, o.net_amount, o.payment_status,
              p.name as patient_name, p.patient_id_code
       FROM test_orders o
       JOIN patients p ON o.patient_id = p.id
       WHERE o.referring_doctor_id = $1
       ORDER BY o.created_at DESC LIMIT 50`,
      [docId]
    );

    res.json({
      doctor,
      patients,
      orders,
      stats: {
        total_patients: patients.length,
        total_orders: orders.length,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/doctors - create doctor
router.post('/', authenticateToken, requirePermission('manage_doctors'), async (req: AuthRequest, res: Response) => {
  const {
    name, qualification, specialization, registration_number, clinic_hospital,
    phone, email, address, city, state, commission_rate
  } = req.body;
  const labId = req.user?.lab_id;

  if (!name || !labId) {
    res.status(400).json({ error: 'Doctor name and laboratory context are required' });
    return;
  }

  try {
    // Check duplicate doctor by registration number or phone in the same lab
    if (registration_number) {
      const existingReg = await db.queryOne(
        `SELECT id, name FROM doctors WHERE lab_id = $1 AND registration_number = $2 AND deleted_at IS NULL`,
        [labId, registration_number.trim()]
      );
      if (existingReg) {
        res.status(409).json({ error: `A doctor with registration number '${registration_number}' is already registered.` });
        return;
      }
    }

    const id = `doc-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO doctors (
        id, lab_id, name, qualification, specialization, registration_number,
        clinic_hospital, phone, email, address, city, state, commission_rate,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', $14)`,
      [
        id, labId, name.trim(), qualification || '', specialization || '', registration_number || '',
        clinic_hospital || '', phone || '', email || '', address || '', city || '', state || '',
        parseFloat(commission_rate) || 0, req.user?.id || null
      ]
    );

    auditFromReq(req, 'CREATE_DOCTOR', 'doctor', id, null, { name, clinic_hospital });
    res.status(201).json({ message: 'Doctor registered successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/doctors/:id - update doctor
router.put('/:id', authenticateToken, requirePermission('manage_doctors'), async (req: AuthRequest, res: Response) => {
  const docId = req.params.id as string;
  const {
    name, qualification, specialization, registration_number, clinic_hospital,
    phone, email, address, city, state, commission_rate, status
  } = req.body;

  try {
    const doctor = await db.queryOne<any>(`SELECT * FROM doctors WHERE id = $1`, [docId]);
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    if (req.user?.role_code !== 'super_admin' && doctor.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Tenant Security Violation: Cannot edit doctor of another laboratory.' });
      return;
    }

    await db.execute(
      `UPDATE doctors
       SET name = COALESCE($1, name),
           qualification = COALESCE($2, qualification),
           specialization = COALESCE($3, specialization),
           registration_number = COALESCE($4, registration_number),
           clinic_hospital = COALESCE($5, clinic_hospital),
           phone = COALESCE($6, phone),
           email = COALESCE($7, email),
           address = COALESCE($8, address),
           city = COALESCE($9, city),
           state = COALESCE($10, state),
           commission_rate = COALESCE($11, commission_rate),
           status = COALESCE($12, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13`,
      [
        name, qualification, specialization, registration_number, clinic_hospital,
        phone, email, address, city, state, commission_rate ? parseFloat(commission_rate) : null,
        status, docId
      ]
    );

    auditFromReq(req, 'UPDATE_DOCTOR', 'doctor', docId, doctor, req.body);
    res.json({ message: 'Doctor details updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/doctors/:id/status - activate or deactivate doctor
router.patch('/:id/status', authenticateToken, requirePermission('manage_doctors'), async (req: AuthRequest, res: Response) => {
  const docId = req.params.id;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    res.status(400).json({ error: 'Valid status (active or inactive) is required' });
    return;
  }

  try {
    const doctor = await db.queryOne<any>(`SELECT * FROM doctors WHERE id = $1`, [docId]);
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    if (req.user?.role_code !== 'super_admin' && doctor.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Tenant Security Violation: Cross-tenant modification denied' });
      return;
    }

    await db.execute(`UPDATE doctors SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, docId]);
    auditFromReq(req, 'STATUS_CHANGE_DOCTOR', 'doctor', docId, { status: doctor.status }, { status });

    res.json({ message: `Doctor status updated to '${status}'` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
