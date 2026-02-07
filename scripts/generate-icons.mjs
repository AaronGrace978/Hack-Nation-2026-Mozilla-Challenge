import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '..', 'public', 'icons');
const sourceIcon = resolve(iconsDir, 'nexie-small.png');

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Resize the Nexie fox icon to each required manifest size
async function generateIcon(size) {
  await sharp(sourceIcon)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(resolve(iconsDir, `icon-${size}.png`));

  console.log(`Generated icon-${size}.png from Nexie source`);
}

await Promise.all([
  generateIcon(16),
  generateIcon(48),
  generateIcon(128),
]);

console.log('Nexie icons generated successfully!');
