// Shared scene kit: lighting presets (so the user's 3D renders sit in each world), vista builder, sword-riding, transitions.
import { drawChar, hand, face, CHARS } from '../rigs/puppet.js';
import { sky, SKY, stars, sun, moon, peaksLayer, PEAKPAL, cloudSea, cloud, mist, layer } from '../env/world.js';
import { sword, trail, QI } from '../fx/magic.js';
import { clamp, lerp, hash2, TAU, rgba, seg, smooth } from '../core/util.js';
import { glow, glowE, godRays, vgrad } from '../core/look.js';
import { withDrift, camKeys, cam } from '../core/camera.js';

export const LIGHT = {
  dawn: { rim: { color: '#ffcf98', a: 0.85, dir: [1, -0.35] }, side: [1, 0.22], wash: ['#ff9a60', 0.05], bright: 1.0, sat: 1.02 },
  day: { rim: { color: '#fff4dc', a: 0.7, dir: [-1, -0.4] }, side: [-1, 0.18], wash: ['#a0c8ff', 0.04], bright: 1.03, sat: 1.04 },
  dusk: { rim: { color: '#ffb070', a: 1, dir: [1, -0.25] }, side: [1, 0.3], wash: ['#ff7a50', 0.08], bright: 0.95, sat: 1.05 },
  night: { rim: { color: '#a8c8ff', a: 0.85, dir: [1, -0.5] }, side: [1, 0.35], wash: ['#20306a', 0.26], bright: 0.78, sat: 0.9 },
  garden: { rim: { color: '#8fffd0', a: 0.75, dir: [-1, -0.3] }, side: [-1, 0.3], wash: ['#1a3a5a', 0.22], bright: 0.8, sat: 0.95 },
  cave: { rim: { color: '#7dffd0', a: 0.9, dir: [-1, -0.2] }, side: [-1, 0.35], wash: ['#0a4a3a', 0.2], bright: 0.8, sat: 0.95 },
  blood: { rim: { color: '#ff5a3a', a: 1, dir: [1, -0.3] }, side: [1, 0.4], wash: ['#8a1020', 0.2], bright: 0.82, sat: 1.0 },
  storm: { rim: { color: '#c8b8ff', a: 0.95, dir: [1, -0.6] }, side: [1, 0.4], wash: ['#2a2a6a', 0.26], bright: 0.75, sat: 0.9 },
  golden: { rim: { color: '#ffe2a0', a: 1, dir: [-1, -0.4] }, side: [-1, 0.2], wash: ['#ffc070', 0.08], bright: 1.05, sat: 1.06 },
  furnace: { rim: { color: '#ffb050', a: 1, dir: [1, 0.2] }, side: [1, 0.38], wash: ['#a03a10', 0.14], bright: 0.88, sat: 1.0 },
};
export const GRADE = {
  dawn: { sat: 1.12, contrast: 1.1, gain: '#ffd8b0', gainAlpha: 0.08, vignette: 0.32, vignetteColor: '#140a18', bloom: 0.2, bloomThreshold: 0.82 },
  day: { sat: 1.14, contrast: 1.1, gain: '#fff4dc', gainAlpha: 0.06, vignette: 0.26, vignetteColor: '#0a1a30', bloom: 0.16, bloomThreshold: 0.85 },
  dusk: { sat: 1.14, contrast: 1.12, gain: '#ffb880', gainAlpha: 0.1, vignette: 0.36, vignetteColor: '#1a0812', bloom: 0.24, bloomThreshold: 0.8 },
  night: { sat: 1.1, contrast: 1.14, gain: '#9fc0ff', gainAlpha: 0.06, vignette: 0.42, vignetteColor: '#02040c', bloom: 0.28, bloomThreshold: 0.74 },
  cave: { sat: 1.12, contrast: 1.16, gain: '#9fffd8', gainAlpha: 0.05, vignette: 0.46, vignetteColor: '#010605', bloom: 0.3, bloomThreshold: 0.72 },
  blood: { sat: 1.16, contrast: 1.18, gain: '#ff9070', gainAlpha: 0.06, vignette: 0.46, vignetteColor: '#0a0002', bloom: 0.28, bloomThreshold: 0.74 },
  storm: { sat: 1.08, contrast: 1.18, gain: '#c0b8ff', gainAlpha: 0.06, vignette: 0.46, vignetteColor: '#020208', bloom: 0.3, bloomThreshold: 0.72 },
  golden: { sat: 1.14, contrast: 1.1, gain: '#ffe8b8', gainAlpha: 0.1, vignette: 0.3, vignetteColor: '#1a1008', bloom: 0.26, bloomThreshold: 0.8 },
};
export const S = (id, start, end, draw, z = 0) => ({ id, start, end, z, draw });
export function C(g, key, preset, o) { const L = LIGHT[preset] || LIGHT.day; drawChar(g, key, { ...L, shadow: { a: 0.6 }, ...o, rim: o.rim === null ? undefined : { ...L.rim, ...(o.rim || {}) } }); }
export { hand, face, CHARS };

