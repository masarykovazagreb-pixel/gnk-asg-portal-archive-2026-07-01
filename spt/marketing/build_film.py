#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPT — promotivni film (1280x720 · 30 fps · ~61 s)
Bez glasova — vedra glazba i zvukovi raznih sportova (publika, sudačka zviždaljka, udarci lopte,
otkucaji srca, tenis, košarka, plivanje...). Zvuk: film_audio.py (v3). Slike proizvoda + renderirana LIVE nadzorna ploča.

produced by GNK ASG · Nermin Sefić

Upotreba:  python build_film.py <mapa_s_PNG_slikama> <izlazna_mapa>
Treba:     pillow, numpy, imageio-ffmpeg
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import imageio_ffmpeg

W, H, FPS, SR = 1280, 720, 30, 44100
SRC = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
FF = imageio_ffmpeg.get_ffmpeg_exe()
FD = "/usr/share/fonts/truetype/dejavu/"
_FC = {}


def F(size, bold=True, mono=False):
    k = (size, bold, mono)
    if k not in _FC:
        name = ("DejaVuSansMono" if mono else "DejaVuSans") + ("-Bold" if bold else "") + ".ttf"
        _FC[k] = ImageFont.truetype(FD + name, size)
    return _FC[k]


CYAN = (56, 214, 245)
LIME = (163, 230, 53)
WHITE = (240, 246, 252)
DIM = (140, 160, 186)
RED = (255, 90, 95)
AMBER = (251, 191, 36)
ORANGE = (255, 138, 76)
NAVY = (7, 13, 24)


def clamp(v, a=0.0, b=1.0):
    return a if v < a else b if v > b else v


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def lerp(a, b, u):
    return a + (b - a) * u


def bump(t, a, b, c, d):
    if t <= a or t >= d:
        return 0.0
    if t < b:
        return smooth((t - a) / (b - a))
    if t <= c:
        return 1.0
    return 1.0 - smooth((t - c) / (d - c))


def load(name, fallback=None):
    p = os.path.join(SRC, name)
    if not os.path.exists(p) and fallback:
        p = os.path.join(SRC, fallback)
    return Image.open(p).convert("RGB")


# ------------------------------------------------------------------ zajedničko
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
_r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
_vig = np.clip((_r - 0.55) / 0.75, 0, 1) ** 1.6 * 185
_cap = np.clip((yy - H * 0.45) / (H * 0.55), 0, 1) ** 1.25 * 205 * np.clip(1.30 - xx / W, 0, 1)
VIGC = Image.fromarray(np.clip(_vig + _cap, 0, 235).astype(np.uint8), "L")
BLACK = Image.new("RGB", (W, H), (4, 7, 12))
_bg = np.zeros((H, W, 3), np.float32)
_g = np.clip(1 - _r / 1.25, 0, 1) ** 1.5
for c, (a, b) in enumerate(zip((4, 7, 12), (16, 34, 58))):
    _bg[..., c] = a + (b - a) * _g
BG = Image.fromarray(_bg.astype(np.uint8), "RGB")


def text_sp(d, xy, s, font, fill, sp=0):
    x, y = xy
    for ch in s:
        d.text((x, y), ch, font=font, fill=fill)
        x += font.getlength(ch) + sp
    return x


def width_sp(s, font, sp):
    return sum(font.getlength(c) + sp for c in s) - sp


def layer(w, h):
    L = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return L, ImageDraw.Draw(L)


def cache(L):
    return (L.convert("RGB"), L.getchannel("A"))


def paste_c(frame, lc, xy, a=1.0):
    if a <= 0.003:
        return
    rgb, al = lc
    if a < 0.997:
        al = al.point(lambda v, a=a: int(v * a))
    frame.paste(rgb, (int(xy[0]), int(xy[1])), al)


def kenburns(img, p, z0, z1, c0, c1):
    p = clamp(p)
    z = max(1.0, z0 + (z1 - z0) * p)
    cx = lerp(c0[0], c1[0], p)
    cy = lerp(c0[1], c1[1], p)
    iw, ih = img.size
    ar = W / H
    if iw / ih > ar:
        bh, bw = ih, ih * ar
    else:
        bw, bh = iw, iw / ar
    bw /= z
    bh /= z
    x0 = clamp(cx * iw - bw / 2, 0, iw - bw)
    y0 = clamp(cy * ih - bh / 2, 0, ih - bh)
    return img.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + bw, y0 + bh))


