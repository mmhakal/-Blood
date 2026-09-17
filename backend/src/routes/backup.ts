import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { createDatabaseBackup, listBackups, getBackupFilePath } from '../services/backupService';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/backups
router.get('/', authenticateToken, requirePermission('manage_backup'), async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.role_code === 'super_admin' ? null : req.user?.lab_id;
    const backups = await listBackups(labId);
    res.json(backups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backups - trigger manual database backup
router.post('/', authenticateToken, requirePermission('manage_backup'), async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.role_code === 'super_admin' ? null : req.user?.lab_id;
    const result = await createDatabaseBackup(labId, req.user?.id);

    auditFromReq(req, 'CREATE_BACKUP', 'backup', result.id, null, { filename: result.filename });
    res.status(201).json({ message: 'Backup created successfully', backup: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/backups/:filename/download
router.get('/:filename/download', authenticateToken, requirePermission('manage_backup'), async (req: AuthRequest, res: Response) => {
  const filename = req.params.filename as string;
  const filePath = getBackupFilePath(filename);

  if (!filePath) {
    res.status(404).json({ error: 'Backup file not found' });
    return;
  }

  auditFromReq(req, 'DOWNLOAD_BACKUP', 'backup', undefined, undefined, { filename });
  res.download(filePath, filename);
});

export default router;
