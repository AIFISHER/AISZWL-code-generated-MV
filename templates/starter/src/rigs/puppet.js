// 2D puppet for user-supplied character renders (example config = examples/fanren-characters; replace CHARS for your cast)
// Original note: 2D puppet for the user's six 3D character renders (assets/chars/c1..c6.png, cleaned by tools/prep_chars.py).
// The render is warped in thin horizontal strips: shear lean pivoting at the feet, head tilt above the neck, breathing,
// wind/secondary motion growing toward hair ends and robe hems, squash-stretch. Painted eyelids (skin sampled from the
// render) blink on a seeded schedule. Lighting: per-scene brightness/saturation, colour wash, foot AO, rim light from a
// light direction, contact shadow, optional glow aura. Everything is a pure function of the arguments (t included).
import { clamp, hash1, TAU, rgba, lerp } from '../core/util.js';

// coordinates in cleaned-image pixels. neck: y of chin; eyes: [x,y,w,h]; hand: [[x,y],[x,y]] (screen-left, screen-right);
// hem: y where robe starts flaring; hair: [y0,y1] band of long hair (sways); face: [x,y] centre of face
export const CHARS = {
  hanli: { file: 'c1', neck: 480, eyes: [[219, 326, 98, 60], [402, 326, 100, 60]], hand: [[80, 930], [520, 930]], hem: 980, face: [300, 330], chest: [300, 680], name: '韩立' },
  ally: { file: 'c2', neck: 455, eyes: [[277, 328, 62, 42], [395, 328, 62, 42]], hand: [[300, 780], [380, 780]], hem: 900, face: [335, 330], chest: [330, 640], name: '南宫婉' },
  fox: { file: 'c3', neck: 470, eyes: [], hand: [[120, 860], [560, 860]], hem: 900, face: [320, 345], chest: [330, 640], name: '狐女' },
  schemer: { file: 'c4', neck: 560, eyes: [], hand: [[80, 900], [560, 900]], hem: 1000, face: [350, 330], chest: [360, 720], name: '墨大夫' },
  sorc: { file: 'c5', neck: 330, eyes: [[395, 197, 62, 38], [500, 205, 60, 36]], hand: [[70, 720], [780, 720]], hem: 820, face: [450, 230], chest: [450, 470], name: '妖女' },
  demon: { file: 'c6', neck: 380, eyes: [], hand: [[150, 640], [640, 760]], hem: 900, face: [530, 290], chest: [530, 600], staffTop: [150, 60], name: '魔修' },
};
const IMG = {}; const SKIN = {}; let LIDC = null;
export async function loadChars(base = '/assets/chars/') {
  await Promise.all(Object.entries(CHARS).map(async ([k, c]) => {
    const im = new Image(); im.src = `${base}${c.file}.png`; try { await im.decode(); } catch (e) { console.info('puppet: missing', c.file); return; } IMG[k] = im; c.w = im.width; c.h = im.height;
    // sample eyelid skin: a few px above each eye
    if (c.eyes.length) { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
      SKIN[k] = c.eyes.map(([x, y, w, h]) => { const d = g.getImageData(Math.round(x - 4), Math.round(y + h * 0.78), 8, 5).data; let r = 0, gg = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; } r /= n; gg /= n; b /= n; const m = (v, w) => (v * 0.85 + w * 0.15) | 0; return `rgb(${m(r, 240)},${m(gg, 214)},${m(b, 204)})`; }); }
  }));
}
export const charImg = (k) => IMG[k];

const POOL = []; let poolI = 0;
function scratch(w, h) { let c = POOL[poolI]; if (!c) { c = document.createElement('canvas'); POOL[poolI] = c; } poolI = (poolI + 1) % 6; if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); } const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.clearRect(0, 0, w, h); return c; }

/** blink amount 0..1 at time t (seeded) */
export function blinkAt(t, seed = 1) {
  const P = 3.6; const k = Math.floor(t / P); const off = hash1(k * 3.7 + seed) * (P - 0.4); const dt = t - k * P - off;
  const one = dt >= 0 && dt < 0.16 ? Math.sin((dt / 0.16) * Math.PI) : 0;
  const dbl = hash1(k + seed * 9.1) > 0.75 ? (dt >= 0.22 && dt < 0.38 ? Math.sin(((dt - 0.22) / 0.16) * Math.PI) : 0) : 0; return Math.max(one, dbl);
}

