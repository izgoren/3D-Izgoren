import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const checksum = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(checksum, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, drawPixel) {
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Draw modern 3D parcel brand icon: dark deep navy background with glowing cyan parcel diamond/polygon
function drawIconPixel(x, y, w, h, isMaskable = false) {
  // Normalize -1 to 1
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  const dist = Math.hypot(nx, ny);

  // Background: Deep Slate Navy (#0b1329) with radial gradient to (#030712)
  const bgGrad = Math.min(1, Math.max(0, dist * 0.75));
  let r = Math.round(11 * (1 - bgGrad) + 3 * bgGrad);
  let g = Math.round(19 * (1 - bgGrad) + 7 * bgGrad);
  let b = Math.round(41 * (1 - bgGrad) + 18 * bgGrad);
  let a = 255;

  // Safe zone scaling: maskable icons get a 25% padding so content stays in 80% safe zone
  const scale = isMaskable ? 0.72 : 0.88;
  const px = nx / scale;
  const py = ny / scale;

  // 3D Isometric Parcel Quad / Diamond
  // Vertices: top (0, -0.65), right (0.65, -0.05), bottom (0, 0.55), left (-0.65, -0.05)
  // Check if inside parcel polygon
  const absPx = Math.abs(px);
  const diamondTop = -0.65;
  const diamondMidY = -0.05;
  const diamondBottom = 0.55;

  let insideDiamond = false;
  if (py >= diamondTop && py <= diamondBottom) {
    if (py <= diamondMidY) {
      const edge = ((py - diamondTop) / (diamondMidY - diamondTop)) * 0.65;
      if (absPx <= edge) insideDiamond = true;
    } else {
      const edge = ((diamondBottom - py) / (diamondBottom - diamondMidY)) * 0.65;
      if (absPx <= edge) insideDiamond = true;
    }
  }

  // Parcel fill with cyan-emerald gradient and 3D terrain glow
  if (insideDiamond) {
    const tY = (py - diamondTop) / (diamondBottom - diamondTop);
    // Cyan to emerald
    r = Math.round(14 * (1 - tY) + 16 * tY);
    g = Math.round(165 * (1 - tY) + 185 * tY);
    b = Math.round(233 * (1 - tY) + 129 * tY);

    // Inner contour grid lines
    if (Math.abs(px) < 0.04 || Math.abs(py - diamondMidY) < 0.04) {
      r = 255;
      g = 255;
      b = 255;
    }
  }

  // Border glow for parcel boundary (Water stream effect)
  // Distance to diamond border
  let borderDist = 999;
  if (py >= diamondTop && py <= diamondBottom) {
    let edge = 0;
    if (py <= diamondMidY) {
      edge = ((py - diamondTop) / (diamondMidY - diamondTop)) * 0.65;
    } else {
      edge = ((diamondBottom - py) / (diamondBottom - diamondMidY)) * 0.65;
    }
    borderDist = Math.abs(absPx - edge);
  }

  if (borderDist < 0.05) {
    const intensity = 1 - borderDist / 0.05;
    r = Math.round(r * (1 - intensity) + 255 * intensity);
    g = Math.round(g * (1 - intensity) + 255 * intensity);
    b = Math.round(b * (1 - intensity) + 255 * intensity);
  }

  // 3D Extrusion base shadow underneath
  if (py > diamondMidY && py < diamondBottom + 0.18 && absPx < 0.6) {
    const shadowEdge = ((diamondBottom + 0.18 - py) / 0.23) * 0.6;
    if (absPx <= shadowEdge && !insideDiamond) {
      r = Math.round(3 * 0.5 + r * 0.5);
      g = Math.round(105 * 0.5 + g * 0.5);
      b = Math.round(160 * 0.5 + b * 0.5);
    }
  }

  return [r, g, b, a];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate PNGs
console.log('Generating PWA PNG icons...');
const png192 = createPng(192, 192, (x, y, w, h) => drawIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

const png512 = createPng(512, 512, (x, y, w, h) => drawIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

const pngMaskable512 = createPng(512, 512, (x, y, w, h) => drawIconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable512);

const pngApple = createPng(180, 180, (x, y, w, h) => drawIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngApple);

// Favicon (32x32 PNG inside favicon.ico format)
const png32 = createPng(32, 32, (x, y, w, h) => drawIconPixel(x, y, w, h, false));
// Write ico header + png
const icoHeader = Buffer.from([
  0, 0, // reserved
  1, 0, // type 1 = icon
  1, 0, // 1 image
  32, 32, // width, height
  0, // color palette
  0, // reserved
  1, 0, // color planes
  32, 0, // bpp
  ...[png32.length & 0xff, (png32.length >> 8) & 0xff, (png32.length >> 16) & 0xff, (png32.length >> 24) & 0xff],
  22, 0, 0, 0, // offset of image data
]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), Buffer.concat([icoHeader, png32]));

// 2. Generate Brand SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#0e172a" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>
    <linearGradient id="parcelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#0ea5e9" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="104" fill="url(#bgGrad)" />
  <!-- Isometric 3D Base -->
  <polygon points="256,410 420,310 420,335 256,435 92,335 92,310" fill="#0369a1" opacity="0.6" />
  <!-- 3D Parcel Polygon -->
  <polygon points="256,100 420,225 256,350 92,225" fill="url(#parcelGrad)" fill-opacity="0.35" stroke="#38bdf8" stroke-width="12" filter="url(#glow)" />
  <!-- Dynamic Inner Terrain Flow Lines -->
  <path d="M 174,162 L 338,287" stroke="#7dd3fc" stroke-width="4" stroke-dasharray="8 8" opacity="0.7" />
  <path d="M 338,162 L 174,287" stroke="#6ee7b7" stroke-width="4" stroke-dasharray="8 8" opacity="0.7" />
  <!-- Center 3D Location Pin -->
  <circle cx="256" cy="225" r="14" fill="#ffffff" filter="url(#glow)" />
  <circle cx="256" cy="225" r="7" fill="#0284c7" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

console.log('All PWA icons generated successfully in /public!');
