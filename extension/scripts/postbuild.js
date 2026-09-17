import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');
const distDir = path.resolve(__dirname, '../dist');

// Copy manifest.json if missing from dist
const manifestSrc = path.join(publicDir, 'manifest.json');
const manifestDest = path.join(distDir, 'manifest.json');
if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDest);
  console.log('[Postbuild] manifest.json successfully copied to dist/');
}

// Copy icons if missing
const iconsSrcDir = path.join(publicDir, 'icons');
const iconsDestDir = path.join(distDir, 'icons');
if (fs.existsSync(iconsSrcDir)) {
  if (!fs.existsSync(iconsDestDir)) {
    fs.mkdirSync(iconsDestDir, { recursive: true });
  }
  const icons = fs.readdirSync(iconsSrcDir);
  icons.forEach((icon) => {
    fs.copyFileSync(path.join(iconsSrcDir, icon), path.join(iconsDestDir, icon));
  });
  console.log('[Postbuild] Icons successfully copied to dist/icons/');
}
