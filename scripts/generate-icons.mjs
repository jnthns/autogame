import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#14120E"/>
  <rect x="40" y="40" width="432" height="432" fill="#F2E9D4" stroke="#14120E" stroke-width="12"/>
  <rect x="72" y="72" width="368" height="120" fill="#14120E"/>
  <text x="256" y="158" text-anchor="middle" font-family="Georgia, serif" font-size="88" font-weight="bold" fill="#F2E9D4">12</text>
  <rect x="72" y="220" width="368" height="180" fill="#1B6B52"/>
  <text x="256" y="340" text-anchor="middle" font-family="Georgia, serif" font-size="96" font-weight="bold" fill="#E8A317">☷</text>
</svg>`;

const buf = Buffer.from(svg);

await sharp(buf).png().toFile(path.join(outDir, 'icon-512.png'));
await sharp(buf).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'));

console.log('Generated PWA icons in public/icons/');
