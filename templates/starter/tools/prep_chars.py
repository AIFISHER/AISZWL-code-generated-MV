# Clean user-supplied character renders: alpha remap (source max 254, soft fringe), edge colour decontamination
# (alpha-weighted neighbour colour for fringe pixels), tight crop + pad. Output assets/chars/c{i}.png
from PIL import Image, ImageFilter
import numpy as np
for i in range(1,7):
    im=np.array(Image.open(f'assets/chars/src/c{i}.png').convert('RGBA')).astype(np.float32)
    a=np.clip((im[:,:,3]-10)/(244-10),0,1)
    rgb=im[:,:,:3]
    # decontaminate: colour from confident interior pixels, spread by repeated blur
    w=(a>0.97).astype(np.float32); acc=rgb*w[...,None]; ws=w.copy()
    A=Image.fromarray; 
    def box(x,r,ax):
        c=np.cumsum(np.pad(x,[(r+1,r) if k==ax else (0,0) for k in range(2)],mode='edge'),axis=ax)
        return (np.take(c,range(2*r+1,c.shape[ax]),axis=ax)-np.take(c,range(0,c.shape[ax]-2*r-1),axis=ax))/(2*r+1)
    def blur(x,r):
        for _ in range(2): x=box(box(x,r,0),r,1)
        return x
    pr=np.stack([blur(acc[:,:,k],3) for k in range(3)],-1); pw=blur(ws,3)
    fill=pr/np.maximum(pw,1e-4)[...,None]
    m=((a<0.97)&(pw>0.02))[...,None]
    t=np.clip((0.97-a)/0.6,0,1)[...,None]*0.85
    rgb=np.where(m,rgb*(1-t)+fill*t,rgb)
    out=np.dstack([np.clip(rgb,0,255),a*255]).astype(np.uint8)
    o=Image.fromarray(out,'RGBA'); bb=o.getbbox(); o=o.crop((bb[0]-8,bb[1]-8,bb[2]+8,bb[3]+8))
    o.save(f'assets/chars/c{i}.png',optimize=True); print(i,o.size)
