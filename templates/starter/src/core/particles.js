// Stateless particles: positions are closed-form functions of T.
import { hash2, fract, TAU } from './util.js';
const R = (seed, k, i) => hash2(seed * 97 + k * 13.37, i);
/** one-shot burst at time `at` */
export function burst(g, T, o, draw) {
  const { at = 0, seed = 1, count = 20, x = 0, y = 0, spread = TAU, angle = -Math.PI / 2, speed = 400, speedVar = 0.6, gravity = 600, drag = 1.5, life = 1.2, lifeVar = 0.4, size = 8, sizeVar = 0.5, spin = 4, rx = 0, ry = 0 } = o;
  const age = T - at; if (age < 0) return;
  for (let i = 0; i < count; i++) {
    const L = life * (1 - lifeVar * R(seed, 1, i)); if (age > L) continue;
    const a = angle + (R(seed, 2, i) - 0.5) * spread, v = speed * (1 - speedVar * R(seed, 3, i));
    const k = drag > 0 ? (1 - Math.exp(-drag * age)) / drag : age;
    const px = x + (R(seed, 6, i) - 0.5) * rx * 2 + Math.cos(a) * v * k, py = y + (R(seed, 7, i) - 0.5) * ry * 2 + Math.sin(a) * v * k + 0.5 * gravity * age * age;
    draw(g, { x: px, y: py, i, p: age / L, age, size: size * (1 - sizeVar * R(seed, 4, i)), rot: (R(seed, 5, i) - 0.5) * spin * age, r: R(seed, 8, i) });
  }
}
/** continuous stream between start and end at `rate`/s; emit(tBorn, i, r) -> {x,y,vx,vy,life,size,gravity?,drag?} */
export function stream(g, T, o, draw) {
  const { start = 0, end = 1e9, rate = 20, seed = 1, maxLife = 2, emit } = o;
  const t = Math.min(T, end); const i0 = Math.max(0, Math.floor((T - maxLife - start) * rate)), i1 = Math.floor((t - start) * rate);
  for (let i = i0; i <= i1; i++) {
    const tb = start + i / rate; if (tb > T || tb < start) continue; const r = (k) => R(seed, k, i);
    const e = emit(tb, i, r); const age = T - tb; if (age > e.life) continue;
    const d = e.drag ?? 0, k = d > 0 ? (1 - Math.exp(-d * age)) / d : age;
    draw(g, { x: e.x + e.vx * k, y: e.y + e.vy * k + 0.5 * (e.gravity || 0) * age * age, i, p: age / e.life, age, size: e.size, r: r(9), e });
  }
}
/** looping ambient field (snow, petals, dust motes, fireflies) */
export function field(g, T, o, draw) {
  const { count = 40, x = 0, y = 0, w = 1920, h = 1080, vx = 0, vy = 40, sway = 20, swayF = 0.3, seed = 1, size = 6, sizeVar = 0.6 } = o;
  for (let i = 0; i < count; i++) {
    const r1 = R(seed, 1, i), r2 = R(seed, 2, i), r3 = R(seed, 3, i), sp = 0.6 + 0.8 * r3;
    const px = x + fract(r1 + (vx * sp * T) / w) * w + Math.sin(T * swayF * TAU * sp + r2 * 9) * sway;
    const py = y + fract(r2 + (vy * sp * T) / h) * h;
    draw(g, { x: px, y: py, i, r: r3, size: size * (1 - sizeVar * R(seed, 4, i)), t: T, ph: r1 * TAU });
  }
}
