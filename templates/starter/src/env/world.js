// Xianxia world kit (Canvas 2D, pure functions of T): skies, karst peaks with volume shading, sea of clouds (memoised puff
// sprites with lit tops / cool undersides), mist, waterfalls, pavilions, sect gate, stone steps, village, cave, herbs, furnace.
import { clamp, lerp, hash1, hash2, TAU, rgba, mixHex, noise1, fbm1, smooth, fract } from '../core/util.js';
import { sprite, vgrad, lgrad, rgrad, glow, glowE } from '../core/look.js';
import { applyCam } from '../core/camera.js';

export const SKY = {
  predawn: [[0, '#070b22'], [0.45, '#1b2452'], [0.75, '#4b4a86'], [1, '#d98a7a']],
  dawn: [[0, '#1d3c7a'], [0.4, '#4f7dc4'], [0.72, '#f0b48e'], [1, '#ffe2b0']],
  day: [[0, '#1557b8'], [0.45, '#3f8fe6'], [0.8, '#9fd2ff'], [1, '#e4f3ff']],
  dusk: [[0, '#21265e'], [0.4, '#7a3f7e'], [0.7, '#e2705a'], [1, '#ffc27a']],
  night: [[0, '#040814'], [0.5, '#0d1a3a'], [0.85, '#1f3260'], [1, '#2d4878']],
  blood: [[0, '#0d0306'], [0.4, '#3a0710'], [0.75, '#8a1a1a'], [1, '#d4552a']],
  storm: [[0, '#05060e'], [0.45, '#14183a'], [0.8, '#2c2f5c'], [1, '#4a4a7a']],
  golden: [[0, '#2a4aa0'], [0.4, '#6f8fe0'], [0.72, '#ffc98a'], [1, '#fff1c8']],
  cave: [[0, '#04100e'], [0.6, '#0a2622'], [1, '#12403a']],
};
export function sky(g, stops, y0 = 0, y1 = 1080) { g.fillStyle = vgrad(g, y0, y1, stops); g.fillRect(-3000, -3000, 7920, 7080); }
export function stars(g, T, a = 1, seed = 3, count = 220, y1 = 700) {
  if (a <= 0) return; g.save();
  for (let i = 0; i < count; i++) { const x = hash2(seed, i) * 2400 - 240, y = hash2(seed + 1, i) * y1, r = 0.6 + hash2(seed + 2, i) ** 3 * 2.2; const tw = 0.6 + 0.4 * Math.sin(T * (1 + hash2(seed + 3, i) * 3) + i);
    g.globalAlpha = a * tw * (1 - y / y1 * 0.6); g.fillStyle = i % 7 ? '#eef3ff' : '#ffe2b0'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); if (r > 2) glow(g, x, y, r * 6, '#cfe0ff', 0.25 * a * tw); }
  g.restore();
}
export function sun(g, x, y, r, color = '#fff3d0', a = 1) { glow(g, x, y, r * 12, color, 0.4 * a, 'screen'); glow(g, x, y, r * 4, color, 0.55 * a, 'screen'); g.save(); g.globalAlpha *= a; g.fillStyle = rgrad(g, x, y, 0, r * 1.15, [[0, '#fffdf6'], [0.7, rgba('#fff6dc', 1)], [1, rgba(color, 0)]]); g.beginPath(); g.arc(x, y, r * 1.15, 0, TAU); g.fill(); g.restore(); }
export function moon(g, x, y, r, a = 1) { glow(g, x, y, r * 7, '#bcd4ff', 0.3 * a); g.save(); g.globalAlpha *= a; g.fillStyle = rgrad(g, x - r * 0.3, y - r * 0.3, 0, r, [[0, '#fffef5'], [1, '#d9e2f5']]); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.globalAlpha *= 0.12; g.fillStyle = '#8090b0'; for (const [dx, dy, s] of [[0.3, 0.1, 0.22], [-0.25, 0.3, 0.15], [-0.1, -0.35, 0.12]]) { g.beginPath(); g.arc(x + dx * r, y + dy * r, s * r, 0, TAU); g.fill(); } g.restore(); }

