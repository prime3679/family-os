import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

const svgPath = join(iconsDir, 'icon.svg');
const svgBuffer = readFileSync(svgPath);

async function generateIcons() {
  console.log('Generating PWA icons...');

  for (const { size, name } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, name));
    console.log(`  Created ${name}`);
  }

  // Create maskable icon (with padding for safe zone)
  // Maskable icons need ~10% padding, so we scale the icon to 80% and center it
  const maskableSize = 512;
  const iconSize = Math.round(maskableSize * 0.8);
  const padding = Math.round((maskableSize - iconSize) / 2);

  const iconBuffer = await sharp(svgBuffer)
    .resize(iconSize, iconSize)
    .toBuffer();

  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 255, g: 251, b: 247, alpha: 1 } // #FFFBF7
    }
  })
    .composite([{
      input: iconBuffer,
      top: padding,
      left: padding
    }])
    .png()
    .toFile(join(iconsDir, 'maskable-icon-512x512.png'));

  console.log('  Created maskable-icon-512x512.png');
  console.log('Done! Generated all PWA icons.');
}

generateIcons().catch(console.error);
