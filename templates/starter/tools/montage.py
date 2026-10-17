# python3 tools/montage.py out.jpg a.png b.png ... (2 columns, 960px tiles)
import sys
from PIL import Image
fs=sys.argv[2:]; ims=[Image.open(f).convert('RGB').resize((960,540)) for f in fs]; cols=2; rows=(len(ims)+1)//2
o=Image.new('RGB',(960*cols,540*rows))
for i,im in enumerate(ims): o.paste(im,((i%cols)*960,(i//cols)*540))
o.save(sys.argv[1],quality=88)
