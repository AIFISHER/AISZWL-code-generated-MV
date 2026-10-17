// Lyric subtitles: brush-kai (Ma Shan Zheng), moon-silver unsung, ink-and-gold karaoke fill per syllable with soft glow,
// ink-bleed entrance (blur->sharp, ink wash stroke unrolls) and dissolve exit. Horizontal, lower third; scenes can move it via SUB_POS.
import { LINES } from '../../../cues.js';
import { clamp, seg, lerp, hash2, rgba } from '../../../core/util.js';
import { outCubic } from '../../../core/ease.js';
import { font } from '../../../core/fonts.js';
const FS = 66;
const WIN = LINES.map((l, i) => { const nx = LINES[i + 1]; const end = nx && nx.t - l.end < 1.1 ? nx.t - 0.15 : l.end + 0.7; const chars = [], ct = [];
  for (const [t0, d, txt] of l.syl) { const cs = [...txt]; cs.forEach((c, j) => { chars.push(c); ct.push([t0 + (d * j) / cs.length, d / cs.length]); }); }
  while (chars.length && chars[chars.length - 1] === ' ') { chars.pop(); ct.pop(); }
  return { ...l, a: l.t - 0.45, b: end, chars, ct }; });
export const SUB_POS = [];
const posAt = (T) => { for (const [a, b, p] of SUB_POS) if (T >= a && T < b) return p; return {}; };
let mctx = null; const measure = (s) => { if (!mctx) mctx = document.createElement('canvas').getContext('2d'); mctx.font = font(FS); return mctx.measureText(s).width; };
const charW = (c) => (c === ' ' ? FS * 0.55 : measure(c) + 6);
let stroke = null;
function brushStroke() {
  if (stroke) return stroke; const s = Math.max(1, globalThis.__dpr || 1); const w = 1200, h = 150; const c = document.createElement('canvas'); c.width = w * s; c.height = h * s; const g = c.getContext('2d'); g.scale(s, s);
  // dry-brush ink wash: many translucent strokes with ragged ends
  for (let i = 0; i < 70; i++) { const y = 40 + hash2(1, i) * 70, x0 = 30 + hash2(2, i) * 80, x1 = w - 30 - hash2(3, i) * 120; const lw = 4 + hash2(4, i) * 16;
    g.strokeStyle = `rgba(6,8,22,${0.05 + hash2(5, i) * 0.07})`; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(w * 0.3, y - 8 + hash2(6, i) * 16, w * 0.7, y - 8 + hash2(7, i) * 16, x1, y + (hash2(8, i) - 0.5) * 12); g.stroke(); }
  stroke = c; c.cw = w; c.ch = h; return c;
}
export function drawSubs(g, T) {
  const cur = WIN.filter((w) => T >= w.a && T < w.b + 0.35); if (!cur.length) return;
  for (const w of cur) {
    const tin = seg(T, w.a, w.a + 0.45), tout = seg(T, w.b, w.b + 0.35);
    const p = posAt(w.t + 0.01); const cy = p.y ?? 978, cx = p.x ?? 960;
    const widths = w.chars.map(charW); const tw = widths.reduce((s, v) => s + v, 0);
    // ink wash band unrolls left->right
    const bs = brushStroke(); const bw = tw + 260; const un = outCubic(tin);
    g.save(); g.globalAlpha = (1 - tout) * 0.85; g.beginPath(); g.rect(cx - bw / 2 - 10, cy - 90, (bw + 20) * un, 180); g.clip(); g.drawImage(bs, cx - bw / 2, cy - 72, bw, 140); g.restore();
    g.save(); g.font = font(FS); g.textBaseline = 'middle'; g.textAlign = 'left';
    let x = cx - tw / 2;
    for (let i = 0; i < w.chars.length; i++) {
      const c = w.chars[i], cw = widths[i]; if (c === ' ') { x += cw; continue; }
      const sy = w.ct[i]; const st = sy[0], du = Math.max(0.12, Math.min(sy[1], 0.6)); const k = clamp((T - st) / du);
      const ap = clamp((T - (w.a + 0.05 + i * 0.03)) / 0.4); const ex = clamp((T - (w.b + i * 0.015)) / 0.3); if (ap <= 0) { x += cw; continue; }
      const blur = (1 - ap) * 9 + ex * 8; const al = ap * (1 - ex);
      g.save(); g.translate(x, cy + (1 - outCubic(ap)) * 6 - ex * 6); if (blur > 0.4) g.filter = `blur(${blur.toFixed(1)}px)`;
      g.globalAlpha = al; g.lineJoin = 'round';
      g.lineWidth = 7; g.strokeStyle = 'rgba(8,8,24,0.75)'; g.strokeText(c, 0, 0);
      g.fillStyle = 'rgba(214,226,244,0.78)'; g.fillText(c, 0, 0);
      if (k > 0) {
        g.save(); g.beginPath(); g.rect(-6, -FS, (cw + 12) * k, FS * 2); g.clip();
        g.shadowColor = 'rgba(255,196,90,0.85)'; g.shadowBlur = 18;
        const fg = g.createLinearGradient(0, -FS * 0.45, 0, FS * 0.45); fg.addColorStop(0, '#fff6d4'); fg.addColorStop(0.45, '#ffd56e'); fg.addColorStop(1, '#e09a2e'); g.fillStyle = fg; g.fillText(c, 0, 0);
        g.shadowBlur = 0; g.restore();
        const fl = Math.max(0, 1 - (T - st - du) / 0.5) * (T > st ? 1 : 0); if (fl > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = al * fl * 0.5; g.fillStyle = '#ffe6a0'; g.fillText(c, 0, 0); }
      }
      g.restore(); x += cw;
    }
    g.restore();
  }
}
export const SUB_WINDOWS = WIN;
