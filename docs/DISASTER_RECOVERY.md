# MediFlow LIS — Disaster Recovery & Business Continuity Runbook

Standard Operating Procedures (SOP) for emergency response, failover, data restoration, and service resumption.

---

## 1. Recovery Objectives
- **RPO (Recovery Point Objective)**: $\le 1$ hour (Automated hourly differential snapshots / daily full backups).
- **RTO (Recovery Time Objective)**: $\le 15$ minutes (Automated container redeployment / database restore).

---

## 2. Emergency Escalation Hierarchy
1. **Incident Commander**: Lead DevOps / Infrastructure Administrator.
2. **Clinical Liaison**: Medical Director / Chief Pathologist.
3. **Operations Coordinator**: Laboratory Administrative Director.

---

## 3. Failure Scenarios & Recovery Procedures

### Scenario A: Primary Database Failure or Corruption
1. **Isolate**: Terminate write traffic by setting the application server to read-only maintenance mode.
2. **Identify Latest Backup**:
   - Access encrypted backup storage in `/app/data/backups/` or S3 bucket `mediflow-backups`.
   - Identify latest verified snapshot (e.g. `backup-2026-09-14T02-00-00.sql.enc`).
3. **Decrypt & Restore**:
   ```bash
   # Decrypt using master encryption key
   openssl enc -d -aes-256-cbc -in backup.sql.enc -out restore.sql -pass env:ENCRYPTION_MASTER_KEY

   # Execute restore
   psql -U mediflow_admin -d mediflow_lis < restore.sql
   ```
4. **Integrity Validation**:
   - Run `npm --prefix backend run migrate:check` to verify table constraints and foreign keys.
   - Query latest test order: `SELECT * FROM test_orders ORDER BY created_at DESC LIMIT 1`.
5. **Resume**: Disable maintenance mode, restart backend daemon, and verify `/api/health`.

### Scenario B: Application Server Crash or Unresponsive Node
1. Container restart via Docker Compose:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```
2. Verify container liveness:
   ```bash
   curl -s http://localhost:5000/api/health | jq .
   ```

### Scenario C: Analyzer Interface Socket Disconnection
1. Inspect serial/TCP connection state:
   ```bash
   curl -H "Authorization: Bearer <TOKEN>" http://localhost:5000/api/analyzers
   ```
2. Check physical ethernet/serial cable and local gateway daemon.
3. Reprocess unparsed raw packets stored in `analyzer_messages` table with status `pending`.

### Scenario D: Storage Volume Exhaustion
1. Check disk utilization:
   ```bash
   df -h /app/uploads
   ```
2. Compress and archive released report snapshots older than 365 days to cold cloud storage (AWS S3 Glacier).

---

## 4. Verification & Post-Mortem
Following any failover or disaster recovery event:
1. Run complete automated regression test suite:
   ```bash
   npm --prefix backend run test:core
   npm --prefix backend run test:phase4
   npm --prefix backend run test:phase7
   ```
2. Verify audit logs recorded the incident timestamp and remediation steps.
3. Document post-mortem report within 24 hours.
