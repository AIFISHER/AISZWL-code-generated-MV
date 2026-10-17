// node tools/render.mjs stills --only b05 --times 42,43.1 --outdir out/review/b05 [--dpr 1] [--sheet name] [--nograin] [--stamp]
// node tools/render.mjs sheet  --only b05 --from 41.8 --to 57 --every 0.25 --cols 8 --tile 300 --out out/review/b05_sheet.jpg
// node tools/render.mjs cues   --from 0 --to 245.6 --cols 8 --tile 320 --out out/review/cues.jpg
// node tools/render.mjs time   --only b05 --from 42 --to 44 --n 10 --dpr 1     (perf: ms per frame)
// node tools/render.mjs video  --fps 30 --dpr 1 --workers 3 [--from 0 --to 245.6] [--audio assets/audio/zhoushen_live.m4a] --out dist/x.mp4
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { args, openPage, launch } from './lib.mjs'; import { startServer } from './server.mjs';
const mode = process.argv[2]; const a = args();
const dpr = +(a.dpr || 1);
const common = { only: a.only, sheet: a.sheet, dpr, nograin: !!a.nograin, stamp: !!a.stamp };
const b64 = (u) => Buffer.from(u.split(',')[1], 'base64');

async function stills() {
  const { page, errors, close } = await openPage(common);
  const outdir = a.outdir || 'out/review'; fs.mkdirSync(outdir, { recursive: true });
  const times = String(a.times).split(',').map(Number);
  for (const t of times) {
    const t0 = Date.now(); const r = await page.evaluate((t) => window.renderFrame(t), t); const ms = Date.now() - t0;
    const url = await page.evaluate(() => window.grabFrame('image/png'));
    const f = path.join(outdir, `${a.prefix || a.sheet || a.only || 'frame'}_${t.toFixed(2)}.png`); fs.writeFileSync(f, b64(url));
    console.log(f, `${ms}ms`, r.shots.join(','), r.errors.length ? 'ERR ' + r.errors.join('; ') : '');
  }
  if (errors.length) console.log('page errors:', errors.slice(0, 10).join('\n'));
  await close();
}
async function contact(times, labels) {
  const { page, errors, close } = await openPage({ ...common, dpr: 1 });
  const cols = +(a.cols || 8), tile = +(a.tile || 300);
  const url = await page.evaluate(async ({ times, labels, cols, tile }) => {
    const th = Math.round((tile * 9) / 16), rows = Math.ceil(times.length / cols);
    const sc = document.createElement('canvas'); sc.width = cols * tile; sc.height = rows * (th + 22); const g = sc.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, sc.width, sc.height);
    for (let i = 0; i < times.length; i++) {
      const r = window.renderFrame(times[i]); const x = (i % cols) * tile, y = Math.floor(i / cols) * (th + 22);
      g.drawImage(window.engine.canvas, x, y, tile, th);
      g.fillStyle = '#000'; g.fillRect(x, y + th, tile, 22); g.fillStyle = r.errors.length ? '#f55' : '#ddd'; g.font = '13px monospace';
      g.fillText(`${times[i].toFixed(2)} ${labels ? labels[i] : r.shots.join(',')}`.slice(0, Math.floor(tile / 7.4)), x + 4, y + th + 16);
      await new Promise((r) => setTimeout(r, 0));
    }
    return sc.toDataURL('image/jpeg', 0.9);
  }, { times, labels, cols, tile });
  const out = a.out || 'out/review/sheet.jpg'; fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, b64(url)); console.log(out);
  if (errors.length) console.log('page errors:', errors.slice(0, 10).join('\n'));
  await close();
}
async function sheet() { const from = +a.from, to = +a.to, every = +(a.every || 0.25); const ts = []; for (let t = from; t <= to + 1e-6; t += every) ts.push(+t.toFixed(3)); await contact(ts); }
async function cues() {
  const { CUE_LIST } = await import('../src/cues.js'); const from = +(a.from || 0), to = +(a.to || 1e9);
  const cs = CUE_LIST.filter((c) => c[1] >= from && c[1] <= to && c[0] !== 'END');
  await contact(cs.map((c) => +(c[1] + 0.35).toFixed(2)), cs.map((c) => `${c[0]} ${c[2] || ''}`));
}
async function time() {
  const { page, close } = await openPage(common); const from = +(a.from || 0), to = +(a.to || from + 2), n = +(a.n || 10);
  await page.evaluate((t) => window.renderFrame(t), from); // warm
  const res = await page.evaluate(({ from, to, n }) => { const out = []; for (let i = 0; i < n; i++) { const t = from + ((to - from) * i) / Math.max(1, n - 1); const t0 = performance.now(); window.renderFrame(t); window.engine.canvas.getContext('2d').getImageData(0, 0, 1, 1); out.push(performance.now() - t0); } return out; }, { from, to, n });
  const t0 = Date.now(); for (let i = 0; i < 3; i++) await page.evaluate(() => window.grabFrame('image/jpeg', 0.95)); const enc = (Date.now() - t0) / 3;
  const avg = res.reduce((s, v) => s + v, 0) / res.length; console.log(JSON.stringify({ dpr, n, avgRenderMs: +avg.toFixed(1), maxRenderMs: +Math.max(...res).toFixed(1), jpegEncodeMs: enc }));
  await close();
}
async function video() {
  const fps = +(a.fps || 30), from = +(a.from || 0); const { DURATION } = await import('../src/cues.js'); const to = +(a.to || DURATION);
  const workers = Math.min(3, +(a.workers || 3)); const out = a.out || 'dist/video.mp4'; fs.mkdirSync(path.dirname(out), { recursive: true });
  const nF = Math.round((to - from) * fps); const per = Math.ceil(nF / workers); const tmp = fs.mkdtempSync('/tmp/mvseg-');
  const server = await startServer(); const browser = await launch(); const t0 = Date.now();
  const segs = await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const f0 = w * per, f1 = Math.min(nF, f0 + per); if (f1 <= f0) return null;
    const seg = path.join(tmp, `seg${w}.mp4`);
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=1920:1080:flags=lanczos`, '-c:v', 'libx264', '-preset', a.preset || 'medium', '-crf', String(a.crf || 16), '-pix_fmt', 'yuv420p', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    const { page, close } = await openPage({ ...common, browser, server });
    for (let f = f0; f < f1; f++) {
      const url = await page.evaluate((t) => { window.renderFrame(t); return window.grabFrame('image/jpeg', 0.94); }, from + f / fps);
      if (!ff.stdin.write(b64(url))) await new Promise((r) => ff.stdin.once('drain', r));
      if (w === 0 && f % 60 === 0) { const done = (f - f0 + 1) / (f1 - f0); const el = (Date.now() - t0) / 1000; console.log(`[w0] ${(done * 100).toFixed(1)}%  elapsed ${el.toFixed(0)}s  eta ${(el / done - el).toFixed(0)}s`); }
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await close(); return seg;
  }));
  await browser.close(); server.srv.close();
  const list = path.join(tmp, 'list.txt'); fs.writeFileSync(list, segs.filter(Boolean).map((s) => `file '${s}'`).join('\n'));
  const cat = ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list];
  if (a.audio) cat.push('-ss', String(from), '-t', String(to - from), '-i', a.audio, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '256k', '-shortest');
  cat.push('-c:v', 'copy', '-movflags', '+faststart', out);
  await new Promise((r) => spawn('ffmpeg', cat, { stdio: 'inherit' }).on('close', r));
  console.log(out, `${((Date.now() - t0) / 1000).toFixed(0)}s for ${nF} frames`);
}
({ stills, sheet, cues, time, video }[mode] || (() => console.log('modes: stills sheet cues time video')))().catch((e) => { console.error(e); process.exit(1); });
