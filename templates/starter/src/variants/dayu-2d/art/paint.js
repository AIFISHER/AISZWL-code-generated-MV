// Environment kit for the 大鱼海棠-like painted look: deep saturated palette, stylised xiangyun clouds, ink-wash mountains,
// round earthen tulou, paper lanterns, petals, sea with swirl waves. Static pieces are memoised sprites (per dpr), animated bits are stateless.
import { clamp, rgba, mixHex, lerp, hash2, fract, TAU, noise1 } from '../../../core/util.js';
import { sp, INK, cloudCurl } from './draw.js';

export const PAL = {
  night0: '#070b1f', night1: '#0f1d44', night2: '#1d3a6a', teal: '#1f6f78', jade: '#3fa38f', celadon: '#9fd3c1', indigo: '#1a2a5c',
  verm: '#d6342c', cinn: '#b5202a', gold: '#e9b44c', goldHi: '#ffe3a0', moon: '#fbf3d9', moonSilver: '#dfe8f4', ochre: '#b97a45', earth: '#8a5434',
  dusk0: '#2a1240', dusk1: '#a8324a', dusk2: '#f08a4a', dusk3: '#ffd08a', mist: '#7f9cc0', ink: INK,
};
const SPR = new Map();
export function sprite(key, w, h, fn, scale = 2) {
  const k = key + '@' + scale; let c = SPR.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
  const g = c.getContext('2d'); g.scale(scale, scale); fn(g, w, h); SPR.set(k, c); return c;
}
const SC = () => (globalThis.__dpr || 2);
export function blit(g, c, x, y, w, h) { g.drawImage(c, x, y, w, h); }

