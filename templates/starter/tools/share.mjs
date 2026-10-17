// Character screen-share: samples every 0.2 s, records which rigs were drawn (alpha>0.3).
import { openPage } from './lib.mjs';
const { page, close } = await openPage({ dpr: 0.25, nograin: true });
const r = await page.evaluate(() => { const cnt = {}; let n = 0; for (let t = 0; t < (window.duration||0); t += 0.2) { window.__drawn = new Set(); window.renderFrame(t); n++; for (const k of window.__drawn) cnt[k] = (cnt[k] || 0) + 1; } return { n, cnt }; });
for (const [k, v] of Object.entries(r.cnt)) console.log(k, (100 * v / r.n).toFixed(1) + '%'); await close();
