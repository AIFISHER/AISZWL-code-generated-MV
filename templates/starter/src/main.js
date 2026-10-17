import { Engine } from './core/engine.js';
import { loadFonts } from './core/fonts.js';
import { loadChars } from './rigs/puppet.js';
import { DURATION, CUE_LIST } from './cues.js';
import { loadStory } from './story.js';
import { drawSubs } from './ui/subs.js';

const q = new URLSearchParams(location.search);
const capture = q.has('capture'), dpr = parseFloat(q.get('dpr') || (capture ? '1' : '1'));
if (capture) document.body.classList.add('capture');
window.__ready = false;
(async () => {
  await loadFonts(); await loadChars();
  let story;
  if (q.get('sheet')) {
    const mod = await import(`./sheets/${q.get('sheet')}.js`);
    const shots = (mod.default || []).map((s, i) => ({ ...s, _order: i }));
    story = { shots, duration: mod.duration || Math.max(...shots.map((s) => s.end)) };
  } else story = await loadStory(q.get('only'));
  if (!q.has('nosubs')) story.overlay = drawSubs;
  const eng = new Engine(document.getElementById('c'), { dpr, story, grain: !q.has('nograin'), stamp: q.has('stamp') });
  window.engine = eng; window.duration = story.duration || DURATION;
  window.renderFrame = (t) => { eng.render(t); return { shots: eng.lastShots, errors: eng.stats.errors, maxLayers: eng.stats.maxLayers }; };
  window.grabFrame = (type = 'image/jpeg', quality = 0.95) => eng.canvas.toDataURL(type, quality);
  // supersampled capture: box-downscale the dpr×N canvas to w×h before encoding (used by tools/renderfilm.mjs)
  let ds = null; window.grabFrameScaled = (w = 1920, h = 1080, type = 'image/jpeg', quality = 0.95) => {
    if (eng.canvas.width === w) return eng.canvas.toDataURL(type, quality);
    if (!ds) { ds = document.createElement('canvas'); ds.width = w; ds.height = h; } const g = ds.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(eng.canvas, 0, 0, w, h); return ds.toDataURL(type, quality); };
  window.__ready = true;
  if (!capture) startPlayer(eng);
})().catch((e) => { console.error(e); window.__error = String(e && e.stack || e); });

function startPlayer(eng) {
  const hud = document.getElementById('hud');
  const audio = new Audio('/assets/audio/song.m4a'); audio.preload = 'auto';
  let t0 = parseFloat(q.get('t') || '0'); let playing = false, clock = t0, last = 0;
  audio.currentTime = t0;
  const tick = (now) => {
    if (playing) { clock = audio.duration ? audio.currentTime : clock + (now - last) / 1000; }
    last = now; eng.render(clock);
    hud.textContent = `${clock.toFixed(2)}s  ${(eng.lastShots || []).join(' ')}  [空格 播放/暂停  ←/→ ±1s  [ ] 上/下一个 cue]`;
    requestAnimationFrame(tick);
  };
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { playing = !playing; if (playing) { audio.currentTime = clock; audio.play().catch(() => {}); } else audio.pause(); }
    const seek = (t) => { clock = Math.max(0, Math.min(DURATION, t)); audio.currentTime = clock; };
    if (e.code === 'ArrowRight') seek(clock + 1); if (e.code === 'ArrowLeft') seek(clock - 1);
    if (e.key === ']') { const c = CUE_LIST.find((c) => c[1] > clock + 0.01); if (c) seek(c[1]); }
    if (e.key === '[') { const c = [...CUE_LIST].reverse().find((c) => c[1] < clock - 0.3); if (c) seek(c[1]); }
  });
  requestAnimationFrame(tick);
}
