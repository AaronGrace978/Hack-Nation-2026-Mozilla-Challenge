import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '..', 'public', 'icons');

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Generate a simple icon with "N" for Nexus
async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4c6ef5;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3b5bdb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#bg)"/>
      <text
        x="50%" y="55%"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="white"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="bold"
        font-size="${Math.round(size * 0.55)}"
      >N</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(resolve(iconsDir, `icon-${size}.png`));

  console.log(`Generated icon-${size}.png`);
}

await Promise.all([
  generateIcon(16),
  generateIcon(48),
  generateIcon(128),
]);

console.log('Icons generated successfully!');
