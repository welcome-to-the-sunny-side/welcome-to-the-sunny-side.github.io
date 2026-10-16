"""PARKED EXPERIMENT (2026-10-16): recolour the dark-skin home image into the sunny palette.
See "Parked: sunny recolour of the dark home image" in site-reference.md for findings.

The dark image is a tritone, not a duotone: solid black (~L0), scanline troughs that are a
dark shade of the teal (~L37), and bright teal (~L230). Mapping those three luminance stops to
three separate colours keeps the clean look; a plain two-colour map washes the scanline areas out.

Usage (run from repo root):
  python3 -I tools/experiments/home-bg-tritone.py <src image> <out dir> <sheet.jpg> name,solid,scan,light ...
e.g. the best candidate ("v4"):
  python3 -I tools/experiments/home-bg-tritone.py public/assets/home/active/dark/pc/expoutput-1500w.webp \
      /tmp/out sheet.jpg "v4,#2A1A0A,#D9A441,#FAF8F4"
Writes <out dir>/home-<name>.webp per variant plus a labelled comparison sheet next to the original."""
import sys
from PIL import Image, ImageOps, ImageDraw, ImageFont

def hexrgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))

def lut(stops):
    # stops: [(L, '#rrggbb'), ...] ascending L; piecewise-linear in RGB
    stops=[(l,hexrgb(c)) for l,c in stops]; tab=[[],[],[]]
    for L in range(256):
        for (l0,c0),(l1,c1) in zip(stops,stops[1:]):
            if l0<=L<=l1: t=(L-l0)/max(1,l1-l0); col=[round(a+(b-a)*t) for a,b in zip(c0,c1)]; break
        else: col=list(stops[0][1] if L<stops[0][0] else stops[-1][1])
        for i in range(3): tab[i].append(col[i])
    return tab[0]+tab[1]+tab[2]

def remap(gray, solid, scan, light):
    # solid black -> solid, scanline trough -> scan, bright -> light
    t=lut([(6,solid),(32,scan),(40,scan),(225,light)])
    return Image.merge('RGB',(gray,gray,gray)).point(t)

if __name__=='__main__':
    src, out_dir, sheet_name = sys.argv[1], sys.argv[2], sys.argv[3]
    variants=[v.split(',') for v in sys.argv[4:]]  # name,solid,scan,light
    im=Image.open(src).convert('RGB'); g=ImageOps.grayscale(im)
    W=600; H=int(W*im.height/im.width); font=ImageFont.load_default(size=18)
    cells=[('original',None,im)]+[(n,(s,sc,l),remap(g,s,sc,l)) for n,s,sc,l in variants]
    cols=2; rows=(len(cells)+1)//2
    sheet=Image.new('RGB',(cols*W+30,rows*(H+34)+10),'#fff'); d=ImageDraw.Draw(sheet)
    for i,(n,c,img) in enumerate(cells):
        if c: img.save(f'{out_dir}/home-{n}.webp',quality=92)
        x=10+(i%cols)*(W+10); y=10+(i//cols)*(H+34)
        d.text((x,y), n+('' if not c else f'  solid {c[0]} · scan {c[1]} · light {c[2]}'), fill='#000', font=font)
        sheet.paste(img.resize((W,H)),(x,y+24))
    sheet.save(f'{out_dir}/{sheet_name}',quality=88)
