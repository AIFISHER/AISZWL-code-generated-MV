# Glyph coverage: lyric chars (src/cues.js) must exist in ZCOOL XiaoWei; every CJK char in other src literals (title, talismans,
# magic-circle glyphs, credits) must exist in BOTH Ma Shan Zheng and XiaoWei (either may draw it). Exit 1 on any miss.
import re, glob, sys, json
from fontTools.ttLib import TTFont
F = {n: TTFont('assets/fonts/' + f).getBestCmap() for n, f in [('xw', 'ZCOOLXiaoWei-Regular.ttf'), ('ms', 'MaShanZheng-Regular.ttf')]}
cues = open('src/cues.js', encoding='utf-8').read(); L = json.loads(re.search(r'LINES = (\[.*?\]);', cues).group(1))
lyric = {c for l in L for c in l['text'] if not c.isspace()}
other = set()
for f in glob.glob('src/**/*.js', recursive=True):
    if f.endswith('cues.js'): continue
    s = re.sub(r'//[^\n]*', '', open(f, encoding='utf-8').read())
    for lit in re.findall(r"'([^'\n]*)'|\"([^\"\n]*)\"|`([^`]*)`", s):
        for part in lit: other |= {c for c in part if ord(c) > 0x2e80}
bad = 0
m = sorted(c for c in lyric if ord(c) not in F['xw']); print('lyrics', len(lyric), 'chars; missing in XiaoWei:', ''.join(m) or '-'); bad += len(m)
for k in ('xw', 'ms'):
    m = sorted(c for c in other if ord(c) not in F[k]); print('other', len(other), f'chars; missing in {k}:', ''.join(m) or '-'); bad += len(m)
sys.exit(1 if bad else 0)
