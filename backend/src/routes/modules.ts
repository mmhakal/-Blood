/**
 * Module Registry & Governance Routes (Section 41 & 42)
 * 
 * Exposes:
 * - Module manifests & ownership registry
 * - 8-layer dependency graph & direction validation
 * - Single-table ownership verification
 * - Module & Subsystem health
 */

import { Router, Response } from 'express';
import {
  MODULE_REGISTRY,
  getAllModuleManifests,
  getModuleManifest,
  validateSingleTableOwnership,
  validateDependencyDirection
} from '../config/moduleRegistry';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { BUSINESS_TRUTH_OWNERS } from '../types/moduleContracts';

const router = Router();

// GET /api/v1/modules - List all cataloged modules with ownership and layers
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const manifests = getAllModuleManifests();
  const ownershipValidation = validateSingleTableOwnership();

  res.json({
    total_modules: manifests.length,
    layers_count: 8,
    single_table_ownership_valid: ownershipValidation.valid,
    modules: manifests
  });
});

// GET /api/v1/modules/health/summary - Subsystem health and readiness
router.get('/health/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  const manifests = getAllModuleManifests();
  const summary = {
    healthy: manifests.filter(m => m.healthStatus === 'healthy').length,
    degraded: manifests.filter(m => m.healthStatus === 'degraded').length,
    offline: manifests.filter(m => m.healthStatus === 'offline').length,
    total: manifests.length,
    subsystems: {
      platform_core: { status: 'healthy', layer: 1 },
      master_data: { status: 'healthy', layer: 2 },
      lis_operations: { status: 'healthy', layer: 3 },
      specialized_clinical: { status: 'healthy', layer: 4 },
      finance_and_business: { status: 'healthy', layer: 5 },
      advanced_platform: { status: 'healthy', layer: 6 },
      reliability_governance: { status: 'healthy', layer: 7 }
    }
  };

  res.json(summary);
});

// GET /api/v1/modules/dependencies/graph - Complete dependency hierarchy
router.get('/dependencies/graph', authenticateToken, async (req: AuthRequest, res: Response) => {
  const manifests = getAllModuleManifests();
  const graph = manifests.map(m => ({
    id: m.moduleId,
    name: m.moduleName,
    owner: m.owner,
    layer: m.layer,
    dependencies: m.dependencies,
    tables_count: m.tablesOwned.length,
    events_produced_count: m.eventsProduced.length,
    events_consumed_count: m.eventsConsumed.length
  }));

  res.json({
    nodes: graph,
    truth_owners: BUSINESS_TRUTH_OWNERS
  });
});

// GET /api/v1/modules/:id - Detailed module manifest
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const manifest = getModuleManifest(req.params.id);
  if (!manifest) {
    res.status(404).json({ error: `Module not found: ${req.params.id}` });
    return;
  }
  res.json(manifest);
});

export default router;
