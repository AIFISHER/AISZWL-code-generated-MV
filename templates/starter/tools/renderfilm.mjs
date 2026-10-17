// Resumable, chunked final render. Each chunk (default 150 frames = 5 s) is encoded to its own H.264 file; finished chunks
// are skipped on re-run, so an interrupted render resumes where it stopped. Workers share one browser (≤3 pages).
// node tools/renderfilm.mjs --dpr 2 --workers 3 [--fps 30 --chunk 150 --dir dist/chunks --crf 14] ; then --concat out.mp4
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { args, openPage, launch } from './lib.mjs'; import { startServer } from './server.mjs';
const a = args(process.argv.slice(2)); const fps = +(a.fps || 30), dpr = +(a.dpr || 2), workers = Math.min(3, +(a.workers || 3)), CH = +(a.chunk || 150);
const dir = a.dir || 'dist/chunks'; fs.mkdirSync(dir, { recursive: true });
const { DURATION } = await import('../src/cues.js'); const nF = Math.round(DURATION * fps); const nC = Math.ceil(nF / CH);
const name = (i) => path.join(dir, `c${String(i).padStart(4, '0')}.mp4`);
const log = (s) => { const line = `${new Date().toISOString()} ${s}`; console.log(line); fs.appendFileSync(path.join(dir, 'render.log'), line + '\n'); };
if (a.concat) {
  const list = path.join(dir, 'list.txt'); const missing = []; for (let i = 0; i < nC; i++) if (!fs.existsSync(name(i))) missing.push(i);
  if (missing.length) { console.log('missing chunks', missing.join(',')); process.exit(1); }
  fs.writeFileSync(list, Array.from({ length: nC }, (_, i) => `file '${path.resolve(name(i))}'`).join('\n'));
  await new Promise((r) => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', a.concat], { stdio: 'inherit' }).on('close', r));
  console.log('concat ->', a.concat); process.exit(0);
}
const todo = []; for (let i = 0; i < nC; i++) if (!fs.existsSync(name(i))) todo.push(i);
log(`start dpr ${dpr} fps ${fps} frames ${nF} chunks ${nC} todo ${todo.length} workers ${workers}`);
const server = await startServer(); const browser = await launch(); const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const { page, close } = await openPage({ dpr, browser, server });
  while (todo.length) { const ci = todo.shift(); const f0 = ci * CH, f1 = Math.min(nF, f0 + CH); const part = name(ci).replace('.mp4', '.part.mp4'); const c0 = Date.now();
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(a.crf || 14),
      '-pix_fmt', 'yuv420p', '-g', '60', '-r', String(fps), '-video_track_timescale', '15360', part], { stdio: ['pipe', 'inherit', 'inherit'] });
    let errs = 0;
    for (let f = f0; f < f1; f++) { const r = await page.evaluate((t) => { const r = window.renderFrame(t); return { e: r.errors.length, url: window.grabFrameScaled(1920, 1080, 'image/jpeg', 0.95) }; }, f / fps);
      errs += r.e; if (!ff.stdin.write(Buffer.from(r.url.split(',')[1], 'base64'))) await new Promise((q) => ff.stdin.once('drain', q)); }
    ff.stdin.end(); const code = await new Promise((q) => ff.on('close', q));
    if (code === 0) { fs.renameSync(part, name(ci)); done++; const el = (Date.now() - t0) / 1000; const left = todo.length + (workers - 1) * 0.5;
      log(`w${w} chunk ${ci} (${(f0 / fps).toFixed(1)}–${(f1 / fps).toFixed(1)}s) ${((Date.now() - c0) / (f1 - f0)).toFixed(0)} ms/f errors ${errs} | ${done} done, ~${((el / done) * left / 60).toFixed(0)} min left`); }
    else log(`w${w} chunk ${ci} FAILED ffmpeg ${code}`); }
  await close();
}));
await browser.close(); server.srv.close(); log(`finished in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
