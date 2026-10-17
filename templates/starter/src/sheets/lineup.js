// Cast lineup sheet: node tools/render.mjs stills --sheet lineup --times 1 --outdir out/review
import { drawChar, CHARS } from '../rigs/puppet.js';
import { sky, SKY, peaksLayer, PEAKPAL } from '../env/world.js';
export const duration = 10;
export default [{ id: 'lineup', start: 0, end: 10, draw(g, T) {
  sky(g, SKY.dusk); peaksLayer(g, { seed: 2, count: 7, base: 760, hMin: 260, hMax: 480 }, PEAKPAL.dawnFar);
  const K = Object.keys(CHARS); K.forEach((k, i) => drawChar(g, k, { x: 170 + i * (1580 / Math.max(1, K.length - 1)), y: 1020, h: 600, t: T, wind: 0.6, rim: { color: '#ffd9a0', a: 0.9, dir: [1, -0.3] }, side: [1, 0.25], shadow: { a: 0.7 } }));
} }];
