// B01 0–20 demo block: shows the shot contract (S(id, start, end, draw)), parallax camera, world kit, a puppet (if
// assets/chars/c1.png exists) and the karaoke subtitle overlay. Replace with your own blocks.
import { S, C } from './kit.js';
import { sky, SKY, stars, moon, peaksLayer, PEAKPAL, cloudSea, layer } from '../env/world.js';
import { camKeys, cam } from '../core/camera.js';
import { grade } from '../core/look.js';
import { clamp } from '../core/util.js';
import { font, FONT } from '../core/fonts.js';

export default [
  S('b01_wide', 0, 9.0, (g, T, lt, ctx) => {
    const c = camKeys(T, [[0, cam(960, 420, 1.0)], [9, cam(960, 560, 1.08)]]);
    sky(g, SKY.dusk); stars(g, T, 0.6);
    layer(g, c, 0.15, (g) => moon(g, 1420, 260, 70));
    layer(g, c, 0.4, (g) => peaksLayer(g, { seed: 2, count: 7, base: 780, hMin: 260, hMax: 480 }, PEAKPAL.dawnFar));
    layer(g, c, 0.7, (g) => peaksLayer(g, { seed: 5, count: 4, base: 880, hMin: 300, hMax: 520, wMin: 200, wMax: 330 }, PEAKPAL.dawnMid));
    layer(g, c, 1.0, (g) => cloudSea(g, { y: 900, T, lit: '#ffe2cc', shade: '#6a5a8a', scale: 0.7, count: 12 }));
    const a = clamp((T - 0.5) / 1.2) * (1 - clamp((T - 3.6) / 0.6));
    if (a > 0) { g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#fff3d6'; g.font = font(150, FONT.brush); g.fillText('示例', 960, 470); g.restore(); }
    grade(ctx, { sat: 1.12, contrast: 1.1, vignette: 0.32, bloom: 0.2, bloomThreshold: 0.82, fade: 1 - clamp(T / 0.6) });
  }),
  S('b01_hero', 9.0, 20, (g, T, lt, ctx) => {
    const c = camKeys(T, [[9, cam(960, 540, 1.0)], [20, cam(980, 520, 1.12)]]);
    sky(g, SKY.dusk);
    layer(g, c, 0.4, (g) => peaksLayer(g, { seed: 9, count: 6, base: 820, hMin: 260, hMax: 460 }, PEAKPAL.dawnFar));
    layer(g, c, 1.0, (g) => C(g, 'hanli', 'dusk', { x: 420, y: 1060, h: 820, t: T, wind: 0.6 }));
    grade(ctx, { sat: 1.12, contrast: 1.12, vignette: 0.36, bloom: 0.22, fade: clamp((T - 19.4) / 0.6) });
  }),
];