/**
 * drawChar(g, key, o)
 * o: x,y = feet position (screen), h = on-screen height of the full figure, t = time, flip, lean (rad), headTilt (rad-ish),
 *    wind (0..2), windDir (+1/-1), breathe (0..1), bob (px), squash (1 = none, >1 stretch), blink (bool, default true), blinkSeed,
 *    bright, sat, wash:[color,a], ao (0..1), rim:{color,a,dir:[dx,dy],w}, shadow:{a,w,y}, aura:{color,a,r}, alpha, eyesClosed (0..1)
 */
export function drawChar(g, key, o) {
  if (typeof window !== "undefined" && window.__drawn && (o.a ?? 1) > 0.3) window.__drawn.add(key);
  const c = CHARS[key], im = IMG[key]; if (!im) return; const t = o.t || 0;
  const m = g.getTransform(); const dev = Math.hypot(m.a, m.b); const S = (o.h || 600) / c.h; const sEff = S * dev;
  const pad = Math.ceil(c.w * 0.25 * sEff) + 8;
  const cw = Math.ceil(c.w * sEff) + pad * 2, ch = Math.ceil(c.h * sEff) + pad * 2;
  if (cw > 6000 || ch > 6000) return;
  const off = scratch(cw, ch), og = off.getContext('2d');
  const wind = o.wind ?? 0.4, wd = o.windDir ?? 1, lean = o.lean || 0, tilt = o.headTilt || 0, br = o.breathe ?? 1;
  const sq = o.squash || 1; const sx = 1 / Math.sqrt(sq), sy = Math.sqrt(sq);
  // strips
  const stripDev = 6; const rows = Math.max(24, Math.ceil((c.h * sEff) / stripDev)); const sh = c.h / rows;
  const breath = Math.sin(t * TAU * 0.28 + (o.seed || 0)) * 0.012 * br;
  for (let i = 0; i < rows; i++) {
    const y0 = i * sh, v = (y0 + sh / 2) / c.h;
    let dx = -lean * (c.h - y0) * 0.9; // shear about feet
    if (y0 < c.neck) dx += tilt * (c.neck - y0) * 1.2;
    const hemK = clamp((y0 - c.hem) / (c.h - c.hem)); const hairK = clamp((y0 - c.neck * 0.6) / (c.h * 0.6)) * 0.35;
    const wv = Math.sin(t * 2.4 - v * 5.5 + (o.seed || 0)) * 0.6 + Math.sin(t * 4.1 - v * 9 + 1.3) * 0.4;
    dx += wd * wind * (Math.pow(hemK, 1.6) * 26 + hairK * 6) * (0.65 + 0.35 * wv) + wind * wv * (Math.pow(hemK, 1.6) * 8 + hairK * 3);
    const bscale = 1 + (v > 0.3 && v < 0.62 ? breath * Math.sin(((v - 0.3) / 0.32) * Math.PI) : 0);
    const dw = c.w * sEff * sx * bscale; const dxDev = dx * sEff + (c.w * sEff - dw) / 2;
    og.drawImage(im, 0, y0, c.w, sh + 0.6, pad + dxDev + (c.w * sEff * (1 - sx)) / 2 * 0, pad + (c.h * sEff) * (1 - sy) + y0 * sEff * sy, dw, (sh + 0.6) * sEff * sy);
  }
  const P = (x, y) => { const yy = y; let dx = -lean * (c.h - yy) * 0.9; if (yy < c.neck) dx += tilt * (c.neck - yy) * 1.2; return [pad + (x + dx) * sEff, pad + c.h * sEff * (1 - sy) + yy * sEff * sy]; };
  // blink (painted eyelids)
  const bl = o.blink === false ? 0 : Math.max(o.eyesClosed || 0, blinkAt(t, o.blinkSeed ?? key.length));
  if (bl > 0.02 && c.eyes.length) {
    c.eyes.forEach(([ex, ey, ew, eh], j) => {
      const [px, py] = P(ex, ey); const rw = (ew / 2) * sEff * sx, rh = (eh / 2) * sEff * sy; const top = py - rh * 1.02, lidY = top + rh * 2.04 * bl; const k = 0.5523;
      const lid = (gg) => { gg.beginPath(); gg.moveTo(px - rw, py - (py - lidY) * 0.25 * (1 - bl) - (bl < 1 ? 0 : 0)); gg.bezierCurveTo(px - rw, top + rh * (1 - k) * 0.6, px - rw * k, top, px, top); gg.bezierCurveTo(px + rw * k, top, px + rw, top + rh * (1 - k) * 0.6, px + rw, py - (py - lidY) * 0.25);
        gg.lineTo(px + rw * 1.02, Math.max(py - rh * 0.6, lidY - rh * 0.28 * bl)); gg.quadraticCurveTo(px, lidY + rh * 0.32 * bl, px - rw * 1.02, Math.max(py - rh * 0.6, lidY - rh * 0.28 * bl)); gg.closePath(); };
      if (!LIDC) LIDC = document.createElement('canvas'); const lw = Math.ceil(rw * 3), lh = Math.ceil(rh * 3.4); if (LIDC.width < lw || LIDC.height < lh) { LIDC.width = Math.max(LIDC.width, lw); LIDC.height = Math.max(LIDC.height, lh); }
      const lc = LIDC.getContext('2d'); lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, LIDC.width, LIDC.height); lc.translate(-(px - rw * 1.5), -(py - rh * 1.7));
      const lg = lc.createRadialGradient(px, lidY - rh * 0.6, rh * 0.1, px, lidY - rh * 0.3, rw * 1.3); lg.addColorStop(0, SKIN[key][j]); lg.addColorStop(0.75, SKIN[key][j]); lg.addColorStop(1, 'rgb(205,150,138)');
      lc.fillStyle = lg; lid(lc); lc.fill();
      og.save(); og.filter = `blur(${Math.max(0.8, rh * 0.13)}px)`; og.drawImage(LIDC, 0, 0, lw, lh, px - rw * 1.5, py - rh * 1.7, lw, lh); og.filter = 'none'; og.restore();
      og.save(); og.fillStyle = 'rgba(110,60,56,0.22)'; og.beginPath(); og.ellipse(px, lidY - rh * 0.22 * bl, rw * 0.95, rh * 0.16, 0, 0, TAU); og.fill();
      og.strokeStyle = 'rgba(30,16,14,0.92)'; og.lineWidth = Math.max(1.2, rh * 0.18); og.lineCap = 'round'; og.beginPath(); og.moveTo(px - rw * 1.02, lidY - rh * 0.28 * bl); og.quadraticCurveTo(px, lidY + rh * 0.32 * bl, px + rw * 1.02, lidY - rh * 0.28 * bl); og.stroke(); og.restore();
    });
  }
  // lighting on the cutout
  og.save(); og.globalCompositeOperation = 'source-atop';
  if (o.ao !== 0) { const ao = o.ao ?? 0.35; const gr = og.createLinearGradient(0, pad + c.h * sEff * 0.72, 0, pad + c.h * sEff); gr.addColorStop(0, 'rgba(10,8,20,0)'); gr.addColorStop(1, `rgba(10,8,20,${ao})`); og.fillStyle = gr; og.fillRect(0, 0, cw, ch); }
  if (o.wash) { og.globalAlpha = o.wash[1]; og.fillStyle = o.wash[0]; og.fillRect(0, 0, cw, ch); og.globalAlpha = 1; }
  if (o.side) { // directional key/fill: darken the side away from light
    const [d, a] = o.side; const gr = og.createLinearGradient(pad, 0, pad + c.w * sEff, 0); const dk = `rgba(12,10,30,${a})`, cl = 'rgba(12,10,30,0)'; gr.addColorStop(0, d > 0 ? dk : cl); gr.addColorStop(1, d > 0 ? cl : dk); og.fillStyle = gr; og.fillRect(0, 0, cw, ch); }
  og.restore();
  if (o.rim && o.rim.a > 0) {
    const r = o.rim; const [ddx, ddy] = r.dir || [1, -0.4]; const w = (r.w || 7) * sEff * 1.6 + 1.5; const rc = scratch(cw, ch), rg = rc.getContext('2d');
    rg.drawImage(off, 0, 0); rg.globalCompositeOperation = 'source-in'; rg.fillStyle = r.color; rg.fillRect(0, 0, cw, ch);
    rg.globalCompositeOperation = 'destination-out'; rg.drawImage(off, -ddx * w, -ddy * w);
    og.save(); og.globalCompositeOperation = 'source-atop'; og.globalAlpha = clamp(r.a, 0, 1); og.filter = `blur(${Math.max(0.6, w * 0.25)}px)`; og.drawImage(rc, 0, 0); og.restore();
    og.save(); og.globalCompositeOperation = 'lighter'; og.globalAlpha = clamp(r.a, 0, 1) * 0.35; og.filter = `blur(${w * 0.8}px)`; og.drawImage(rc, 0, 0); og.restore();
  }
  // composite to screen
  const x = o.x, y = o.y; const fullH = c.h * S;
  g.save();
  if (o.shadow && o.shadow.a > 0) { const sw = (o.shadow.w || c.w * 0.62) * S; g.save(); g.globalAlpha *= o.shadow.a; const gr = g.createRadialGradient(x, y, 0, x, y, sw); gr.addColorStop(0, 'rgba(5,6,16,0.85)'); gr.addColorStop(0.55, 'rgba(5,6,16,0.35)'); gr.addColorStop(1, 'rgba(5,6,16,0)'); g.fillStyle = gr; g.translate(x, y + (o.shadow.y || 0)); g.scale(1, o.shadow.flat || 0.16); g.translate(-x, -y - (o.shadow.y || 0)); g.beginPath(); g.arc(x, y + (o.shadow.y || 0), sw, 0, TAU); g.fill(); g.restore(); }
  if (o.aura && o.aura.a > 0) { const ar = o.aura; const cx = x, cy = y - fullH * 0.5; const R = (ar.r || 1) * fullH * 0.62; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= clamp(ar.a); const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, rgba(ar.color, 0.55)); gr.addColorStop(0.5, rgba(ar.color, 0.18)); gr.addColorStop(1, rgba(ar.color, 0)); g.fillStyle = gr; g.fillRect(cx - R, cy - R, R * 2, R * 2); g.restore(); }
  g.globalAlpha *= o.alpha ?? 1;
  const f = []; if (o.bright !== undefined && o.bright !== 1) f.push(`brightness(${o.bright})`); if (o.sat !== undefined && o.sat !== 1) f.push(`saturate(${o.sat})`); if (o.contrast) f.push(`contrast(${o.contrast})`); if (o.blur) f.push(`blur(${o.blur * dev}px)`); if (f.length) g.filter = f.join(' ');
  g.translate(x, y + (o.bob || 0)); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1);
  g.setTransform(g.getTransform().scale(1 / sEff * S, 1 / sEff * S));
  g.drawImage(off, 0, 0, cw, ch, -(pad + (c.w * sEff) / 2), -(pad + c.h * sEff), cw, ch);
  g.restore();
}
/** screen position of a rig point (e.g. hand, face) for given draw options (ignores wind) */
export function charPoint(key, o, px, py) {
  const c = CHARS[key]; const S = (o.h || 600) / c.h; const lean = o.lean || 0, tilt = o.headTilt || 0; let dx = -lean * (c.h - py) * 0.9; if (py < c.neck) dx += tilt * (c.neck - py) * 1.2;
  const sq = o.squash || 1, sy = Math.sqrt(sq); let lx = (px + dx - c.w / 2) * S, ly = -(c.h - py) * S * sy; if (o.flip) lx = -lx;
  if (o.rot) { const cs = Math.cos(o.rot), sn = Math.sin(o.rot); [lx, ly] = [lx * cs - ly * sn, lx * sn + ly * cs]; }
  return [o.x + lx, o.y + (o.bob || 0) + ly];
}
export const hand = (key, o, j = 1) => { const c = CHARS[key]; let jj = o.flip ? 1 - j : j; return charPoint(key, o, ...c.hand[jj]); };
export const face = (key, o) => charPoint(key, o, ...CHARS[key].face);
