// Shared sets + helpers for all blocks. Every function is pure in (T, camera, options).
import { applyCam, camKeys, withDrift } from '../../core/camera.js';
import { clamp, seg, lerp, hash2, rgba, mixHex, TAU, smooth, noise1 } from '../../core/util.js';
import { inOutSine, outCubic, inOutCubic } from '../../core/ease.js';
import { PAL, SKY, sky, stars, moon, cloudBank, mountains, tulou, lantern, skyLantern, petals, sea, koi, ripple, moonWindow, mist, inkBlot, banner, soldier, sprite } from './art/paint.js';
import { drawChar, drawSword, ribbon } from './art/chars.js';
import { INK, sp } from './art/draw.js';
export { applyCam, camKeys, withDrift, clamp, seg, lerp, hash2, rgba, mixHex, TAU, smooth, noise1, inOutSine, outCubic, inOutCubic };
export { PAL, SKY, sky, stars, moon, cloudBank, mountains, tulou, lantern, skyLantern, petals, sea, koi, ripple, moonWindow, mist, inkBlot, banner, soldier, drawChar, drawSword, ribbon, INK, sp };

export const GRADE = {
  night: { sat: 1.14, contrast: 1.1, bloom: 0.34, bloomThreshold: 0.72, bloomRadius: 30, vignette: 0.42, vignetteColor: '#03040e', grain: 0.016, gain: '#9fc0ff', gainAlpha: 0.06 },
  warm: { sat: 1.16, contrast: 1.1, bloom: 0.34, bloomThreshold: 0.7, vignette: 0.42, vignetteColor: '#12040a', grain: 0.016, gain: '#ffcf90', gainAlpha: 0.08 },
  blood: { sat: 1.2, contrast: 1.14, bloom: 0.3, bloomThreshold: 0.72, vignette: 0.5, vignetteColor: '#120206', grain: 0.02, gain: '#ff8a5a', gainAlpha: 0.08 },
};
export const grade = (ctx, k, extra) => Object.assign(ctx.fx, GRADE[k], extra || {});
/** layer with camera parallax */
export function plane(g, c, depth, fn) { g.save(); applyCam(g, c, depth); fn(g); g.restore(); }

