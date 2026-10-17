// Low-level 2D cel helpers: smooth paths, ink outline, cel fill with soft gradient + rim light.
import { clamp, rgba, mixHex, TAU } from '../../../core/util.js';
export const INK = '#1b1424';
export const LW = { k: 1 };
/** Catmull-Rom closed/open smooth path through pts [[x,y],...] */
export function sp(g, pts, closed = true, tension = 0.5) {
  const n = pts.length; if (n < 2) return; g.moveTo(pts[0][0], pts[0][1]);
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2); const k = tension / 3;
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (closed) g.closePath();
}
/** filled shape with cel shading. o: {fill, shade, light, line, lw, dir:[dx,dy] light direction (shadow opposite), rim, rimColor, alpha} */
export function cel(g, pathFn, o) {
  const { fill, shade = mixHex(fill, '#1d1840', 0.45), line = INK, lw = 2.4, rim = 0, rimColor = '#dfe8ff', box = [-100, -100, 100, 100], dir = [1, -0.4], hi = 0, hiColor = '#ffffff' } = o;
  g.save(); g.beginPath(); pathFn(g);
  const [x0, y0, x1, y1] = box; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
  const gr = g.createLinearGradient(cx - dir[0] * hw, cy - dir[1] * hh, cx + dir[0] * hw, cy + dir[1] * hh);
  gr.addColorStop(0, fill); gr.addColorStop(0.52, fill); gr.addColorStop(0.62, shade); gr.addColorStop(1, mixHex(shade, '#0c0a1a', 0.2));
  // NOTE gradient goes light->shadow along -dir; dir points toward light so we invert
  const gr2 = g.createLinearGradient(cx + dir[0] * hw, cy + dir[1] * hh, cx - dir[0] * hw, cy - dir[1] * hh);
  gr2.addColorStop(0, fill); gr2.addColorStop(0.5, fill); gr2.addColorStop(0.6, shade); gr2.addColorStop(1, mixHex(shade, '#0c0a1a', 0.25));
  g.fillStyle = gr2; g.fill();
  if (rim > 0 || hi > 0) {
    g.save(); g.clip();
    if (rim > 0) { g.globalCompositeOperation = 'screen'; g.strokeStyle = rgba(rimColor, clamp(rim)); g.lineWidth = 7 * LW.k; g.translate(-dir[0] * 4 * LW.k, -dir[1] * 4 * LW.k); g.beginPath(); pathFn(g); g.stroke(); }
    g.restore();
  }
  if (lw > 0) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = line; g.lineWidth = lw * LW.k; g.beginPath(); pathFn(g); g.stroke(); }
  g.restore();
}
export function line(g, pts, color = INK, lw = 2, closed = false) { g.save(); g.strokeStyle = color; g.lineWidth = lw * LW.k; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); sp(g, pts, closed); g.stroke(); g.restore(); }
/** xiangyun (auspicious cloud) curl motif at (x,y) size s, drawn as stroke */
export function cloudCurl(g, x, y, s, color, lw = 1.4, flip = 1) {
  g.save(); g.translate(x, y); g.scale(s * flip, s); g.strokeStyle = color; g.lineWidth = lw / s; g.lineCap = 'round';
  g.beginPath(); g.arc(0, 0, 6, Math.PI * 0.2, Math.PI * 1.9); g.arc(-2, -1, 3, Math.PI * 1.9, Math.PI * 0.9, true); g.stroke();
  g.beginPath(); g.moveTo(6, 2); g.quadraticCurveTo(14, -8, 22, 0); g.arc(17, 1, 5, 0, Math.PI * 1.1, true); g.stroke();
  g.beginPath(); g.moveTo(-6, 3); g.quadraticCurveTo(-14, 10, -22, 4); g.stroke();
  g.restore();
}
export const circle = (g, x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); };
