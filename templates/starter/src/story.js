import { DURATION } from './cues.js';
import { loadBlocks } from './scenes/index.js';
export const CUTS = [];
export async function loadStory(only) { const shots = await loadBlocks(only); shots.forEach((s, i) => (s._order = i)); return { shots, duration: DURATION, cuts: CUTS }; }
