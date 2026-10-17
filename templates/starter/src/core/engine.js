// Engine: shot scheduling, offscreen layers (DOF blur), masks, post (camera fx, bloom, grade, vignette, grain, letterbox, fade).
import { W, H } from './camera.js';
import { clamp, hash2, rgba } from './util.js';
import { resetLight, clearEmissive } from './look.js';

class Pool {
  constructor() { this.free = new Map(); this.inUse = 0; }
  get(w, h) { const k = w + 'x' + h; const a = this.free.get(k); this.inUse++; if (a && a.length) { const c = a.pop(); const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); return c; } const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  put(c) { this.inUse--; const k = c.width + 'x' + c.height; if (!this.free.has(k)) this.free.set(k, []); this.free.get(k).push(c); }
}

export const FX_DEFAULT = () => ({ shake: [0, 0], zoom: 1, rot: 0, sat: 1.12, bright: 1, contrast: 1.08, hue: 0, blur: 0,
  tint: null, tintAlpha: 0, tintMode: 'soft-light', flash: 0, flashColor: '#ffffff', fade: 0, fadeColor: '#000000',
  bloom: 0.22, bloomThreshold: 0.8, bloomRadius: 24, vignette: 0.26, vignetteColor: '#1a0f08', grain: 0.012, letterbox: 0,
  lift: null, liftAlpha: 0.0, gain: null, gainAlpha: 0.0 });

