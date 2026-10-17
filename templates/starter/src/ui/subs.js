// Xianxia lyric subtitles: ZCOOL XiaoWei (song-style) lettering in the lower third over a feathered ink-wash band.
// Unsung glyphs: pale jade-white. Word-by-word karaoke on KRC syllables: each glyph fills with a gold->jade gradient,
// a soft glow and a tiny lift. Entrance: glyphs condense out of blur + qi motes; exit: glyphs drift up and dissolve like ink.
import { LINES } from '../cues.js';
import { font } from '../core/fonts.js';
import { rgba, clamp, lerp, TAU, seg, hash2 } from '../core/util.js';
import { outCubic } from '../core/ease.js';

const FS = 58, GAP = 10;
const WIN = LINES.map((l, i) => { const nx = LINES[i + 1]; const end = nx && nx.t - l.end < 1.2 ? nx.t - 0.12 : l.end + 0.7; const chars = [], ct = [];
  for (const [t0, d, txt] of l.syl) { const cs = [...txt]; cs.forEach((c, j) => { chars.push(c); ct.push([t0 + (d * j) / cs.length, d / cs.length]); }); }
  while (chars.length && chars[chars.length - 1] === ' ') { chars.pop(); ct.pop(); }
  return { ...l, a: l.t - 0.4, b: end, chars, ct }; });
/** position overrides [t0, t1, {x, y}] so subtitles never cover faces / key action */
export const SUB_POS = [];
const posAt = (T) => { for (const [a, b, p] of SUB_POS) if (T >= a && T < b) return p; return {}; };
let mctx = null; const measure = (s) => { if (!mctx) mctx = document.createElement('canvas').getContext('2d'); mctx.font = font(FS); return mctx.measureText(s).width; };
const charW = (c) => (c === ' ' ? FS * 0.55 : measure(c) + GAP);
export function drawSubs(g, T) {
  const cur = WIN.filter((w) => T >= w.a && T < w.b + 0.45); if (!cur.length) return;
  for (const w of cur) {
    const tin = seg(T, w.a, w.a + 0.45), tout = seg(T, w.b, w.b + 0.45);
    const p = posAt(w.t + 0.01); const cy = p.y ?? 978, cx = p.x ?? 960;
    const widths = w.chars.map(charW); const tw = widths.reduce((s, v) => s + v, 0);
    // ink band
    const bandA = Math.min(outCubic(tin), 1 - tout) * 0.62; if (bandA > 0) { g.save(); g.globalAlpha = bandA; const bw = tw * 0.5 + 220; const gr = g.createRadialGradient(cx, cy, 10, cx, cy, bw); gr.addColorStop(0, 'rgba(4,10,14,0.75)'); gr.addColorStop(0.6, 'rgba(4,10,14,0.4)'); gr.addColorStop(1, 'rgba(4,10,14,0)'); g.translate(cx, cy); g.scale(1, 0.16); g.translate(-cx, -cy); g.fillStyle = gr; g.fillRect(cx - bw, cy - bw, bw * 2, bw * 2); g.restore();
      // gold hairlines
      g.save(); g.globalAlpha = bandA * 0.9; const lw = (tw / 2 + 60) * outCubic(tin); for (const yy of [cy - 46, cy + 44]) { const lg = g.createLinearGradient(cx - lw, 0, cx + lw, 0); lg.addColorStop(0, 'rgba(232,200,110,0)'); lg.addColorStop(0.5, 'rgba(232,200,110,0.85)'); lg.addColorStop(1, 'rgba(232,200,110,0)'); g.fillStyle = lg; g.fillRect(cx - lw, yy, lw * 2, 1.6); }
      g.fillStyle = 'rgba(240,210,120,0.9)'; for (const s of [-1, 1]) { g.save(); g.translate(cx + s * (lw + 8), cy - 1); g.rotate(Math.PI / 4); g.fillRect(-4, -4, 8, 8); g.restore(); } g.restore(); }
    g.save(); g.font = font(FS); g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineJoin = 'round';
    let x = cx - tw / 2;
    for (let i = 0; i < w.chars.length; i++) {
      const c = w.chars[i], cw = widths[i]; const sy = w.ct[i]; if (c === ' ') { x += cw; continue; }
      const st = sy ? sy[0] : w.t, du = sy ? Math.max(0.12, Math.min(sy[1], 0.5)) : 0.2; const k = clamp((T - st) / du);
      const ap = clamp((T - (w.a + i * 0.025)) / 0.35); const ex = clamp((T - (w.b + i * 0.018)) / 0.4); if (ap <= 0 || ex >= 1) { x += cw; continue; }
      const al = ap * (1 - ex); const lift = k > 0 ? Math.sin(clamp((T - st) / 0.35) * Math.PI) * 5 : 0;
      const yy = cy + (1 - outCubic(ap)) * 14 - ex * 26 - lift; const xx = x + (hash2(i, 3) - 0.5) * ex * 30;
      g.save(); g.globalAlpha = al; if (ap < 1 || ex > 0) g.filter = `blur(${((1 - ap) * 6 + ex * 5).toFixed(2)}px)`;
      g.lineWidth = 6; g.strokeStyle = 'rgba(6,14,18,0.75)'; g.strokeText(c, xx, yy);
      g.fillStyle = 'rgba(214,236,228,0.62)'; g.fillText(c, xx, yy);
      if (k > 0) { g.save(); g.beginPath(); g.rect(xx - 4, yy - FS, (cw + 6) * k, FS * 2); g.clip();
        g.shadowColor = 'rgba(255,214,120,0.9)'; g.shadowBlur = 18 * (0.6 + 0.4 * (1 - k));
        const fg = g.createLinearGradient(0, yy - FS * 0.45, 0, yy + FS * 0.45); fg.addColorStop(0, '#fff6c8'); fg.addColorStop(0.45, '#f2c75a'); fg.addColorStop(1, '#5fe0b4'); g.fillStyle = fg; g.fillText(c, xx, yy);
        g.shadowBlur = 0; g.restore(); }
      g.restore();
      // qi motes on light-up
      const kp = T - st; if (kp > 0 && kp < 0.6) { g.save(); g.globalCompositeOperation = 'lighter'; for (let m = 0; m < 3; m++) { const r = hash2(i * 7 + m, w.t); const px = xx + cw * r, py = yy - 20 - kp * 60 * (0.5 + r); g.fillStyle = rgba('#ffe7a0', (1 - kp / 0.6) * 0.8); g.beginPath(); g.arc(px, py, 2.2, 0, TAU); g.fill(); } g.restore(); }
      x += cw;
    }
    g.restore();
  }
}
export const SUB_WINDOWS = WIN;
