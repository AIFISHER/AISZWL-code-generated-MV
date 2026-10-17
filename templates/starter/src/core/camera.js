import { lerp, noise1, clamp } from './util.js';
export const W = 1920, H = 1080;
/** camera: looks at world (x,y) with zoom & roll. depth parallax: 1 = subject plane; <1 far; >1 near */
export const cam = (x = 960, y = 540, zoom = 1, rot = 0) => ({ x, y, zoom, rot });
export function applyCam(g, c, depth = 1) {
  const z = 1 + (c.zoom - 1) * depth;
  g.translate(960, 540); if (c.rot) g.rotate(c.rot * Math.min(1, depth)); g.scale(z, z);
  g.translate(-(960 + (c.x - 960) * depth), -(540 + (c.y - 540) * depth));
}
export function toScreen(c, depth, x, y) {
  const z = 1 + (c.zoom - 1) * depth; const cx = 960 + (c.x - 960) * depth, cy = 540 + (c.y - 540) * depth;
  let dx = (x - cx) * z, dy = (y - cy) * z; if (c.rot) { const r = c.rot * Math.min(1, depth), cs = Math.cos(r), sn = Math.sin(r); [dx, dy] = [dx * cs - dy * sn, dx * sn + dy * cs]; }
  return [960 + dx, 540 + dy];
}
/** zoom interpolated geometrically */
export const lerpCam = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), t)), rot: lerp(a.rot || 0, b.rot || 0, t) });
/** handheld-ish idle drift, always on (Pixar cameras breathe). returns cam offset to add */
export function drift(T, { amp = 6, speed = 0.18, seed = 1, zoomAmp = 0.004, rotAmp = 0.0015 } = {}) {
  return { x: noise1(T * speed, seed) * amp, y: noise1(T * speed * 0.9, seed + 9) * amp * 0.6, zoom: 1 + noise1(T * speed * 0.7, seed + 3) * zoomAmp, rot: noise1(T * speed * 0.5, seed + 5) * rotAmp };
}
export function withDrift(c, T, o) { const d = drift(T, o); return { x: c.x + d.x, y: c.y + d.y, zoom: c.zoom * d.zoom, rot: (c.rot || 0) + d.rot }; }
/** impact shake: returns [dx, dy] */
export function shake(T, at, { amp = 18, decay = 0.35, freq = 26, seed = 3 } = {}) {
  if (T < at) return [0, 0]; const k = Math.exp(-(T - at) / decay) * amp; if (k < 0.2) return [0, 0];
  return [noise1((T - at) * freq, seed) * k, noise1((T - at) * freq, seed + 7) * k];
}
/** camera keyframes: [[T, cam], ...] with easing fn (default inOutSine) */
export function camKeys(T, ks, ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2) {
  if (T <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (T <= ks[i][0]) { const k = clamp((T - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0])); return lerpCam(ks[i - 1][1], ks[i][1], (ks[i][2] || ease)(k)); }
  return ks[ks.length - 1][1];
}
