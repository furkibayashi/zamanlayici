// Uygulama ve tepsi simgelerini harici bağımlılık olmadan üretir.
// Kullanım: node scripts/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// İşaretli mesafe fonksiyonları (birim kare 0..1 koordinatlarında)
function sdRoundRect(x, y, half, r) {
  const qx = Math.abs(x - 0.5) - half + r;
  const qy = Math.abs(y - 0.5) - half + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

// Güç simgesi: üstte boşluk bırakan bir yay + dikey çizgi
function sdPower(x, y, cx, cy, R, w, gapDeg) {
  const dx = x - cx, dy = y - cy;
  const ang = Math.abs(Math.atan2(dx, -dy)) * 180 / Math.PI; // 0 = yukarı
  let dArc;
  if (ang >= gapDeg) {
    dArc = Math.abs(Math.hypot(dx, dy) - R) - w / 2;
  } else {
    const a = gapDeg * Math.PI / 180;
    const sx = Math.sign(dx) || 1;
    const ex = cx + sx * R * Math.sin(a), ey = cy - R * Math.cos(a);
    dArc = Math.hypot(x - ex, y - ey) - w / 2;
  }
  const dLine = sdSegment(x, y, cx, cy - R * 1.08, cx, cy - R * 0.22) - w / 2;
  return Math.min(dArc, dLine);
}

function render(size, opts) {
  const out = Buffer.alloc(size * size * 4);
  const SS = 4;
  const bgA = hex(opts.bgTop || '#000000');
  const bgB = hex(opts.bgBottom || '#000000');
  const fg = hex(opts.fg);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          let cr = 0, cg = 0, cb = 0, ca = 0;
          if (opts.bg) {
            if (sdRoundRect(x, y, 0.47, 0.22) <= 0) {
              const t = y;
              cr = bgA[0] + (bgB[0] - bgA[0]) * t;
              cg = bgA[1] + (bgB[1] - bgA[1]) * t;
              cb = bgA[2] + (bgB[2] - bgA[2]) * t;
              ca = 1;
              // hafif iç parıltı
              const glow = Math.max(0, 1 - Math.hypot(x - 0.5, y - 0.55) / 0.45) * 0.35;
              cr += (fg[0] - cr) * glow * 0.35;
              cg += (fg[1] - cg) * glow * 0.35;
              cb += (fg[2] - cb) * glow * 0.35;
            }
          }
          if (sdPower(x, y, 0.5, 0.54, opts.R, opts.w, 38) <= 0) {
            cr = fg[0]; cg = fg[1]; cb = fg[2]; ca = 1;
          }
          if (opts.dot && Math.hypot(x - 0.82, y - 0.2) <= 0.16) {
            const d = hex(opts.dot);
            cr = d[0]; cg = d[1]; cb = d[2]; ca = 1;
          }
          r += cr * ca; g += cg * ca; b += cb * ca; a += ca;
        }
      }
      const i = (py * size + px) * 4;
      const n = SS * SS;
      out[i + 3] = Math.round((a / n) * 255);
      if (a > 0) {
        out[i] = Math.round(r / a);
        out[i + 1] = Math.round(g / a);
        out[i + 2] = Math.round(b / a);
      }
    }
  }
  return encodePNG(size, out);
}

function encodeICO(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0; e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');
const assetsDir = path.join(root, 'assets');
fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });

const appIcon = { bg: true, bgTop: '#1d1f2b', bgBottom: '#0b0c12', fg: '#ffb86b', R: 0.2, w: 0.075 };
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = icoSizes.map((s) => ({ size: s, data: render(s, appIcon) }));
fs.writeFileSync(path.join(buildDir, 'icon.ico'), encodeICO(pngs));
fs.writeFileSync(path.join(buildDir, 'icon.png'), pngs[pngs.length - 1].data);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), render(256, appIcon));

const trayIdle = { fg: '#f2f2f5', R: 0.33, w: 0.13 };
const trayActive = { fg: '#ffb86b', R: 0.33, w: 0.13 };
for (const [name, o] of [['tray', trayIdle], ['tray-active', trayActive]]) {
  fs.writeFileSync(path.join(assetsDir, `${name}.png`), render(16, o));
  fs.writeFileSync(path.join(assetsDir, `${name}@2x.png`), render(32, o));
}
console.log('Simgeler üretildi: build/icon.ico, assets/*.png');
