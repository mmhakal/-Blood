import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DataImportService, ImportEntity } from '../services/dataImportService';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/import/templates/:entity - Download sample CSV template
router.get('/templates/:entity', (req, res: Response) => {
  const entity = req.params.entity as ImportEntity;
  const csv = DataImportService.getTemplate(entity);

  if (!csv) {
    res.status(404).json({ error: 'Unknown import entity template' });
    return;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="template_${entity}.csv"`);
  res.send(csv);
});

// POST /api/import/validate - Parse & validate records
router.post('/validate', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { entity, data_csv, records } = req.body;
  const labId = req.user?.lab_id || 'lab-apex';

  if (!entity) {
    res.status(400).json({ error: 'Entity type is required (patients, doctors, tests, inventory)' });
    return;
  }

  try {
    let parsedRecords: Record<string, any>[] = [];
    if (data_csv) {
      parsedRecords = DataImportService.parseCSV(data_csv);
    } else if (Array.isArray(records)) {
      parsedRecords = records;
    } else {
      res.status(400).json({ error: 'Either data_csv or records array is required' });
      return;
    }

    const validation = await DataImportService.validate(entity, parsedRecords, labId);
    res.json(validation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/import/execute - Commit verified records
router.post('/execute', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { entity, records } = req.body;
  const labId = req.user?.lab_id || 'lab-apex';

  if (!entity || !Array.isArray(records) || records.length === 0) {
    res.status(400).json({ error: 'Valid entity and non-empty records array required' });
    return;
  }

  try {
    // Re-validate before commit
    const validation = await DataImportService.validate(entity, records, labId);
    if (!validation.can_import) {
      res.status(422).json({
        error: 'Validation failed on submitted batch',
        details: validation.errors
      });
      return;
    }

    const result = await DataImportService.executeImport(entity, records, labId, req.user?.id);
    auditFromReq(req, 'DATA_IMPORT_BATCH', entity, null, null, {
      entity,
      imported_count: result.imported_count
    });

    res.json({
      message: `Successfully imported ${result.imported_count} ${entity} records into LIS database.`,
      imported_count: result.imported_count
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