def caption(kicker, title, sub=None):
    L, d = layer(1040, 190)
    d.rectangle([0, 8, 5, 132 if sub else 104], fill=CYAN + (255,))
    text_sp(d, (22, 4), kicker, F(19), CYAN + (255,), 4)
    d.text((20, 34), title, font=F(48), fill=WHITE + (255,))
    if sub:
        d.text((22, 100), sub, font=F(21, bold=False), fill=(205, 215, 228, 255))
    sh = Image.new("RGBA", L.size, (0, 0, 0, 0))
    sh.putalpha(L.getchannel("A").filter(ImageFilter.GaussianBlur(7)).point(lambda v: int(min(255, v * 1.4) * 0.9)))
    return cache(Image.alpha_composite(sh, L))


def watermark():
    L, d = layer(320, 60)
    tw = F(30).getlength("SPT")
    d.text((320 - tw - 4, 0), "SPT", font=F(30), fill=CYAN + (240,))
    s = "produced by GNK ASG"
    d.text((320 - F(12, False).getlength(s) - 4, 38), s, font=F(12, False), fill=(205, 214, 228, 210))
    return cache(L)


WM = watermark()


def kb_scene(name, kicker, title, sub=None, z0=1.0, z1=1.13, c0=(.5, .5), c1=(.5, .5), fallback=None):
    img = load(name, fallback)
    cap = caption(kicker, title, sub)

    def fn(tl, dur):
        fr = kenburns(img, tl / dur, z0, z1, c0, c1)
        fr = Image.composite(BLACK, fr, VIGC)
        a_in = smooth((tl - 0.35) / 0.55)
        a_out = 1 - smooth((tl - (dur - 0.55)) / 0.4)
        paste_c(fr, cap, (64, H - 190 - 40 + int((1 - a_in) * 26)), min(a_in, a_out))
        paste_c(fr, WM, (W - 348, 22), 0.9)
        return fr
    return fn


# ------------------------------------------------------------------ intro / outro
ICON = load("icon-512.png")
_m = Image.new("L", (1024, 1024), 0)
ImageDraw.Draw(_m).rounded_rectangle([40, 40, 984, 984], radius=200, fill=255)
ICON_MASK = _m


def text_layer(s, font, fill, sp=0):
    w = int(width_sp(s, font, sp)) + 8
    h = font.size + 14
    L, d = layer(w, h)
    text_sp(d, (2, 2), s, font, fill + (255,), sp)
    return cache(L), w


T_SPT, T_SPT_W = text_layer("SPORTS PERFORMANCE TRACKING", F(26), WHITE, 9)
T_BY, T_BY_W = text_layer("produced by GNK ASG", F(17, False), DIM, 3)


def rings(fr, cx, cy, t, base=170, n=3, col=CYAN):
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for k in range(n):
        ph = (t * 0.55 + k / n) % 1.0
        r = base + ph * 330
        a = int(110 * (1 - ph) ** 1.7)
        od.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col + (a,), width=2)
    base_rgba = fr.convert("RGBA")
    base_rgba.alpha_composite(ov)
    return base_rgba.convert("RGB")


