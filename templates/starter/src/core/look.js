// Shinkai-style light toolkit for Canvas 2D: light is the star.
// Everything deterministic. Sprites are memoised per key (pure function of params), never per time.
import { rgba, clamp, hash2, TAU, lerp, mixHex, fract } from './util.js';

export function resetLight() {}
export function clearEmissive() {}

export const PAL = {
  // skies
  zenith: '#1f5fbf', skyBlue: '#3b8ee8', skyLow: '#a9dcff', horizonWarm: '#ffe2b8', cloudWhite: '#fbfdff', cloudShade: '#8ea3cf', cloudDeep: '#5b6c9e',
  nightTop: '#0b1430', nightMid: '#1d2c55', nightGlow: '#5a6fa8', cityGlow: '#e98f6f', overcast: '#7f8ea8', overcastLow: '#b9c2cf', stormTop: '#2b3550', stormLow: '#5d6a85',
  gold: '#ffc96b', goldHot: '#fff0c4', sunCore: '#fffaf0', amber: '#ff9f4a', rose: '#ff8fa3', neonPink: '#ff4f9a', neonCyan: '#3ff0ff', neonBlue: '#4a7dff', neonAmber: '#ffb347',
  // matter
  asphalt: '#1b2232', asphaltWet: '#141a28', concrete: '#9aa3b2', concreteDark: '#5d6677', glass: '#9fd0ff', steel: '#c4ccd8', wood: '#8a6146', leaf: '#4f9a5e', leafLight: '#9ad07a',
  // characters
  skin: '#fde3d2', skinShade: '#eab3a0', skinDeep: '#c98a7c', blush: '#ff9d9d', line: '#3a2a34', hairM: '#1d1f2b', hairMHi: '#5a6a95', suit: '#26314d', suitShade: '#161d31', shirt: '#f4f6fb', tie: '#7d8db8',
  hairF: '#4a2e2a', hairFHi: '#b07a66', dress: '#fbfbff', dressShade: '#c9cfe6', veil: '#eef3ff', groomSuit: '#e9e6e0', groomShade: '#b9b3a8',
  hydrangea: '#7fa6ff', hydrangeaPink: '#c9a2f0', ribbon: '#d7b46a', card: '#fbf6ea',
};

const SPR = new Map();
/** memoised sprite: fn(g, w, h) draws once into a w×h canvas (device px = css px × scale) */
export function sprite(key, w, h, fn, scale = 1) {
  const k = key + '@' + scale; let c = SPR.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * scale)); c.height = Math.max(1, Math.ceil(h * scale));
  const g = c.getContext('2d'); g.scale(scale, scale); fn(g, w, h); c.cssW = w; c.cssH = h; SPR.set(k, c); return c;
}
export const spriteScale = (ctx) => Math.min(2, ctx ? ctx.dpr : 1);

export function vgrad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); for (const [o, c] of stops) gr.addColorStop(clamp(o), c); return gr; }
export function lgrad(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) gr.addColorStop(clamp(o), c); return gr; }
export function rgrad(g, x, y, r0, r1, stops, x1 = x, y1 = y) { const gr = g.createRadialGradient(x, y, r0, x1, y1, r1); for (const [o, c] of stops) gr.addColorStop(clamp(o), c); return gr; }

