import re,sys,json
src=open(sys.argv[1],encoding='utf-8').read().splitlines()
L=[]
for ln in src:
    m=re.match(r'\[(\d+),(\d+)\](.*)',ln)
    if not m: continue
    t0,d=int(m[1]),int(m[2]); syl=[(t0+int(a),int(b),c) for a,b,c in re.findall(r'<(\d+),(\d+),\d+>([^<]*)',m[3])]
    L.append({'t':t0/1000,'d':d/1000,'text':''.join(s[2] for s in syl),'syl':[[s[0]/1000,s[1]/1000,s[2]] for s in syl]})
json.dump(L,open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
for i,l in enumerate(L): print(i,f"{l['t']:.2f}",f"{l['t']+l['d']:.2f}",l['text'])
