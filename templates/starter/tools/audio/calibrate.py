# HPSS harmonic spectral-flux onsets vs KRC syllable starts -> global & per-section offset
import sys  # usage: python3 THIS out/m22.raw  (make it: ffmpeg -i assets/audio/song.m4a -ac 1 -ar 22050 -f s16le out/m22.raw)
import numpy as np,json
from numpy.lib.stride_tricks import sliding_window_view as sw
sr=22050; a=np.fromfile(sys.argv[1] if len(sys.argv)>1 else 'out/m22.raw',dtype=np.int16).astype(np.float32)/32768
hop=220; win=2048; n=(len(a)-win)//hop
fr=np.lib.stride_tricks.as_strided(a,shape=(n,win),strides=(a.strides[0]*hop,a.strides[0]))
S=np.abs(np.fft.rfft(fr*np.hanning(win),axis=1)).astype(np.float32); f=np.fft.rfftfreq(win,1/sr); k=8
Ht=np.median(sw(np.pad(S,((k,k),(0,0)),mode='edge'),2*k+1,axis=0),axis=-1)
Pf=np.median(sw(np.pad(S,((0,0),(k,k)),mode='edge'),2*k+1,axis=1),axis=-1)
H=S*(Ht**2/(Ht**2+Pf**2+1e-9)); band=(f>250)&(f<3000)
L=np.log1p(1000*H[:,band]); fl=np.concatenate([[0],np.maximum(0,np.diff(L,axis=0)).sum(1)])
kk=50; med=np.median(sw(np.pad(fl,(kk,kk),mode='edge'),2*kk+1),axis=1)[:len(fl)]; o=fl-med; fps=sr/hop
np.save('out/hflux.npy',o)
# also full-band RMS for later beat/energy use
rms=np.sqrt((fr**2).mean(1)); np.save('out/rms.npy',rms)
Ls=json.load(open('assets/audio/lines.json'))
ts=[s[0] for l in Ls if l['t']>20 for s in l['syl'] if s[2].strip()]
def score(t,off):
    idx=((np.array(t)+off)*fps).astype(int); idx=idx[(idx>1)&(idx<len(o)-2)]
    return np.maximum(np.maximum(o[idx-1],o[idx]),o[idx+1]).mean()
offs=np.arange(-0.5,0.5,0.01); sc=[score(ts,x) for x in offs]; i=int(np.argmax(sc)); print('global best',round(offs[i],2),round(sc[i],2),'at0',round(score(ts,0),2))
for a_,b_ in [(30,62),(62,92),(139,153),(185,206)]:
    t=[x for x in ts if a_<=x<b_]; sc=[score(t,x) for x in offs]; i=int(np.argmax(sc)); print(a_,b_,len(t),'best',round(offs[i],2),round(sc[i],2),'at0',round(score(t,0),2))
print('--- per-section score at candidate offsets')
for a_,b_ in [(30,62),(62,92),(139,153),(185,206)]:
    t=[x for x in ts if a_<=x<b_]; print(a_,b_,' '.join(f'{x:+.2f}:{score(t,x):.1f}' for x in [-0.45,-0.37,-0.2,-0.1,0,0.05,0.11,0.15]))
