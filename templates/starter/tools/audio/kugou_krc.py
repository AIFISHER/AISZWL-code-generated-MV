import json,sys,base64,zlib,urllib.request
KEY=[64,71,97,119,94,50,116,71,81,54,49,45,206,210,110,105]
def get(id,ak):
    u=f"https://lyrics.kugou.com/download?ver=1&client=pc&id={id}&accesskey={ak}&fmt=krc&charset=utf8"
    d=json.load(urllib.request.urlopen(u))
    raw=base64.b64decode(d['content'])[4:]
    dec=bytes(b^KEY[i%16] for i,b in enumerate(raw))
    return zlib.decompress(dec).decode('utf-8')
id,ak,out=sys.argv[1:4]
open(out,'w').write(get(id,ak))