/** a karst peak: steep pillar with a domed, forested crown, lit side, soft vertical crevices, foliage clusters on ledges, base mist. */
export function peak(g, p, pal) {
  const { x, base, h, w, seed = 1, lean = 0 } = p; const top = base - h; const N = 48; const L = [], R = [];
  const taper = 0.5 + hash2(seed, 77) * 0.35;
  for (let i = 0; i <= N; i++) { const v = i / N; const prof = Math.min(1, taper + (1 - taper) * Math.pow(Math.min(1, v * 3), 0.6)) * (1 + 0.22 * v * v);
    const j1 = fbm1(v * 7 + seed * 3.1, seed) * 0.14 + noise1(v * 26 + seed, seed + 2) * 0.03, j2 = fbm1(v * 7 + seed * 7.7, seed + 5) * 0.14 + noise1(v * 23 + seed, seed + 4) * 0.03;
    const y = top + v * h; const cx = x + lean * (1 - v) * h; L.push([cx - w * 0.5 * prof * (1 + j1), y]); R.push([cx + w * 0.5 * prof * (1 + j2), y]); }
  const crownH = Math.min(w, 420) * taper * 0.32;
  const path = () => { g.beginPath(); g.moveTo(L[0][0], L[0][1]); g.bezierCurveTo(L[0][0], top - crownH, R[0][0], top - crownH, R[0][0], R[0][1]); for (const q of R) g.lineTo(q[0], q[1]); for (let i = L.length - 1; i >= 0; i--) g.lineTo(L[i][0], L[i][1]); g.closePath(); };
  const ld = pal.lightDir ?? 1;
  g.save(); path(); g.fillStyle = vgrad(g, top - crownH, base, [[0, pal.top], [0.45, pal.mid], [1, pal.base]]); g.fill(); g.clip();
  // soft vertical crevices (few, tapered)
  for (let k = 0; k < 5; k++) { const u = hash2(seed + 11, k); const cx = x + (u - 0.5) * w * 0.8; const cw = w * (0.02 + hash2(seed + 12, k) * 0.03); const y0 = top + h * (0.08 + hash2(seed + 13, k) * 0.3);
    g.fillStyle = vgrad(g, y0, base, [[0, rgba(pal.shade, 0)], [0.25, rgba(pal.shade, 0.32)], [1, rgba(pal.shade, 0.05)]]); g.beginPath(); g.moveTo(cx, y0); g.quadraticCurveTo(cx - cw * 2, (y0 + base) / 2, cx - cw, base); g.lineTo(cx + cw, base); g.quadraticCurveTo(cx + cw * 0.5, (y0 + base) / 2, cx, y0); g.fill(); }
  // form shading: core shadow + reflected light + lit side
  g.fillStyle = lgrad(g, x - w * 0.62, 0, x + w * 0.62, 0, ld > 0 ? [[0, rgba(pal.shade, 0.55)], [0.18, rgba(pal.shade, 0.75)], [0.55, rgba(pal.shade, 0.12)], [0.85, rgba(pal.rim, 0.1)], [1, rgba(pal.rim, 0.32)]] : [[0, rgba(pal.rim, 0.32)], [0.15, rgba(pal.rim, 0.1)], [0.45, rgba(pal.shade, 0.12)], [0.82, rgba(pal.shade, 0.75)], [1, rgba(pal.shade, 0.55)]]); g.fillRect(x - w, top - crownH - 20, w * 2, h + 80);
  // foliage clusters on ledges
  if (pal.tree) for (let k = 0; k < 4; k++) { const yy = top + h * (0.16 + k * 0.16 + hash2(seed + 21, k) * 0.08); const n = 2 + Math.floor(hash2(seed + 24, k) * 3);
    for (let i = 0; i < n; i++) { const u = hash2(seed + 22 + k, i); const tx = x + (u - 0.5) * w * 1.0; const s = Math.min(w, 300) * (0.05 + hash2(seed + 23 + k, i) * 0.05); const col = mixHex(pal.tree, pal.mist, k * 0.1);
      g.save(); g.translate(tx, yy); g.scale(1.5, 0.55); foliage(g, 0, 0, s, mixHex(col, pal.mid, 0.35), pal.rim, ld, seed * 31 + k * 7 + i); g.restore(); } }
  g.strokeStyle = rgba(pal.rim, 0.55); g.lineWidth = Math.max(2, w * 0.02); g.beginPath(); const side = ld > 0 ? R : L; side.slice(0, 34).forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke();
  g.fillStyle = vgrad(g, base - h * 0.6, base, [[0, rgba(pal.mist, 0)], [1, rgba(pal.mist, 0.92)]]); g.fillRect(x - w, base - h * 0.6, w * 2, h * 0.6);
  g.restore();
  // forested dome crown
  if (pal.tree) { const wc = Math.min(w, 300); const n = 5 + Math.floor(w / 40); for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; const tx = lerp(L[0][0], R[0][0], u); const ty = top - Math.sin(u * Math.PI) * crownH * 0.7 + wc * 0.05 + hash2(seed + 6, i) * wc * 0.04; const s = wc * (0.06 + hash2(seed + 4, i) * 0.04);
    foliage(g, tx, ty, s, pal.tree, pal.rim, ld, seed * 13 + i); } }
}
/** rounded foliage clump (Pixar-style: lit cap, dark underside) */
export function foliage(g, x, y, s, col, rim, ld = 1, seed = 1) {
  const n = 4; g.save();
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI - Math.PI; const cx = x + Math.cos(a) * s * 0.7 * (0.7 + hash2(seed, i) * 0.5), cy = y + Math.sin(a) * s * 0.45 - s * 0.2; const r = s * (0.55 + hash2(seed + 1, i) * 0.3);
    g.fillStyle = rgrad(g, cx + ld * r * 0.3, cy - r * 0.45, r * 0.1, r * 1.1, [[0, mixHex(col, rim, 0.35)], [0.6, col], [1, mixHex(col, '#000000', 0.35)]]); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); }
  g.restore();
}
/** seeded row of peaks for a depth layer */
export function peaksLayer(g, o, pal) {
  const { seed = 1, count = 6, x0 = -400, x1 = 2320, base = 900, hMin = 300, hMax = 700, wMin = 140, wMax = 300 } = o;
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => hash2(seed + 1, a) - hash2(seed + 1, b)); for (const i of order) { const u = (i + 0.1 + hash2(seed, i) * 0.8) / count; peak(g, { x: lerp(x0, x1, u), base: base + hash2(seed + 3, i) * 90, h: lerp(hMin, hMax, Math.pow(hash2(seed + 1, i), 0.8)), w: lerp(wMin, wMax, hash2(seed + 2, i)), seed: seed * 10 + i, lean: (hash2(seed + 5, i) - 0.5) * 0.08 }, pal); }
}
export const PEAKPAL = {
  dawnFar: { top: '#7f8fc0', mid: '#6876a8', base: '#9aa3c8', shade: '#3a3f78', rim: '#ffd3b0', mist: '#c9c4dc', lightDir: 1 },
  dawnMid: { top: '#4d6a8c', mid: '#3a5070', base: '#7c88a8', shade: '#1d2448', rim: '#ffc79a', mist: '#b8b8d0', tree: '#2c4a42', lightDir: 1 },
  dawnNear: { top: '#2f4a4a', mid: '#25384a', base: '#45506a', shade: '#0e1428', rim: '#ffbf8a', mist: '#9a9cb8', tree: '#1f3a30', lightDir: 1 },
  dayFar: { top: '#8fb0dc', mid: '#7fa0d0', base: '#bcd4f0', shade: '#4a64a0', rim: '#ffffff', mist: '#dcebff', lightDir: -1 },
  dayMid: { top: '#4f8a78', mid: '#3d6a6c', base: '#86a8c4', shade: '#1a3550', rim: '#fff6d8', mist: '#d0e2f4', tree: '#2f6a40', lightDir: -1 },
  dayNear: { top: '#3b6e4c', mid: '#2e5050', base: '#5a7890', shade: '#0d2030', rim: '#fff1c0', mist: '#b8d0e8', tree: '#24552e', lightDir: -1 },
  nightFar: { top: '#2a3a68', mid: '#22305a', base: '#34467a', shade: '#0a1030', rim: '#9fc0ff', mist: '#3a4e84', lightDir: 1 },
  nightMid: { top: '#1c2a50', mid: '#15203f', base: '#26365e', shade: '#050a1c', rim: '#a8c8ff', mist: '#2c3e6a', tree: '#0f1c30', lightDir: 1 },
  bloodFar: { top: '#5a1a24', mid: '#40121c', base: '#7a2a26', shade: '#12030a', rim: '#ff7a4a', mist: '#8a3028', lightDir: 1 },
  bloodMid: { top: '#2a0c14', mid: '#1c070d', base: '#4a1418', shade: '#050002', rim: '#ff5a3a', mist: '#5a1a1c', tree: '#14050a', lightDir: 1 },
  stormFar: { top: '#2a2c58', mid: '#20224a', base: '#36386a', shade: '#06061a', rim: '#b8a8ff', mist: '#3a3a6a', lightDir: 1 },
  stormMid: { top: '#181a3a', mid: '#10122c', base: '#22244a', shade: '#020210', rim: '#c8b8ff', mist: '#2a2a50', tree: '#0a0a1c', lightDir: 1 },
  goldFar: { top: '#a8a0d8', mid: '#9890c8', base: '#e8c8b8', shade: '#5a5098', rim: '#fff0c0', mist: '#ffe6cc', lightDir: 1 },
  goldMid: { top: '#5a7aa0', mid: '#46628a', base: '#c0a8b0', shade: '#24305a', rim: '#ffe0a0', mist: '#f4d8c4', tree: '#2c5048', lightDir: 1 },
};

