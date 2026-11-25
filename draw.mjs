// draw.mjs — news-image-20261125
// Renders a one-page newspaper front page summing up Wednesday 25 November 2026.
// Node 22 standard library only. Fully deterministic: no clock, no network,
// no randomness, no environment-dependent input — every run writes identical bytes.
//
// Stories (all first reported 25 Nov 2026, checked against live news briefs):
//  1. ICJ rules Myanmar committed genocide against the Rohingya (The Hague)
//  2. Pakistan's first astronaut, Muhammad Zeeshan Ali, docks at Tiangong
//  3. Two tankers hit mines in the Strait of Hormuz; Yemen war flares
//  4. AI sell-off: Nvidia -7%, Nikkei -2.76%
//  5. Cartagena supermarket siege ends, all hostages freed
//  6. Bangladesh garment minimum wage up 36% to 17,000 taka

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

// ---------------------------------------------------------------- palette
const PAPER = [246, 241, 230];
const INK = [26, 26, 26];
const NAVY = [20, 33, 61];
const NAVY2 = [31, 52, 92];
const RED = [180, 35, 24];
const GOLD = [201, 162, 39];
const GOLD_LT = [232, 196, 90];
const SKY = [191, 217, 232];
const SKY_LT = [223, 233, 240];
const SEA = [31, 111, 139];
const SEA_DK = [18, 74, 96];
const TEAL = [14, 124, 123];
const WHITE = [255, 255, 255];
const GREY = [120, 120, 112];
const GREEN = [46, 125, 50];
const ORANGE = [230, 126, 34];
const DARK = [15, 15, 20];

// ---------------------------------------------------------------- canvas
let CLIP = [0, 0, W, H];
function setClip(x, y, w, h) { CLIP = [x, y, w, h]; }
function resetClip() { CLIP = [0, 0, W, H]; }
function setPx(x, y, c) {
  if (x < CLIP[0] || y < CLIP[1] || x >= CLIP[0] + CLIP[2] || y >= CLIP[1] + CLIP[3]) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function fillRect(x, y, w, h, c) {
  const x0 = Math.max(CLIP[0], x), y0 = Math.max(CLIP[1], y);
  const x1 = Math.min(CLIP[0] + CLIP[2], x + w), y1 = Math.min(CLIP[1] + CLIP[3], y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; i += 3;
    }
  }
}
function strokeRect(x, y, w, h, c, t = 2) {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}
function hline(x, y, len, c) { fillRect(x, y, len, 1, c); }
function vline(x, y, len, c) { fillRect(x, y, 1, len, c); }
function line(x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    setPx(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function disc(cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    hline(cx - dx, cy + dy, dx * 2 + 1, c);
  }
}
function ring(cx, cy, r, c, t = 2) {
  disc(cx, cy, r, c);
  disc(cx, cy, r - t, PAPER);
}
// Filled triangle by scanline interpolation.
function tri(x0, y0, x1, y1, x2, y2, c) {
  const pts = [[x0, y0], [x1, y1], [x2, y2]].sort((a, b) => a[1] - b[1]);
  const [ax, ay] = pts[0], [bx, by] = pts[1], [cx, cy] = pts[2];
  const lerp = (y, yA, xA, yB, xB) => (yB === yA ? xA : xA + ((y - yA) * (xB - xA)) / (yB - yA));
  for (let y = ay; y <= cy; y++) {
    const xa = lerp(y, ay, ax, cy, cx);
    const xb = y <= by ? lerp(y, ay, ax, by, bx) : lerp(y, by, bx, cy, cx);
    const x0s = Math.min(xa, xb), x1s = Math.max(xa, xb);
    hline(Math.round(x0s), y, Math.round(x1s) - Math.round(x0s) + 1, c);
  }
}
function polyline(pts, c) {
  for (let i = 0; i + 1 < pts.length; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c);
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 bits. All copy is set in capitals.
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '*': ['00000', '10101', '01110', '10101', '00000', '00000', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '·': ['00000', '00000', '00000', '00000', '01100', '01100', '00000'],
};
function charW(s) { return 6 * s - s; } // advance per char, minus trailing gap
function textW(str, s) { return str.length === 0 ? 0 : str.length * 6 * s - s; }
function drawChar(ch, x, y, s, c) {
  const g = FONT[ch] || FONT[' '];
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === '1') fillRect(x + col * s, y + r * s, s, s, c);
    }
  }
}
function drawText(str, x, y, s, c, align = 'l') {
  let x0 = x;
  if (align === 'c') x0 = x - Math.floor(textW(str, s) / 2);
  if (align === 'r') x0 = x - textW(str, s);
  for (let i = 0; i < str.length; i++) drawChar(str[i], x0 + i * 6 * s, y, s, c);
  return textW(str, s);
}
// Greedy word wrap; returns array of lines, each at most maxChars long.
function wrap(str, maxChars) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur === '' ? w : cur + ' ' + w;
    if (next.length <= maxChars) { cur = next; continue; }
    if (cur !== '') lines.push(cur);
    cur = w.length > maxChars ? w.slice(0, maxChars) : w;
  }
  if (cur !== '') lines.push(cur);
  return lines;
}
function drawWrapped(str, x, y, s, c, maxChars, pitch) {
  const lines = wrap(str, maxChars);
  lines.forEach((ln, i) => drawText(ln, x, y + i * pitch, s, c));
  return lines.length;
}

