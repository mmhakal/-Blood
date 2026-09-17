import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';
import { parseAnalyzerPacket } from '../services/analyzerParserService';
import { evaluateDeltaCheck, evaluateFormula, evaluateReflexTriggers } from '../services/validationEngineService';
import { dispatchWebhookEvent } from '../services/webhookDispatchService';

const router = Router();

// GET /api/analyzers - List analyzers with status & telemetry
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;

  try {
    const analyzers = await db.query(
      `SELECT a.*, b.name as branch_name,
              c.status as connection_status, c.last_heartbeat, c.latency_ms, c.packets_sent, c.packets_received,
              (SELECT COUNT(*) FROM analyzer_test_mappings WHERE analyzer_id = a.id) as mapping_count,
              (SELECT COUNT(*) FROM analyzer_results WHERE analyzer_id = a.id AND status = 'pending') as pending_results_count
       FROM analyzers a
       LEFT JOIN branches b ON a.branch_id = b.id
       LEFT JOIN analyzer_connections c ON a.id = c.analyzer_id
       WHERE a.lab_id = $1 OR a.lab_id = 'lab-apex'
       ORDER BY a.name ASC`,
      [labId || 'lab-apex']
    );

    res.json(analyzers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analyzers - Register analyzer
router.post('/', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }

  const { name, manufacturer, model, serial_number, department, connection_type, protocol, ip_address, port, branch_id, maintenance_schedule } = req.body;

  if (!name || !manufacturer || !model || !department) {
    res.status(400).json({ error: 'Analyzer name, manufacturer, model, and department are required' });
    return;
  }

  try {
    const id = `anl-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO analyzers (id, lab_id, branch_id, name, manufacturer, model, serial_number, department, connection_type, protocol, ip_address, port, status, maintenance_schedule, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'online', $13, 1)`,
      [id, labId, branch_id || null, name, manufacturer, model, serial_number || null, department, connection_type || 'tcp', protocol || 'hl7', ip_address || null, port || null, maintenance_schedule || 'monthly']
    );

    await db.execute(
      `INSERT INTO analyzer_connections (id, analyzer_id, status, last_heartbeat, latency_ms)
       VALUES ($1, $2, 'connected', CURRENT_TIMESTAMP, 15)`,
      [`conn-${id}`, id]
    );

    auditFromReq(req, 'REGISTER_ANALYZER', 'analyzer', id, null, { name, manufacturer, model, protocol });

    res.status(201).json({ message: 'Analyzer registered successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analyzers/:id - Analyzer details
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const analyzer = await db.queryOne(
      `SELECT a.*, b.name as branch_name,
              c.status as connection_status, c.last_heartbeat, c.latency_ms, c.packets_sent, c.packets_received
       FROM analyzers a
       LEFT JOIN branches b ON a.branch_id = b.id
       LEFT JOIN analyzer_connections c ON a.id = c.analyzer_id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (!analyzer) {
      res.status(404).json({ error: 'Analyzer not found' });
      return;
    }

    const mappings = await db.query(
      `SELECT m.*, t.name as test_name, t.code as test_code, tp.name as param_name, tp.unit as system_unit
       FROM analyzer_test_mappings m
       JOIN tests t ON m.test_id = t.id
       JOIN test_parameters tp ON m.parameter_id = tp.id
       WHERE m.analyzer_id = $1
       ORDER BY m.analyzer_test_code ASC`,
      [req.params.id]
    );

    res.json({ analyzer, mappings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analyzers/:id/test-connection - Connection handshake test
router.post('/:id/test-connection', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const analyzer = await db.queryOne<{ id: string; name: string; status: string; protocol: string }>(
      `SELECT id, name, status, protocol FROM analyzers WHERE id = $1`,
      [req.params.id]
    );

    if (!analyzer) {
      res.status(404).json({ error: 'Analyzer not found' });
      return;
    }

    const latency = Math.floor(Math.random() * 25) + 8; // 8 - 32ms simulated response
    await db.execute(
      `UPDATE analyzer_connections
       SET status = 'connected', last_heartbeat = CURRENT_TIMESTAMP, latency_ms = $1, packets_sent = packets_sent + 1, packets_received = packets_received + 1
       WHERE analyzer_id = $2`,
      [latency, analyzer.id]
    );

    res.json({
      success: true,
      analyzer: analyzer.name,
      protocol: analyzer.protocol.toUpperCase(),
      status: 'online',
      latency_ms: latency,
      message: `Connection to ${analyzer.name} established successfully via ${analyzer.protocol.toUpperCase()}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analyzers/:id/mappings - Get test parameter mappings
router.get('/:id/mappings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const mappings = await db.query(
      `SELECT m.*, t.name as test_name, t.code as test_code, tp.name as param_name, tp.unit as system_unit
       FROM analyzer_test_mappings m
       JOIN tests t ON m.test_id = t.id
       JOIN test_parameters tp ON m.parameter_id = tp.id
       WHERE m.analyzer_id = $1
       ORDER BY m.analyzer_test_code ASC`,
      [req.params.id]
    );

    res.json(mappings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analyzers/:id/mappings - Add or update parameter mapping
router.post('/:id/mappings', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  const analyzerId = req.params.id;
  const { test_id, parameter_id, analyzer_test_code, analyzer_parameter_name, loinc_code, unit, decimal_precision, conversion_formula } = req.body;

  if (!test_id || !parameter_id || !analyzer_test_code) {
    res.status(400).json({ error: 'test_id, parameter_id, and analyzer_test_code are required' });
    return;
  }

  try {
    const id = `map-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO analyzer_test_mappings (id, lab_id, analyzer_id, test_id, parameter_id, analyzer_test_code, analyzer_parameter_name, loinc_code, unit, decimal_precision, conversion_formula, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)
       ON CONFLICT (analyzer_id, analyzer_test_code)
       DO UPDATE SET test_id = $4, parameter_id = $5, analyzer_parameter_name = $7, loinc_code = $8, unit = $9, decimal_precision = $10, conversion_formula = $11, updated_at = CURRENT_TIMESTAMP`,
      [id, labId || 'lab-apex', analyzerId, test_id, parameter_id, analyzer_test_code.trim().toUpperCase(), analyzer_parameter_name || null, loinc_code || null, unit || null, decimal_precision || 2, conversion_formula || null]
    );

    auditFromReq(req, 'SAVE_ANALYZER_MAPPING', 'analyzer_test_mapping', id, null, { analyzer_id: analyzerId, test_code: analyzer_test_code });

    res.status(201).json({ message: `Mapping for ${analyzer_test_code} configured successfully`, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analyzers/:id/simulate-packet - Ingest raw ASTM / HL7 / JSON packet & automatic result import
router.post('/:id/simulate-packet', authenticateToken, async (req: AuthRequest, res: Response) => {
  const analyzerId = req.params.id;
  const labId = req.user?.lab_id || 'lab-apex';
  const { raw_message, protocol_hint } = req.body;

  if (!raw_message) {
    res.status(400).json({ error: 'raw_message payload is required' });
    return;
  }

  try {
    const analyzer = await db.queryOne<{ id: string; name: string; protocol: string }>(
      `SELECT * FROM analyzers WHERE id = $1`,
      [analyzerId]
    );

    if (!analyzer) {
      res.status(404).json({ error: 'Analyzer not found' });
      return;
    }

    // Parse packet using Universal Parser
    const parsed = parseAnalyzerPacket(raw_message, protocol_hint || analyzer.protocol);

    // Save message log
    const messageId = `amsg-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO analyzer_messages (id, lab_id, analyzer_id, direction, protocol, raw_message, parsed_json, status)
       VALUES ($1, $2, $3, 'inbound', $4, $5, $6, 'processed')`,
      [messageId, labId, analyzer.id, parsed.protocol, raw_message, JSON.stringify(parsed)]
    );

    const importedResults: any[] = [];
    const matchedOrders: string[] = [];

    // Process each observation item
    for (const item of parsed.results) {
      const resultQueueId = `ares-${uuidv4().substring(0, 8)}`;

      // Look up mapping for this analyzer and test code
      const mapping = await db.queryOne<{
        test_id: string;
        parameter_id: string;
        decimal_precision: number;
        conversion_formula: string;
        test_name: string;
        param_name: string;
      }>(
        `SELECT m.*, t.name as test_name, tp.name as param_name
         FROM analyzer_test_mappings m
         JOIN tests t ON m.test_id = t.id
         JOIN test_parameters tp ON m.parameter_id = tp.id
         WHERE m.analyzer_id = $1 AND UPPER(m.analyzer_test_code) = UPPER($2) AND m.is_active = 1`,
        [analyzer.id, item.testCode]
      );

      let finalValue = item.parsedNumericValue;
      if (finalValue !== null && mapping?.conversion_formula) {
        const computed = evaluateFormula(mapping.conversion_formula, { value: finalValue });
        if (computed !== null) finalValue = computed;
      }

      // Try to find matching sample / test order in laboratory
      const sample = await db.queryOne<{ id: string; order_id: string }>(
        `SELECT id, order_id FROM samples WHERE (sample_barcode = $1 OR sample_barcode = $2) AND lab_id = $3 LIMIT 1`,
        [item.sampleBarcode, `SMP-2026-${item.sampleBarcode}`, labId]
      );

      let matchStatus = 'pending';
      let matchedResultId: string | null = null;

      if (sample && mapping) {
        // Find order item
        const orderItem = await db.queryOne<{ id: string }>(
          `SELECT id FROM order_items WHERE order_id = $1 AND test_id = $2 LIMIT 1`,
          [sample.order_id, mapping.test_id]
        );

        if (orderItem) {
          // Check or create results entry
          let resHeader = await db.queryOne<{ id: string }>(
            `SELECT id FROM results WHERE order_item_id = $1`,
            [orderItem.id]
          );

          if (!resHeader) {
            matchedResultId = `res-${uuidv4().substring(0, 8)}`;
            await db.execute(
              `INSERT INTO results (id, order_id, order_item_id, test_id, status, entered_by, clinical_remarks)
               VALUES ($1, $2, $3, $4, 'draft', $5, $6)`,
              [matchedResultId, sample.order_id, orderItem.id, mapping.test_id, req.user?.id || 'system', `Imported automatically from ${analyzer.name}`]
            );
          } else {
            matchedResultId = resHeader.id;
          }

          // Reference ranges lookup for flag
          const refRange = await db.queryOne<{
            normal_min: number;
            normal_max: number;
            critical_low: number;
            critical_high: number;
          }>(
            `SELECT normal_min, normal_max, critical_low, critical_high
             FROM reference_ranges
             WHERE parameter_id = $1 LIMIT 1`,
            [mapping.parameter_id]
          );

          let flag = 'normal';
          let isCritical = 0;
          if (finalValue !== null && refRange) {
            if (refRange.critical_low !== null && finalValue <= refRange.critical_low) {
              flag = 'critical_low';
              isCritical = 1;
            } else if (refRange.critical_high !== null && finalValue >= refRange.critical_high) {
              flag = 'critical_high';
              isCritical = 1;
            } else if (refRange.normal_min !== null && finalValue < refRange.normal_min) {
              flag = 'low';
            } else if (refRange.normal_max !== null && finalValue > refRange.normal_max) {
              flag = 'high';
            }
          }

          // Insert or update result_values
          const valId = `rval-${uuidv4().substring(0, 8)}`;
          await db.execute(
            `INSERT INTO result_values (id, result_id, parameter_id, value_text, value_numeric, flag, is_critical)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [valId, matchedResultId, mapping.parameter_id, String(finalValue !== null ? finalValue : item.rawValue), finalValue, flag, isCritical]
          );

          // Update sample status to result_received
          await db.execute(`UPDATE samples SET status = 'received' WHERE id = $1`, [sample.id]);

          matchStatus = 'imported';
          if (!matchedOrders.includes(sample.order_id)) {
            matchedOrders.push(sample.order_id);
          }
        }
      }

      await db.execute(
        `INSERT INTO analyzer_results (id, lab_id, analyzer_id, message_id, sample_barcode, accession_number, analyzer_test_code, raw_value, parsed_value, unit, flag, status, matched_result_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [resultQueueId, labId, analyzer.id, messageId, item.sampleBarcode, item.accessionNumber || null, item.testCode, item.rawValue, finalValue, item.unit || null, item.flag || 'normal', matchStatus, matchedResultId]
      );

      importedResults.push({
        barcode: item.sampleBarcode,
        testCode: item.testCode,
        value: finalValue !== null ? finalValue : item.rawValue,
        unit: item.unit,
        matchStatus
      });
    }

    // Trigger webhook for imported results
    dispatchWebhookEvent(labId, 'result.imported', {
      analyzer: analyzer.name,
      resultsCount: importedResults.length,
      matchedOrdersCount: matchedOrders.length,
      timestamp: new Date().toISOString()
    });

    auditFromReq(req, 'IMPORT_ANALYZER_RESULTS', 'analyzer_result', messageId, null, {
      analyzer: analyzer.name,
      items: importedResults.length,
      matched: matchedOrders.length
    });

    res.json({
      message: `Parsed ${parsed.results.length} observations from ${analyzer.name}`,
      protocol: parsed.protocol.toUpperCase(),
      imported_count: importedResults.length,
      matched_orders: matchedOrders.length,
      results: importedResults
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analyzers/results/imported - List imported analyzer results feed
router.get('/results/imported', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;

  try {
    const results = await db.query(
      `SELECT ar.*, a.name as analyzer_name, a.department,
              atm.analyzer_parameter_name, tp.name as system_parameter_name, tp.unit as system_unit
       FROM analyzer_results ar
       JOIN analyzers a ON ar.analyzer_id = a.id
       LEFT JOIN analyzer_test_mappings atm ON (ar.analyzer_id = atm.analyzer_id AND UPPER(ar.analyzer_test_code) = UPPER(atm.analyzer_test_code))
       LEFT JOIN test_parameters tp ON atm.parameter_id = tp.id
       WHERE ar.lab_id = $1 OR ar.lab_id = 'lab-apex'
       ORDER BY ar.created_at DESC LIMIT 100`,
      [labId || 'lab-apex']
    );

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analyzers/messages/logs - Raw communication logs
router.get('/messages/logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;

  try {
    const logs = await db.query(
      `SELECT am.*, a.name as analyzer_name
       FROM analyzer_messages am
       JOIN analyzers a ON am.analyzer_id = a.id
       WHERE am.lab_id = $1 OR am.lab_id = 'lab-apex'
       ORDER BY am.created_at DESC LIMIT 50`,
      [labId || 'lab-apex']
    );

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