export function sky(g, stops, y0 = 0, y1 = 1080, x0 = -400, x1 = 2320) {
  const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(x0, y0 - 2000, x1 - x0, y1 - y0 + 4000);
}
export const SKY = {
  night: [[0, '#050818'], [0.45, '#0f1f4a'], [0.8, '#1d4170'], [1, '#2e6386']],
  deep: [[0, '#04061a'], [0.5, '#0b1838'], [1, '#183660']],
  dusk: [[0, '#1c0f3a'], [0.4, '#6a1f4f'], [0.72, '#d2503f'], [0.9, '#f59a52'], [1, '#ffd38a']],
  blood: [[0, '#1a0510'], [0.5, '#6a0f1c'], [0.85, '#c8361e'], [1, '#f08a3a']],
  dawn: [[0, '#0d1d4a'], [0.5, '#3a5a9a'], [0.82, '#d88aa0'], [1, '#ffd6a8']],
};
export function stars(g, T, { count = 140, seed = 3, area = [-200, -200, 2320, 760], alpha = 0.9 } = {}) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) { const x = area[0] + hash2(seed, i) * area[2], y = area[1] + hash2(seed + 1, i) * area[3]; const r = 0.6 + hash2(seed + 2, i) ** 3 * 2.2;
    const tw = 0.55 + 0.45 * Math.sin(T * (1 + hash2(seed + 3, i) * 2) + i); g.fillStyle = rgba('#e8f0ff', alpha * tw * (0.4 + 0.6 * hash2(seed + 4, i))); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  g.restore();
}
function moonSprite(r) {
  return sprite('moon' + r, r * 2 + 4, r * 2 + 4, (g) => {
    const c = r + 2; const gr = g.createRadialGradient(c - r * 0.25, c - r * 0.3, r * 0.1, c, c, r); gr.addColorStop(0, '#fffcf0'); gr.addColorStop(0.7, '#f7ecd0'); gr.addColorStop(1, '#e6d6b0');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, r, 0, TAU); g.fill();
    g.save(); g.clip(); // soft maria (ink-wash blots)
    for (let i = 0; i < 9; i++) { const a = hash2(7, i) * TAU, d = hash2(8, i) * r * 0.7, rr = r * (0.12 + hash2(9, i) * 0.22); const x = c + Math.cos(a) * d, y = c + Math.sin(a) * d;
      const bg = g.createRadialGradient(x, y, 0, x, y, rr); bg.addColorStop(0, 'rgba(190,170,140,0.32)'); bg.addColorStop(1, 'rgba(190,170,140,0)'); g.fillStyle = bg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    g.restore();
  }, SC());
}
/** giant moon with halo + painted ring. o:{halo, ring, color} */
export function moon(g, x, y, r, o = {}) {
  const { halo = 1, ring = 0.5, tint = null, alpha = 1 } = o;
  g.save(); g.globalAlpha *= alpha;
  if (halo > 0) { g.save(); g.globalCompositeOperation = 'lighter';
    const hg = g.createRadialGradient(x, y, r * 0.9, x, y, r * 4.2); hg.addColorStop(0, rgba('#cfdcff', 0.42 * halo)); hg.addColorStop(0.25, rgba('#7f9ee0', 0.16 * halo)); hg.addColorStop(1, 'rgba(60,80,160,0)');
    g.fillStyle = hg; g.fillRect(x - r * 4.2, y - r * 4.2, r * 8.4, r * 8.4); g.restore(); }
  if (ring > 0) { g.save(); g.strokeStyle = rgba('#e8eeff', 0.18 * ring); g.lineWidth = 2; for (const k of [1.18, 1.32]) { g.beginPath(); g.arc(x, y, r * k, 0, TAU); g.stroke(); } g.restore(); }
  const s = moonSprite(Math.round(Math.min(r, 600))); const R = r + 2 * (r / Math.round(Math.min(r, 600)));
  g.drawImage(s, x - R, y - R, R * 2, R * 2);
  if (tint) { g.save(); g.globalCompositeOperation = 'source-atop'; g.restore(); }
  g.restore();
}
/** stylised xiangyun cloud bank (flat, outlined, curls). memoised */
export function cloudBank(g, x, y, w, o = {}) {
  const { seed = 1, fill = '#2a3f78', light = '#4a66a8', line = '#9fb4e8', alpha = 1, rows = 1 } = o;
  const h = w * 0.36; const S = sprite(`cb${seed}_${w}_${fill}_${light}_${line}`, w + 40, h + 40, (q) => {
    const n = 7 + Math.floor(hash2(seed, 1) * 4); const puffs = [];
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; const r = (0.12 + hash2(seed, i + 3) * 0.1) * w * (1 - Math.abs(u - 0.5) * 0.9); puffs.push([20 + u * w, 20 + h - r * 0.9 - hash2(seed, i + 9) * h * 0.25, r]); }
    q.save(); q.beginPath(); for (const [px, py, r] of puffs) { q.moveTo(px + r, py); q.arc(px, py, r, 0, TAU); } q.rect(20 + w * 0.06, 20 + h * 0.62, w * 0.88, h * 0.38);
    const gr = q.createLinearGradient(0, 20, 0, 20 + h); gr.addColorStop(0, light); gr.addColorStop(0.7, fill); gr.addColorStop(1, mixHex(fill, '#000', 0.2)); q.fillStyle = gr; q.fill();
    q.restore();
    q.strokeStyle = line; q.lineWidth = 2.2; q.lineCap = 'round';
    for (const [px, py, r] of puffs) { q.beginPath(); q.arc(px, py, r, Math.PI * 1.05, Math.PI * 1.95); q.stroke(); q.beginPath(); q.arc(px - r * 0.35, py - r * 0.1, r * 0.35, Math.PI * 1.1, Math.PI * 2.4); q.stroke(); }
    q.strokeStyle = rgba(line, 0.5); q.lineWidth = 1.4; q.beginPath(); q.moveTo(20 + w * 0.08, 20 + h * 0.9); q.lineTo(20 + w * 0.92, 20 + h * 0.9); q.stroke();
  }, SC());
  g.save(); g.globalAlpha *= alpha; g.drawImage(S, x - 20 - w / 2, y - 20 - h, w + 40, h + 40); g.restore();
}
/** ink-wash mountain range (memoised), base at y, peaks up to height h. o:{seed, color, mist} */
export function mountains(g, x, y, w, h, o = {}) {
  const { seed = 1, color = '#1c2c55', top = null, mist = '#4a6a9a', alpha = 1, peaks = 5 } = o;
  const S = sprite(`mt${seed}_${w}_${h}_${color}_${mist}_${peaks}`, w, h + 40, (q) => {
    const pts = [[0, h + 40]]; const N = 60;
    for (let i = 0; i <= N; i++) { const u = i / N; let v = 0; for (let k = 0; k < peaks; k++) { const c = hash2(seed, k) * 0.9 + 0.05, wd = 0.06 + hash2(seed, k + 20) * 0.12, ht = 0.4 + hash2(seed, k + 40) * 0.6; v = Math.max(v, ht * Math.exp(-(((u - c) / wd) ** 2) * 0.9) * (1 - 0.15 * Math.abs(Math.sin(u * 40 + k)))); }
      v = Math.max(v, 0.18 + 0.06 * noise1(u * 14, seed)); pts.push([u * w, h + 4 - v * h]); }
    pts.push([w, h + 40]);
    q.beginPath(); q.moveTo(pts[0][0], pts[0][1]); for (const p of pts) q.lineTo(p[0], p[1]); q.closePath();
    const gr = q.createLinearGradient(0, 0, 0, h + 40); gr.addColorStop(0, top || mixHex(color, '#ffffff', 0.08)); gr.addColorStop(0.55, color); gr.addColorStop(1, mist); q.fillStyle = gr; q.fill();
    // ink texture strokes (cun)
    q.save(); q.clip(); q.globalAlpha = 0.22; q.strokeStyle = mixHex(color, '#000', 0.5); q.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) { const sx = hash2(seed + 5, i) * w, sy = h * (0.2 + hash2(seed + 6, i) * 0.6); q.beginPath(); q.moveTo(sx, sy); q.quadraticCurveTo(sx + 10, sy + 30, sx - 6, sy + 60 + hash2(seed, i) * 40); q.stroke(); }
    q.restore();
    q.strokeStyle = rgba('#cfe0ff', 0.25); q.lineWidth = 1.6; q.beginPath(); for (let i = 1; i < pts.length - 1; i++) q.lineTo(pts[i][0], pts[i][1]); q.stroke();
  }, SC());
  g.save(); g.globalAlpha *= alpha; g.drawImage(S, x, y - h, w, h + 40); g.restore();
}
/** round earthen tulou, (x,y)=front base point, radius r. memoised per r */
export function tulou(g, x, y, r, o = {}) {
  const { seed = 1, lit = 1, night = true } = o; const rr = Math.round(r);
  const ry = 0.24, H = r * 0.58, ov = 1.12;
  const Wd = rr * 2 * ov + 40, Ht = H + r * ry * 2 * ov + r * 0.25 + 30;
  const S = sprite(`tl${rr}_${seed}_${night}`, Wd, Ht, (q) => {
    const cx = Wd / 2, by = Ht - r * ry - 6, top = by - H;
    const base = night ? '#6a4632' : '#c4884e';
    q.beginPath(); q.ellipse(cx, by, r, r * ry, 0, 0, Math.PI); q.lineTo(cx - r, top); q.lineTo(cx + r, top); q.closePath();
    const wg = q.createLinearGradient(cx - r, 0, cx + r, 0);
    wg.addColorStop(0, mixHex(base, '#070512', 0.6)); wg.addColorStop(0.3, mixHex(base, '#070512', 0.15)); wg.addColorStop(0.62, mixHex(base, '#ffe0b0', night ? 0.12 : 0.3)); wg.addColorStop(0.85, base); wg.addColorStop(1, mixHex(base, '#070512', 0.55)); q.fillStyle = wg; q.fill();
    q.save(); q.clip();
    // rammed-earth strata + weathering streaks
    q.strokeStyle = 'rgba(30,14,10,0.18)'; q.lineWidth = 1; for (let k = 1; k < 9; k++) { const yy = top + (H * k) / 9; q.beginPath(); q.ellipse(cx, yy, r, r * ry, 0, 0, Math.PI); q.stroke(); }
    for (let i = 0; i < 26; i++) { const xx = cx - r + hash2(seed + 9, i) * r * 2; q.fillStyle = `rgba(20,10,8,${0.06 + hash2(seed, i) * 0.1})`; q.fillRect(xx, top, 2 + hash2(seed + 2, i) * 6, H * (0.3 + hash2(seed + 3, i) * 0.7)); }
    // stone plinth
    q.fillStyle = night ? 'rgba(40,40,60,0.55)' : 'rgba(90,80,80,0.5)'; q.fillRect(cx - r, by - H * 0.14 + r * ry, r * 2, H); 
    q.beginPath(); q.ellipse(cx, by - H * 0.14, r, r * ry, 0, 0, Math.PI); q.lineTo(cx + r, by + r); q.lineTo(cx - r, by + r); q.closePath(); q.fill();
    // eave shadow band
    const eg = q.createLinearGradient(0, top, 0, top + H * 0.25); eg.addColorStop(0, 'rgba(5,3,12,0.75)'); eg.addColorStop(1, 'rgba(5,3,12,0)'); q.fillStyle = eg; q.fillRect(cx - r, top, r * 2, H * 0.25 + r * ry);
    q.restore();
    // windows (only upper rows, small + sparse like real tulou)
    for (let row = 0; row < 2; row++) { const wy = top + H * (0.3 + row * 0.2); const n = 11;
      for (let i = 0; i < n; i++) { const a = Math.PI * (0.08 + (i / (n - 1)) * 0.84); const wx = cx - Math.cos(a) * r * 0.985; const yy = wy + Math.sin(a) * r * ry; const sa = Math.sin(a); const ww = Math.max(1.5, 9 * sa * (r / 200)), wh = 13 * (r / 200);
        const on = night && hash2(seed + row, i) < 0.5 * lit; q.fillStyle = on ? '#ffc76c' : night ? '#160c10' : '#3a2418'; q.fillRect(wx - ww / 2, yy - wh / 2, ww, wh);
        if (on) { q.save(); q.globalCompositeOperation = 'lighter'; const gg = q.createRadialGradient(wx, yy, 0, wx, yy, wh * 2.4); gg.addColorStop(0, 'rgba(255,180,90,0.45)'); gg.addColorStop(1, 'rgba(255,180,90,0)'); q.fillStyle = gg; q.fillRect(wx - wh * 3, yy - wh * 3, wh * 6, wh * 6); q.restore(); } } }
    // gate
    q.fillStyle = '#140a0c'; q.beginPath(); q.roundRect(cx - r * 0.07, by + r * ry - H * 0.36, r * 0.14, H * 0.36, [r * 0.07, r * 0.07, 0, 0]); q.fill();
    q.strokeStyle = night ? 'rgba(220,180,120,0.5)' : '#e8c890'; q.lineWidth = 2; q.stroke();
    q.strokeStyle = INK; q.lineWidth = 2; q.beginPath(); q.ellipse(cx, by, r, r * ry, 0, 0, Math.PI); q.moveTo(cx - r, by); q.lineTo(cx - r, top); q.moveTo(cx + r, by); q.lineTo(cx + r, top); q.stroke();
    // roof ring: overhanging dark tiles, sloped
    const rt = top - r * 0.03; const R1 = r * ov, R0 = r * 0.66;
    q.beginPath(); q.ellipse(cx, rt + r * 0.04, R1, R1 * ry, 0, 0, TAU); q.fillStyle = '#0b0912'; q.fill();
    q.beginPath(); q.ellipse(cx, rt, R1, R1 * ry, 0, 0, TAU);
    const rg = q.createLinearGradient(0, rt - R1 * ry, 0, rt + R1 * ry); rg.addColorStop(0, night ? '#3a3a58' : '#5a5a68'); rg.addColorStop(0.5, night ? '#24243a' : '#3a3a48'); rg.addColorStop(1, night ? '#16162a' : '#2a2a38'); q.fillStyle = rg; q.fill(); q.strokeStyle = INK; q.stroke();
    q.save(); q.beginPath(); q.ellipse(cx, rt, R1, R1 * ry, 0, 0, TAU); q.clip(); q.strokeStyle = 'rgba(170,180,220,0.2)'; q.lineWidth = 1;
    for (let i = 0; i < 90; i++) { const a = (i / 90) * TAU; q.beginPath(); q.moveTo(cx + Math.cos(a) * R0, rt - r * 0.05 + Math.sin(a) * R0 * ry); q.lineTo(cx + Math.cos(a) * R1, rt + Math.sin(a) * R1 * ry); q.stroke(); } q.restore();
    // courtyard opening (inner ring, raised ridge)
    q.beginPath(); q.ellipse(cx, rt - r * 0.05, R0, R0 * ry, 0, 0, TAU); q.fillStyle = night ? '#1a0e10' : '#6a4a32'; q.fill(); q.strokeStyle = INK; q.stroke();
    q.beginPath(); q.ellipse(cx, rt - r * 0.05, R0 * 0.92, R0 * ry * 0.8, 0, Math.PI, TAU); q.lineTo(cx + R0 * 0.92, rt - r * 0.0); q.ellipse(cx, rt, R0 * 0.92, R0 * ry * 0.8, 0, 0, Math.PI, true); q.closePath(); q.fillStyle = night ? 'rgba(255,160,80,0.5)' : 'rgba(255,220,170,0.4)'; q.fill();
    q.strokeStyle = 'rgba(223,232,255,0.45)'; q.lineWidth = 2.4; q.beginPath(); q.ellipse(cx, rt, R1, R1 * ry, 0, Math.PI * 1.08, Math.PI * 1.92); q.stroke();
  }, SC());
  g.drawImage(S, x - Wd / 2, y - Ht + r * ry + 6 - r * ry, Wd, Ht);
}
/** red paper lantern hanging at (x,y) (top hook), size s. glow 0..1 */
export function lantern(g, x, y, s, T, o = {}) {
  const { glow = 1, swing = 0.06, seed = 0, color = '#d6342c' } = o; const a = Math.sin(T * 1.3 + seed) * swing;
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  if (glow > 0) { g.save(); g.globalCompositeOperation = 'lighter'; const gg = g.createRadialGradient(0, 60, 0, 0, 60, 150); gg.addColorStop(0, rgba('#ffb060', 0.55 * glow)); gg.addColorStop(0.4, rgba('#ff6a30', 0.18 * glow)); gg.addColorStop(1, 'rgba(255,90,40,0)'); g.fillStyle = gg; g.fillRect(-150, -90, 300, 300); g.restore(); }
  g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 16); g.stroke();
  g.fillStyle = '#2a1a14'; g.fillRect(-16, 14, 32, 8); g.fillRect(-16, 98, 32, 8);
  const bg = g.createRadialGradient(-8, 50, 4, 0, 60, 46); bg.addColorStop(0, mixHex('#ffd27a', color, 0.2)); bg.addColorStop(0.5, color); bg.addColorStop(1, mixHex(color, '#3a0510', 0.55));
  g.fillStyle = bg; g.beginPath(); g.ellipse(0, 60, 40, 40, 0, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(80,10,10,0.5)'; g.lineWidth = 1.2; for (const k of [-0.6, -0.25, 0.25, 0.6]) { g.beginPath(); g.ellipse(0, 60, 40 * Math.abs(k) + 1, 40, 0, k < 0 ? Math.PI / 2 : -Math.PI / 2, k < 0 ? Math.PI * 1.5 : Math.PI / 2); g.stroke(); }
  g.fillStyle = '#e9b44c'; g.fillRect(-3, 106, 6, 6); g.strokeStyle = '#c0282c'; g.lineWidth = 3; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 2, 110); g.lineTo(i * 3 + Math.sin(T * 2 + i + seed) * 2, 150); g.stroke(); }
  g.restore();
}
/** floating sky / river lantern (warm paper box) */
export function skyLantern(g, x, y, s, T, o = {}) {
  const { glow = 1, seed = 0, river = false } = o;
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(T * 0.8 + seed) * 0.05);
  g.save(); g.globalCompositeOperation = 'lighter'; const gg = g.createRadialGradient(0, 0, 0, 0, 0, 90); gg.addColorStop(0, rgba('#ffcf70', 0.6 * glow)); gg.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gg; g.fillRect(-90, -90, 180, 180); g.restore();
  if (river) { g.fillStyle = '#e9d6a8'; g.beginPath(); g.moveTo(-26, 10); g.lineTo(26, 10); g.lineTo(18, 22); g.lineTo(-18, 22); g.closePath(); g.fill(); }
  const bg = g.createLinearGradient(0, -30, 0, 26); bg.addColorStop(0, '#ffe7a8'); bg.addColorStop(1, '#ff9a40');
  g.fillStyle = bg; g.beginPath(); g.moveTo(-18, -30); g.lineTo(18, -30); g.lineTo(22, 14); g.lineTo(-22, 14); g.closePath(); g.fill(); g.strokeStyle = 'rgba(120,50,20,0.6)'; g.lineWidth = 1.2; g.stroke();
  g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 14); g.stroke();
  g.restore();
}
/** stateless drifting petals (crabapple-like, 5 lobes simplified to ovals) */
export function petals(g, T, { count = 40, seed = 11, area = [-100, -100, 2120, 1280], color = '#ffd6dc', color2 = '#ff8fa6', vx = 60, vy = 40, size = 9, alpha = 1 } = {}) {
  g.save();
  for (let i = 0; i < count; i++) { const r1 = hash2(seed, i), r2 = hash2(seed + 1, i), r3 = hash2(seed + 2, i);
    const x = area[0] + fract(r1 + (vx * T * (0.6 + r3 * 0.8)) / area[2]) * area[2] + Math.sin(T * 1.3 + i) * 20; const y = area[1] + fract(r2 + (vy * T * (0.6 + r3)) / area[3]) * area[3];
    const s = size * (0.6 + r3 * 0.8); const rot = T * (1 + r2 * 2) + i; const flip = Math.cos(T * (1.5 + r1 * 2) + i);
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, Math.abs(flip) * 0.8 + 0.2); g.globalAlpha = alpha * (0.6 + 0.4 * r3);
    g.fillStyle = flip > 0 ? color : color2; g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(s * 0.9, -s * 0.2, 0, s); g.quadraticCurveTo(-s * 0.9, -s * 0.2, 0, -s); g.fill(); g.restore(); }
  g.restore();
}
/** stylised sea: horizontal bands from horizon hy to bottom, swirl wave crests, moon glitter path at mx */
export function sea(g, hy, T, o = {}) {
  const { mx = 960, top = '#1d3f72', bottom = '#071230', crest = '#8fb4e8', glitter = 1, speed = 1, y1 = 1300 } = o;
  const gr = g.createLinearGradient(0, hy, 0, y1); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(-600, hy, 3120, y1 - hy + 600);
  g.save(); g.lineCap = 'round';
  for (let row = 0; row < 16; row++) { const d = row / 15; const y = hy + Math.pow(d, 1.8) * (y1 - hy); const sc = 0.25 + d * 1.6;
    const step = 140 * sc; const off = (T * 30 * speed * sc + row * 57) % step;
    g.strokeStyle = rgba(crest, 0.18 + 0.32 * d); g.lineWidth = 1 + 2.2 * d;
    for (let x = -step * 2 - off; x < 2100 + step; x += step) { const yy = y + Math.sin(x * 0.01 + T + row) * 3 * sc; g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + step * 0.25, yy - 10 * sc, x + step * 0.5, yy); g.arc(x + step * 0.5 - 6 * sc, yy - 2 * sc, 6 * sc, 0, Math.PI * 1.3, true); g.stroke(); } }
  // moon glitter path
  if (glitter > 0) { g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 120; i++) { const d = hash2(5, i); const y = hy + Math.pow(d, 1.5) * (y1 - hy); const wdt = 20 + d * 240; const x = mx + (hash2(6, i) - 0.5) * wdt + Math.sin(T * 1.5 + i) * 8;
      const a = glitter * (0.35 + 0.65 * Math.max(0, Math.sin(T * 3 + i * 1.7))) * (1 - d * 0.4); g.strokeStyle = rgba('#fff4d0', a); g.lineWidth = 1 + d * 3; g.beginPath(); g.moveTo(x - 6 - d * 30, y); g.lineTo(x + 6 + d * 30, y); g.stroke(); }
    const pg = g.createLinearGradient(0, hy, 0, y1); pg.addColorStop(0, 'rgba(255,240,200,0.35)'); pg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = pg; g.beginPath(); g.moveTo(mx - 20, hy); g.lineTo(mx + 20, hy); g.lineTo(mx + 300, y1); g.lineTo(mx - 300, y1); g.closePath(); g.globalAlpha = 0.35 * glitter; g.fill(); }
  g.restore();
}
/** golden koi (white/gold/orange patches; not a solid red fish) */
export function koi(g, x, y, s, ang, T, o = {}) {
  const { seed = 0, body = '#fff4e6', patch = '#f08a2a', alpha = 1 } = o; const wv = Math.sin(T * 6 + seed);
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s); g.globalAlpha *= alpha;
  const pts = [[44, 0], [30, -11], [0, -12], [-30, -6 + wv * 2], [-50, wv * 6], [-30, 6 + wv * 2], [0, 12], [30, 11]];
  g.beginPath(); sp(g, pts); g.fillStyle = body; g.fill(); g.save(); g.clip(); g.fillStyle = patch; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(26 - i * 22 + hash2(seed, i) * 6, (hash2(seed + 1, i) - 0.5) * 10, 11, 8, 0, 0, TAU); g.fill(); } g.restore();
  g.strokeStyle = 'rgba(40,20,20,0.7)'; g.lineWidth = 1.2; g.beginPath(); sp(g, pts); g.stroke();
  g.fillStyle = rgba('#ffe6c8', 0.85); g.beginPath(); g.moveTo(-48, wv * 6); g.quadraticCurveTo(-70, -16 + wv * 10, -78, -6 + wv * 12); g.quadraticCurveTo(-66, wv * 9, -78, 10 + wv * 12); g.quadraticCurveTo(-68, 14 + wv * 10, -48, wv * 6); g.fill();
  g.beginPath(); g.ellipse(4, -12, 14, 5, -0.5 + wv * 0.2, 0, TAU); g.ellipse(4, 12, 14, 5, 0.5 - wv * 0.2, 0, TAU); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(34, -4, 2, 0, TAU); g.fill();
  g.restore();
}
export function ripple(g, x, y, r, a, color = '#cfe0ff') { if (a <= 0) return; g.save(); g.strokeStyle = rgba(color, a); g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, r, r * 0.3, 0, 0, TAU); g.stroke(); g.restore(); }
/** round moon-gate window with lattice; draws frame only (content behind is caller's) */
export function moonWindow(g, cx, cy, r, o = {}) {
  const { wall = '#5a1a20', lattice = '#2a0e10', T = 0 } = o;
  g.save(); g.beginPath(); g.rect(-400, -400, 2720, 1880); g.arc(cx, cy, r, 0, TAU, true);
  const wg = g.createRadialGradient(cx, cy, r, cx, cy, r * 3.2); wg.addColorStop(0, mixHex(wall, '#ff9a60', 0.2)); wg.addColorStop(0.3, wall); wg.addColorStop(1, mixHex(wall, '#05030a', 0.7)); g.fillStyle = wg; g.fill('evenodd');
  g.strokeStyle = '#d9a441'; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, r + 6, 0, TAU); g.stroke(); g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r + 12, 0, TAU); g.stroke();
  // lattice (cracked-ice + cloud pattern) clipped to circle, sparse so moon reads
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip(); g.strokeStyle = lattice; g.lineWidth = 7; g.lineCap = 'square';
  const k = r / 300; const L = [[-300, -120, -120, -150], [-120, -150, -60, -300], [-120, -150, -200, 30], [-200, 30, -300, 60], [-200, 30, -120, 200], [-120, 200, -160, 300], [-120, 200, 60, 230], [60, 230, 120, 300], [60, 230, 200, 120], [200, 120, 300, 150], [200, 120, 170, -60], [170, -60, 300, -90], [170, -60, 80, -200], [80, -200, 100, -300], [80, -200, -60, -300]];
  for (const [a, b, c, d] of L) { g.beginPath(); g.moveTo(cx + a * k, cy + b * k); g.lineTo(cx + c * k, cy + d * k); g.stroke(); }
  g.restore();
}
/** paper grain overlay, memoised tile */
export function paperGrain(g, a = 0.08) {
  const S = sprite('paper', 512, 512, (q) => { const id = q.getImageData(0, 0, 512 * SC(), 512 * SC()); const d = id.data; const W = 512 * SC();
    for (let i = 0; i < d.length / 4; i++) { const x = i % W, y = Math.floor(i / W); const v = 128 + (hash2(x * 0.71, y * 0.37) - 0.5) * 60 + (hash2(Math.floor(x / 6), Math.floor(y / 40)) - 0.5) * 40; d[i * 4] = v; d[i * 4 + 1] = v * 0.97; d[i * 4 + 2] = v * 0.9; d[i * 4 + 3] = 255; }
    q.putImageData(id, 0, 0); }, SC());
  const Wsh = sprite('wash', 480, 270, (q) => { for (let i = 0; i < 60; i++) { const x = hash2(71, i) * 480, y = hash2(72, i) * 270, r = 20 + hash2(73, i) * 80; const v = hash2(74, i) > 0.5; const gg = q.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, v ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'); gg.addColorStop(1, 'rgba(128,128,128,0)'); q.fillStyle = gg; q.fillRect(x - r, y - r, r * 2, r * 2); } }, 1);
  g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = a * 2.2; g.drawImage(Wsh, 0, 0, 1920, 1080); g.restore();
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = a; const pat = g.createPattern(S, 'repeat'); pat.setTransform(new DOMMatrix().scale(1 / SC())); g.fillStyle = pat; g.fillRect(0, 0, 1920, 1080); g.restore();
}
/** soft mist band */
export function mist(g, y0, y1, color, a = 0.5, T = 0, drift = 20) {
  if (a <= 0) return; g.save(); const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(0.5, rgba(color, a)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.fillRect(-600, y0, 3120, y1 - y0);
  g.globalAlpha = a * 0.6; for (let i = 0; i < 6; i++) { const x = ((hash2(3, i) * 2400 + T * drift * (0.5 + hash2(4, i))) % 2800) - 400; const y = lerp(y0, y1, 0.3 + hash2(5, i) * 0.4); const w = 500 + hash2(6, i) * 500;
    const eg = g.createRadialGradient(x, y, 0, x, y, w / 2); eg.addColorStop(0, rgba(color, 0.5)); eg.addColorStop(1, rgba(color, 0)); g.save(); g.translate(x, y); g.scale(1, 0.18); g.translate(-x, -y); g.fillStyle = eg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore(); }
  g.restore();
}
/** ink-blot wipe mask path: progress 0..1 grows blots from centre(s) */
export function inkBlot(g, cx, cy, R, p, seed = 1) {
  const n = 28; g.beginPath(); for (let i = 0; i <= n; i++) { const a = (i / n) * TAU; const r = R * p * (0.75 + 0.35 * hash2(seed, i) + 0.1 * Math.sin(a * 5 + seed)); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath();
}
/** war banner on pole (silhouette-ish, red cloth) */
export function banner(g, x, y, h, T, o = {}) {
  const { color = '#b5202a', seed = 0, wind = 1, dark = '#120a12' } = o;
  g.save(); g.strokeStyle = dark; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h); g.stroke();
  const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([x + u * h * 0.32 * wind, y - h + 8 + Math.sin(T * 4 + u * 4 + seed) * 10 * u]); }
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); for (let i = 6; i >= 0; i--) g.lineTo(pts[i][0] + Math.sin(T * 3 + i) * 3, pts[i][1] + h * 0.42); g.closePath(); g.fillStyle = color; g.fill();
  g.restore();
}
export function soldier(g, x, y, s, T, o = {}) {
  const { color = '#120a14', seed = 0, spear = true } = o; const b = Math.sin(T * 6 + seed) * 2;
  g.save(); g.translate(x, y + b); g.scale(s, s); g.fillStyle = color;
  g.beginPath(); g.moveTo(-24, 0); g.lineTo(-18, -70); g.lineTo(-26, -110); g.lineTo(26, -110); g.lineTo(18, -70); g.lineTo(24, 0); g.closePath(); g.fill();
  g.beginPath(); g.arc(0, -126, 16, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-22, -130); g.lineTo(0, -156); g.lineTo(22, -130); g.closePath(); g.fill();
  if (spear) { g.strokeStyle = color; g.lineWidth = 4; g.beginPath(); g.moveTo(30, 10); g.lineTo(38, -230); g.stroke(); g.beginPath(); g.moveTo(34, -230); g.lineTo(40, -262); g.lineTo(44, -230); g.fill(); }
  g.restore();
}