// ---------------------------------------------------------------- PNG encode
const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}
function encodePNG() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- scenes
// Each scene draws inside the given rect (x, y, w, h). All coordinates are
// fixed literals: no randomness, so the picture is identical every run.

function sceneCourt(x, y, w, h) {
  fillRect(x, y, w, h, SKY_LT);
  const cx = x + Math.floor(w / 2);
  // Courthouse behind: pediment, entablature, four columns, steps.
  tri(cx, y + 14, x + 52, y + 62, x + w - 52, y + 62, NAVY);
  fillRect(x + 44, y + 62, w - 88, 10, NAVY2);
  for (let i = 0; i < 4; i++) {
    const colX = x + 44 + i * 84;
    fillRect(colX, y + 76, 24, 100, WHITE);
    strokeRect(colX, y + 76, 24, 100, NAVY, 1);
  }
  fillRect(x + 30, y + 180, w - 60, 8, NAVY2);
  fillRect(x + 50, y + 188, w - 100, 8, GREY);
  fillRect(x + 70, y + 196, w - 140, 8, NAVY2);
  // Scales of justice in front.
  fillRect(cx - 3, y + 96, 6, 108, GOLD);
  disc(cx, y + 92, 7, GOLD);
  fillRect(cx - 110, y + 116, 220, 6, GOLD);
  disc(cx - 110, y + 119, 5, GOLD);
  disc(cx + 110, y + 119, 5, GOLD);
  line(cx - 110, y + 124, cx - 128, y + 158, INK);
  line(cx - 110, y + 124, cx - 92, y + 158, INK);
  tri(cx - 128, y + 158, cx - 92, y + 158, cx - 110, y + 184, GOLD_LT);
  line(cx + 110, y + 124, cx + 92, y + 158, INK);
  line(cx + 110, y + 124, cx + 128, y + 158, INK);
  tri(cx + 92, y + 158, cx + 128, y + 158, cx + 110, y + 184, GOLD_LT);
  fillRect(cx - 34, y + 204, 68, 8, GOLD);
  fillRect(cx - 46, y + 212, 92, 6, GOLD);
}

