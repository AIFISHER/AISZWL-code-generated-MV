// node tools/seams.mjs            -> static check: seams match docs/blocks.json boundaries + groups
// node tools/seams.mjs --render   -> renders (at-1/30, at) pairs for every seam into out/review/seams/
import fs from 'node:fs'; import { spawnSync } from 'node:child_process';
const { SEAMS } = await import('../src/scenes/_seams.js');
const B = JSON.parse(fs.readFileSync('docs/blocks.json', 'utf8')).blocks; let bad = 0;
for (let i = 0; i < B.length - 1; i++) { const s = SEAMS[i], a = B[i], b = B[i + 1];
  const ok = s && s.from === a.id && s.to === b.id && Math.abs(s.at - a.end) < 1e-6 && Math.abs(b.start - a.end) < 1e-6 && (!!s.cross === (a.group !== b.group));
  if (!ok) { bad++; console.log('SEAM MISMATCH', a.id, '→', b.id, s); } }
if (SEAMS.length !== B.length - 1) { bad++; console.log('seam count', SEAMS.length, 'blocks', B.length); }
console.log(bad ? `seams: ${bad} problem(s)` : `seams OK (${SEAMS.length} contracts, ${SEAMS.filter((s) => s.cross).length} cross-group)`);
if (process.argv.includes('--render')) { const times = SEAMS.flatMap((s) => [(s.at - 1 / 30).toFixed(3), s.at.toFixed(3)]).join(',');
  spawnSync('node', ['tools/render.mjs', 'stills', '--times', times, '--outdir', 'out/review/seams', '--prefix', 'seam'], { stdio: 'inherit' }); }
process.exit(bad ? 1 : 0);
