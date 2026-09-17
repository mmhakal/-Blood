import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/sample-types - list sample types
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const sampleTypes = await db.query(
      `SELECT * FROM sample_types
       WHERE (lab_id = $1 OR lab_id IS NULL) AND deleted_at IS NULL
       ORDER BY name ASC`,
      [labId]
    );
    res.json(sampleTypes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sample-types - create sample type
router.post('/', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const { name, code, container, color_code, cap_type, min_volume, storage_requirement, processing_instructions } = req.body;
  const labId = req.user?.lab_id;

  if (!name || !code || !container) {
    res.status(400).json({ error: 'Sample type name, code, and container type are required' });
    return;
  }

  try {
    const id = `smp-type-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO sample_types (
        id, lab_id, name, code, container, color_code, cap_type, min_volume,
        storage_requirement, processing_instructions, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11)`,
      [
        id, labId, name.trim(), code.trim().toUpperCase(), container.trim(),
        color_code || '#8b5cf6', cap_type || '', min_volume || '2.0 mL',
        storage_requirement || '2-8°C refrigerated', processing_instructions || '',
        req.user?.id || null
      ]
    );

    auditFromReq(req, 'CREATE_SAMPLE_TYPE', 'sample_type', id, null, { name, code: code.toUpperCase() });
    res.status(201).json({ message: 'Sample type created successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sample-types/:id - update sample type
router.put('/:id', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  const { name, code, container, color_code, cap_type, min_volume, storage_requirement, processing_instructions, status } = req.body;

  try {
    await db.execute(
      `UPDATE sample_types
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           container = COALESCE($3, container),
           color_code = COALESCE($4, color_code),
           cap_type = COALESCE($5, cap_type),
           min_volume = COALESCE($6, min_volume),
           storage_requirement = COALESCE($7, storage_requirement),
           processing_instructions = COALESCE($8, processing_instructions),
           status = COALESCE($9, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        name, code ? code.toUpperCase() : null, container, color_code, cap_type,
        min_volume, storage_requirement, processing_instructions, status, id
      ]
    );

    auditFromReq(req, 'UPDATE_SAMPLE_TYPE', 'sample_type', id, null, req.body);
    res.json({ message: 'Sample type updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sample-types/:id/status - activate or deactivate
router.patch('/:id/status', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    res.status(400).json({ error: 'Valid status (active or inactive) is required' });
    return;
  }

  try {
    await db.execute(`UPDATE sample_types SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, id]);
    res.json({ message: `Sample type status updated to '${status}'` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sample-types/:id - soft delete sample type
router.delete('/:id', authenticateToken, requirePermission('manage_tests'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  try {
    await db.execute(`UPDATE sample_types SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    res.json({ message: 'Sample type removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