/** vista: sky + celestial + 3 parallax peak layers + sea of clouds + mist, under camera c */
export function vista(g, T, c, P, o = {}) {
  const { sunX = 1300, sunY = 420, seed = 1, cloudY = 820, noClouds = false, starsA, nearPeaks = true, farBase = 760, midBase = 860, cloudLit, cloudShade } = o;
  const sk = { dawn: SKY.dawn, day: SKY.day, dusk: SKY.dusk, night: SKY.night, blood: SKY.blood, storm: SKY.storm, golden: SKY.golden, predawn: SKY.predawn }[P] || SKY.day;
  const pal = { dawn: ['dawnFar', 'dawnMid', 'dawnNear'], predawn: ['nightFar', 'nightMid', 'nightMid'], day: ['dayFar', 'dayMid', 'dayNear'], dusk: ['dawnFar', 'dawnMid', 'dawnNear'], night: ['nightFar', 'nightMid', 'nightMid'], blood: ['bloodFar', 'bloodMid', 'bloodMid'], storm: ['stormFar', 'stormMid', 'stormMid'], golden: ['goldFar', 'goldMid', 'goldMid'] }[P];
  const cl = { dawn: ['#ffe6d0', '#7a6a98'], predawn: ['#8a8ab8', '#262a58'], day: ['#ffffff', '#8fa8d8'], dusk: ['#ffd0a8', '#6a4a7a'], night: ['#9ab0e0', '#1c2850'], blood: ['#e07060', '#3a0a14'], storm: ['#8a88c0', '#1a1a3a'], golden: ['#fff0d0', '#a08ab8'] }[P];
  layer(g, c, 0.02, (g) => { sky(g, sk); if (P === 'night' || P === 'predawn' || P === 'storm') stars(g, T, starsA ?? (P === 'storm' ? 0.2 : 1)); if (P === 'night') moon(g, sunX, sunY, 46); else if (P === 'predawn') moon(g, sunX, sunY, 40, 0.8); else if (P !== 'storm' && P !== 'blood') sun(g, sunX, sunY, P === 'day' ? 34 : 46, P === 'dusk' ? '#ffb070' : '#fff0c8'); if (P === 'blood') { glow(g, sunX, sunY, 500, '#ff3020', 0.5); g.save(); g.fillStyle = '#ff6a40'; g.globalAlpha = 0.9; g.beginPath(); g.arc(sunX, sunY, 60, 0, TAU); g.fill(); g.restore(); } });
  layer(g, c, 0.12, (g) => peaksLayer(g, { seed: seed + 1, count: 8, base: farBase, hMin: 260, hMax: 520, wMin: 120, wMax: 230 }, PEAKPAL[pal[0]]));
  layer(g, c, 0.25, (g) => mist(g, T, { y: farBase - 40, h: 160, color: cl[1], a: 0.35, seed: seed + 3 }));
  layer(g, c, 0.3, (g) => peaksLayer(g, { seed: seed + 2, count: 5, base: midBase, hMin: 380, hMax: 640, wMin: 180, wMax: 320, x0: -500, x1: 2420 }, PEAKPAL[pal[1]]));
  if (!noClouds) layer(g, c, 0.45, (g) => cloudSea(g, { y: cloudY, T, lit: cloudLit || cl[0], shade: cloudShade || cl[1], scale: 0.8, count: 13, seed: seed + 5, speed: 8 }));
}
/** char riding a flying sword. o: {x,y (feet), h, ang, t, preset, trailFrom:[[x,y]...]} */
export function rideSword(g, key, preset, o) {
  const { x, y, h, t, ang = 0, glowA = 1 } = o; const L = h * 0.95;
  sword(g, x, y + h * 0.015, ang, L, { glowA, color: QI.jade });
  C(g, key, preset, { ...o, shadow: { a: 0 }, wind: o.wind ?? 1.4, windDir: o.windDir ?? -1 });
}
/** big foreground cloud wipe, p 0..1 sweeping across (dir 1: left->right) */
export function cloudWipe(g, p, dir = 1, lit = '#ffffff', shade = '#9aa8d0', yMid = 540) {
  if (p <= 0 || p >= 1) return; const x = lerp(-1600, 3500, p) * (dir > 0 ? 1 : -1) + (dir > 0 ? 0 : 1920);
  g.save(); for (let i = 0; i < 9; i++) { const s = 3.2 + hash2(7, i) * 2; cloud(g, x + (i - 4) * 360 * dir, yMid + (hash2(3, i) - 0.5) * 900 + 300, s, lit, shade, i); }
  g.fillStyle = lit; g.globalAlpha = clamp(1 - Math.abs(p - 0.5) * 3.2); g.fillRect(0, 0, 1920, 1080); g.restore();
}
/** cut flash helper on ctx */
export const flashAt = (ctx, T, at, k = 0.8, d = 0.25, color = '#ffffff') => { if (T >= at && T < at + d * 4) { const v = k * Math.exp(-(T - at) / d); if (v > ctx.fx.flash) { ctx.fx.flash = v; ctx.fx.flashColor = color; } } };
export const fadeIn = (ctx, lt, d = 0.3, color = '#000000') => { const v = 1 - clamp(lt / d); if (v > 0) { ctx.fx.fade = Math.max(ctx.fx.fade, v); ctx.fx.fadeColor = color; } };
export const fadeOut = (ctx, T, end, d = 0.3, color = '#000000') => { const v = clamp((T - (end - d)) / d); if (v > 0) { ctx.fx.fade = Math.max(ctx.fx.fade, v); ctx.fx.fadeColor = color; } };
export const grade = (ctx, P, extra = {}) => Object.assign(ctx.fx, GRADE[P] || {}, extra);
export const camAt = (T, ks, d = {}) => withDrift(camKeys(T, ks), T, { amp: 5, speed: 0.2, ...d });
export { cam };
