import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const zipOutput = path.resolve(__dirname, '../extension.zip');

if (!fs.existsSync(distDir)) {
  console.error('[Package Error] dist directory does not exist! Run build first.');
  process.exit(1);
}

if (fs.existsSync(zipOutput)) {
  fs.unlinkSync(zipOutput);
}

try {
  console.log('[Package] Packaging extension into extension.zip...');
  // Use fast Windows tar.exe with automatic format deduction (-a)
  execSync(`tar -a -c -f "${zipOutput}" -C "${distDir}" .`, {
    stdio: 'inherit'
  });
  const stats = fs.statSync(zipOutput);
  console.log(`[Package Success] Created extension.zip (${(stats.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error('[Package Error] Failed to create extension.zip:', err);
  process.exit(1);
}
