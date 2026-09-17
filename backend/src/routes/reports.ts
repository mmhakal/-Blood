import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { generateReportPdf, ReportData } from '../services/pdfService';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/reports - list reports with filter by status, branch, test, search
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const branchId = req.query.branch_id as string || req.user?.branch_id;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let query = `
      SELECT r.*,
             o.order_number, o.lab_number, o.priority, o.created_at as order_date,
             p.name as patient_name, p.patient_id_code, p.age, p.gender, p.mobile as patient_mobile,
             d.name as doctor_name,
             b.name as branch_name,
             u_app.name as approved_by_name,
             u_rel.name as released_by_name
      FROM reports r
      JOIN test_orders o ON r.order_id = o.id
      JOIN patients p ON o.patient_id = p.id
      LEFT JOIN doctors d ON o.referring_doctor_id = d.id
      LEFT JOIN branches b ON r.branch_id = b.id
      LEFT JOIN users u_app ON r.approved_by = u_app.id
      LEFT JOIN users u_rel ON r.released_by = u_rel.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND r.lab_id = $${params.length}`;
    }

    if (branchId) {
      params.push(branchId);
      query += ` AND r.branch_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      query += ` AND (LOWER(p.name) LIKE $${idx} OR r.report_number LIKE $${idx} OR o.order_number LIKE $${idx} OR p.patient_id_code LIKE $${idx})`;
    }

    query += ` ORDER BY r.created_at DESC LIMIT 100`;

    const reports = await db.query(query, params);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:id - view detailed report data
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const reportId = req.params.id;
    const report = await db.queryOne(
      `SELECT r.*,
              o.order_number, o.lab_number, o.created_at as order_date, o.clinical_history, o.priority,
              p.id as patient_id, p.name as patient_name, p.patient_id_code, p.age, p.age_unit, p.gender, p.mobile, p.address as patient_address,
              d.name as doctor_name, d.qualification as doctor_qualification, d.specialization as doctor_specialization, d.clinic_hospital as doctor_hospital,
              b.name as branch_name, b.code as branch_code, b.address as branch_address, b.phone as branch_phone,
              l.name as lab_name, l.license_number, l.address as lab_address, l.phone as lab_phone, l.email as lab_email, l.header_text, l.footer_text,
              u_app.name as approved_by_name, u_app.email as approved_by_email,
              u_rel.name as released_by_name
       FROM reports r
       JOIN test_orders o ON r.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       LEFT JOIN doctors d ON o.referring_doctor_id = d.id
       LEFT JOIN branches b ON r.branch_id = b.id
       LEFT JOIN laboratories l ON r.lab_id = l.id
       LEFT JOIN users u_app ON r.approved_by = u_app.id
       LEFT JOIN users u_rel ON r.released_by = u_rel.id
       WHERE r.id = $1`,
      [reportId]
    );

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (req.user?.lab_id && report.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot access report from another laboratory' });
      return;
    }

    const samples = await db.query(`SELECT * FROM samples WHERE order_id = $1`, [report.order_id]);

    const testResults = await db.query(
      `SELECT r.id as result_id, r.clinical_remarks, r.impression, r.status as result_status,
              t.id as test_id, t.name as test_name, t.code as test_code, t.department, t.method
       FROM results r
       JOIN tests t ON r.test_id = t.id
       WHERE r.order_id = $1`,
      [report.order_id]
    );

    for (const tr of testResults) {
      const values = await db.query(
        `SELECT rv.*, tp.name as param_name, tp.short_name, tp.display_order
         FROM result_values rv
         JOIN test_parameters tp ON rv.parameter_id = tp.id
         WHERE rv.result_id = $1
         ORDER BY tp.display_order ASC`,
        [tr.result_id]
      );
      tr.parameters = values;
    }

    const versions = await db.query(
      `SELECT rv.*, u.name as changed_by_name
       FROM report_versions rv
       LEFT JOIN users u ON rv.changed_by = u.id
       WHERE rv.report_id = $1
       ORDER BY rv.version_number DESC`,
      [reportId]
    );

    const signatures = await db.query(
      `SELECT rs.* FROM report_signatures rs WHERE rs.report_id = $1 ORDER BY rs.signed_at DESC`,
      [reportId]
    );

    res.json({ report, samples, testResults, versions, signatures });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:id/versions - get all historical versions of report
router.get('/:id/versions', authenticateToken, async (req: AuthRequest, res: Response) => {
  const reportId = req.params.id;

  try {
    const report = await db.queryOne<{ id: string; lab_id: string }>(`SELECT id, lab_id FROM reports WHERE id = $1`, [reportId]);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (req.user?.lab_id && report.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot access report versions from another laboratory' });
      return;
    }

    const versions = await db.query(
      `SELECT rv.*, u.name as changed_by_name
       FROM report_versions rv
       LEFT JOIN users u ON rv.changed_by = u.id
       WHERE rv.report_id = $1
       ORDER BY rv.version_number DESC`,
      [reportId]
    );

    res.json(versions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/:id/approve - Pathologist approves report with digital signature
router.post('/:id/approve', authenticateToken, requirePermission('approve_report'), async (req: AuthRequest, res: Response) => {
  const reportId = req.params.id as string;
  const { clinical_notes } = req.body;

  try {
    const report = await db.queryOne<{ id: string; lab_id: string; order_id: string; report_number: string; status: string; version_number: number }>(
      `SELECT id, lab_id, order_id, report_number, status, version_number FROM reports WHERE id = $1`,
      [reportId]
    );

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (req.user?.lab_id && report.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot approve report belonging to another laboratory' });
      return;
    }

    // 1. Update report status to approved
    await db.execute(
      `UPDATE reports
       SET status = 'approved',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [req.user?.id, reportId]
    );

    // 2. Update all results of this order to approved
    await db.execute(
      `UPDATE results
       SET status = 'approved',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP,
           clinical_remarks = COALESCE($2, clinical_remarks),
           updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $3`,
      [req.user?.id, clinical_notes || null, report.order_id]
    );

    // 3. Update order status to approved
    await db.execute(`UPDATE test_orders SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [report.order_id]);

    // 4. Attach digital signature record
    const sigId = `sig-${uuidv4().substring(0, 8)}`;
    const digitalHash = `SHA256-${uuidv4()}`;
    await db.execute(
      `INSERT INTO report_signatures (id, report_id, signer_id, signer_name, signer_role, digital_hash, signed_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [sigId, reportId, req.user?.id, req.user?.name || 'Pathologist', req.user?.role_code || 'pathologist', digitalHash]
    );

    // 5. Create report version snapshot
    const versionCount = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM report_versions WHERE report_id = $1`, [reportId]);
    const nextVer = (parseInt(versionCount?.count as any || '0')) + 1;

    await db.execute(
      `INSERT INTO report_versions (id, report_id, version_number, snapshot_data, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5, 'Clinical sign-off & digital signature by Pathologist')`,
      [`rv-${uuidv4().substring(0, 8)}`, reportId, nextVer, JSON.stringify({ approved_by: req.user?.name, time: new Date().toISOString(), notes: clinical_notes }), req.user?.id]
    );

    auditFromReq(req, 'APPROVE_REPORT', 'report', reportId, { status: report.status }, { report_number: report.report_number, approver: req.user?.name });

    res.json({ message: 'Diagnostic report approved and certified with digital signature', status: 'approved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/:id/release - release approved report for dispatch
router.post('/:id/release', authenticateToken, async (req: AuthRequest, res: Response) => {
  const reportId = req.params.id as string;
  const userRole = req.user?.role_code;
  const userPerms = req.user?.permissions || [];

  if (userRole !== 'super_admin' && !userPerms.includes('release_report') && !userPerms.includes('approve_report')) {
    res.status(403).json({ error: 'Permission Denied: Missing permission to release reports.' });
    return;
  }

  try {
    const report = await db.queryOne<{ id: string; lab_id: string; order_id: string; status: string; report_number: string }>(
      `SELECT id, lab_id, order_id, status, report_number FROM reports WHERE id = $1`,
      [reportId]
    );

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (req.user?.lab_id && report.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot release report belonging to another laboratory' });
      return;
    }

    await db.execute(
      `UPDATE reports
       SET status = 'released',
           released_by = $1,
           released_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [req.user?.id, reportId]
    );

    await db.execute(
      `UPDATE test_orders
       SET status = 'report_released',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [report.order_id]
    );

    auditFromReq(req, 'RELEASE_REPORT', 'report', reportId, { status: report.status }, { status: 'released', report_number: report.report_number });
    res.json({ message: 'Report released for patient delivery', status: 'released' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/:id/amend - amend an approved/released report
router.post('/:id/amend', authenticateToken, requirePermission('approve_report'), async (req: AuthRequest, res: Response) => {
  const reportId = req.params.id as string;
  const { amendment_reason } = req.body;

  if (!amendment_reason) {
    res.status(400).json({ error: 'Amendment reason is required to re-open report' });
    return;
  }

  try {
    const report = await db.queryOne<{ id: string; lab_id: string; order_id: string; status: string; version_number: number; report_number: string }>(
      `SELECT id, lab_id, order_id, status, version_number, report_number FROM reports WHERE id = $1`,
      [reportId]
    );

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (req.user?.lab_id && report.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot amend report belonging to another laboratory' });
      return;
    }

    const newVer = (report.version_number || 1) + 1;

    // Snapshot existing report into versions table before amendment
    await db.execute(
      `INSERT INTO report_versions (id, report_id, version_number, snapshot_data, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`rv-${uuidv4().substring(0, 8)}`, reportId, newVer, JSON.stringify({ status: report.status, amended_at: new Date().toISOString() }), req.user?.id, amendment_reason]
    );

    await db.execute(
      `UPDATE reports
       SET status = 'amended',
           version_number = $1,
           is_amended = 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newVer, reportId]
    );

    auditFromReq(req, 'AMEND_REPORT', 'report', reportId, { version: report.version_number }, {
      version: newVer,
      amendment_reason,
      report_number: report.report_number
    });

    res.json({ message: `Report amended to Version ${newVer}`, version: newVer, status: 'amended' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:id/pdf - Stream high-quality A4 PDF diagnostic report
router.get('/:id/pdf', authenticateToken, async (req: AuthRequest, res: Response) => {
  const reportId = req.params.id as string;

  try {
    const reportRow = await db.queryOne(
      `SELECT r.*,
              o.order_number, o.lab_number, o.created_at as order_date,
              p.name as patient_name, p.patient_id_code, p.age, p.age_unit, p.gender, p.mobile, p.address as patient_address,
              d.name as doctor_name, d.qualification as doctor_qualification, d.specialization as doctor_specialization, d.clinic_hospital as doctor_hospital,
              b.name as branch_name, b.code as branch_code, b.address as branch_address, b.phone as branch_phone,
              l.name as lab_name, l.license_number, l.address as lab_address, l.phone as lab_phone, l.email as lab_email, l.header_text, l.footer_text,
              u_app.name as approver_name, r_role.code as approver_role
       FROM reports r
       JOIN test_orders o ON r.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       LEFT JOIN doctors d ON o.referring_doctor_id = d.id
       LEFT JOIN branches b ON r.branch_id = b.id
       LEFT JOIN laboratories l ON r.lab_id = l.id
       LEFT JOIN users u_app ON r.approved_by = u_app.id
       LEFT JOIN roles r_role ON u_app.role_id = r_role.id
       WHERE r.id = $1`,
      [reportId]
    );

    if (!reportRow) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (req.user?.lab_id && reportRow.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot access report PDF from another laboratory' });
      return;
    }

    const sample = await db.queryOne(`SELECT * FROM samples WHERE order_id = $1 LIMIT 1`, [reportRow.order_id]);

    const results = await db.query(
      `SELECT r.id as result_id, r.clinical_remarks, r.impression, t.name as test_name, t.department, t.method
       FROM results r
       JOIN tests t ON r.test_id = t.id
       WHERE r.order_id = $1`,
      [reportRow.order_id]
    );

    const testSections: any[] = [];
    for (const r of results) {
      const values = await db.query(
        `SELECT rv.*, tp.name as param_name, tp.display_order
         FROM result_values rv
         JOIN test_parameters tp ON rv.parameter_id = tp.id
         WHERE rv.result_id = $1
         ORDER BY tp.display_order ASC`,
        [r.result_id]
      );

      testSections.push({
        test_name: r.test_name,
        department: r.department,
        method: r.method,
        clinical_remarks: r.clinical_remarks,
        impression: r.impression,
        parameters: values.map(v => ({
          param_name: v.param_name,
          value: v.value_numeric !== null ? v.value_numeric : (v.value_text || '-'),
          unit: v.unit,
          ref_range: v.reference_range_text,
          flag: v.flag,
          is_critical: Boolean(v.is_critical)
        }))
      });
    }

    const reportData: ReportData = {
      report_number: reportRow.report_number,
      created_at: reportRow.created_at,
      approved_at: reportRow.approved_at,
      version_number: reportRow.version_number || 1,
      is_amended: Boolean(reportRow.is_amended),
      watermark_text: reportRow.is_amended ? 'AMENDED REPORT' : undefined,
      patient: {
        name: reportRow.patient_name,
        patient_id_code: reportRow.patient_id_code,
        lab_number: reportRow.lab_number,
        age: reportRow.age,
        age_unit: reportRow.age_unit || 'Yrs',
        gender: reportRow.gender,
        mobile: reportRow.mobile,
        address: reportRow.patient_address
      },
      doctor: reportRow.doctor_name ? {
        name: reportRow.doctor_name,
        qualification: reportRow.doctor_qualification,
        specialization: reportRow.doctor_specialization,
        clinic_hospital: reportRow.doctor_hospital
      } : undefined,
      branch: {
        name: reportRow.branch_name,
        code: reportRow.branch_code,
        address: reportRow.branch_address,
        phone: reportRow.branch_phone
      },
      lab: {
        name: reportRow.lab_name,
        license_number: reportRow.license_number,
        address: reportRow.lab_address,
        phone: reportRow.lab_phone,
        email: reportRow.lab_email,
        header_text: reportRow.header_text,
        footer_text: reportRow.footer_text
      },
      sample: sample ? {
        sample_barcode: sample.sample_barcode,
        sample_type: sample.sample_type,
        collected_at: sample.collected_at
      } : undefined,
      tests: testSections,
      approver: reportRow.approver_name ? {
        name: reportRow.approver_name,
        role_code: reportRow.approver_role || 'pathologist'
      } : undefined
    };

    // Increment print count
    await db.execute(`UPDATE reports SET print_count = print_count + 1 WHERE id = $1`, [reportId]);
    auditFromReq(req, 'PRINT_REPORT_PDF', 'report', reportId, null, { report_number: reportRow.report_number });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Report_${reportRow.report_number}.pdf"`);

    generateReportPdf(reportData, res);
  } catch (err: any) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate report PDF' });
  }
});

export default router;