export class Engine {
  constructor(canvas, { dpr = 1, story, grain = true, stamp = false } = {}) {
    this.canvas = canvas; this.dpr = dpr; this.story = story; this.grainOn = grain; this.stamp = stamp;
    canvas.width = W * dpr; canvas.height = H * dpr;
    this.out = canvas.getContext('2d');
    this.pool = new Pool();
    this.scene = document.createElement('canvas'); this.scene.width = W * dpr; this.scene.height = H * dpr;
    this.bloomC = document.createElement('canvas'); this.bloomC.width = Math.round(W * dpr / 4); this.bloomC.height = Math.round(H * dpr / 4);
    this.bloomC2 = document.createElement('canvas'); this.bloomC2.width = this.bloomC.width; this.bloomC2.height = this.bloomC.height;
    this.grains = []; for (let k = 0; k < 4; k++) this.grains.push(this.makeGrain(k));
    this.ctx = this.makeCtx(); this.stats = { layers: 0, maxLayers: 0, errors: [] };
  }
  makeGrain(seed) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); const id = g.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = 128 + (hash2(seed * 7.1 + (i % 256) * 0.37, Math.floor(i / 256) * 0.91 + seed) - 0.5) * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    g.putImageData(id, 0, 0); return c;
  }
  makeCtx() {
    const eng = this; const dpr = this.dpr;
    return {
      fx: FX_DEFAULT(), dpr, W, H, engine: this,
      /** offscreen layer. o: {blur, alpha, blend, filter, shadow:{blur,x,y,color}, res, tint:{color,alpha,mode}} */
      layer(g, o, fn) {
        o = o || {}; const blur = o.blur || 0; const s = o.res ?? (blur >= 14 ? 0.25 : blur >= 5 ? 0.5 : 1);
        const w = Math.max(1, Math.round(W * dpr * s)), h = Math.max(1, Math.round(H * dpr * s));
        const c = eng.pool.get(w, h); const lg = c.getContext('2d'); eng.stats.layers++; eng.stats.maxLayers = Math.max(eng.stats.maxLayers, eng.pool.inUse);
        const m = g.getTransform(); lg.setTransform(m.a * s, m.b * s, m.c * s, m.d * s, m.e * s, m.f * s);
        lg.save(); fn(lg); lg.restore();
        if (o.tint) { lg.save(); lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = o.tint.mode || 'source-atop'; lg.globalAlpha = o.tint.alpha ?? 0.5; lg.fillStyle = o.tint.color; lg.fillRect(0, 0, w, h); lg.restore(); }
        let src = c, c2 = null;
        if (blur > 0.3) { c2 = eng.pool.get(w, h); const g2 = c2.getContext('2d'); g2.filter = `blur(${(blur * dpr * s).toFixed(2)}px)`; g2.drawImage(c, 0, 0); g2.filter = 'none'; src = c2; }
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
        if (o.alpha !== undefined) g.globalAlpha *= o.alpha; if (o.blend) g.globalCompositeOperation = o.blend;
        const f = []; if (o.filter) f.push(o.filter); if (o.sat !== undefined) f.push(`saturate(${o.sat})`); if (o.bright !== undefined) f.push(`brightness(${o.bright})`); if (o.contrast !== undefined) f.push(`contrast(${o.contrast})`);
        if (f.length) g.filter = f.join(' ');
        if (o.shadow) { const sh = o.shadow; g.shadowColor = sh.color || 'rgba(30,20,50,0.35)'; g.shadowBlur = (sh.blur ?? 20) * dpr; g.shadowOffsetX = (sh.x ?? 8) * dpr; g.shadowOffsetY = (sh.y ?? 12) * dpr; }
        g.imageSmoothingQuality = src === c ? 'medium' : 'low'; g.drawImage(src, 0, 0, W * dpr, H * dpr);
        g.restore(); eng.pool.put(c); if (c2) eng.pool.put(c2);
      },
      /** depth-of-field shortcut */
      dof(g, blur, fn, o = {}) { return this.layer(g, { ...o, blur }, fn); },
      /** mask: drawFn content kept where maskFn fills (destination-in). o: {feather, invert} */
      mask(g, maskFn, drawFn, o = {}) {
        const w = W * dpr, h = H * dpr; const c = eng.pool.get(w, h), mc = eng.pool.get(w, h); const lg = c.getContext('2d'), mg = mc.getContext('2d');
        const m = g.getTransform(); lg.setTransform(m); mg.setTransform(m);
        lg.save(); drawFn(lg); lg.restore();
        mg.save(); mg.fillStyle = '#fff'; maskFn(mg); mg.restore();
        lg.save(); lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = o.invert ? 'destination-out' : 'destination-in';
        if (o.feather) lg.filter = `blur(${o.feather * dpr}px)`; lg.drawImage(mc, 0, 0); lg.restore();
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); if (o.alpha !== undefined) g.globalAlpha *= o.alpha; g.drawImage(c, 0, 0); g.restore();
        eng.pool.put(c); eng.pool.put(mc);
      },
    };
  }
  activeShots(T) { return this.story.shots.filter((s) => T >= s.start && T < s.end).sort((a, b) => (a.z || 0) - (b.z || 0) || a._order - b._order); }
  drawShots(g, T, ctx) {
    g.save(); g.fillStyle = '#0a0f1c'; g.fillRect(0, 0, W, H); g.restore();
    const shots = this.activeShots(T); this.lastShots = shots.map((s) => s.id);
    for (const s of shots) {
      resetLight(); clearEmissive(); g.save();
      try { s.draw(g, T, T - s.start, ctx); } catch (e) { this.stats.errors.push(s.id + ': ' + e.message); console.error('[shot error]', s.id, e); g.restore(); g.save(); g.fillStyle = '#d00'; g.fillRect(0, 0, W, 40); g.fillStyle = '#fff'; g.font = '24px sans-serif'; g.fillText(s.id + ': ' + e.message, 20, 28); }
      g.restore();
      if (this.pool.inUse !== 0) { console.warn('[layer leak]', s.id, this.pool.inUse); this.pool.inUse = 0; }
    }
    if (this.story.post) this.story.post(g, T, ctx);
    return shots.length;
  }
  render(T) {
    const dpr = this.dpr, ctx = this.ctx; ctx.fx = FX_DEFAULT(); this.stats.errors = []; this.stats.layers = 0;
    const sg = this.scene.getContext('2d'); sg.setTransform(dpr, 0, 0, dpr, 0, 0); sg.globalAlpha = 1; sg.globalCompositeOperation = 'source-over'; sg.filter = 'none';
    const n = this.drawShots(sg, T, ctx); const fx = ctx.fx; const o = this.out;
    o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.fillStyle = '#000'; o.fillRect(0, 0, W * dpr, H * dpr);
    // camera fx (shake / zoom / roll), auto overscan so edges never show
    const z = fx.zoom * (fx.shake[0] || fx.shake[1] || fx.rot ? 1 + (Math.max(Math.abs(fx.shake[0]), Math.abs(fx.shake[1])) * 2.2) / W + Math.abs(fx.rot) * 0.6 : 1);
    o.translate((W / 2 + fx.shake[0]) * dpr, (H / 2 + fx.shake[1]) * dpr); o.rotate(fx.rot); o.scale(z, z); o.translate((-W / 2) * dpr, (-H / 2) * dpr);
    const f = []; if (fx.sat !== 1) f.push(`saturate(${fx.sat})`); if (fx.bright !== 1) f.push(`brightness(${fx.bright})`); if (fx.contrast !== 1) f.push(`contrast(${fx.contrast})`); if (fx.hue) f.push(`hue-rotate(${fx.hue}deg)`); if (fx.blur) f.push(`blur(${fx.blur * dpr}px)`);
    if (f.length) o.filter = f.join(' ');
    o.drawImage(this.scene, 0, 0); o.restore();
    this.finish(o, T, fx, n);
    return n;
  }
  finish(o, T, fx, n) {
    const dpr = this.dpr, w = W * dpr, h = H * dpr;
    o.save(); o.setTransform(1, 0, 0, 1, 0, 0);
    // bloom: bright-pass approximated with brightness/contrast on a 1/4 buffer, blurred, screened back
    if (fx.bloom > 0) {
      const b = this.bloomC, bg = b.getContext('2d'), b2 = this.bloomC2, bg2 = b2.getContext('2d');
      const th = fx.bloomThreshold; bg.globalCompositeOperation = 'copy'; bg.filter = `brightness(${(0.55 / th).toFixed(3)}) contrast(${(1 + 3.2 * th).toFixed(2)}) saturate(1.25)`;
      bg.drawImage(this.out.canvas, 0, 0, b.width, b.height); bg.filter = 'none';
      bg2.globalCompositeOperation = 'copy'; bg2.filter = `blur(${(fx.bloomRadius * dpr / 4).toFixed(1)}px)`; bg2.drawImage(b, 0, 0); bg2.filter = 'none';
      o.globalCompositeOperation = 'screen'; o.globalAlpha = clamp(fx.bloom, 0, 1.5) * 0.85; o.imageSmoothingQuality = 'low'; o.drawImage(b2, 0, 0, w, h);
      if (fx.bloom > 1) { o.globalAlpha = fx.bloom - 1; o.drawImage(b2, 0, 0, w, h); }
      o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
    }
    // split-tone grade: lift (shadows) & gain (highlights)
    if (fx.lift && fx.liftAlpha) { o.globalCompositeOperation = 'lighten'; o.globalAlpha = fx.liftAlpha; o.fillStyle = fx.lift; o.fillRect(0, 0, w, h); }
    if (fx.gain && fx.gainAlpha) { o.globalCompositeOperation = 'soft-light'; o.globalAlpha = fx.gainAlpha; o.fillStyle = fx.gain; o.fillRect(0, 0, w, h); }
    if (fx.tint && fx.tintAlpha) { o.globalCompositeOperation = fx.tintMode; o.globalAlpha = fx.tintAlpha; o.fillStyle = fx.tint; o.fillRect(0, 0, w, h); }
    o.globalAlpha = 1;
    if (fx.flash > 0) { o.globalCompositeOperation = 'screen'; o.globalAlpha = clamp(fx.flash); o.fillStyle = fx.flashColor; o.fillRect(0, 0, w, h); o.globalAlpha = 1; }
    // vignette
    if (fx.vignette > 0) { o.globalCompositeOperation = 'multiply'; const vg = o.createRadialGradient(w / 2, h * 0.48, h * 0.35, w / 2, h / 2, h * 1.05); vg.addColorStop(0, 'rgba(255,255,255,1)'); vg.addColorStop(1, rgba(fx.vignetteColor, 1)); o.globalAlpha = fx.vignette; o.fillStyle = vg; o.fillRect(0, 0, w, h); o.globalAlpha = 1; }
    // grain (very light; Pixar is clean)
    if (this.grainOn && fx.grain > 0) { o.globalCompositeOperation = 'overlay'; o.globalAlpha = fx.grain; const gc = this.grains[Math.floor(T * 12) % 4]; const pat = o.createPattern(gc, 'repeat'); o.fillStyle = pat; o.fillRect(0, 0, w, h); o.globalAlpha = 1; }
    o.globalCompositeOperation = 'source-over';
    if (this.story.overlay) { o.save(); o.setTransform(dpr, 0, 0, dpr, 0, 0); this.story.overlay(o, T, this.ctx); o.restore(); }
    if (fx.fade > 0) { o.globalAlpha = clamp(fx.fade); o.fillStyle = fx.fadeColor; o.fillRect(0, 0, w, h); o.globalAlpha = 1; }
    if (fx.letterbox > 0) { const bh = ((H - W / 2.39) / 2) * clamp(fx.letterbox) * dpr; o.fillStyle = '#000'; o.fillRect(0, 0, w, bh); o.fillRect(0, h - bh, w, bh); }
    if (!n) { o.fillStyle = '#300'; o.fillRect(0, 0, w, h); o.fillStyle = '#f66'; o.font = `${40 * dpr}px sans-serif`; o.fillText('NO SHOT  ' + T.toFixed(2), 40 * dpr, 80 * dpr); }
    if (this.stamp) { o.fillStyle = 'rgba(0,0,0,.55)'; o.fillRect(0, h - 34 * dpr, 520 * dpr, 34 * dpr); o.fillStyle = '#fff'; o.font = `${20 * dpr}px monospace`; o.fillText(T.toFixed(2) + 's  ' + (this.lastShots || []).join(' '), 10 * dpr, h - 10 * dpr); }
    o.restore();
  }
  /** render with only the given draw (seam / probe renders) */
  renderProbe(T, draw) { const saved = this.story; this.story = { shots: [{ id: 'probe', start: -1e9, end: 1e9, draw, _order: 0 }] }; try { return this.render(T); } finally { this.story = saved; } }
}