function sceneRocket(x, y, w, h) {
  fillRect(x, y, w, h, [11, 29, 51]);
  const stars = [[0.08, 0.15], [0.2, 0.32], [0.35, 0.12], [0.52, 0.26], [0.68, 0.1], [0.8, 0.3], [0.93, 0.14], [0.6, 0.46], [0.44, 0.06]];
  for (const [fx, fy] of stars) disc(x + Math.floor(fx * w), y + Math.floor(fy * h), 1, WHITE);
  // Earth arc along the bottom (clipped to the scene rect by the caller).
  disc(x + Math.floor(w * 0.5), y + h + 55, 70, TEAL);
  disc(x + Math.floor(w * 0.5) - 30, y + h + 6, 16, GREEN);
  // Rocket, left of centre.
  const rx = x + 64;
  tri(rx, y + 16, rx + 16, y + 16, rx + 8, y + 2, RED);
  fillRect(rx, y + 16, 16, 44, WHITE);
  strokeRect(rx, y + 16, 16, 44, INK, 1);
  disc(rx + 8, y + 30, 4, SKY);
  tri(rx, y + 52, rx, y + 62, rx - 9, y + 64, RED);
  tri(rx + 16, y + 52, rx + 16, y + 62, rx + 25, y + 64, RED);
  tri(rx + 3, y + 60, rx + 13, y + 60, rx + 8, y + 78, ORANGE);
  tri(rx + 5, y + 60, rx + 11, y + 60, rx + 8, y + 72, GOLD_LT);
  // Space station, right.
  const sx = x + w - 216;
  fillRect(sx - 52, y + 34, 48, 6, [30, 80, 180]);
  fillRect(sx + 74, y + 34, 48, 6, [30, 80, 180]);
  fillRect(sx, y + 30, 70, 14, GREY);
  fillRect(sx + 20, y + 18, 30, 12, GREY);
  line(sx + 35, y + 18, sx + 35, y + 8, WHITE);
  disc(sx + 35, y + 7, 2, RED);
  fillRect(sx + 6, y + 33, 10, 8, WHITE);
}

function sceneTanker(x, y, w, h) {
  fillRect(x, y, w, Math.floor(h * 0.55), SKY);
  fillRect(x, y + Math.floor(h * 0.55), w, h - Math.floor(h * 0.55), SEA);
  disc(x + w - 42, y + 14, 10, GOLD_LT);
  // Tanker.
  fillRect(x + 60, y + 44, 190, 16, [40, 40, 44]);
  tri(x + 250, y + 44, x + 250, y + 60, x + 284, y + 60, [40, 40, 44]);
  fillRect(x + 210, y + 28, 34, 16, WHITE);
  strokeRect(x + 210, y + 28, 34, 16, INK, 1);
  fillRect(x + 120, y + 34, 14, 10, RED);
  hline(x + 60, y + 52, 190, [90, 90, 96]);
  // Mine and blast near the bow.
  const mx = x + 322, my = y + 56;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    line(mx + Math.round(6 * Math.cos(a)), my + Math.round(6 * Math.sin(a)),
      mx + Math.round(14 * Math.cos(a)), my + Math.round(14 * Math.sin(a)), INK);
  }
  disc(mx, my, 8, INK);
  tri(mx - 22, y + 30, mx - 6, y + 26, mx - 12, y + 40, ORANGE);
  tri(mx + 4, y + 24, mx + 18, y + 32, mx + 2, y + 40, GOLD_LT);
  tri(mx - 8, y + 18, mx + 6, y + 22, mx - 2, y + 34, [255, 220, 90]);
  // Waves.
  for (const wy of [y + 66, y + 74]) {
    for (let wx = x + 8; wx < x + w - 30; wx += 26) hline(wx, wy, 16, WHITE);
  }
}

function sceneChart(x, y, w, h) {
  fillRect(x, y, w, h, WHITE);
  const base = y + h - 12;
  vline(x + 18, y + 10, h - 22, INK);
  hline(x + 18, base, w - 30, INK);
  const heights = [58, 52, 46, 40, 34, 28];
  for (let i = 0; i < 6; i++) {
    fillRect(x + 28 + i * 26, base - heights[i], 18, heights[i], [205, 205, 195]);
  }
  polyline([
    [x + 36, y + 16], [x + 62, y + 24], [x + 88, y + 32],
    [x + 114, y + 42], [x + 140, y + 50], [x + 166, y + 60], [x + 188, y + 68],
  ], RED);
  tri(x + 188, y + 68, x + 176, y + 62, x + 178, y + 74, RED);
  drawText('-7%', x + w - 66, y + 10, 2, RED);
  drawText('NIKKEI -2.76%', x + 24, y + h - 26, 1, INK);
}