def intro(tl, dur):
    fr = BG.copy()
    cx, cy = W // 2, int(H * 0.40)
    fr = rings(fr, cx, cy, tl, base=150)
    s = 0.84 + 0.16 * smooth(tl / 1.7)
    a = smooth((tl - 0.12) / 0.9)
    size = int(290 * s)
    ic = ICON.resize((size, size), Image.LANCZOS)
    m = ICON_MASK.resize((size, size)).point(lambda v, a=a: int(v * a))
    fr.paste(ic, (cx - size // 2, cy - size // 2), m)
    paste_c(fr, T_SPT, ((W - T_SPT_W) / 2, H * 0.68), smooth((tl - 1.0) / 0.7))
    paste_c(fr, T_BY, ((W - T_BY_W) / 2, H * 0.68 + 52), smooth((tl - 1.8) / 0.7))
    return fr


L1, L1W = text_layer("EVERY METRE.", F(64), WHITE, 2)
L2, L2W = text_layer("EVERY HEARTBEAT.", F(64), WHITE, 2)
L3, L3W = text_layer("EVERY ATHLETE.", F(64), CYAN, 2)
O1, O1W = text_layer("SPT — SPORTS PERFORMANCE TRACKING", F(22), WHITE, 3)
O2, O2W = text_layer("gnk-asg.hr/spt", F(24), LIME, 2)
O3, O3W = text_layer("produced by GNK ASG  ·  Nermin Sefić", F(19, False), (186, 200, 220), 2)


def outro(tl, dur):
    fr = BG.copy()
    fr = rings(fr, W // 2, int(H * 0.36), tl * 0.8, base=260, n=2)
    y0 = 120
    for i, (lc, lw) in enumerate(((L1, L1W), (L2, L2W), (L3, L3W))):
        a = smooth((tl - 0.25 - i * 0.55) / 0.5)
        paste_c(fr, lc, ((W - lw) / 2, y0 + i * 86 + (1 - a) * 18), a)
    a2 = smooth((tl - 2.2) / 0.6)
    size = 74
    ic = ICON.resize((size, size), Image.LANCZOS)
    m = ICON_MASK.resize((size, size)).point(lambda v, a=a2: int(v * a))
    fr.paste(ic, ((W - size) // 2, 420), m)
    paste_c(fr, O1, ((W - O1W) / 2, 512), a2)
    paste_c(fr, O2, ((W - O2W) / 2, 552), smooth((tl - 2.6) / 0.6))
    paste_c(fr, O3, ((W - O3W) / 2, 600), smooth((tl - 2.9) / 0.6))
    fade = smooth((tl - (dur - 0.9)) / 0.85)
    if fade > 0:
        fr = Image.blend(fr, BLACK, fade)
    return fr


# ------------------------------------------------------------------ LIVE ploča
PX0, PY0, PW, PH = 28, 92, 820, 530
RX = 868


def PP(x, y):
    return (PX0 + x * PW, PY0 + y * PH)


HOME = [(0.05, 0.5), (0.22, 0.14), (0.19, 0.38), (0.19, 0.62), (0.22, 0.86), (0.40, 0.30),
        (0.36, 0.50), (0.40, 0.70), (0.60, 0.17), (0.63, 0.50), (0.60, 0.83)]
HOME_NUM = [1, 2, 4, 5, 3, 8, 6, 10, 7, 9, 11]
AWAY = [(0.95, 0.5), (0.80, 0.16), (0.83, 0.38), (0.83, 0.62), (0.80, 0.84), (0.66, 0.16),
        (0.63, 0.40), (0.63, 0.60), (0.66, 0.84), (0.50, 0.42), (0.50, 0.58)]
AWAY_NUM = [1, 2, 5, 4, 3, 7, 8, 6, 11, 9, 10]
_rs = np.random.default_rng(7)
PHH = _rs.uniform(0, 6.28, (11, 4))
PHA = _rs.uniform(0, 6.28, (11, 4))
WH = _rs.uniform(0.45, 1.05, (11, 2))
WA = _rs.uniform(0.45, 1.05, (11, 2))
PASSES = [(0.4, 1.1, 2, 6), (1.9, 2.6, 6, 5), (3.4, 4.2, 5, 8), (6.1, 6.9, 8, 7), (7.6, 8.3, 7, 9)]
SHOT_T0, SHOT_T1 = 9.25, 9.7
GOAL_XY = (1.005, 0.46)


def home_pos(i, t):
    bx, by = HOME[i]
    shift = 0.10 * smooth(t / 9.0) if i > 0 else 0.03 * smooth(t / 9.0)
    w1, w2 = WH[i]
    p = PHH[i]
    x = bx + shift + 0.016 * math.sin(w1 * t + p[0]) + 0.008 * math.sin(2.3 * w2 * t + p[1])
    y = by + 0.020 * math.sin(w2 * t + p[2]) + 0.009 * math.sin(1.7 * w1 * t + p[3])
    if i == 8:
        s = smooth((t - 4.2) / 1.8)
        x += 0.15 * s
        y += 0.05 * s
    if i == 7:
        s = smooth((t - 3.0) / 3.8)
        x += 0.20 * s
        y -= 0.14 * s
    if i == 9:
        s = smooth((t - 7.4) / 2.0)
        x += 0.18 * s
        y -= 0.03 * s
    if t > 9.8 and i > 0:   # slavlje: suigrači trče prema strijelcu
        k = smooth((t - 9.8) / 1.8) * (0.55 if i != 9 else 0.0)
        gx, gy = home_pos(9, 9.8)
        x = lerp(x, gx - 0.03, k * 0.6)
        y = lerp(y, gy, k * 0.6)
    return x, y


def feet(i, t):
    x, y = home_pos(i, t)
    return x + 0.012, y + 0.004


def ball_pos(t):
    if t < PASSES[0][0]:
        return feet(PASSES[0][2], t)
    for k, (t0, t1, a, b) in enumerate(PASSES):
        if t0 <= t <= t1:
            p0 = feet(a, t0)
            p1 = feet(b, t1)
            u = smooth((t - t0) / (t1 - t0)) * 0.35 + ((t - t0) / (t1 - t0)) * 0.65
            return lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u)
        nxt = PASSES[k + 1][0] if k + 1 < len(PASSES) else SHOT_T0
        if t1 < t < nxt:
            return feet(b, t)
    if t < SHOT_T0:
        return feet(9, t)
    if t <= SHOT_T1:
        p0 = feet(9, SHOT_T0)
        u = (t - SHOT_T0) / (SHOT_T1 - SHOT_T0)
        return lerp(p0[0], GOAL_XY[0], u), lerp(p0[1], GOAL_XY[1], u)
    return GOAL_XY[0] + 0.004 * math.sin(t * 9) * max(0, 1 - (t - SHOT_T1)), GOAL_XY[1]


def away_pos(i, t):
    bx, by = AWAY[i]
    _, bly = ball_pos(t)
    w1, w2 = WA[i]
    p = PHA[i]
    if i == 0:
        return bx, 0.5 + 0.35 * (bly - 0.5) + 0.004 * math.sin(t * 2)
    shift = 0.07 * smooth(t / 9.0)
    x = bx + shift + 0.015 * math.sin(w1 * t + p[0]) + 0.007 * math.sin(2.1 * w2 * t + p[1])
    y = by + 0.13 * (bly - 0.5) + 0.018 * math.sin(w2 * t + p[2])
    return x, y


def spd9(t):
    v = 10.5 + 2.6 * math.sin(0.9 * t) + 1.2 * math.sin(2.3 * t + 1) + 18.0 * bump(t, 7.3, 8.0, 9.3, 10.6)
    return max(0.0, v)


_ts = np.arange(0, 12.5, 1 / FPS)
_dist = 7.418 + np.cumsum([spd9(x) / 3600.0 / FPS for x in _ts])
_tmax = np.maximum.accumulate([spd9(x) for x in _ts])


def dist9(t):
    return float(_dist[min(len(_dist) - 1, int(t * FPS))])


def top9(t):
    return max(29.1, float(_tmax[min(len(_tmax) - 1, int(t * FPS))]))


def hr9(t):
    return 157 + 6 * math.sin(0.5 * t) + 19 * bump(t, 7.5, 8.7, 10.2, 12.5)


def build_live_static():
    im = Image.new("RGBA", (W, H), (6, 11, 20, 255))
    d = ImageDraw.Draw(im)
    for x in range(0, W, 40):
        d.line([(x, 0), (x, H)], fill=(9, 17, 29, 255))
    for y in range(0, H, 40):
        d.line([(0, y), (W, y)], fill=(9, 17, 29, 255))
    for k in range(12):
        x0 = PX0 + k * PW / 12
        x1 = PX0 + (k + 1) * PW / 12
        d.rectangle([x0, PY0, x1, PY0 + PH], fill=(16, 60, 40, 255) if k % 2 == 0 else (13, 52, 34, 255))
    lc = (205, 232, 218, 255)
    d.rectangle([PX0, PY0, PX0 + PW, PY0 + PH], outline=lc, width=2)
    d.line([PP(.5, 0), PP(.5, 1)], fill=lc, width=2)
    cx, cy = PP(.5, .5)
    r = 9.15 / 105 * PW
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=lc, width=2)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=lc)
    pw_, ph_ = 16.5 / 105, 40.32 / 68
    gw, gh = 5.5 / 105, 18.32 / 68
    gg = 7.32 / 68
    for side in (0, 1):
        if side == 0:
            d.rectangle([PP(0, .5 - ph_ / 2), PP(pw_, .5 + ph_ / 2)], outline=lc, width=2)
            d.rectangle([PP(0, .5 - gh / 2), PP(gw, .5 + gh / 2)], outline=lc, width=2)
            d.rectangle([PP(-0.014, .5 - gg / 2), PP(0, .5 + gg / 2)], outline=lc, width=2)
        else:
            d.rectangle([PP(1 - pw_, .5 - ph_ / 2), PP(1, .5 + ph_ / 2)], outline=lc, width=2)
            d.rectangle([PP(1 - gw, .5 - gh / 2), PP(1, .5 + gh / 2)], outline=lc, width=2)
            d.rectangle([PP(1, .5 - gg / 2), PP(1.014, .5 + gg / 2)], outline=lc, width=2)
    for xx_ in (11 / 105, 1 - 11 / 105):
        px, py = PP(xx_, .5)
        d.ellipse([px - 2.5, py - 2.5, px + 2.5, py + 2.5], fill=lc)
    panel = (10, 18, 32, 255)
    edge = (30, 46, 70, 255)
    d.rounded_rectangle([RX, PY0, W - 24, PY0 + PH], radius=14, fill=panel, outline=edge)
    d.rounded_rectangle([24, 16, W - 24, 76], radius=12, fill=panel, outline=edge)
    d.rounded_rectangle([24, 638, W - 24, 704], radius=12, fill=panel, outline=edge)
    # statični natpisi
    text_sp(d, (RX + 20, PY0 + 14), "LIVE TRACKING", F(12), DIM + (255,), 3)
    d.text((RX + 20, PY0 + 30), "#9 · STRIKER", font=F(25), fill=WHITE + (255,))
    text_sp(d, (RX + 20, PY0 + 140), "SPEED", F(12), DIM + (255,), 3)
    labels = [("DISTANCE", 0, 0), ("HEART RATE", 1, 0), ("SPRINTS", 0, 1), ("PLAYER LOAD", 1, 1)]
    for lab, cx_, cy_ in labels:
        bx = RX + 20 + cx_ * 180
        by = PY0 + 166 + cy_ * 70
        d.rounded_rectangle([bx, by, bx + 168, by + 60], radius=10, fill=(14, 25, 43, 255), outline=(32, 50, 76, 255))
        text_sp(d, (bx + 12, by + 8), lab, F(10), DIM + (255,), 2)
    text_sp(d, (RX + 20, PY0 + 312), "HR ZONES", F(11), DIM + (255,), 2)
    text_sp(d, (RX + 20, PY0 + 352), "SPEED · LAST 10 s", F(11), DIM + (255,), 2)
    text_sp(d, (RX + 20, PY0 + 430), "TOP SPEED · MATCH", F(11), DIM + (255,), 2)
    return im


LIVE_STATIC = build_live_static()
BOARD = [("#7", 31.2), ("#11", 30.6), ("#2", 29.8), ("#9", 29.1), ("#8", 28.7)]


def live(tl, dur):
    t = clamp(tl, 0, 12.4)
    fr = LIVE_STATIC.copy()
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    # trag strijelca #9
    for k in range(30, 0, -1):
        x, y = home_pos(9, t - k * 0.06)
        px, py = PP(x, y)
        a = int(150 * (1 - k / 30))
        r = 2.5 + 3.5 * (1 - k / 30)
        od.ellipse([px - r, py - r, px + r, py + r], fill=LIME + (a,))
    for (t0, t1, a_, b_) in PASSES:
        if t0 <= t <= t1 + 0.3:
            p0 = PP(*feet(a_, t0))
            p1 = PP(*feet(b_, t1))
            al = int(180 * (1 - smooth((t - t1) / 0.3))) if t > t1 else 180
            od.line([p0, p1], fill=CYAN + (al,), width=2)
    if SHOT_T0 <= t <= SHOT_T1 + 0.4:
        p0 = PP(*feet(9, SHOT_T0))
        p1 = PP(*GOAL_XY)
        od.line([p0, p1], fill=LIME + (200,), width=3)
    for i in range(11):
        px, py = PP(*home_pos(i, t))
        od.ellipse([px - 15, py - 15, px + 15, py + 15], fill=CYAN + (38,))
        px, py = PP(*away_pos(i, t))
        od.ellipse([px - 14, py - 14, px + 14, py + 14], fill=ORANGE + (32,))
    # upozorenje (ACWR)
    aa = bump(t, 4.2, 4.55, 8.0, 8.4)
    if aa > 0:
        x0 = PX0 + 16 - (1 - aa) * 40
        y0 = PY0 + 14
        od.rounded_rectangle([x0, y0, x0 + 500, y0 + 66], radius=10, fill=(60, 10, 16, int(225 * aa)),
                             outline=RED + (int(255 * aa),), width=2)
    fr.alpha_composite(ov)
    d = ImageDraw.Draw(fr)
    if aa > 0:
        x0 = PX0 + 16 - (1 - aa) * 40
        y0 = PY0 + 14
        c1 = tuple(int(v * aa + 40 * (1 - aa)) for v in (255, 120, 124))
        c2 = tuple(int(v * aa + 40 * (1 - aa)) for v in (236, 222, 226))
        d.text((x0 + 16, y0 + 10), "⚠  #6 · ACWR 1.52 · HIGH INJURY RISK", font=F(16), fill=c1)
        d.text((x0 + 16, y0 + 36), "Load spike +38 % vs 4-week average — consider substitution", font=F(13, False), fill=c2)
    for i in range(11):
        px, py = PP(*away_pos(i, t))
        d.ellipse([px - 9, py - 9, px + 9, py + 9], fill=(178, 74, 38), outline=ORANGE, width=2)
        n = str(AWAY_NUM[i])
        d.text((px - F(10).getlength(n) / 2, py - 6), n, font=F(10), fill=WHITE)
    for i in range(11):
        px, py = PP(*home_pos(i, t))
        d.ellipse([px - 9, py - 9, px + 9, py + 9], fill=(18, 120, 170), outline=CYAN, width=2)
        n = str(HOME_NUM[i])
        d.text((px - F(10).getlength(n) / 2, py - 6), n, font=F(10), fill=WHITE)
    px, py = PP(*home_pos(9, t))
    rr = 15 + 2 * math.sin(t * 6)
    d.ellipse([px - rr, py - rr, px + rr, py + rr], outline=LIME, width=2)
    sp = spd9(t)
    tag = f"#9  {sp:.1f} km/h"
    tx = min(px + 16, PX0 + PW - F(13).getlength(tag) - 6)
    d.rounded_rectangle([tx - 5, py - 30, tx + F(13).getlength(tag) + 5, py - 11], radius=5, fill=(8, 16, 28))
    d.text((tx, py - 29), tag, font=F(13), fill=LIME)
    bx, by = PP(*ball_pos(t))
    d.ellipse([bx - 5, by - 5, bx + 5, by + 5], fill=(255, 255, 255), outline=(25, 25, 25))
    # GOL
    goal = t >= SHOT_T1 + 0.05
    ga = bump(t, SHOT_T1 + 0.05, SHOT_T1 + 0.3, 11.8, 12.3)
    if ga > 0:
        gl, gd = layer(560, 200)
        s = "GOAL!"
        gd.text(((560 - F(120).getlength(s)) / 2, 10), s, font=F(120), fill=CYAN + (255,))
        glow = gl.filter(ImageFilter.GaussianBlur(14))
        cx, cy = PP(.5, .5)
        fr.alpha_composite(glow, (int(cx - 280), int(cy - 110)))
        fr.alpha_composite(glow, (int(cx - 280), int(cy - 110)))
        al = gl.getchannel("A").point(lambda v, a=ga: int(v * a))
        fr.paste(gl.convert("RGB"), (int(cx - 280), int(cy - 110)), al)
        s2 = "COASTLINE UTD 3 : 1"
        d.text((cx - F(26).getlength(s2) / 2, cy + 64), s2, font=F(26), fill=tuple(int(v * ga) for v in WHITE))
    # gornja traka
    pulse = 0.55 + 0.45 * math.sin(t * 5)
    d.ellipse([44, 37, 60, 53], fill=tuple(int(v * pulse + 30 * (1 - pulse)) for v in RED))
    d.text((70, 33), "LIVE", font=F(20), fill=RED)
    text_sp(d, (128, 38), "SPT CONTROL ROOM · DEMO", F(13), DIM, 2)
    score = "3 : 1" if goal else "2 : 1"
    sw = F(34).getlength(score)
    d.text((W / 2 - sw / 2, 24), score, font=F(34), fill=WHITE)
    hn = "COASTLINE UTD"
    d.text((W / 2 - sw / 2 - 18 - F(18).getlength(hn), 33), hn, font=F(18), fill=CYAN)
    d.text((W / 2 + sw / 2 + 18, 33), "BAY CITY", font=F(18), fill=ORANGE)
    secs = int(63 * 60 + 12 + t)
    clock = f"{secs // 60}:{secs % 60:02d}"
    d.text((W / 2 + sw / 2 + 130, 33), clock, font=F(18, mono=True), fill=WHITE)
    rt = "GPS 20 Hz · UWB · 22/22 TAGS ✓"
    d.text((W - 44 - F(14).getlength(rt), 36), rt, font=F(14), fill=LIME)
    # desni panel — dinamika
    col = LIME if sp > 25 else WHITE
    s = f"{sp:4.1f}"
    d.text((RX + 20, PY0 + 62), s, font=F(64), fill=col)
    d.text((RX + 28 + F(64).getlength(s), PY0 + 104), "km/h", font=F(18, False), fill=DIM)
    vals = [(f"{dist9(t):.2f} km", 0, 0, WHITE), (f"{hr9(t):.0f} bpm", 1, 0, RED if hr9(t) > 175 else AMBER),
            (f"{14 + (1 if t > 8.2 else 0)}", 0, 1, WHITE), (f"{612 + 2.4 * t:.0f} AU", 1, 1, WHITE)]
    for v, cx_, cy_, c in vals:
        d.text((RX + 32 + cx_ * 180, PY0 + 190 + cy_ * 70), v, font=F(22), fill=c)
    hr = hr9(t)
    zone = 0 if hr < 117 else 1 if hr < 137 else 2 if hr < 157 else 3 if hr < 176 else 4
    zc = [(70, 110, 160), (56, 214, 245), (163, 230, 53), (251, 191, 36), (255, 90, 95)]
    for z in range(5):
        x0 = RX + 20 + z * 70
        on = z == zone
        fill = zc[z] if on else tuple(int(v * 0.28) for v in zc[z])
        d.rounded_rectangle([x0, PY0 + 330, x0 + 64, PY0 + 344], radius=4, fill=fill)
        if on:
            d.text((x0 + 18, PY0 + 330), f"Z{z + 1}", font=F(11), fill=(8, 14, 24))
    # sparkline brzine
    gx0, gy0, gw_, gh_ = RX + 20, PY0 + 370, 352, 50
    pts = []
    for k in range(60):
        tt = t - 10 + k * (10 / 59)
        v = spd9(tt) if tt >= 0 else spd9(0)
        pts.append((gx0 + k * gw_ / 59, gy0 + gh_ - (v / 36) * gh_))
    d.line([(gx0, gy0 + gh_), (gx0 + gw_, gy0 + gh_)], fill=(30, 46, 70))
    d.line(pts, fill=CYAN, width=2)
    d.ellipse([pts[-1][0] - 4, pts[-1][1] - 4, pts[-1][0] + 4, pts[-1][1] + 4], fill=LIME)
    # ljestvica brzine
    board = [(n, top9(t) if n == "#9" else v) for n, v in BOARD]
    board.sort(key=lambda x: -x[1])
    for k, (n, v) in enumerate(board):
        y = PY0 + 448 + k * 15.5
        me = n == "#9"
        c = LIME if me else (200, 212, 228)
        d.text((RX + 20, y), f"{k + 1}. {n}", font=F(12), fill=c)
        bw = (v - 26) / 8 * 220
        d.rounded_rectangle([RX + 92, y + 3, RX + 92 + bw, y + 11], radius=3, fill=LIME if me else (44, 92, 130))
        d.text((RX + 320, y), f"{v:.1f}", font=F(12), fill=c)
    # donja traka
    stats = [("TEAM DISTANCE", f"{74.62 + 0.031 * t:.2f} km"), ("HIGH-SPEED RUNNING", f"{6.18 + 0.006 * t:.2f} km"),
             ("SPRINTS", f"{117 + (1 if t > 2.5 else 0) + (1 if t > 8.2 else 0)}"),
             ("AVG HEART RATE", f"{151 + 3 * bump(t, 7, 9, 11, 12.5):.0f} bpm"), ("POSSESSION", "58 %")]
    cw = (W - 48) / 5
    for k, (lab, v) in enumerate(stats):
        x0 = 24 + k * cw + 22
        text_sp(d, (x0, 648), lab, F(10), DIM, 2)
        d.text((x0, 666), v, font=F(21), fill=WHITE)
    return fr.convert("RGB")


# ------------------------------------------------------------------ montaža
SCENES = [
    (0.0, 4.0, intro),
    (4.0, 8.0, kb_scene("hero_stadium_usa.png", "MATCH DAY · USA", "Every player. Every second.", None, 1.0, 1.12, (.5, .55), (.55, .5))),
    (8.0, 11.5, kb_scene("vest_front.png", "SPT VEST", "GPS 20 Hz + UWB indoor", None, 1.02, 1.16)),
    (11.5, 14.5, kb_scene("vest_back.png", "SENSOR POD", "Between the shoulder blades", None, 1.12, 1.0)),
    (14.5, 18.0, kb_scene("chip_pod.png", "SPT POD", "1000 Hz IMU · IP67", None, 1.0, 1.22, (.5, .5), (.47, .45))),
    (18.0, 21.0, kb_scene("watch.png", "SPT WATCH", "Heart rate · HRV · zones", None, 1.04, 1.18)),
    (21.0, 24.0, kb_scene("uwb_anchor.png", "INDOOR POSITIONING", "UWB anchors · ±10 cm", None, 1.0, 1.15, (.6, .45), (.66, .42))),
    (24.0, 27.0, kb_scene("edge_server.png", "SPT EDGE ONE", "Stadium server · < 1 s live", None, 1.12, 1.0)),
    (27.0, 39.0, live),
    (39.0, 42.5, kb_scene("coach_tablet.png", "SIDELINE", "Decisions in real time", None, 1.0, 1.12, (.6, .5), (.7, .45))),
    (42.5, 46.0, kb_scene("analytics_screen.png", "AI ANALYTICS", "Injury risk · ACWR · biomechanics", None, 1.0, 1.12, (.4, .45), (.35, .45))),
    (46.0, 49.5, kb_scene("control_room.png", "CONTROL ROOM", "Up to 12 live tiles", None, 1.12, 1.0)),
    (49.5, 52.5, kb_scene("training_vests.png", "TRAINING", "Every session measured", None, 1.0, 1.1, (.55, .5), (.5, .5))),
    (52.5, 55.5, kb_scene("mobile_app.png", "FOR EVERY ATHLETE", "Daily readiness score", None, 1.0, 1.14, (.5, .5), (.46, .45))),
    (55.5, 61.0, outro),
]
TOTAL = SCENES[-1][1]
XF = 0.2


def frame_at(T):
    for i, (s, e, fn) in enumerate(SCENES):
        if s <= T < e or (i == len(SCENES) - 1 and T >= s):
            break
    s, e, fn = SCENES[i]
    cur = fn(T - s, e - s)
    if i > 0 and T - s < XF:
        ps, pe, pfn = SCENES[i - 1]
        w = 0.5 + (T - s) / (2 * XF)
        return Image.blend(pfn(T - ps, pe - ps), cur, w)
    if i < len(SCENES) - 1 and e - T < XF:
        ns, ne, nfn = SCENES[i + 1]
        w = (T - (e - XF)) / (2 * XF)
        return Image.blend(cur, nfn(max(0.0, T - ns), ne - ns), w)
    return cur


# ------------------------------------------------------------------ zvuk
# v2: zvučni zapis je u film_audio.py (bez šumnih prijelaza; publika, srce, lopta, zviždaljka)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from film_audio import build_audio  # noqa: E402


def main():
    wav = os.path.join("/tmp", "spt_film_audio.wav")
    build_audio(wav)
    print("audio ✓", flush=True)
    enc = subprocess.run([FF, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
    vc = ["-c:v", "libx264", "-preset", "medium", "-crf", "23", "-profile:v", "high"] if "libx264" in enc \
        else ["-c:v", "mpeg4", "-q:v", "4"]
    out = os.path.join(OUT, "spt-film.mp4")
    cmd = [FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", wav] + vc + ["-pix_fmt", "yuv420p", "-movflags", "+faststart",
                                          "-c:a", "aac", "-b:a", "128k", "-shortest", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = int(TOTAL * FPS)
    for k in range(n):
        T = k / FPS
        fr = frame_at(T)
        p.stdin.write(fr.tobytes())
        if k % 300 == 0:
            print(f"frame {k}/{n}", flush=True)
    p.stdin.close()
    p.wait()
    print("video ✓", out, os.path.getsize(out) // 1024, "KB", "codec", vc[1], flush=True)
    # poster i statični kadrovi s nadzorne ploče
    frame_at(33.6).save(os.path.join(OUT, "spt-film-poster.webp"), quality=86)
    live(8.6, 12).save(os.path.join(OUT, "live-hud-sprint.webp"), quality=88)
    live(10.6, 12).save(os.path.join(OUT, "live-hud-goal.webp"), quality=88)
    live(5.6, 12).save(os.path.join(OUT, "live-hud-alert.webp"), quality=88)
    print("poster ✓", flush=True)


if __name__ == "__main__":
    main()
