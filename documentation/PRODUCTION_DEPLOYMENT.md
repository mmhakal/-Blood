# MediFlow LIS — Enterprise Production Deployment & Infrastructure Guide

## 1. System Architecture Overview

MediFlow LIS is architected as an enterprise-grade, multi-tenant Diagnostic Laboratory Information System:
- **Frontend**: High-performance React 18 SPA built with Vite, TypeScript, and modern clinical CSS tokens.
- **Backend API**: Node.js/TypeScript REST API with Express, Helmet, CORS, JWT-based RBAC, and double-entry ledger engines.
- **Relational Persistence**: PostgreSQL (Production) with automatic zero-downtime embedded fallback.
- **Security**: AES-256 encrypted provider credentials, immutable audit logging, and HMAC-SHA256 QR code cryptographic verification tokens.

---

## 2. Server Prerequisites

- **OS**: Ubuntu 22.04 LTS or Debian 12 / Enterprise Linux (RHEL 9)
- **Node.js**: v20.x or v22.x LTS (`node -v >= 20.0.0`)
- **PostgreSQL**: PostgreSQL 16+ with `uuid-ossp` and `pgcrypto` extensions
- **Reverse Proxy**: Nginx 1.24+ with HTTP/2 and SSL/TLS (Let's Encrypt / Certbot)
- **Process Manager**: PM2 v5+ or Systemd service daemon

---

## 3. Database Provisioning & Hardening

### 3.1 Create Database & Restricted Service Role
```bash
sudo -u postgres psql

-- Create production database and role
CREATE USER mediflow_admin WITH PASSWORD 'YourSecureClinicalPass2026!';
CREATE DATABASE mediflow_lis_prod OWNER mediflow_admin;

-- Connect to production database
\c mediflow_lis_prod

-- Grant schema privileges
GRANT ALL PRIVILEGES ON DATABASE mediflow_lis_prod TO mediflow_admin;
GRANT ALL ON SCHEMA public TO mediflow_admin;
```

### 3.2 Run Migrations and Initial Seed
```bash
cd /opt/mediflow/backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials and production JWT secrets

# Execute automated migrations
npm run migrate

# (Optional) Seed initial roles, permissions, and test master catalog
npm run seed
```

---

## 4. Production Build & Process Management

### 4.1 Build Frontend Assets
```bash
cd /opt/mediflow/frontend
npm ci
npm run build
# Output artifacts located in /opt/mediflow/frontend/dist
```

### 4.2 Build Backend API
```bash
cd /opt/mediflow/backend
npm ci
npm run build
```

### 4.3 Configure PM2 Daemon
Create `/opt/mediflow/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'mediflow-lis-api',
      script: './backend/dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      exp_backoff_restart_delay: 100,
      max_memory_restart: '1G',
    },
  ],
};
```

Launch with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 5. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/mediflow.conf`:
```nginx
server {
    listen 80;
    server_name lis.yourdiagnosticlab.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lis.yourdiagnosticlab.com;

    ssl_certificate /etc/letsencrypt/live/lis.yourdiagnosticlab.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lis.yourdiagnosticlab.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend Single Page Application
    location / {
        root /opt/mediflow/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend REST API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Clinical PDF downloads buffer settings
        proxy_buffering off;
        proxy_read_timeout 120s;
    }
}
```

Enable site and reload:
```bash
sudo ln -s /etc/nginx/sites-available/mediflow.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Automated Backup Strategy

Run automated nightly backups via cron:
```bash
# /etc/cron.d/mediflow-backup
0 2 * * * postgres pg_dump mediflow_lis_prod | gzip > /var/backups/mediflow/backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
0 3 * * * find /var/backups/mediflow/ -name "backup_*.sql.gz" -mtime +30 -delete
```

---

## 7. Disaster Recovery & Rollback

### Restoring from Backup
```bash
gunzip -c /var/backups/mediflow/backup_20260911_020000.sql.gz | psql -U mediflow_admin -d mediflow_lis_prod
```

### Zero-Downtime Rollback
PM2 supports zero-downtime reloads:
```bash
git checkout <previous_stable_tag>
npm run build
pm2 reload mediflow-lis-api
```
