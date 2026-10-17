// Fonts (OFL, google/fonts): ZCOOL XiaoWei (elegant song-style) for lyric subtitles & credits, Ma Shan Zheng (brush calligraphy) for the
// title / talisman glyphs. Every glyph used is checked by tools/fontcheck.py.
export const FONT = { sub: 'XiaoWei', brush: 'MaShan', sans: 'Noto Sans CJK SC', serif: 'Noto Serif CJK SC' };
const FILES = [['XiaoWei', 'ZCOOLXiaoWei-Regular.ttf'], ['MaShan', 'MaShanZheng-Regular.ttf']];
export async function loadFonts(base = '/assets/fonts/') {
  await Promise.all(FILES.map(async ([fam, file]) => { const f = new FontFace(fam, `url(${base}${file})`); try { await f.load(); document.fonts.add(f); } catch (e) { console.info('font missing (run tools/get_fonts.sh):', file); } }));
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  for (const fam of Object.values(FONT)) { g.font = `400 40px "${fam}"`; g.fillText('歌词字幕', 0, 40); }
  await document.fonts.ready;
}
export const font = (size, fam = FONT.sub, weight = 400) => `${weight} ${size}px "${fam}", "${FONT.serif}", serif`;
export const fontCN = font;
