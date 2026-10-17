import { clamp, seg } from './util.js';
export const linear = (t) => t;
export const inQuad = (t) => t * t, outQuad = (t) => 1 - (1 - t) * (1 - t), inOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const inCubic = (t) => t * t * t, outCubic = (t) => 1 - Math.pow(1 - t, 3), inOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const outQuart = (t) => 1 - Math.pow(1 - t, 4), inOutQuart = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2);
export const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)), inExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const inOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2, outSine = (t) => Math.sin((t * Math.PI) / 2), inSine = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const outBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const inBack = (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t;
export const inOutBack = (t, s = 1.70158 * 1.525) => (t < 0.5 ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2 : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2);
export const outElastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
export const outBounce = (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; };
/** damped spring 0->1 (overshoot), t in seconds-ish units of progress */
export const spring = (t, k = 7, damp = 4.5) => (t <= 0 ? 0 : 1 - Math.exp(-damp * t) * Math.cos(k * t));
/** anticipation -> action -> settle (classic animation): dips by `a` before going to 1 */
export const anticip = (t, a = 0.12, split = 0.3) => (t < split ? -a * Math.sin((t / split) * Math.PI * 0.5) : -a + (1 + a) * outBack((t - split) / (1 - split), 1.4));
/** ez(T, a, b, fn): eased progress of T through [a,b] */
export const ez = (T, a, b, fn = inOutCubic) => fn(seg(T, a, b));
export const glide = (t) => inOutSine(clamp(t));
export const snap = (t) => outExpo(clamp(t));
export const whip = (t) => inOutQuart(clamp(t));