/** soft additive glow */
export function glow(g, x, y, r, color, a = 1, mode = 'lighter') {
  if (a <= 0.003 || r <= 0) return; g.save(); g.globalCompositeOperation = mode; g.globalAlpha *= clamp(a, 0, 4) > 1 ? 1 : a;
  g.fillStyle = rgrad(g, x, y, 0, r, [[0, rgba(color, 1)], [0.18, rgba(color, 0.55)], [0.5, rgba(color, 0.16)], [1, rgba(color, 0)]]);
  g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
/** elliptic glow (streetlights on wet ground, horizon bands) */
export function glowE(g, x, y, rx, ry, color, a = 1, mode = 'lighter') {
  if (a <= 0.003) return; g.save(); g.translate(x, y); g.scale(1, ry / rx); glow(g, 0, 0, rx, color, a, mode); g.restore();
}

/** volumetric god rays fanning from (x,y). o: {angle, spread, count, len, width, color, alpha, T, seed, mode} */
export function godRays(g, x, y, o = {}) {
  const { angle = Math.PI / 2, spread = 0.9, count = 9, len = 1600, width = 0.06, color = PAL.goldHot, alpha = 0.35, T = 0, seed = 1, mode = 'screen', flicker = 0.3 } = o;
  if (alpha <= 0.003) return; g.save(); g.globalCompositeOperation = mode;
  for (let i = 0; i < count; i++) {
    const r = hash2(seed * 7.3, i * 3.1), r2 = hash2(seed * 2.1, i * 5.7);
    const a = angle + (r - 0.5) * spread + Math.sin(T * 0.13 + i) * 0.012; const w = width * (0.4 + r2 * 1.2);
    const L = len * (0.6 + 0.5 * hash2(seed, i + 9)); const k = alpha * (0.35 + 0.65 * hash2(seed + 3, i)) * (1 - flicker + flicker * (0.5 + 0.5 * Math.sin(T * (0.4 + r2) + i * 2.1)));
    const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
    const gr = g.createLinearGradient(x, y, ex, ey); gr.addColorStop(0, rgba(color, k)); gr.addColorStop(0.45, rgba(color, k * 0.45)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x + Math.cos(a + Math.PI / 2) * 6, y + Math.sin(a + Math.PI / 2) * 6);
    g.lineTo(x + Math.cos(a - w) * L, y + Math.sin(a - w) * L); g.lineTo(x + Math.cos(a + w) * L, y + Math.sin(a + w) * L); g.closePath(); g.fill();
  }
  g.restore();
}

/** anamorphic lens flare for a light at (sx,sy). a: strength 0..1 */
export function lensFlare(g, sx, sy, a = 1, o = {}) {
  if (a <= 0.01) return; const { color = PAL.goldHot, tint2 = '#7fd0ff', streak = 1, ghosts = 1, size = 1 } = o;
  g.save(); g.globalCompositeOperation = 'lighter';
  glow(g, sx, sy, 260 * size, color, 0.55 * a); glow(g, sx, sy, 70 * size, '#ffffff', 0.9 * a);
  if (streak) { g.save(); g.translate(sx, sy); g.scale(1, 0.018); glow(g, 0, 0, 1100 * size * streak, '#9fd8ff', 0.5 * a); g.restore();
    g.save(); g.translate(sx, sy); g.scale(1, 0.05); glow(g, 0, 0, 420 * size, '#ffffff', 0.5 * a); g.restore(); }
  // starburst spikes
  g.save(); g.translate(sx, sy); for (let i = 0; i < 6; i++) { g.rotate(TAU / 6); g.save(); g.scale(1, 0.012); glow(g, 0, 0, 260 * size, '#ffffff', 0.35 * a); g.restore(); } g.restore();
  if (ghosts) { const cx = 960, cy = 540, dx = cx - sx, dy = cy - sy;
    [[0.35, 26, tint2, 0.18], [0.62, 60, '#b8ff9a', 0.08], [0.9, 18, '#ffffff', 0.2], [1.25, 110, '#ffb070', 0.07], [1.55, 40, tint2, 0.13], [1.9, 160, '#a0b8ff', 0.05]].forEach(([k, r, c, al]) => {
      const x = sx + dx * k, y = sy + dy * k; g.globalAlpha = al * a * ghosts; g.fillStyle = rgrad(g, x, y, r * 0.2, r, [[0, rgba(c, 0.15)], [0.75, rgba(c, 0.6)], [1, rgba(c, 0)]]);
      g.beginPath(); for (let j = 0; j < 6; j++) { const t = (j / 6) * TAU + 0.3; g.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } g.closePath(); g.fill(); });
    g.globalAlpha = 1; }
  g.restore();
}

/** out-of-focus bokeh discs. o: {count, seed, area:[x,y,w,h], colors, size, alpha, T, drift, hex} */
export function bokeh(g, T, o = {}) {
  const { count = 30, seed = 1, area = [0, 0, 1920, 1080], colors = [PAL.gold, PAL.neonPink, PAL.neonCyan], size = 40, alpha = 0.35, drift = 6, hex = false } = o;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const r1 = hash2(seed, i), r2 = hash2(seed + 1, i), r3 = hash2(seed + 2, i);
    const x = area[0] + r1 * area[2] + Math.sin(T * 0.3 + i) * drift, y = area[1] + r2 * area[3] + Math.cos(T * 0.25 + i * 1.3) * drift;
    const s = size * (0.45 + r3 * 0.9), c = colors[i % colors.length], a = alpha * (0.4 + 0.6 * hash2(seed + 3, i)) * (0.75 + 0.25 * Math.sin(T * 1.1 + i * 2.3));
    g.fillStyle = rgrad(g, x, y, s * 0.1, s, [[0, rgba(c, a * 0.35)], [0.82, rgba(c, a * 0.55)], [0.93, rgba(c, a * 0.8)], [1, rgba(c, 0)]]);
    g.beginPath(); if (hex) { for (let j = 0; j < 6; j++) { const t = (j / 6) * TAU; g.lineTo(x + Math.cos(t) * s, y + Math.sin(t) * s); } g.closePath(); } else g.arc(x, y, s, 0, TAU); g.fill();
  }
  g.restore();
}

