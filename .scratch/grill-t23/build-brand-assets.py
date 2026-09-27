#!/usr/bin/env python3
# grill-t23 brand asset pipeline (deterministic; Pillow only).
# Input : D:/NDM/generated-image.png (external GPT Image draft, alpha already cut)
# Output: docs/assets/brand/* per the repo-logo Phase-9 matrix subset chartered
#         by grill-t23 D-005/D-007 (no GIF; no in-repo raster generation).
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

ROOT = r'D:\Aworker\jiahao'
SRC  = r'D:\NDM\generated-image.png'
OUT  = os.path.join(ROOT, 'docs', 'assets', 'brand')
EVID = os.path.join(ROOT, '.scratch', 'grill-t23', 'evidence')
os.makedirs(OUT, exist_ok=True)
os.makedirs(EVID, exist_ok=True)

FONT_B = r'C:\Windows\Fonts\msyhbd.ttc'   # bold, covers latin + CJK
FONT_R = r'C:\Windows\Fonts\msyh.ttc'

def bbox_of(a):
    al = np.asarray(a)[:, :, 3]
    ys, xs = np.where(al > 10)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def pad_to_square(im, frac=0.03):
    w, h = im.size
    side = int(max(w, h) * (1 + frac * 2))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - w) // 2, (side - h) // 2), im)
    return canvas

src = Image.open(SRC).convert('RGBA')

# --- Phase 7: 1024 RGBA master ---------------------------------------------
fig = src.crop(bbox_of(src))
master = pad_to_square(fig, 0.03).resize((1024, 1024), Image.LANCZOS)
master.save(os.path.join(OUT, 'logo.png'), optimize=True)

# --- dark-theme variant: white sticker halo (dilated alpha -> white) -------
al = master.getchannel('A')
halo = al.filter(ImageFilter.MaxFilter(31)).point(lambda v: 255 if v > 40 else 0)
white = Image.new('RGBA', master.size, (255, 255, 255, 0))
white.putalpha(halo)
dark = Image.alpha_composite(white, master)
dark.save(os.path.join(OUT, 'logo-dark.png'), optimize=True)

# --- favicons: head/mask crop (identity mark reads at 16px) -----------------
# head region of the 1254 source: hood tip .. chin-hand, centred on the face
head = src.crop((255, 55, 1075, 875))          # 820x820 square over the hood
head = pad_to_square(head, 0.02)
for s in (16, 32, 48, 128):
    head.resize((s, s), Image.LANCZOS).save(os.path.join(OUT, 'favicon-%d.png' % s), optimize=True)
head.resize((48, 48), Image.LANCZOS).save(
    os.path.join(OUT, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])

# --- apple touch icon: opaque brand-light tile, safe padding ----------------
tile = Image.new('RGBA', (180, 180), (255, 255, 255, 255))
inner = master.resize((150, 150), Image.LANCZOS)
tile.paste(inner, (15, 15), inner)
tile.convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'), optimize=True)

# --- PWA icons (cheap deterministic extras) ---------------------------------
for s in (192, 512):
    master.resize((s, s), Image.LANCZOS).save(os.path.join(OUT, 'android-chrome-%dx%d.png' % (s, s)), optimize=True)

# --- social preview 1280x640 (GitHub OG) ------------------------------------
card = Image.new('RGB', (1280, 640), (13, 17, 23))   # #0d1117
d = ImageDraw.Draw(card)
logo = dark.resize((540, 540), Image.LANCZOS)
card.paste(logo, (720, 50), logo)
fb = ImageFont.truetype(FONT_B, 92)
fm = ImageFont.truetype(FONT_B, 30)
fr = ImageFont.truetype(FONT_R, 30)
TEXT_R = 700                                  # text must clear the figure
def fit(draw, xy, s, font, fill):
    draw.text(xy, s, font=font, fill=fill)
    assert draw.textlength(s, font=font) + xy[0] < TEXT_R, s + ' overflows'
d.text((80, 150), 'jiahao 嘉豪', font=fb, fill=(240, 243, 245))
fit(d, (84, 290), 'dual-profile evidence-verdict harness', fm, (160, 170, 180))
fit(d, (84, 345), 'generator profile x verifier profile', fr, (120, 130, 140))
d.text((84, 430), 'failed -> CAPA -> verified', font=fr, fill=(248, 81, 73))
# six-rung evidence ladder motif as a footer tick-strip, below all text
x0, y0 = 84, 560
for i in range(6):
    xx = x0 + i * 44
    d.line([(xx, y0), (xx, y0 - 14 - i * 8)], fill=(240, 243, 245), width=4)
d.text((84 + 6 * 44 + 16, 536), 'six-rung evidence ladder', font=fr, fill=(90, 98, 108))
card.save(os.path.join(OUT, 'social-preview.png'), optimize=True)

# --- Phase-6 verification sheet ---------------------------------------------
sheet = Image.new('RGB', (1280, 420), (255, 255, 255))
ds = ImageDraw.Draw(sheet)
ds.rectangle([640, 0, 1280, 420], fill=(13, 17, 23))
m160 = master.resize((380, 380), Image.LANCZOS)
sheet.paste(m160, (130, 20), m160)
dk = dark.resize((380, 380), Image.LANCZOS)
sheet.paste(dk, (770, 20), dk)
sheet.paste(head.resize((64, 64), Image.LANCZOS), (580, 20))
sheet.paste(head.resize((32, 32), Image.LANCZOS), (580, 100))
sheet.paste(head.resize((16, 16), Image.LANCZOS).resize((64, 64), Image.NEAREST), (580, 150))
sheet.save(os.path.join(EVID, 'logo-phase6-sheet.png'))

print('wrote docs/assets/brand/:')
for f in sorted(os.listdir(OUT)):
    print(' ', f, os.path.getsize(os.path.join(OUT, f)))
print('evidence sheet:', os.path.join(EVID, 'logo-phase6-sheet.png'))
