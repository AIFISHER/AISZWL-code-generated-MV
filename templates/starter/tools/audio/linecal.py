# line-start energy-rise calibration (vocal band 300-3k after HPSS-free bandpass)
import sys  # usage: python3 THIS out/m22.raw  (make it: ffmpeg -i assets/audio/song.m4a -ac 1 -ar 22050 -f s16le out/m22.raw)
import numpy as np,json
sr=22050;a=np.fromfile(sys.argv[1] if len(sys.argv)>1 else 'out/m22.raw',dtype=np.int16).astype(np.float32)/32768
hop=220;win=1024;n=(len(a)-win)//hop
fr=np.lib.stride_tricks.as_strided(a,shape=(n,win),strides=(a.strides[0]*hop,a.strides[0]))
S=np.abs(np.fft.rfft(fr*np.hanning(win),axis=1));f=np.fft.rfftfreq(win,1/sr)
e=np.log(1e-6+S[:,(f>300)&(f<3000)].sum(1));fps=sr/hop
L=[l for l in json.load(open('assets/audio/lines.json')) if l['t']>16]
def rise(t):
    i=int(t*fps);return e[i:i+25].mean()-e[i-40:i].mean()
offs=np.arange(-0.6,0.61,0.02)
tot=np.zeros(len(offs))
for l in L:
    r=np.array([rise(l['t']+o) for o in offs]);tot+=r
    print(f"{l['t']:7.2f} best {offs[r.argmax()]:+.2f} {l['text']}")
print('GLOBAL',offs[tot.argmax()])
