import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import db from './db/database';
import { runMigrations } from './db/migrate';
import { runSeeds } from './db/seed';

// Routes
import authRoutes from './routes/auth';
import laboratoryRoutes from './routes/laboratories';
import branchRoutes from './routes/branches';
import subscriptionRoutes from './routes/subscriptions';
import userRoutes from './routes/users';
import patientRoutes from './routes/patients';
import doctorRoutes from './routes/doctors';
import testRoutes from './routes/tests';
import orderRoutes from './routes/orders';
import sampleRoutes from './routes/samples';
import resultRoutes from './routes/results';
import reportRoutes from './routes/reports';
import billingRoutes from './routes/billing';
import analyticsRoutes from './routes/analytics';
import auditRoutes from './routes/audit';
import backupRoutes from './routes/backup';
import settingsRoutes from './routes/settings';
import notificationRoutes from './routes/notifications';
import sampleTypeRoutes from './routes/sampleTypes';
import accountingRoutes from './routes/accounting';
import inventoryRoutes from './routes/inventory';
import doctorPortalRoutes from './routes/doctorPortal';
import patientPortalRoutes from './routes/patientPortal';
import communicationRoutes from './routes/communication';
import reportTemplateRoutes from './routes/reportTemplates';
import verificationPublicRoutes from './routes/verificationPublic';
import analyzerRoutes from './routes/analyzers';
import hl7Routes from './routes/hl7';
import qcRoutes from './routes/qc';
import equipmentRoutes from './routes/equipment';
import lisRulesRoutes from './routes/lisRules';
import developerApiRoutes from './routes/developerApi';
import systemHealthRoutes from './routes/systemHealth';

// Phase 7 Command Center & Enterprise AI Routes
import commandCenterRoutes from './routes/commandCenter';
import organizationRoutes from './routes/organizations';
import aiClinicalRoutes from './routes/aiClinical';
import documentRoutes from './routes/documents';
import mobileSyncRoutes from './routes/mobileSync';
import whiteLabelRoutes from './routes/whiteLabel';
import approvalRoutes from './routes/approvals';
import securityCenterRoutes from './routes/securityCenter';
import featureFlagRoutes from './routes/featureFlags';
import searchRoutes from './routes/search';

// Production Hardening & Operations Routes
import dataImportRoutes from './routes/dataImport';
import onboardingRoutes from './routes/onboarding';
import paymentGatewayRoutes from './routes/paymentGateway';
import jobsRoutes from './routes/jobs';

// Phase 9 Enterprise Operations, Automation, Procurement & QMS
import operationsRoutes from './routes/operations';
import automationRoutes from './routes/automation';
import procurementRoutes from './routes/procurement';
import crmRoutes from './routes/crm';
import fieldServicesRoutes from './routes/fieldServices';
import workforceRoutes from './routes/workforce';
import qualityGovernanceRoutes from './routes/qualityGovernance';
import pricingEngineRoutes from './routes/pricingEngine';
import modulesRoutes from './routes/modules';


// Production Middleware
import { requestContextMiddleware } from './middleware/requestContext';
import { globalRateLimiter } from './middleware/rateLimiter';
import QueueService from './services/queueService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security, Context & Parsing
app.use(requestContextMiddleware);
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false, // Managed per tenant for white-label
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(cors({ origin: true, credentials: true }));
app.use(globalRateLimiter);
app.use(express.json({ limit: '20mb' }));
app.use(express.text({ type: ['text/*', 'application/hl7-v2'], limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads directory
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/laboratories', laboratoryRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/samples', sampleRoutes);
app.use('/api/sample-types', sampleTypeRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/doctor-portal', doctorPortalRoutes);
app.use('/api/patient-portal', patientPortalRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/report-templates', reportTemplateRoutes);
app.use('/api/verify', verificationPublicRoutes);

// Phase 6 LIS, Analyzer, QC & Enterprise Routes
app.use('/api/analyzers', analyzerRoutes);
app.use('/api/hl7', hl7Routes);
app.use('/api/qc', qcRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/lis-rules', lisRulesRoutes);
app.use('/api/developer', developerApiRoutes);
app.use('/api/system-health', systemHealthRoutes);

// Phase 7 Command Center, Multi-Lab, AI & Enterprise Routes
app.use('/api/command-center', commandCenterRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/ai', aiClinicalRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/mobile', mobileSyncRoutes);
app.use('/api/white-label', whiteLabelRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/security-center', securityCenterRoutes);
app.use('/api/feature-flags', featureFlagRoutes);
app.use('/api/search', searchRoutes);

// Production Operations & Hardening Routes
app.use('/api/import', dataImportRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/payments', paymentGatewayRoutes);
app.use('/api/jobs', jobsRoutes);

// Phase 9 Advanced Enterprise Operations Routes
app.use('/api/operations', operationsRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/field-services', fieldServicesRoutes);
app.use('/api/workforce', workforceRoutes);
app.use('/api/quality-governance', qualityGovernanceRoutes);
app.use('/api/pricing-engine', pricingEngineRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/v1/modules', modulesRoutes);


// Enhanced Liveness & Readiness Probes
app.get('/api/health', async (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MediFlow Clinical LIS Backend',
    database_driver: db.isPostgres ? 'PostgreSQL' : 'Embedded Relational (SQLite)',
    uptime_seconds: Math.floor(process.uptime()),
    memory: {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024)
    }
  });
});

app.get('/api/health/ready', async (req, res) => {
  try {
    const start = Date.now();
    await db.queryOne('SELECT 1');
    const dbLatency = Date.now() - start;
    const queueMetrics = QueueService.getMetrics();

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'up', latency_ms: dbLatency },
        queue: { status: 'operational', ...queueMetrics },
        storage: { status: fs.existsSync(uploadDir) ? 'accessible' : 'unavailable' }
      }
    });
  } catch (err: any) {
    res.status(503).json({ status: 'unready', error: err.message });
  }
});

// Centralized error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Clinical Server Error',
  });
});

async function startServer() {
  try {
    console.log('🚀 Initializing MediFlow LIS Database...');
    await db.initialize();
    await runMigrations();

    // Check if seeded; if users table is empty, auto seed
    const userCount = await db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
    if (!userCount || parseInt(userCount.count as any || '0') === 0) {
      console.log('🌱 Performing initial database seeding with clinical catalog and demo accounts...');
      await runSeeds();
    } else {
      // Ensure all user accounts have the new password
      const newHash = bcrypt.hashSync('admin123', 10);
      await db.execute('UPDATE users SET password_hash = $1', [newHash]);
      console.log('🔑 All user accounts updated with new password: admin123');
    }

    app.listen(PORT, () => {
      console.log(`\n============================================================`);
      console.log(`🏥 MediFlow LIS Clinical API Server running on port ${PORT}`);
      console.log(`   Health Check: http://localhost:${PORT}/api/health`);
      console.log(`   Database Driver: ${db.isPostgres ? 'PostgreSQL' : 'Embedded Relational SQLite'}`);
      console.log(`============================================================\n`);
    });
  } catch (error) {
    console.error('Fatal Server Startup Error:', error);
    process.exit(1);
  }
}

startServer();