/** film light leak from a screen edge */
export function lightLeak(g, a, o = {}) {
  if (a <= 0.005) return; const { color = '#ffb36b', color2 = '#ff6f91', x = 0, y = 300, r = 900 } = o;
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = clamp(a);
  g.fillStyle = rgrad(g, x, y, 0, r, [[0, rgba(color, 0.9)], [0.4, rgba(color2, 0.35)], [1, rgba(color2, 0)]]); g.fillRect(0, 0, 1920, 1080); g.restore();
}

/** horizontal atmospheric haze band */
export function haze(g, y0, y1, color, a = 0.5, mode = 'source-over') {
  if (a <= 0.003) return; g.save(); g.globalCompositeOperation = mode; g.fillStyle = vgrad(g, y0, y1, [[0, rgba(color, 0)], [0.55, rgba(color, a)], [1, rgba(color, a * 0.6)]]); g.fillRect(-4000, y0, 9920, y1 - y0); g.restore();
}

/** floating dust / sparkles in light (stateless) */
export function motes(g, T, o = {}) {
  const { count = 60, seed = 4, area = [0, 0, 1920, 1080], color = PAL.goldHot, size = 2.2, alpha = 0.7, vy = -8, vx = 6 } = o;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const r1 = hash2(seed, i), r2 = hash2(seed + 7, i), r3 = hash2(seed + 9, i);
    const x = area[0] + fract(r1 + (vx * T * (0.5 + r3)) / area[2]) * area[2] + Math.sin(T * 0.7 + i) * 8;
    const y = area[1] + fract(r2 + (vy * T * (0.5 + r3)) / area[3]) * area[3];
    const tw = 0.5 + 0.5 * Math.sin(T * (1.5 + r3 * 2) + i * 3.7); const s = size * (0.5 + r3);
    g.fillStyle = rgba(color, alpha * tw); g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    if (r3 > 0.8) glow(g, x, y, s * 6, color, 0.25 * tw);
  }
  g.restore();
}

/** colour grade helpers written into ctx.fx */
export function grade(ctx, o) { Object.assign(ctx.fx, o); }
export const GRADES = {
  rainNight: { sat: 1.16, contrast: 1.14, lift: '#0b1a3a', liftAlpha: 0.04, gain: '#6fb6ff', gainAlpha: 0.1, vignette: 0.34, vignetteColor: '#050a1a', bloom: 0.3, bloomThreshold: 0.74},
  overcast: { sat: 1.08, contrast: 1.12, lift: '#24324d', liftAlpha: 0.03, gain: '#a9c4ff', gainAlpha: 0.08, vignette: 0.28, vignetteColor: '#101c33', bloom: 0.18},
  interiorWarm: { sat: 1.16, contrast: 1.16, lift: '#2a2030', liftAlpha: 0.02, gain: '#ffd9a8', gainAlpha: 0.1, vignette: 0.38, vignetteColor: '#1c1020', bloom: 0.22, bloomThreshold: 0.8},
  sunshower: { sat: 1.24, contrast: 1.14, lift: '#20406f', liftAlpha: 0.0, gain: '#fff1c9', gainAlpha: 0.1, vignette: 0.24, vignetteColor: '#0d2240', bloom: 0.24, bloomThreshold: 0.8},
  clear: { sat: 1.26, contrast: 1.14, lift: '#1a3a70', liftAlpha: 0.0, gain: '#fff4dc', gainAlpha: 0.1, vignette: 0.26, vignetteColor: '#0b2348', bloom: 0.26, bloomThreshold: 0.8},
  memory: { sat: 1.1, contrast: 1.08, lift: '#3a3050', liftAlpha: 0.05, gain: '#ffe6c4', gainAlpha: 0.14, vignette: 0.36, vignetteColor: '#2a1a28', bloom: 0.34, bloomThreshold: 0.72},
};
export function mixGrade(a, b, k) {
  const A = typeof a === 'string' ? GRADES[a] : a, B = typeof b === 'string' ? GRADES[b] : b; const o = {};
  for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const va = A[key], vb = B[key];
    if (typeof va === 'number' || typeof vb === 'number') o[key] = lerp(va ?? (key.endsWith('Alpha') ? 0 : 1), vb ?? (key.endsWith('Alpha') ? 0 : 1), k);
    else if (typeof va === 'string' && typeof vb === 'string' && va[0] === '#' && vb[0] === '#') o[key] = mixHex(va, vb, k);
    else o[key] = k < 0.5 ? va ?? vb : vb ?? va;
  }
  return o;
}
