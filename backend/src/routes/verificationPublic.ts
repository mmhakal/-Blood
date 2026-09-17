import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/verify/:token - Public cryptographic report verification endpoint
router.get('/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const tokenRecord = await db.queryOne<{
      id: string;
      report_id: string;
      token: string;
      patient_safe_code: string;
      expires_at: string;
      scan_count: number;
    }>(
      `SELECT * FROM report_verification_tokens WHERE token = $1`,
      [token]
    );

    if (!tokenRecord) {
      res.status(404).json({
        valid: false,
        error: 'Invalid or unrecognized report verification QR code. This document cannot be authenticated.'
      });
      return;
    }

    // Increment scan analytics
    await db.execute(
      `UPDATE report_verification_tokens
       SET scan_count = scan_count + 1, last_scanned_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [tokenRecord.id]
    );

    // Fetch report and laboratory details
    const reportData = await db.queryOne<{
      id: string;
      report_number: string;
      order_date: string;
      status: string;
      is_amended: boolean;
      version_number: number;
      lab_name: string;
      lab_license: string;
      lab_address: string;
      branch_name: string;
      approver_name: string;
      approved_at: string;
    }>(
      `SELECT r.id, r.report_number, o.created_at as order_date, r.status, r.is_amended, r.version_number,
              l.name as lab_name, l.license_number as lab_license, l.address as lab_address,
              b.name as branch_name,
              u.name as approver_name, r.approved_at
       FROM reports r
       JOIN test_orders o ON r.order_id = o.id
       JOIN laboratories l ON r.lab_id = l.id
       LEFT JOIN branches b ON r.branch_id = b.id
       LEFT JOIN users u ON r.approved_by = u.id
       WHERE r.id = $1`,
      [tokenRecord.report_id]
    );

    if (!reportData) {
      res.status(404).json({ valid: false, error: 'Associated laboratory report record not found.' });
      return;
    }

    // Return patient-safe verification details (never exposes sensitive diagnosis to unauthenticated scanners)
    res.json({
      valid: true,
      report_number: reportData.report_number,
      patient_safe_code: tokenRecord.patient_safe_code,
      order_date: reportData.order_date,
      lab_name: reportData.lab_name,
      lab_license: reportData.lab_license,
      lab_address: reportData.lab_address,
      branch_name: reportData.branch_name,
      pathologist_name: reportData.approver_name || 'Consultant Pathologist',
      verification_status: reportData.status === 'released' ? 'Officially Certified & Released' : (reportData.status === 'approved' ? 'Clinically Approved' : 'Draft In Process'),
      is_amended: Boolean(reportData.is_amended),
      version_number: reportData.version_number || 1,
      certified_at: reportData.approved_at,
      scan_count: tokenRecord.scan_count + 1
    });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// POST /api/verify/generate-token/:reportId - Generate or retrieve QR verification token
router.post('/generate-token/:reportId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { reportId } = req.params;

  try {
    const existing = await db.queryOne<{ token: string; patient_safe_code: string }>(
      `SELECT token, patient_safe_code FROM report_verification_tokens WHERE report_id = $1`,
      [reportId]
    );

    if (existing) {
      res.json({ token: existing.token, patient_safe_code: existing.patient_safe_code });
      return;
    }

    const report = await db.queryOne<{ id: string; patient_name: string; patient_id_code: string; gender: string; age: number }>(
      `SELECT r.id, p.name as patient_name, p.patient_id_code, p.gender, p.age
       FROM reports r
       JOIN test_orders o ON r.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       WHERE r.id = $1`,
      [reportId]
    );

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Generate cryptographic token and safe identifier (e.g. "R. D. (PID-***010, M/32)")
    const token = `verify-${uuidv4()}`;
    const nameParts = report.patient_name.split(' ');
    const initials = nameParts.map((p) => p[0]?.toUpperCase() + '.').join(' ');
    const safeCode = `${initials} (${report.patient_id_code}, ${report.gender[0]}/${report.age}Y)`;

    await db.execute(
      `INSERT INTO report_verification_tokens (id, report_id, token, patient_safe_code)
       VALUES ($1, $2, $3, $4)`,
      [`tok-${uuidv4().substring(0, 8)}`, reportId, token, safeCode]
    );

    res.status(201).json({ token, patient_safe_code: safeCode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