function sceneShop(x, y, w, h) {
  fillRect(x, y, w, h, SKY_LT);
  fillRect(x + 24, y + 26, w - 48, h - 26, [250, 244, 220]);
  strokeRect(x + 24, y + 26, w - 48, h - 26, INK, 1);
  for (let i = 0; i < 8; i++) {
    fillRect(x + 20 + i * 16, y + 20, 16, 12, i % 2 === 0 ? RED : WHITE);
  }
  fillRect(x + 20, y + 32, 128, 2, INK);
  fillRect(x + 40, y + 48, 34, 24, SKY);
  strokeRect(x + 40, y + 48, 34, 24, INK, 1);
  vline(x + 57, y + 48, 24, INK);
  hline(x + 40, y + 60, 34, INK);
  const cx = x + Math.floor(w / 2);
  fillRect(cx - 12, y + h - 34, 24, 34, NAVY);
  disc(cx - 6, y + h - 16, 2, GOLD_LT);
  // Shield with a check: the rescue.
  disc(x + w - 36, y + 22, 16, [30, 80, 180]);
  line(x + w - 44, y + 22, x + w - 38, y + 28, WHITE);
  line(x + w - 44, y + 23, x + w - 38, y + 29, WHITE);
  line(x + w - 38, y + 28, x + w - 26, y + 14, WHITE);
  line(x + w - 38, y + 29, x + w - 26, y + 15, WHITE);
}

function sceneFactory(x, y, w, h) {
  fillRect(x, y, w, h, SKY_LT);
  disc(x + w - 28, y + 16, 9, GOLD_LT);
  // Sawtooth roof + brick hall.
  for (let i = 0; i < 3; i++) {
    tri(x + 20 + i * 52, y + 46, x + 20 + i * 52, y + 28, x + 72 + i * 52, y + 46, [150, 45, 35]);
  }
  fillRect(x + 20, y + 46, 156, h - 46, [178, 60, 44]);
  for (let i = 0; i < 3; i++) {
    fillRect(x + 34 + i * 48, y + 58, 20, 16, WHITE);
    strokeRect(x + 34 + i * 48, y + 58, 20, 16, INK, 1);
  }
  // Chimney with smoke.
  fillRect(x + w - 58, y + 20, 16, h - 20, GREY);
  disc(x + w - 50, y + 12, 4, GREY);
  disc(x + w - 42, y + 5, 5, GREY);
  // Spool of thread, bottom right.
  disc(x + w - 26, y + h - 16, 10, WHITE);
  ring(x + w - 26, y + h - 16, 10, GREY, 2);
  hline(x + w - 52, y + h - 18, 18, RED);
  hline(x + w - 52, y + h - 14, 18, RED);
}

// ---------------------------------------------------------------- layout
function drawPanel(x, y, w, h, kicker, sceneFn, sceneH, headline, headMax, caption, capScale, capMax, capPitch, why) {
  strokeRect(x, y, w, h, INK, 2);
  fillRect(x + 14, y + 13, 8, 8, RED);
  drawText(kicker, x + 28, y + 12, 1, INK);
  strokeRect(x + 12, y + 30, w - 24, sceneH, INK, 1);
  setClip(x + 13, y + 31, w - 26, sceneH - 2);
  sceneFn(x + 13, y + 31, w - 26, sceneH - 2);
  resetClip();
  let cy = y + 30 + sceneH + 10;
  const hl = drawWrapped(headline, x + 14, cy, 2, INK, headMax, 17);
  cy += hl * 17 + 6;
  const cl = drawWrapped(caption, x + 14, cy, capScale, INK, capMax, capPitch);
  cy += cl * capPitch + 6;
  if (why) drawText(why, x + 14, cy, 1, RED);
}

