import { openPage } from './lib.mjs';
const { page, close } = await openPage({ dpr: 2 });
const ts = []; for (let t = 106.8; t < 108.2; t += 1/30) ts.push(+t.toFixed(3));
const r = await page.evaluate((ts) => ts.map((t) => { const t0 = performance.now(); window.renderFrame(t); window.engine.canvas.getContext('2d').getImageData(0,0,1,1); return [t, Math.round(performance.now() - t0)]; }), ts);
console.log(r.map((x) => x.join(':')).join(' ')); await close();
