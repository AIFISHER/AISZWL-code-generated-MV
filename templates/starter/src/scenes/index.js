// Block registry: each block module (src/scenes/bNN_*.js) exports a default shot array. Add new blocks here in order.
const BLOCKS = ['b01_demo'];
export async function loadBlocks(only) {
  const list = only ? BLOCKS.filter((b) => b.startsWith(only)) : BLOCKS; const shots = [];
  for (const b of list) { try { const m = await import(`./${b}.js`); shots.push(...m.default); } catch (e) { if (!/Failed to fetch|dynamically imported/.test(String(e))) throw e; } }
  return shots;
}