// ---- clouds ---------------------------------------------------------------------------------------------------------
function puffSprite(lit, shade, seed) {
  return sprite(`puff_${lit}_${shade}_${seed}`, 512, 300, (g) => {
    const lumps = []; const n = 14; for (let i = 0; i < n; i++) { const u = hash2(seed, i); const cx = 70 + u * 372; const dome = Math.sin(((cx - 40) / 432) * Math.PI); const r = 26 + 46 * dome * (0.6 + 0.6 * hash2(seed + 1, i)); lumps.push([cx, 250 - r * 0.55 - dome * 70 * hash2(seed + 2, i), r]); }
    lumps.push([256, 215, 60], [180, 225, 48], [330, 222, 52]);
    const sil = (gg) => { gg.beginPath(); for (const [x, y, r] of lumps) { gg.moveTo(x + r, y); gg.arc(x, y, r, 0, TAU); } gg.rect(40, 240, 432, 20); gg.fill(); };
    g.filter = 'blur(3px)'; g.fillStyle = '#fff'; sil(g); g.filter = 'none';
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = vgrad(g, 90, 262, [[0, lit], [0.5, mixHex(lit, shade, 0.35)], [1, shade]]); g.fillRect(0, 0, 512, 300);
    // per-lump top-left highlight and lower occlusion (soft)
    for (const [x, y, r] of lumps) { g.fillStyle = rgrad(g, x - r * 0.35, y - r * 0.5, 0, r * 0.95, [[0, rgba(lit, 0.55)], [1, rgba(lit, 0)]]); g.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
      g.fillStyle = rgrad(g, x + r * 0.2, y + r * 0.85, 0, r * 0.8, [[0, rgba(shade, 0.35)], [1, rgba(shade, 0)]]); g.fillRect(x - r * 1.5, y - r, r * 3, r * 3); }
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = vgrad(g, 236, 300, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]); g.fillRect(0, 236, 512, 64);
  }, 1);
}
/** sea of clouds band. o: {y, T, lit, shade, count, scale, speed, seed, alpha, depthX} */
export function cloudSea(g, o) {
  const { y = 800, T = 0, lit = '#ffffff', shade = '#8fa0c8', count = 14, scale = 1, speed = 10, seed = 1, alpha = 1, x0 = -600, span = 3100, rows = 2 } = o;
  g.save(); g.globalAlpha *= alpha;
  for (let r = 0; r < rows; r++) for (let i = 0; i < count; i++) { const sp = sprite && puffSprite(lit, shade, (seed * 7 + i) % 5);
    const s = scale * (0.8 + hash2(seed + r, i) * 0.6) * (1 + r * 0.25); const x = x0 + fract(i / count + hash2(seed + 4, i) * 0.05 + (T * speed * (1 + r * 0.3)) / span) * span - 250 * s; const yy = y + r * 60 * scale + (hash2(seed + 2, i) - 0.5) * 50 * scale;
    g.drawImage(sp, x, yy - 240 * s, 512 * s, 300 * s); }
  // continuous body under the puffs
  g.fillStyle = vgrad(g, y - 10 * scale, y + 400 * scale, [[0, rgba(mixHex(lit, shade, 0.5), 1)], [0.35, rgba(shade, 1)], [1, rgba(shade, 1)]]); g.fillRect(-3000, y + 40 * scale, 7920, 3000);
  g.restore();
}
/** one cumulus (foreground wisps / framing) */
export function cloud(g, x, y, s, lit = '#ffffff', shade = '#9aa8d0', seed = 1, a = 1) { const sp = puffSprite(lit, shade, seed % 5); g.save(); g.globalAlpha *= a; g.drawImage(sp, x - 256 * s, y - 240 * s, 512 * s, 300 * s); g.restore(); }
export function mist(g, T, o = {}) {
  const { y = 700, h = 260, color = '#dfe6ff', a = 0.5, speed = 20, seed = 2, count = 8 } = o; if (a <= 0) return;
  g.save(); for (let i = 0; i < count; i++) { const w = 700 + hash2(seed, i) * 700; const x = fract(hash2(seed + 1, i) + (T * speed * (0.6 + hash2(seed + 2, i))) / 3200) * 3200 - 800; const yy = y + (hash2(seed + 3, i) - 0.5) * h;
    glowE(g, x, yy, w * 0.5, h * 0.35, color, a * 0.7, 'source-over'); } g.restore();
}

