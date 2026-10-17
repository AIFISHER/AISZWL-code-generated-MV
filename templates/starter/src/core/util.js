// Pure helpers. Everything is a function of its inputs (no Math.random / Date.now).
export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => (b === a ? 0 : (x - a) / (b - a));
/** 0..1 progress of x through [a,b] (clamped) */
export const seg = (x, a, b) => clamp(invLerp(a, b, x));
export const smooth = (t) => t * t * (3 - 2 * t);
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
/** rises over [a,a+i], holds, falls over [b-o,b] */
export const envelope = (x, a, b, i = 0.2, o = 0.2) => Math.min(seg(x, a, a + i), 1 - seg(x, b - o, b));
/** decaying pulse after time `at` */
export const pulse = (x, at, dur = 0.3) => (x < at ? 0 : Math.exp(-((x - at) / dur) * 3) * (x - at < dur * 4 ? 1 : 0));
export const hit = (x, at, a = 0.06, d = 0.35) => (x < at - a ? 0 : x < at ? smooth((x - at + a) / a) : Math.exp(-(x - at) / d));
export const hits = (x, times, a, d) => times.reduce((m, t) => Math.max(m, hit(x, t, a, d)), 0);
export const osc = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * TAU);
export const wobble = (t, f = 1, seed = 0) => Math.sin(t * f * 6.1 + seed * 1.7) * 0.6 + Math.sin(t * f * 2.3 + seed * 4.1) * 0.4;
/** squash & stretch scale pair that conserves area. s>1 stretch vertical */
export const squash = (s) => [1 / Math.sqrt(Math.max(0.05, s)), Math.sqrt(Math.max(0.05, s))];
export const stepIndex = (x, times) => { let i = -1; for (let k = 0; k < times.length; k++) if (x >= times[k]) i = k; return i; };
export const fract = (x) => x - Math.floor(x);
export function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
export function hash2(a, b) { const s = Math.sin(a * 127.1 + b * 311.7 + 74.7) * 43758.5453123; return s - Math.floor(s); }
export function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i; const a = hash2(i, seed), b = hash2(i + 1, seed); return lerp(a, b, smooth(f)) * 2 - 1; }
export function fbm1(x, seed = 0, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise1(x * f, seed + i * 17); f *= 2; a *= 0.5; } return s; }
export function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return h.length === 4 ? [((n >> 8) & 15) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function rgbToHex(r, g, b) { const c = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0'); return '#' + c(r) + c(g) + c(b); }
export function rgba(hex, a = 1) { if (hex.startsWith('rgb')) return hex; const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
export function mixHex(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
export const lighten = (h, t) => mixHex(h, '#ffffff', t);
export const darken = (h, t) => mixHex(h, '#000000', t);
/** shift hex toward a hue-tinted shadow (Pixar style: shadows go cooler & more saturated) */
export function shadeOf(h, t = 0.35, cool = '#2a2350') { return mixHex(h, cool, t); }
export function warmOf(h, t = 0.25, warm = '#fff1c9') { return mixHex(h, warm, t); }
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const angle = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
export const deg = (d) => (d * Math.PI) / 180;
/** quadratic/cubic bezier point */
export const bez2 = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;
export const bez3 = (a, c1, c2, b, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * b; };
/** piecewise keyframes: keys=[[t, v],...] numeric or arrays, with optional ease fn per key */
export function keys(T, ks, ease = smooth) {
  if (T <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (T <= ks[i][0]) {
      const [t0, v0] = ks[i - 1], [t1, v1, e] = ks[i]; const k = (e || ease)(seg(T, t0, t1));
      return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : typeof v0 === 'object' ? Object.fromEntries(Object.keys(v0).map((n) => [n, lerp(v0[n], v1[n], k)])) : lerp(v0, v1, k);
    }
  }
  return ks[ks.length - 1][1];
}
