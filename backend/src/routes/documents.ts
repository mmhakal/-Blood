import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/documents - List laboratory documents
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || (req.headers['x-lab-id'] as string) || (req.user?.role_code === 'super_admin' ? null : 'lab-apex');
  const category = (req.query.category as string) || undefined;

  try {
    let query = `
      SELECT d.*, 
             COALESCE(d.id, 'DOC-001') as document_number,
             COALESCE(u.name, 'QA Compliance Officer') as uploaded_by_name,
             (CASE 
                WHEN d.expiry_date IS NOT NULL AND d.expiry_date < date('now') THEN 'expired'
                WHEN d.expiry_date IS NOT NULL AND d.expiry_date <= date('now', '+30 days') THEN 'expiring_soon'
                ELSE 'active'
              END) as status,
             (SELECT COUNT(*) FROM document_versions WHERE document_id = d.id) as version_count,
             (SELECT COUNT(*) FROM document_access_logs WHERE document_id = d.id) as access_count
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND d.lab_id = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      query += ` AND d.category = $${params.length}`;
    }

    query += ` ORDER BY d.created_at DESC`;

    const docs = await db.query(query, params);
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents - Register / Upload document
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { title, category, file_url, file_size_bytes, mime_type, expiry_date, branch_id } = req.body;

  if (!title || !category) {
    res.status(400).json({ error: 'Title and category are required' });
    return;
  }

  try {
    const id = `doc-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO documents (id, lab_id, branch_id, category, title, file_url, file_size_bytes, mime_type, version, expiry_date, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10)`,
      [
        id,
        labId,
        branch_id || req.user?.branch_id || null,
        category,
        title,
        file_url || `/documents/${id}.pdf`,
        file_size_bytes || 102400,
        mime_type || 'application/pdf',
        expiry_date || null,
        req.user?.id || 'user-labadmin'
      ]
    );

    auditFromReq(req, 'UPLOAD_DOCUMENT', 'document', id, null, { title, category });

    res.status(201).json({ message: 'Document registered successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/download - Audit download and return file URL
router.get('/:id/download', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db.queryOne<{ id: string; title: string; file_url: string }>(
      `SELECT id, title, file_url FROM documents WHERE id = $1`,
      [req.params.id]
    );

    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Log access
    const logId = `dal-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO document_access_logs (id, document_id, user_id, action, ip_address)
       VALUES ($1, $2, $3, 'download', $4)`,
      [logId, doc.id, req.user?.id || 'user-labadmin', req.ip || '127.0.0.1']
    );

    res.json({
      document_id: doc.id,
      title: doc.title,
      download_url: doc.file_url,
      expires_in_seconds: 3600
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/versions - Upload new version
router.post('/:id/versions', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { file_url, change_summary } = req.body;

  try {
    const doc = await db.queryOne<{ version: number }>(`SELECT version FROM documents WHERE id = $1`, [req.params.id]);
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const nextVer = (doc.version || 1) + 1;
    const vId = `dver-${uuidv4().substring(0, 8)}`;

    await db.execute(
      `INSERT INTO document_versions (id, document_id, version_number, file_url, change_summary, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [vId, req.params.id, nextVer, file_url || `/documents/${req.params.id}_v${nextVer}.pdf`, change_summary || '', req.user?.id || 'user-labadmin']
    );

    await db.execute(
      `UPDATE documents SET version = $1, file_url = $2 WHERE id = $3`,
      [nextVer, file_url || `/documents/${req.params.id}_v${nextVer}.pdf`, req.params.id]
    );

    auditFromReq(req, 'NEW_DOCUMENT_VERSION', 'document', req.params.id, null, { new_version: nextVer });

    res.status(201).json({ message: `Version ${nextVer} uploaded successfully`, version_id: vId, version: nextVer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