/** rocky outcrop / cliff silhouette with rim light (memoised) */
export function rock(g, x, y, w, h, o = {}) {
  const { seed = 1, fill = '#141a33', rim = '#9fb8ff', rimA = 0.5, flip = 1 } = o;
  const S = sprite(`rk${seed}_${w}_${h}_${fill}_${rimA}`, w + 20, h + 20, (q) => {
    const pts = [[10, h + 10]]; const N = 14; for (let i = 0; i <= N; i++) { const u = i / N; const top = 10 + h * (1 - Math.sin(Math.PI * Math.pow(u, 0.8)) * (0.75 + 0.25 * hash2(seed, i))); pts.push([10 + u * w, top + (i % 2) * h * 0.05]); } pts.push([w + 10, h + 10]);
    q.beginPath(); q.moveTo(pts[0][0], pts[0][1]); for (const p of pts) q.lineTo(p[0], p[1]); q.closePath();
    const gr = q.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, mixHex(fill, '#4a5a90', 0.25)); gr.addColorStop(1, mixHex(fill, '#000', 0.4)); q.fillStyle = gr; q.fill(); q.strokeStyle = INK; q.lineWidth = 2; q.stroke();
    q.save(); q.clip(); q.strokeStyle = rgba('#000', 0.25); q.lineWidth = 2; for (let i = 0; i < 12; i++) { const sx = 10 + hash2(seed + 3, i) * w; q.beginPath(); q.moveTo(sx, 10 + h * 0.2 + hash2(seed, i) * h * 0.3); q.lineTo(sx + 20 - hash2(seed + 1, i) * 40, h); q.stroke(); } q.restore();
    q.strokeStyle = rgba(rim, rimA); q.lineWidth = 3; q.beginPath(); for (let i = 1; i < pts.length - 1; i++) q.lineTo(pts[i][0], pts[i][1] + 1); q.stroke();
  }, globalThis.__dpr || 2);
  g.save(); g.translate(x, y); g.scale(flip, 1); g.drawImage(S, -10 - w / 2, -h - 10, w + 20, h + 20); g.restore();
}
/** stylised pine (ink) */
export function pine(g, x, y, s, T, o = {}) {
  const { color = '#0e1424', seed = 1 } = o; g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = color; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(10, -60, -20, -120, 20, -200); g.stroke();
  g.fillStyle = color; for (const [px, py, w] of [[20, -200, 90], [-30, -150, 80], [50, -130, 70], [-10, -240, 60]]) { const sw = Math.sin(T * 1.2 + px) * 3; g.beginPath(); g.ellipse(px + sw, py, w, w * 0.22, -0.1, 0, TAU); g.fill(); }
  g.restore();
}
/** night-sea master set. o: {moon:[x,y,r], horizon, clouds, shoreTulou, mt} camera c */
export function setNightSea(g, T, c, o = {}) {
  const { moonP = [960, 330, 170], horizon = 700, clouds = true, stops = SKY.night, tulous = false, glitter = 1, mtA = 1, starsA = 0.9 } = o;
  plane(g, c, 0.05, (q) => { sky(q, stops, -300, horizon + 20); stars(q, T, { alpha: starsA }); });
  plane(g, c, 0.1, (q) => moon(q, moonP[0], moonP[1], moonP[2], { halo: o.halo ?? 1 }));
  if (clouds) plane(g, c, 0.2, (q) => { cloudBank(q, 300 + T * 6, horizon - 250, 620, { seed: 2, fill: '#1c2c5e', light: '#33508e', line: '#8aa6e0' }); cloudBank(q, 1650 - T * 5, horizon - 300, 720, { seed: 5, fill: '#1a2858', light: '#2f4a88', line: '#8aa6e0' }); cloudBank(q, 1000 + T * 3, horizon - 120, 520, { seed: 9, fill: '#22356a', light: '#3d5c9c', line: '#9ab4ea', alpha: 0.9 }); });
  if (mtA > 0) plane(g, c, 0.3, (q) => { mountains(q, -400, horizon + 4, 1300, 200, { seed: 3, color: '#14224a', mist: '#2a4a7a', alpha: mtA }); mountains(q, 1400, horizon + 4, 1000, 160, { seed: 7, color: '#14224a', mist: '#2a4a7a', alpha: mtA }); });
  plane(g, c, 0.55, (q) => sea(q, horizon, T, { mx: moonP[0], glitter, y1: horizon + 900 }));
  if (tulous) plane(g, c, 0.7, (q) => { tulou(q, 260, horizon + 120, 170, { seed: 2 }); tulou(q, 560, horizon + 90, 120, { seed: 4 }); });
}
/** tulou village terrace set: girl's home. o:{moonP, lanterns} */
export function setVillage(g, T, c, o = {}) {
  const { moonP = [1300, 260, 160], horizon = 640, stops = SKY.night, near = true } = o;
  plane(g, c, 0.05, (q) => { sky(q, stops, -300, horizon + 60); stars(q, T, { alpha: 0.7 }); });
  plane(g, c, 0.1, (q) => moon(q, moonP[0], moonP[1], moonP[2]));
  plane(g, c, 0.2, (q) => { cloudBank(q, 500 + T * 4, 420, 640, { seed: 12, fill: '#1c2c5e', light: '#33508e', line: '#8aa6e0' }); });
  plane(g, c, 0.3, (q) => { mountains(q, -300, horizon, 1400, 260, { seed: 21, color: '#16264f', mist: '#2c4c7c' }); mountains(q, 900, horizon + 10, 1400, 200, { seed: 22, color: '#13214a', mist: '#2c4c7c' }); });
  plane(g, c, 0.45, (q) => { mist(q, horizon - 80, horizon + 100, '#5a7ab0', 0.35, T); tulou(q, 300, horizon + 90, 110, { seed: 5 }); tulou(q, 1650, horizon + 120, 150, { seed: 6 }); tulou(q, 980, horizon + 70, 80, { seed: 8 }); });
  plane(g, c, 0.62, (q) => { mist(q, horizon + 60, horizon + 260, '#4a6aa0', 0.3, T, 12); if (near) tulou(q, 1300, horizon + 330, 260, { seed: 9 }); });
}
/** terrace walkway of a tulou (foreground floor, railing, posts, hanging lanterns) */
export function terrace(g, T, o = {}) {
  const { y = 900, lanterns = [[200, 120], [1700, 120]], lit = 1, eaves = true } = o;
  g.save(); const fg = g.createLinearGradient(0, y, 0, 1180); fg.addColorStop(0, '#5a3426'); fg.addColorStop(1, '#1e0e0e'); g.fillStyle = fg; g.fillRect(-600, y, 3120, 600);
  g.strokeStyle = 'rgba(20,8,8,0.6)'; g.lineWidth = 2; for (let i = -10; i < 40; i++) { g.beginPath(); g.moveTo(i * 80, y); g.lineTo(i * 80 + (i * 80 - 960) * 0.4, 1180); g.stroke(); }
  // railing
  g.fillStyle = '#3a1810'; g.fillRect(-600, y - 130, 3120, 14); g.fillRect(-600, y - 40, 3120, 10);
  for (let i = -8; i < 30; i++) { const px = i * 90; g.fillStyle = '#4a2216'; g.fillRect(px, y - 130, 8, 100); }
  g.strokeStyle = rgba('#ffcf90', 0.25); g.lineWidth = 2; g.beginPath(); g.moveTo(-600, y - 130); g.lineTo(2520, y - 130); g.stroke();
  // posts + eaves top
  if (eaves) {
  for (const px of [-60, 1980]) { g.fillStyle = '#2a0e0a'; g.fillRect(px - 30, -200, 60, y + 200); }
  g.fillStyle = '#140a10'; g.beginPath(); g.moveTo(-600, -200); g.lineTo(2520, -200); g.lineTo(2520, 40); g.quadraticCurveTo(960, 90, -600, 40); g.closePath(); g.fill();
  g.strokeStyle = rgba('#9fb8ff', 0.3); g.lineWidth = 2; g.beginPath(); g.moveTo(-600, 40); g.quadraticCurveTo(960, 90, 2520, 40); g.stroke();
  for (let i = -6; i < 30; i++) { g.fillStyle = '#0a0508'; g.beginPath(); g.ellipse(i * 70, 52, 26, 12, 0, 0, Math.PI); g.fill(); } }
  g.restore();
  lanterns.forEach(([lx, ly], i) => lantern(g, lx, ly, 1.1, T, { seed: i, glow: lit }));
}
/** blood-red battlefield set */
export function setBattle(g, T, c, o = {}) {
  const { horizon = 760, moonP = [1400, 300, 150], ranks = 3, dust = 1 } = o;
  plane(g, c, 0.05, (q) => sky(q, SKY.blood, -300, horizon + 40));
  plane(g, c, 0.1, (q) => { moon(q, moonP[0], moonP[1], moonP[2], { halo: 0.6 }); q.save(); q.globalCompositeOperation = 'multiply'; q.fillStyle = 'rgba(255,110,90,0.55)'; q.beginPath(); q.arc(moonP[0], moonP[1], moonP[2] + 2, 0, TAU); q.fill(); q.restore(); });
  plane(g, c, 0.2, (q) => { cloudBank(q, 400 - T * 8, horizon - 260, 700, { seed: 31, fill: '#5a1022', light: '#8a2a2a', line: '#ff9a6a' }); cloudBank(q, 1500 + T * 6, horizon - 360, 600, { seed: 33, fill: '#4a0c1c', light: '#7a2028', line: '#ff8a5a' }); });
  plane(g, c, 0.3, (q) => mountains(q, -400, horizon, 2800, 220, { seed: 34, color: '#3a0c18', mist: '#8a2a20', top: '#5a1420' }));
  plane(g, c, 0.42, (q) => { const gg = q.createLinearGradient(0, horizon, 0, horizon + 700); gg.addColorStop(0, '#5a1a18'); gg.addColorStop(0.3, '#2a0a10'); gg.addColorStop(1, '#0c0208'); q.fillStyle = gg; q.fillRect(-1200, horizon - 4, 4400, 1400); });
  for (let r = 0; r < ranks; r++) { const d = 0.45 + r * 0.18; plane(g, c, d, (q) => { const y = horizon + 30 + r * 80, s = 0.35 + r * 0.25; const n = 26 - r * 6;
    for (let i = 0; i < n; i++) { const x = -400 + (i + 0.5 * (r % 2)) * (2800 / n) + hash2(r, i) * 40; soldier(q, x, y, s, T, { seed: i + r * 10, color: mixHex('#120408', '#5a1418', 0.5 - r * 0.25) }); if (i % 4 === 1) banner(q, x + 30 * s, y, 420 * s, T, { seed: i, color: r === 0 ? '#7a1620' : '#a81a22' }); } }); }
  if (dust > 0) plane(g, c, 0.8, (q) => { mist(q, horizon - 40, horizon + 300, '#d2603a', 0.35 * dust, T, 60); q.save(); q.globalCompositeOperation = 'lighter'; for (let i = 0; i < 70; i++) { const x = ((hash2(40, i) * 2400 + T * (120 + hash2(41, i) * 160)) % 2600) - 300, y = horizon - 300 + hash2(42, i) * 700; q.fillStyle = rgba('#ff9a5a', 0.25 * dust * hash2(43, i)); q.beginPath(); q.arc(x, y, 1 + hash2(44, i) * 3, 0, TAU); q.fill(); } q.restore(); });
}
/** speed lines / wind streaks */
export function windStreaks(g, T, o = {}) {
  const { count = 30, alpha = 0.35, dir = -1, color = '#cfe0ff', speed = 1400, seed = 51, area = [-200, 0, 2320, 1080] } = o; g.save(); g.lineCap = 'round';
  for (let i = 0; i < count; i++) { const len = 80 + hash2(seed, i) * 240; const x = (((hash2(seed + 1, i) * area[2] + T * speed * (0.6 + hash2(seed + 2, i)) * -dir) % (area[2] + len)) + area[2] + len) % (area[2] + len) + area[0] - len;
    const y = area[1] + hash2(seed + 3, i) * area[3]; g.strokeStyle = rgba(color, alpha * hash2(seed + 4, i)); g.lineWidth = 1 + hash2(seed + 5, i) * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + len * -dir * -1, y); g.stroke(); }
  g.restore();
}
/** crescent sword-light arc */
export function slashArc(g, x, y, r, a0, a1, p, o = {}) {
  const { color = '#cfe6ff', width = 40, alpha = 1 } = o; if (p <= 0 || alpha <= 0) return; const fade = clamp(1.6 - p * 1.4); const head = lerp(a0, a1, clamp(p * 1.4)), tail = lerp(a0, a1, clamp(p * 1.4 - 0.5));
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * fade; const N = 24;
  for (let i = 0; i < N; i++) { const u0 = i / N, u1 = (i + 1) / N; const a = lerp(tail, head, u0), b = lerp(tail, head, u1); const w = width * Math.sin(Math.PI * u0) + 1;
    g.strokeStyle = rgba(color, 0.25 + 0.75 * u0); g.lineWidth = w; g.beginPath(); g.arc(x, y, r, a, b, a1 < a0); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, tail, head, a1 < a0); g.stroke();
  g.restore();
}
/** whole-frame ink-blot transition overlay: covers with ink (p 0->1) */
export function inkCover(g, p, color = '#05060f', seed = 3) {
  if (p <= 0) return; g.save(); g.fillStyle = color; if (p >= 1) { g.fillRect(0, 0, 1920, 1080); g.restore(); return; }
  for (let i = 0; i < 6; i++) { inkBlot(g, 200 + hash2(seed, i) * 1500, 150 + hash2(seed + 1, i) * 800, 1100, clamp(p * 1.3 - i * 0.05), seed + i); g.fill(); }
  g.restore();
}
/** reveal: draws fn only inside growing ink blots */
export function inkReveal(ctx, g, p, fn, seed = 5) { if (p >= 1) { fn(g); return; } if (p <= 0) return; ctx.mask(g, (m) => { for (let i = 0; i < 5; i++) { inkBlot(m, 300 + hash2(seed, i) * 1300, 200 + hash2(seed + 1, i) * 700, 1300, clamp(p * 1.25 - i * 0.05), seed + i); m.fill(); } }, fn, { feather: 6 }); }

