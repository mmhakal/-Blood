import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database';
import { authenticateToken, AuthRequest, JWT_SECRET } from '../middleware/auth';
import { generatePdfReport } from '../services/pdfService';

const router = Router();

// Middleware to ensure request is from an authenticated patient
function requirePatient(req: AuthRequest, res: Response, next: any) {
  if (!req.user || (!req.user.patient_id && req.user.role_code !== 'super_admin')) {
    res.status(403).json({ error: 'Access restricted to authorized Patient Portal accounts' });
    return;
  }
  next();
}

// POST /api/patient-portal/login - Patient Portal authentication
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Patient ID / Mobile and password are required' });
    return;
  }

  try {
    const account = await db.queryOne<{
      id: string;
      lab_id: string;
      patient_id: string;
      username: string;
      password_hash: string;
      is_active: boolean;
      patient_name: string;
      patient_id_code: string;
      mobile: string;
      lab_name: string;
    }>(
      `SELECT ppa.*, p.name as patient_name, p.patient_id_code, p.mobile, l.name as lab_name
       FROM patient_portal_accounts ppa
       JOIN patients p ON ppa.patient_id = p.id
       JOIN laboratories l ON ppa.lab_id = l.id
       WHERE (LOWER(ppa.username) = LOWER($1) OR p.patient_id_code = $1 OR p.mobile = $1)`,
      [username.trim()]
    );

    if (!account) {
      res.status(401).json({ error: 'Invalid Patient Portal credentials' });
      return;
    }

    if (!account.is_active) {
      res.status(403).json({ error: 'Patient account is inactive. Please contact the diagnostic center.' });
      return;
    }

    const isValid = bcrypt.compareSync(password, account.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid Patient Portal credentials' });
      return;
    }

    // Update last login
    await db.execute(`UPDATE patient_portal_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [account.id]);

    const token = jwt.sign(
      {
        id: account.id,
        patient_id: account.patient_id,
        lab_id: account.lab_id,
        name: account.patient_name,
        role_code: 'patient',
        is_patient: true,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      patient: {
        id: account.patient_id,
        name: account.patient_name,
        patient_id_code: account.patient_id_code,
        mobile: account.mobile,
        lab_name: account.lab_name,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patient-portal/me - Current patient profile
router.get('/me', authenticateToken, requirePatient, async (req: AuthRequest, res: Response) => {
  try {
    const patient = await db.queryOne(
      `SELECT p.*, l.name as lab_name, l.phone as lab_phone, l.email as lab_email
       FROM patients p
       JOIN laboratories l ON p.lab_id = l.id
       WHERE p.id = $1`,
      [req.user?.patient_id]
    );
    res.json(patient);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patient-portal/dashboard - Patient overview
router.get('/dashboard', authenticateToken, requirePatient, async (req: AuthRequest, res: Response) => {
  const patientId = req.user?.patient_id;

  try {
    // 1. Total orders
    const ordCount = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM test_orders WHERE patient_id = $1`,
      [patientId]
    );

    // 2. Reports released
    const repCount = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM reports r
       JOIN test_orders o ON r.order_id = o.id
       WHERE o.patient_id = $1 AND r.status IN ('approved', 'released')`,
      [patientId]
    );

    // 3. Pending balance
    const dueRes = await db.queryOne<{ total_due: number }>(
      `SELECT COALESCE(SUM(i.due), 0) as total_due
       FROM invoices i
       JOIN test_orders o ON i.order_id = o.id
       WHERE o.patient_id = $1`,
      [patientId]
    );

    // 4. Recent Reports available for download
    const recentReports = await db.query(
      `SELECT r.id, r.report_number, r.status, r.created_at, r.is_amended, r.version_number,
              o.order_number, b.name as branch_name, d.name as doctor_name
       FROM reports r
       JOIN test_orders o ON r.order_id = o.id
       LEFT JOIN branches b ON r.branch_id = b.id
       LEFT JOIN doctors d ON o.referring_doctor_id = d.id
       WHERE o.patient_id = $1 AND r.status IN ('approved', 'released')
       ORDER BY r.created_at DESC LIMIT 5`,
      [patientId]
    );

    res.json({
      total_orders: Number(ordCount?.count || 0),
      available_reports: Number(repCount?.count || 0),
      pending_balance: Number(dueRes?.total_due || 0),
      recent_reports: recentReports,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patient-portal/orders - Patient test orders
router.get('/orders', authenticateToken, requirePatient, async (req: AuthRequest, res: Response) => {
  const patientId = req.user?.patient_id;

  try {
    const orders = await db.query(
      `SELECT o.*, b.name as branch_name, d.name as doctor_name,
              i.net_total, i.paid, i.due, i.status as payment_status,
              r.id as report_id, r.report_number, r.status as report_status
       FROM test_orders o
       LEFT JOIN branches b ON o.branch_id = b.id
       LEFT JOIN doctors d ON o.referring_doctor_id = d.id
       LEFT JOIN invoices i ON o.id = i.order_id
       LEFT JOIN reports r ON o.id = r.order_id
       WHERE o.patient_id = $1
       ORDER BY o.created_at DESC`,
      [patientId]
    );

    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patient-portal/reports - Patient reports
router.get('/reports', authenticateToken, requirePatient, async (req: AuthRequest, res: Response) => {
  const patientId = req.user?.patient_id;

  try {
    const reports = await db.query(
      `SELECT r.*, o.order_number, b.name as branch_name, d.name as doctor_name
       FROM reports r
       JOIN test_orders o ON r.order_id = o.id
       LEFT JOIN branches b ON r.branch_id = b.id
       LEFT JOIN doctors d ON o.referring_doctor_id = d.id
       WHERE o.patient_id = $1 AND r.status IN ('approved', 'released')
       ORDER BY r.created_at DESC`,
      [patientId]
    );

    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patient-portal/reports/:id/pdf - Stream PDF report
router.get('/reports/:id/pdf', authenticateToken, requirePatient, async (req: AuthRequest, res: Response) => {
  const reportId = req.params.id as string;
  const patientId = req.user?.patient_id;

  try {
    // Security check: Must belong strictly to logged-in patient
    const reportCheck = await db.queryOne<{ id: string; report_number: string }>(
      `SELECT r.id, r.report_number
       FROM reports r
       JOIN test_orders o ON r.order_id = o.id
       WHERE r.id = $1 AND o.patient_id = $2`,
      [reportId, patientId]
    );

    if (!reportCheck) {
      res.status(403).json({ error: 'Access denied: You can only view your own certified diagnostic reports' });
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

// GET /api/patient-portal/invoices - Financial statement
router.get('/invoices', authenticateToken, requirePatient, async (req: AuthRequest, res: Response) => {
  const patientId = req.user?.patient_id;

  try {
    const invoices = await db.query(
      `SELECT i.*, o.order_number, b.name as branch_name
       FROM invoices i
       JOIN test_orders o ON i.order_id = o.id
       LEFT JOIN branches b ON i.branch_id = b.id
       WHERE o.patient_id = $1
       ORDER BY i.created_at DESC`,
      [patientId]
    );

    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patient-portal/trends - Parameter history trends
router.get('/trends', authenticateToken, requirePatient, async (req: AuthRequest, res: Response) => {
  const patientId = req.user?.patient_id;

  try {
    const trends = await db.query(
      `SELECT tp.name as param_name, rv.value_numeric, tp.unit, rv.flag,
              o.created_at as test_date, t.name as test_name
       FROM result_values rv
       JOIN test_parameters tp ON rv.parameter_id = tp.id
       JOIN results r ON rv.result_id = r.id
       JOIN test_orders o ON r.order_id = o.id
       JOIN tests t ON r.test_id = t.id
       WHERE o.patient_id = $1 AND rv.value_numeric IS NOT NULL
       ORDER BY o.created_at ASC`,
      [patientId]
    );

    res.json(trends);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
