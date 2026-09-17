import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database';
import { authenticateToken, AuthRequest, JWT_SECRET } from '../middleware/auth';
import { generatePdfReport } from '../services/pdfService';
import { checkFeature } from '../middleware/featureGate';

const router = Router();

// Middleware to ensure request is from an authenticated doctor
function requireDoctor(req: AuthRequest, res: Response, next: any) {
  if (!req.user || (!req.user.doctor_id && req.user.role_code !== 'super_admin')) {
    res.status(403).json({ error: 'Access restricted to authorized Doctor Portal accounts' });
    return;
  }
  next();
}

// POST /api/doctor-portal/login - Doctor Portal authentication
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Doctor username/ID and password are required' });
    return;
  }

  try {
    const account = await db.queryOne<{
      id: string;
      lab_id: string;
      doctor_id: string;
      username: string;
      password_hash: string;
      is_active: boolean;
      doctor_name: string;
      specialization: string;
      clinic_hospital: string;
      lab_name: string;
    }>(
      `SELECT dpa.*, d.name as doctor_name, d.specialization, d.clinic_hospital, l.name as lab_name
       FROM doctor_portal_accounts dpa
       JOIN doctors d ON dpa.doctor_id = d.id
       JOIN laboratories l ON dpa.lab_id = l.id
       WHERE (LOWER(dpa.username) = LOWER($1) OR LOWER(dpa.email) = LOWER($1))`,
      [username.trim()]
    );

    if (!account) {
      res.status(401).json({ error: 'Invalid Doctor Portal credentials' });
      return;
    }

    if (!account.is_active) {
      res.status(403).json({ error: 'Doctor Portal account is currently inactive. Please contact laboratory administration.' });
      return;
    }

    const isValid = bcrypt.compareSync(password, account.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid Doctor Portal credentials' });
      return;
    }

    // Update last login
    await db.execute(`UPDATE doctor_portal_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [account.id]);

    const token = jwt.sign(
      {
        id: account.id,
        doctor_id: account.doctor_id,
        lab_id: account.lab_id,
        name: account.doctor_name,
        role_code: 'doctor',
        is_doctor: true,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      doctor: {
        id: account.doctor_id,
        name: account.doctor_name,
        specialization: account.specialization,
        clinic_hospital: account.clinic_hospital,
        lab_name: account.lab_name,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctor-portal/me - Current Doctor profile
router.get('/me', authenticateToken, requireDoctor, async (req: AuthRequest, res: Response) => {
  try {
    const doctor = await db.queryOne(
      `SELECT d.*, l.name as lab_name, l.license_number as lab_license
       FROM doctors d
       JOIN laboratories l ON d.lab_id = l.id
       WHERE d.id = $1`,
      [req.user?.doctor_id]
    );
    res.json(doctor);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctor-portal/dashboard - Doctor Referral Overview KPIs
router.get('/dashboard', authenticateToken, requireDoctor, async (req: AuthRequest, res: Response) => {
  const docId = req.user?.doctor_id;

  try {
    // 1. Total referred patients
    const ptCount = await db.queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT patient_id) as count FROM test_orders WHERE referring_doctor_id = $1`,
      [docId]
    );

    // 2. Orders this month
    const ordCount = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM test_orders
       WHERE referring_doctor_id = $1 AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
      [docId]
    );

    // 3. Pending tests
    const pendingCount = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM test_orders
       WHERE referring_doctor_id = $1 AND status NOT IN ('approved', 'report_released', 'cancelled')`,
      [docId]
    );

    // 4. Critical alerts count
    const criticalCount = await db.queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT r.id) as count
       FROM results r
       JOIN result_values rv ON r.id = rv.result_id
       JOIN test_orders o ON r.order_id = o.id
       WHERE o.referring_doctor_id = $1 AND (rv.is_critical = 1 OR rv.flag IN ('critical_high', 'critical_low'))`,
      [docId]
    );

    // 5. Recent Reports
    const recentReports = await db.query(
      `SELECT rep.*, p.name as patient_name, p.patient_id_code, p.age, p.gender, o.priority
       FROM reports rep
       JOIN test_orders o ON rep.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       WHERE o.referring_doctor_id = $1 AND rep.status IN ('approved', 'released')
       ORDER BY rep.created_at DESC LIMIT 5`,
      [docId]
    );

    res.json({
      referred_patients: Number(ptCount?.count || 0),
      orders_this_month: Number(ordCount?.count || 0),
      pending_orders: Number(pendingCount?.count || 0),
      critical_alerts: Number(criticalCount?.count || 0),
      recent_reports: recentReports
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctor-portal/patients - Referred patients list
router.get('/patients', authenticateToken, requireDoctor, async (req: AuthRequest, res: Response) => {
  const docId = req.user?.doctor_id;
  const { search } = req.query;

  try {
    let query = `
      SELECT DISTINCT p.id, p.name, p.patient_id_code, p.age, p.gender, p.mobile,
             COUNT(o.id) as total_orders, MAX(o.created_at) as last_order_date
      FROM patients p
      JOIN test_orders o ON p.id = o.patient_id
      WHERE o.referring_doctor_id = $1
    `;
    const params: any[] = [docId];

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      const idx = params.length;
      query += ` AND (LOWER(p.name) LIKE $${idx} OR LOWER(p.patient_id_code) LIKE $${idx} OR p.mobile LIKE $${idx})`;
    }

    query += ` GROUP BY p.id ORDER BY last_order_date DESC LIMIT 100`;

    const patients = await db.query(query, params);
    res.json(patients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctor-portal/reports - Diagnostic reports for referred patients
router.get('/reports', authenticateToken, requireDoctor, async (req: AuthRequest, res: Response) => {
  const docId = req.user?.doctor_id;
  const { search, status } = req.query;

  try {
    let query = `
      SELECT rep.*, p.name as patient_name, p.patient_id_code, p.age, p.gender,
             o.order_number, o.priority
      FROM reports rep
      JOIN test_orders o ON rep.order_id = o.id
      JOIN patients p ON o.patient_id = p.id
      WHERE o.referring_doctor_id = $1
    `;
    const params: any[] = [docId];

    if (status) {
      params.push(status);
      query += ` AND rep.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      const idx = params.length;
      query += ` AND (LOWER(p.name) LIKE $${idx} OR rep.report_number LIKE $${idx} OR p.patient_id_code LIKE $${idx})`;
    }

    query += ` ORDER BY rep.created_at DESC LIMIT 100`;

    const reports = await db.query(query, params);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctor-portal/reports/:id/pdf - Stream certified PDF report
router.get('/reports/:id/pdf', authenticateToken, requireDoctor, async (req: AuthRequest, res: Response) => {
  const reportId = req.params.id as string;
  const docId = req.user?.doctor_id;

  try {
    // Verify report belongs to doctor's patient
    const reportCheck = await db.queryOne<{ id: string; report_number: string }>(
      `SELECT rep.id, rep.report_number
       FROM reports rep
       JOIN test_orders o ON rep.order_id = o.id
       WHERE rep.id = $1 AND o.referring_doctor_id = $2`,
      [reportId, docId]
    );

    if (!reportCheck) {
      res.status(403).json({ error: 'Access denied: You are not authorized to view reports for patients not referred by you' });
      return;
    }

    const pdfBuffer = await generatePdfReport(reportId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Diagnostic_Report_${reportCheck.report_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctor-portal/critical-alerts - Immediate panic value notifications
router.get('/critical-alerts', authenticateToken, requireDoctor, async (req: AuthRequest, res: Response) => {
  const docId = req.user?.doctor_id;

  try {
    const alerts = await db.query(
      `SELECT rv.*, tp.name as param_name, t.name as test_name,
              p.name as patient_name, p.patient_id_code, p.mobile,
              o.order_number, rep.report_number, rep.id as report_id, r.created_at as alert_time
       FROM result_values rv
       JOIN results r ON rv.result_id = r.id
       JOIN test_orders o ON r.order_id = o.id
       JOIN tests t ON r.test_id = t.id
       JOIN test_parameters tp ON rv.parameter_id = tp.id
       JOIN patients p ON o.patient_id = p.id
       LEFT JOIN reports rep ON o.id = rep.order_id
       WHERE o.referring_doctor_id = $1 AND (rv.is_critical = 1 OR rv.flag IN ('critical_high', 'critical_low'))
       ORDER BY r.created_at DESC LIMIT 25`,
      [docId]
    );

    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