function render() {
  fillRect(0, 0, W, H, PAPER);

  // Masthead.
  fillRect(0, 0, W, 108, NAVY);
  drawText('THE WORLD TODAY', 512, 16, 5, WHITE, 'c');
  fillRect(212, 62, 600, 3, GOLD);
  drawText('WEDNESDAY 25 NOVEMBER 2026', 512, 74, 2, GOLD_LT, 'c');
  drawText('ONE DAY IN WORLD NEWS - SIX STORIES THAT MATTERED', 512, 94, 1, WHITE, 'c');

  // Lead story: ICJ genocide ruling.
  strokeRect(20, 120, 984, 276, INK, 2);
  drawText('THE HAGUE - WORLD COURT', 36, 140, 2, RED);
  fillRect(36, 164, 180, 3, GOLD);
  drawWrapped('MYANMAR GUILTY OF ROHINGYA GENOCIDE IN LANDMARK RULING', 36, 178, 3, INK, 20, 26);
  drawWrapped('THE INTERNATIONAL COURT OF JUSTICE RULED MYANMAR COMMITTED GENOCIDE AGAINST THE ROHINGYA - THE FIRST TIME ANY STATE HAS BEEN HELD DIRECTLY RESPONSIBLE. THE COURT ORDERED REPARATIONS AND PROTECTION MEASURES.', 36, 272, 2, INK, 47, 18);
  drawText('MALAYSIA TO REPATRIATE 6,803 NATIONALS DESPITE THE RULING.', 36, 374, 1, GREY);
  strokeRect(624, 132, 364, 252, INK, 1);
  setClip(625, 133, 362, 218);
  sceneCourt(625, 133, 362, 218);
  resetClip();
  fillRect(624, 352, 364, 32, NAVY);
  drawText('THE WORLD COURT - THE HAGUE', 806, 363, 1, WHITE, 'c');

  // Row 2: space + Hormuz.
  drawPanel(20, 412, 482, 228, 'SPACE - CHINA AND PAKISTAN', sceneRocket, 82,
    "PAKISTAN'S FIRST ASTRONAUT DOCKS AT TIANGONG", 37,
    'MUHAMMAD ZEESHAN ALI BOARDS TIANGONG ON SHENZHOU-24 - FIRST FOREIGNER ABOARD.', 2, 37, 16,
    'PM SHARIF: THE JOURNEY OF 240 MILLION PAKISTANIS.');
  drawPanel(522, 412, 482, 228, 'MIDDLE EAST - STRAIT OF HORMUZ', sceneTanker, 82,
    'TWO TANKERS HIT MINES AS YEMEN WAR FLARES', 37,
    "IRAN'S GUARDS SAY MINES STRUCK TWO SHIPS IN HORMUZ. SAUDI JETS HIT HODEIDAH PORT.", 2, 37, 16,
    'HOUTHI DRONE ON RIYADH WOUNDS 11.');

  // Row 3: markets, Colombia, Bangladesh.
  drawPanel(20, 656, 320, 232, 'MARKETS - AI SELL-OFF', sceneChart, 94,
    'NVIDIA -7% AS AI DOUBTS HIT STOCKS', 24,
    'NIKKEI -2.76%, S AND P 500 -0.5%. LAWMAKERS QUIZ TRUMP ROLE IN HUANG RETURN.', 1, 48, 11,
    'WHY IT MATTERS: AI SHARES DROVE THE 2026 RALLY.');
  drawPanel(352, 656, 320, 232, 'COLOMBIA - CARTAGENA', sceneShop, 94,
    'ALL HOSTAGES FREED AS CARTAGENA SIEGE ENDS', 24,
    'FORCES STORM SUPERMARKET AFTER DAY-LONG STANDOFF. ABOUT 20 HELD, ONE CAPTOR KILLED.', 1, 48, 11,
    'THE RAID ENDED A DAY OF FEAR IN THE PORT CITY.');
  drawPanel(684, 656, 320, 232, 'BANGLADESH - GARMENT WORKERS', sceneFactory, 94,
    'BANGLADESH GARMENT WAGE UP 36% AFTER PROTESTS', 24,
    'MINIMUM NOW 17,000 TAKA A MONTH FOR ENTRY-LEVEL WORKERS AFTER WEEKS OF UNREST.', 1, 48, 11,
    'WHY IT MATTERS: GARMENTS ARE THE TOP EXPORT.');

  // Briefs band.
  fillRect(0, 904, W, 100, NAVY);
  fillRect(0, 904, W, 3, GOLD);
  drawText('ALSO TODAY', 24, 920, 2, GOLD_LT);
  drawText('SOLOMON ISLANDS SIGNS AUSTRALIA SECURITY PACT, BARRING FOREIGN BASES', 24, 944, 1, WHITE);
  drawText('CHINA PROBES SHANGHAI CHIEF CHEN JINING - INDONESIA MINE RESCUE UNDER WAY - SENEGAL REGAIN AFCON TITLE', 24, 962, 1, WHITE);
  drawText('FRONT PAGE - WEDNESDAY 25 NOVEMBER 2026 - THE WORLD TODAY', 512, 982, 1, [170, 170, 160], 'c');

  return encodePNG();
}

// ---------------------------------------------------------------- entry
const outDir = process.argv[2] || process.env.MAKEFUN_OUTPUT_DIR || '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), render());
