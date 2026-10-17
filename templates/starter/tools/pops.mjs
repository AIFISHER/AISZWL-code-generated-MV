// Full-film integration scan (low-res, every frame): unplanned jumps, render errors, empty/stub frames, near-black/flat frames.
// node tools/pops.mjs --from 0 --to 333.6 [--fps 30] [--out out/review/integ/pops_0.json]
// Flags: POP = diff > max(5, 3×local median) and not at a shot-set change; CUT = same at a shot-set change (review);
// ERR = engine errors; EMPTY = no shots or a *_stub shot; FLAT = luminance stddev < 4 (black/blank card).
import fs from 'node:fs';
import { args, openPage } from './lib.mjs';
const a = args(process.argv.slice(2)); const fps = +(a.fps || 30); const r0 = +(a.from ?? 0), r1 = +(a.to ?? 333.6);
const out = a.out || `out/review/integ/pops_${r0}.json`;
const { page, close } = await openPage({ dpr: 0.25, nograin: true });
const n = Math.round((r1 - r0) * fps); const rows = [];
for (let c0 = 0; c0 < n; c0 += 300) {
  const res = await page.evaluate(async ({ r0, c0, c1, fps, prevKey }) => {
    const sc = document.createElement('canvas'); sc.width = 128; sc.height = 72; const g = sc.getContext('2d', { willReadFrequently: true });
    let prev = window.__popPrev || null; const out = [];
    for (let f = c0; f < c1; f++) {
      const t = r0 + f / fps; const r = window.renderFrame(t); g.drawImage(window.engine.canvas, 0, 0, 128, 72); const d = g.getImageData(0, 0, 128, 72).data;
      let diff = 0, s = 0, s2 = 0; const N = d.length / 4;
      for (let i = 0; i < d.length; i += 4) { const L = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; s += L; s2 += L * L; if (prev) diff += Math.abs(d[i] - prev[i]) + Math.abs(d[i + 1] - prev[i + 1]) + Math.abs(d[i + 2] - prev[i + 2]); }
      diff = prev ? diff / (N * 3) : 0; const mean = s / N, sd = Math.sqrt(Math.max(0, s2 / N - mean * mean));
      out.push({ t: +t.toFixed(3), diff: +diff.toFixed(2), mean: +mean.toFixed(1), sd: +sd.toFixed(1), shots: r.shots.join('+'), err: r.errors.slice(0, 2) });
      prev = new Uint8ClampedArray(d); if (f % 30 === 0) await new Promise((q) => setTimeout(q, 0));
    }
    window.__popPrev = prev; return out;
  }, { r0, c0, c1: Math.min(n, c0 + 300), fps });
  rows.push(...res); process.stderr.write(`\r${r0}+ ${rows.length}/${n}`);
}
await close(); fs.writeFileSync(out, JSON.stringify(rows)); process.stderr.write('\n');
const fl = [];
for (let i = 0; i < rows.length; i++) { const r = rows[i];
  if (r.err.length) fl.push(`${r.t.toFixed(3)} ERR ${r.err.join(' | ')} [${r.shots}]`);
  if (!r.shots || /_stub/.test(r.shots)) fl.push(`${r.t.toFixed(3)} EMPTY [${r.shots}]`);
  if (r.sd < 4) fl.push(`${r.t.toFixed(3)} FLAT mean ${r.mean} sd ${r.sd} [${r.shots}]`);
  if (i > 0) { const w = rows.slice(Math.max(1, i - 8), i + 9).filter((x) => x !== r).map((x) => x.diff).sort((x, y) => x - y); const med = w[Math.floor(w.length / 2)] || 0;
    if (r.diff > Math.max(5, med * 3)) fl.push(`${r.t.toFixed(3)} ${r.shots !== rows[i - 1].shots ? 'CUT' : 'POP'} diff ${r.diff} med ${med} [${rows[i - 1].shots} -> ${r.shots}]`); } }
fs.writeFileSync(out.replace('.json', '.txt'), fl.join('\n') + '\n'); console.log(fl.join('\n')); console.log(`frames ${rows.length}, flags ${fl.length}`);
