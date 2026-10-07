#!/usr/bin/env node
/**
 * Generates every FINB PWA icon from one vector source (sharp), so the app
 * never ships a placeholder squircle. Run with: npm run icons
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const OUT = join(process.cwd(), 'public', 'icons');

const BRAND = (size, inset) => {
  const pad = inset;
  const inner = size - pad * 2;
  const radius = inner * 0.24;
  const strokeW = Math.max(2, Math.round(inner * 0.012));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="navy" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#141b3c"/>
      <stop offset="55%" stop-color="#0b1024"/>
      <stop offset="100%" stop-color="#05070f"/>
    </linearGradient>
    <linearGradient id="duo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF6B00"/>
      <stop offset="52%" stop-color="#FF9500"/>
      <stop offset="100%" stop-color="#00C853"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00E676" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#FF6B00" stop-opacity="0.25"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${size * 0.035}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#navy)"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${radius}" fill="none" stroke="url(#duo)" stroke-width="${strokeW}" opacity="0.85"/>
  <g filter="url(#soft)">
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
      font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" font-weight="800"
      font-size="${inner * 0.56}" fill="url(#duo)" letter-spacing="-2">F</text>
  </g>
  <rect x="${pad * 1.6}" y="${size - pad * 2.6}" width="${inner * 0.62}" height="${Math.max(3, size * 0.02)}" rx="${size * 0.01}" fill="url(#glow)"/>
  <circle cx="${size - pad * 2.1}" cy="${pad * 2.1}" r="${Math.max(3, size * 0.028)}" fill="#00E676"/>
  <circle cx="${pad * 2.1}" cy="${size - pad * 2.4}" r="${Math.max(3, size * 0.022)}" fill="#FF9500"/>
</svg>`;
};

/** Maskable variant: the mark sits inside the safe circle and bleeds to the edges. */
const MASKABLE = size => {
  const inner = size * 0.52;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bleed" cx="50%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#242f63"/>
      <stop offset="58%" stop-color="#0d1330"/>
      <stop offset="100%" stop-color="#05070f"/>
    </radialGradient>
    <linearGradient id="duo2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF6B00"/>
      <stop offset="60%" stop-color="#FF9500"/>
      <stop offset="100%" stop-color="#00C853"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bleed)"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${inner * 0.72}" fill="#0b1024" stroke="url(#duo2)" stroke-width="${size * 0.018}" opacity="0.92"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
    font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" font-weight="800"
    font-size="${inner * 0.86}" fill="url(#duo2)">F</text>
</svg>`;
};

const targets = [
  { file: 'icon-192.png', size: 192, svg: BRAND(192, 14) },
  { file: 'icon-256.png', size: 256, svg: BRAND(256, 18) },
  { file: 'icon-384.png', size: 384, svg: BRAND(384, 28) },
  { file: 'icon-512.png', size: 512, svg: BRAND(512, 36) },
  { file: 'icon-1024.png', size: 1024, svg: BRAND(1024, 72) },
  { file: 'apple-touch-icon.png', size: 180, svg: BRAND(180, 13) },
  { file: 'maskable-192.png', size: 192, svg: MASKABLE(192) },
  { file: 'maskable-512.png', size: 512, svg: MASKABLE(512) },
  { file: 'favicon-32.png', size: 32, svg: BRAND(32, 3) },
];

await mkdir(OUT, { recursive: true });
for (const target of targets) {
  const buffer = await sharp(Buffer.from(target.svg)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(join(OUT, target.file), buffer);
  console.log(`✓ ${target.file} (${target.size}×${target.size}, ${(buffer.length / 1024).toFixed(1)} KB)`);
}

await writeFile(join(OUT, 'favicon.svg'), BRAND(64, 4), 'utf8');
console.log('✓ favicon.svg');
console.log(`\nFINB icons written to ${OUT}`);