// ---- architecture -----------------------------------------------------------------------------------------------------
/** Chinese pavilion / hall. s = scale (1 => ~400px wide), o: {tiers, roof, wall, pillar, glow (lanterns 0..1), night} */
export function pavilion(g, x, y, s, o = {}) {
  const { tiers = 2, roof = '#2a4a5a', roofHi = '#5a8a90', pillar = '#a8322a', wall = '#e8d8b8', gold = '#e8b84a', lantern = 0, T = 0, dark = 0 } = o;
  g.save(); g.translate(x, y); g.scale(s, s);
  // platform
  g.fillStyle = '#8a8a90'; g.fillRect(-230, -30, 460, 30); g.fillStyle = '#b8b4b0'; g.fillRect(-240, -38, 480, 10);
  let yy = -38; let w = 170;
  for (let t = 0; t < tiers; t++) {
    const bh = t ? 70 : 120; // body
    g.fillStyle = wall; g.fillRect(-w, yy - bh, w * 2, bh); g.fillStyle = 'rgba(40,20,10,0.35)'; g.fillRect(-w, yy - bh, w * 2, 18);
    // lattice windows
    g.fillStyle = 'rgba(60,30,20,0.55)'; for (let k = -2; k <= 1; k++) { g.fillRect(k * w * 0.45 + 12, yy - bh + 30, w * 0.3, bh - 46); }
    if (lantern > 0) { g.fillStyle = rgba('#ffcf7a', 0.85 * lantern); for (let k = -2; k <= 1; k++) g.fillRect(k * w * 0.45 + 16, yy - bh + 34, w * 0.3 - 8, bh - 54); }
    g.fillStyle = pillar; for (const px of [-w, -w * 0.33, w * 0.33, w]) g.fillRect(px - 7, yy - bh, 14, bh);
    yy -= bh;
    // roof with upturned eaves
    const rw = w + 70, rh = t === tiers - 1 ? 95 : 60;
    g.beginPath(); g.moveTo(-rw - 30, yy - 8 - 30); g.quadraticCurveTo(-rw + 20, yy + 6, -rw * 0.5, yy - rh * 0.25); g.lineTo(-w * 0.55, yy - rh); g.lineTo(w * 0.55, yy - rh); g.lineTo(rw * 0.5, yy - rh * 0.25); g.quadraticCurveTo(rw - 20, yy + 6, rw + 30, yy - 38); g.lineTo(rw - 10, yy - 14); g.lineTo(-rw + 10, yy - 14); g.closePath();
    g.fillStyle = vgrad(g, yy - rh, yy, [[0, roofHi], [1, roof]]); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(k * w * 0.09, yy - rh + 4); g.lineTo(k * rw * 0.16, yy - 14); g.stroke(); }
    g.strokeStyle = gold; g.lineWidth = 5; g.beginPath(); g.moveTo(-rw - 30, yy - 38); g.quadraticCurveTo(-rw + 20, yy + 6, -rw * 0.5, yy - rh * 0.25 + 2); g.moveTo(rw + 30, yy - 38); g.quadraticCurveTo(rw - 20, yy + 6, rw * 0.5, yy - rh * 0.25 + 2); g.stroke();
    g.fillStyle = gold; g.fillRect(-w * 0.55, yy - rh - 6, w * 1.1, 8);
    if (lantern > 0) for (const lx of [-rw * 0.8, rw * 0.8]) { const sw = Math.sin(T * 1.5 + lx) * 3; g.fillStyle = '#d8352a'; g.beginPath(); g.ellipse(lx + sw, yy + 24, 12, 16, 0, 0, TAU); g.fill(); glow(g, lx + sw, yy + 24, 70, '#ffb050', 0.7 * lantern); }
    yy -= rh - 10; w *= 0.66;
  }
  // finial
  g.fillStyle = gold; g.beginPath(); g.arc(0, yy - 14, 10, 0, TAU); g.fill(); g.fillRect(-3, yy - 40, 6, 30);
  if (dark > 0) { g.globalCompositeOperation = 'source-atop'; }
  g.restore();
}
/** stone paifang sect gate. s ~ 1 => 900px wide */
export function sectGate(g, x, y, s, o = {}) {
  const { T = 0, glowA = 0.6, plaque = '青云' } = o; g.save(); g.translate(x, y); g.scale(s, s);
  const stone = (x0, y0, w, h) => { g.fillStyle = lgrad(g, x0, 0, x0 + w, 0, [[0, '#cfc6b8'], [0.6, '#a69c90'], [1, '#6f6860']]); g.fillRect(x0, y0, w, h); };
  for (const px of [-420, -170, 140, 390]) { stone(px, -620, 34, 620); g.fillStyle = '#5a554e'; g.fillRect(px - 10, -40, 54, 40); }
  for (const [y0, w] of [[-650, 880], [-470, 620]]) { stone(-w / 2 - 20, y0, w + 40, 46); }
  // roofs
  for (const [cx, w, yy] of [[0, 360, -650], [-300, 200, -520], [300, 200, -520]]) { g.beginPath(); g.moveTo(cx - w - 40, yy - 20); g.quadraticCurveTo(cx - w, yy + 10, cx - w * 0.7, yy - 30); g.lineTo(cx - w * 0.6, yy - 90); g.lineTo(cx + w * 0.6, yy - 90); g.lineTo(cx + w * 0.7, yy - 30); g.quadraticCurveTo(cx + w, yy + 10, cx + w + 40, yy - 20); g.closePath(); g.fillStyle = vgrad(g, yy - 90, yy, [[0, '#4f8a8a'], [1, '#1e3a44']]); g.fill(); g.fillStyle = '#e8b84a'; g.fillRect(cx - w * 0.6, yy - 96, w * 1.2, 8); }
  // plaque
  g.fillStyle = '#1a2a3a'; g.fillRect(-120, -600, 240, 110); g.strokeStyle = '#e8b84a'; g.lineWidth = 8; g.strokeRect(-120, -600, 240, 110);
  g.fillStyle = '#ffd77a'; g.font = '400 78px "MaShan", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(plaque, 0, -542); glow(g, 0, -545, 160, '#ffcf6a', 0.25 * glowA);
  g.restore();
}
/** receding stone stairway between two points (perspective trapezoid with steps) */
export function stairs(g, xb, yb, wb, xt, yt, wt, n = 30, col = '#a8a090') {
  for (let i = n - 1; i >= 0; i--) { const v0 = i / n, v1 = (i + 1) / n; const e = (v) => Math.pow(v, 0.7);
    const y0 = lerp(yb, yt, e(v0)), y1 = lerp(yb, yt, e(v1)); const x0 = lerp(xb, xt, e(v0)), x1 = lerp(xb, xt, e(v1)); const w0 = lerp(wb, wt, e(v0)), w1 = lerp(wb, wt, e(v1));
    g.fillStyle = mixHex(col, '#2a2a3a', 0.25 + v0 * 0.35); g.beginPath(); g.moveTo(x0 - w0 / 2, y0); g.lineTo(x0 + w0 / 2, y0); g.lineTo(x1 + w1 / 2, y1); g.lineTo(x1 - w1 / 2, y1); g.fill();
    g.fillStyle = mixHex(col, '#ffffff', 0.15 - v0 * 0.1); g.fillRect(x1 - w1 / 2, y1, w1, Math.max(1, (y0 - y1) * 0.3)); }
}
/** thatched village cottage (volume-shaded walls, timber frame, thick thatch with lit edge, warm window, ground AO) */
export function cottage(g, x, y, s, o = {}) {
  const { lit = 0, T = 0, smoke = 1, ld = 1 } = o; g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = rgrad(g, 0, 0, 10, 260, [[0, 'rgba(10,14,8,0.45)'], [1, 'rgba(10,14,8,0)']]); g.save(); g.scale(1, 0.18); g.beginPath(); g.arc(20 * ld, 0, 260, 0, TAU); g.fill(); g.restore();
  // stone base + walls
  g.fillStyle = lgrad(g, -150, 0, 150, 0, ld > 0 ? [[0, '#a89070'], [1, '#f0dcb4']] : [[0, '#f0dcb4'], [1, '#a89070']]); g.fillRect(-140, -150, 280, 150);
  g.fillStyle = 'rgba(60,40,30,0.25)'; g.fillRect(-140, -150, 280, 26);
  g.fillStyle = '#7a7268'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(-130 + i * 32, -6, 18, 10, 0, 0, TAU); g.fill(); }
  g.fillStyle = '#6a4630'; for (const bx of [-140, -50, 50, 130]) g.fillRect(bx, -150, 10, 150); g.fillRect(-140, -82, 280, 8);
  g.fillStyle = vgrad(g, -100, 0, [[0, '#3a2418'], [1, '#5a3a24']]); g.fillRect(-30, -104, 60, 100); g.fillStyle = '#c89a50'; g.beginPath(); g.arc(18, -50, 3, 0, TAU); g.fill();
  if (lit) { g.fillStyle = rgba('#ffc870', 0.9 * lit); g.fillRect(70, -120, 46, 40); glow(g, 93, -100, 140, '#ffb860', 0.55 * lit); } else { g.fillStyle = '#2a1e18'; g.fillRect(70, -120, 46, 40); }
  g.strokeStyle = '#6a4630'; g.lineWidth = 4; g.beginPath(); g.moveTo(93, -120); g.lineTo(93, -80); g.moveTo(70, -100); g.lineTo(116, -100); g.stroke();
  // thatch: thick rounded roof
  g.beginPath(); g.moveTo(-200, -124); g.quadraticCurveTo(-170, -150, -120, -215); g.quadraticCurveTo(0, -300, 120, -215); g.quadraticCurveTo(170, -150, 200, -124); g.quadraticCurveTo(0, -150, -200, -124); g.closePath();
  g.fillStyle = vgrad(g, -290, -124, [[0, '#e8c47a'], [0.6, '#b8904a'], [1, '#6a4a24']]); g.fill();
  g.save(); g.clip(); g.fillStyle = lgrad(g, -200, 0, 200, 0, ld > 0 ? [[0, 'rgba(40,20,10,0.4)'], [1, 'rgba(255,240,200,0.15)']] : [[0, 'rgba(255,240,200,0.15)'], [1, 'rgba(40,20,10,0.4)']]); g.fillRect(-210, -300, 420, 180);
  g.strokeStyle = 'rgba(90,60,30,0.35)'; g.lineWidth = 2; for (let k = -12; k <= 12; k++) { g.beginPath(); g.moveTo(k * 8, -280); g.quadraticCurveTo(k * 14, -200, k * 17, -126); g.stroke(); }
  g.restore(); g.strokeStyle = 'rgba(255,236,180,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-120, -215); g.quadraticCurveTo(0, -300, 120, -215); g.stroke();
  g.fillStyle = '#5a3a26'; g.fillRect(84, -282, 26, 70);
  if (smoke) for (let i = 0; i < 7; i++) { const p = fract(T * 0.12 + i / 7); glow(g, 97 + Math.sin(p * 6 + i) * 18 + p * 70, -300 - p * 320, 26 + p * 70, '#e6e6ee', 0.32 * (1 - p) * smoke, 'source-over'); }
  g.restore();
}
/** Pixar round-canopy tree */
export function tree(g, x, y, s, o = {}) {
  const { col = '#3f7a3a', rim = '#fff0b0', ld = 1, seed = 1, T = 0 } = o; g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(10,14,8,0.35)'; g.beginPath(); g.ellipse(10 * ld, 0, 90, 16, 0, 0, TAU); g.fill();
  g.fillStyle = lgrad(g, -14, 0, 14, 0, [[0, '#3a2414'], [1, '#7a5030']]); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-8, -120); g.lineTo(8, -120); g.lineTo(14, 0); g.fill();
  const sw = Math.sin(T * 1.2 + seed) * 3; foliage(g, sw, -150, 70, col, rim, ld, seed); foliage(g, -40 + sw, -120, 50, col, rim, ld, seed + 3); foliage(g, 45 + sw, -125, 52, col, rim, ld, seed + 5); foliage(g, sw * 1.3, -205, 52, col, rim, ld, seed + 7);
  g.restore();
}
/** rolling hill ground with lit crest; o: {y, amp, col, colHi, colLo, seed, ld} */
export function hills(g, o = {}) {
  const { y = 760, amp = 60, col = '#5f8a3a', colHi = '#b8d070', colLo = '#24401c', seed = 1, x0 = -800, x1 = 2800, depth = 600 } = o;
  g.save(); g.beginPath(); g.moveTo(x0, y + 2000); for (let x = x0; x <= x1; x += 40) g.lineTo(x, y + fbm1(x * 0.0012 + seed, seed) * amp); g.lineTo(x1, y + 2000); g.closePath();
  g.fillStyle = vgrad(g, y - amp, y + depth, [[0, colHi], [0.12, col], [1, colLo]]); g.fill(); g.clip();
  for (let i = 0; i < 40; i++) { const px = lerp(x0, x1, hash2(seed + 3, i)), py = y + 40 + hash2(seed + 4, i) * depth; glowE(g, px, py, 120 + hash2(seed + 5, i) * 200, 20 + hash2(seed + 6, i) * 30, i % 2 ? colLo : colHi, 0.18, 'source-over'); }
  g.restore();
}
/** swaying tall grass field; o: {y0 (horizon), y1, density, colA, colB, wind, seed, x0, x1} */
export function grass(g, T, o = {}) {
  const { y0 = 760, y1 = 1100, n = 260, colA = '#3e7a3a', colB = '#a8c860', wind = 1, seed = 5, x0 = -100, x1 = 2020, hMul = 1, push = null } = o;
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const v = hash2(seed, i); const y = lerp(y0, y1, v * v); const x = lerp(x0, x1, hash2(seed + 1, i)); const h = (30 + 140 * v * v) * hMul * (0.7 + hash2(seed + 2, i) * 0.6);
    let bend = (Math.sin(T * 1.6 + x * 0.004 + i) * 0.5 + Math.sin(T * 2.7 + x * 0.01) * 0.3) * 0.25 * wind + 0.15 * wind;
    if (push) { const d = Math.abs(x - push[0]); if (d < push[1]) bend += (x > push[0] ? 1 : -1) * (1 - d / push[1]) * 0.9; }
    g.strokeStyle = mixHex(colA, colB, hash2(seed + 3, i) * 0.7 + (1 - v) * 0.3); g.lineWidth = 1.5 + v * 5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + bend * h * 0.3, y - h * 0.6, x + bend * h, y - h); g.stroke(); }
  g.restore();
}
/** waterfall ribbon from (x,y0) to y1, width w */
export function waterfall(g, T, x, y0, y1, w, a = 1) {
  g.save(); g.globalAlpha *= a; g.fillStyle = lgrad(g, x - w / 2, 0, x + w / 2, 0, [[0, 'rgba(180,220,255,0.15)'], [0.3, 'rgba(230,245,255,0.85)'], [0.7, 'rgba(200,230,255,0.75)'], [1, 'rgba(180,220,255,0.15)']]); g.fillRect(x - w / 2, y0, w, y1 - y0);
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { const xx = x - w / 2 + (i + 0.5) / 12 * w; const ph = fract(T * 0.9 + hash1(i)); g.beginPath(); g.moveTo(xx, y0 + (y1 - y0) * ph); g.lineTo(xx, y0 + (y1 - y0) * Math.min(1, ph + 0.15)); g.stroke(); }
  for (let i = 0; i < 6; i++) glowE(g, x + (i - 2.5) * w * 0.3, y1, w * 0.7, w * 0.25, '#ffffff', 0.25, 'source-over');
  g.restore();
}
/** parallax helper: draw fn in camera space at depth */
export function layer(g, c, depth, fn) { g.save(); applyCam(g, c, depth); fn(g); g.restore(); }