/** Chinese hip roof with upturned eaves, centred at x, eave line at y, half-width w */
export function roof(g, x, y, w, h, o = {}) {
  const { tile = '#1a1a2a', rim = '#9fb8ff', rimA = 0.5 } = o;
  g.save(); g.beginPath(); g.moveTo(x - w - 40, y - 30); g.quadraticCurveTo(x - w * 0.7, y + 6, x - w * 0.5, y); g.lineTo(x + w * 0.5, y); g.quadraticCurveTo(x + w * 0.7, y + 6, x + w + 40, y - 30);
  g.quadraticCurveTo(x + w * 0.6, y - h * 0.5, x + w * 0.45, y - h); g.lineTo(x - w * 0.45, y - h); g.quadraticCurveTo(x - w * 0.6, y - h * 0.5, x - w - 40, y - 30); g.closePath();
  const gr = g.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, mixHex(tile, '#5a6a9a', 0.3)); gr.addColorStop(1, tile); g.fillStyle = gr; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
  g.save(); g.clip(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; for (let i = -20; i <= 20; i++) { g.beginPath(); g.moveTo(x + i * w * 0.045, y - h); g.lineTo(x + i * w * 0.07, y + 10); g.stroke(); } g.restore();
  g.strokeStyle = rgba(rim, rimA); g.lineWidth = 3; g.beginPath(); g.moveTo(x - w * 0.45, y - h); g.lineTo(x + w * 0.45, y - h); g.stroke();
  g.fillStyle = '#0a0a14'; g.fillRect(x - w * 0.47, y - h - 10, w * 0.94, 12);
  g.restore();
}
/** the mountain pass gate (情关): cliffs + wall + arch + tower. (x,y) = ground centre. open 0..1 */
export function passGate(g, x, y, s, T, o = {}) {
  const { open = 0, glow = 0 } = o; g.save(); g.translate(x, y); g.scale(s, s);
  // wall
  const wg = g.createLinearGradient(0, -420, 0, 0); wg.addColorStop(0, '#3a3a5a'); wg.addColorStop(1, '#1a1a30'); g.fillStyle = wg; g.fillRect(-900, -420, 1800, 420);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; for (let r = 1; r < 9; r++) { g.beginPath(); g.moveTo(-900, -r * 46); g.lineTo(900, -r * 46); g.stroke(); for (let k = -12; k < 12; k++) { const bx = k * 80 + (r % 2) * 40; g.beginPath(); g.moveTo(bx, -r * 46); g.lineTo(bx, -r * 46 + 46); g.stroke(); } }
  for (let k = -18; k < 18; k++) { g.fillStyle = '#2a2a44'; g.fillRect(k * 50, -450, 30, 32); }
  // arch opening with light behind
  g.save(); g.beginPath(); g.moveTo(-120, 0); g.lineTo(-120, -200); g.arc(0, -200, 120, Math.PI, 0); g.lineTo(120, 0); g.closePath(); g.clip();
  const lg = g.createRadialGradient(0, -120, 10, 0, -120, 300); lg.addColorStop(0, rgba('#fff2c8', 0.3 + glow * 0.7)); lg.addColorStop(1, '#2a3a6a'); g.fillStyle = lg; g.fillRect(-130, -330, 260, 340);
  // doors swing open
  for (const sd of [-1, 1]) { const w = 120 * (1 - open * 0.85); g.fillStyle = '#5a1418'; g.fillRect(sd < 0 ? -120 : 120 - w, -330, w, 330); g.fillStyle = '#e9b44c'; for (let r = 0; r < 6; r++) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc((sd < 0 ? -120 : 120 - w) + (k + 0.5) * w / 3, -300 + r * 50, 4, 0, TAU); g.fill(); } }
  g.restore();
  g.strokeStyle = '#0a0a14'; g.lineWidth = 6; g.beginPath(); g.moveTo(-120, 0); g.lineTo(-120, -200); g.arc(0, -200, 120, Math.PI, 0); g.lineTo(120, 0); g.stroke();
  // tower
  g.fillStyle = '#6a1a1e'; g.fillRect(-300, -640, 600, 190); for (let k = -2; k <= 2; k++) { g.fillStyle = '#2a0a0c'; g.fillRect(k * 120 - 40, -610, 80, 120); g.fillStyle = rgba('#ffc070', 0.6); g.fillRect(k * 120 - 32, -600, 64, 104); }
  g.fillStyle = '#5a1418'; for (let k = -3; k <= 3; k++) g.fillRect(k * 100 - 10, -640, 20, 190);
  roof(g, 0, -640, 360, 150, {});
  // plaque
  g.fillStyle = '#1a0e14'; g.strokeStyle = '#e9b44c'; g.lineWidth = 6; g.beginPath(); g.roundRect(-90, -400, 180, 110, 8); g.fill(); g.stroke();
  g.fillStyle = '#ffd98a'; g.font = '400 70px "MaShanZheng", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('情关', 0, -344);
  g.restore();
}
/** tall cliff wall (left/right of the pass) */
export function cliffWall(g, x, y, w, h, flip = 1, seed = 1) {
  g.save(); g.translate(x, y); g.scale(flip, 1); g.beginPath(); g.moveTo(0, 0); for (let i = 0; i <= 12; i++) { const u = i / 12; g.lineTo(w * (0.2 + 0.8 * u) + Math.sin(u * 12 + seed) * 40, -h * (1 - u * 0.15) + (hash2(seed, i) - 0.5) * 80); } g.lineTo(w + 600, -h); g.lineTo(w + 600, 200); g.lineTo(0, 200); g.closePath();
  const gr = g.createLinearGradient(0, -h, w, 0); gr.addColorStop(0, '#1e2a52'); gr.addColorStop(1, '#070a18'); g.fillStyle = gr; g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
  g.save(); g.clip(); g.strokeStyle = 'rgba(160,180,255,0.18)'; g.lineWidth = 3; for (let i = 0; i < 16; i++) { const sx = hash2(seed + 2, i) * w * 1.2, sy = -h * hash2(seed + 3, i); g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + 30, sy + 80, sx + 10, sy + 200); g.stroke(); } g.restore();
  g.restore();
}
