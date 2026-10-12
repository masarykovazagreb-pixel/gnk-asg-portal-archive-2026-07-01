#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPT film — zvučni zapis v3 (bez naracije i govora): vedra glazba + zvukovi raznih sportova

Što je novo u odnosu na v2 (v2 je bio "pretužan" — samo stadion, srce i duboki boom):
  * vedra instrumentalna sportska pjesma (bez vokala), 120 BPM, D-dur, usklađena sa scenama:
    uvod s arpeggiom → dan utakmice s melodijom → ritam ispod uređaja → mekani akordi i zvončići
    na otkucaje srca (sat) → gradacija → utakmica → napetost (samo srce) → GOL (puna pjesma)
    → završni refren i veseli završni akord D-dur
  * zvukovi raznih sportova: tenis (izmjena udaraca), košarka (vođenje lopte, tenisice),
    plivanje (skok u vodu uz kadar IP67), atletika (elektronički start, sprint), hokej,
    veslanje, trčanje, biciklističko zvonce — uz postojeći nogomet i odbojku
  * bubnjevi i ritmični pljesak navijača poravnani su s taktom glazbe
  * zadržano: otkucaji srca (glazba se tada povuče), glasni navijači, gol, sudačka zviždaljka;
    i dalje bez šumnih "whoosh" prijelaza (zvučali su kao šmrcanje)
  * završna obrada: kompresija, meki limiter, dvoprolazna normalizacija -16 LUFS

produced by GNK ASG · Nermin Sefić

Upotreba:
  python film_audio.py <ulaz.mp4> <izlaz.mp4>   zamijeni zvuk (video se kopira bez rekompresije)
  python film_audio.py --wav <izlaz.wav>        samo WAV
Treba: numpy, imageio-ffmpeg
"""
import json
import math
import os
import subprocess
import sys
import wave
from functools import lru_cache

import numpy as np

SR = 44100
TOTAL = 61.0
N = int(TOTAL * SR)
NFFT = 1 << int(math.ceil(math.log2(N + 4 * SR)))
tt = np.arange(N) / SR

# Vremenska crta filma (s) — odgovara SCENES u build_film.py
L0 = 27.0                                    # početak LIVE utakmice (27–39 s)
PASSES = [(0.4, 1.1), (1.9, 2.6), (3.4, 4.2), (6.1, 6.9), (7.6, 8.3)]
PASS_PAN = [-0.55, -0.25, 0.05, 0.3, 0.5]
SHOT_T0, SHOT_T1 = 9.25, 9.7                 # udarac / gol (relativno na L0)
SHOT = L0 + SHOT_T0                          # 36.25 s
GOAL = L0 + SHOT_T1                          # 36.70 s
ALERT = L0 + 4.2                             # ACWR alarm za #6

rng = np.random.default_rng(2026)


# ------------------------------------------------------------------ alati
def filt(x, resp):
    """Filtriranje bez faznog pomaka preko FFT-a; resp(f) vraća amplitudni odziv."""
    n = len(x)
    nf = NFFT if n == N else 1 << int(math.ceil(math.log2(n + 1)))
    f = np.fft.rfftfreq(nf, 1 / SR)
    return np.fft.irfft(np.fft.rfft(x, nf) * resp(f), nf)[:n]


def bp(lo, hi, order=2):
    def r(f):
        f = np.maximum(f, 1e-3)
        a = (f / lo) ** (2 * order)
        return (a / (1 + a)) / (1 + (f / hi) ** (2 * order))
    return r


def lp(hi, order=2):
    return lambda f: 1 / (1 + (np.maximum(f, 1e-3) / hi) ** (2 * order))


def env_db(points, shift=0.0):
    ts = [p[0] for p in points]
    ds = [p[1] for p in points]
    return 10 ** (np.interp(tt - shift, ts, ds) / 20)


def movavg(x, w):
    if w <= 1 or len(x) <= 2 * w:
        return x
    c = np.cumsum(np.concatenate([[0.0], x]))
    y = (c[w:] - c[:-w]) / w
    pl = w // 2
    return np.concatenate([np.full(pl, y[0]), y, np.full(len(x) - len(y) - pl, y[-1])])


def slow_noise(rate_hz, seed, n=N):
    """Glatki slučajni signal (~N(0,1)) širine pojasa ~rate_hz."""
    r = np.random.default_rng(seed)
    k = max(4, int(n / SR * rate_hz) + 4)
    x = np.interp(np.linspace(0, k - 1, n), np.arange(k), r.standard_normal(k))
    x = movavg(x, max(1, int(SR / rate_hz / 2)))
    x -= np.mean(x)
    return x / (np.std(x) + 1e-9)


def envelope(n, att, rel):
    e = np.ones(n)
    a = max(1, min(n, int(att * SR)))
    r_ = max(1, min(n, int(rel * SR)))
    e[:a] = np.linspace(0, 1, a)
    e[-r_:] *= np.linspace(1, 0, r_)
    return e


def pan_gains(p):
    return math.cos((p + 1) * math.pi / 4) * 1.414, math.sin((p + 1) * math.pi / 4) * 1.414


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, sig, T, gain=1.0, pan=0.0):
        i = int(round(T * SR))
        if i >= N or i + len(sig) <= 0:
            return
        s0 = max(0, -i)
        i = max(0, i)
        j = min(N, i + len(sig) - s0)
        gl, gr = pan_gains(pan)
        self.L[i:j] += sig[s0:s0 + j - i] * gain * gl
        self.R[i:j] += sig[s0:s0 + j - i] * gain * gr


# ------------------------------------------------------------------ jeka
def make_ir(rt60, length, seed, predelay=0.025, hf=0.45, early=8):
    r = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    out = []
    for _ in range(2):
        noise = r.standard_normal(n)
        low = filt(noise, lp(1400, 1))
        high = noise - low
        ir = low * np.exp(-6.91 * t / rt60) + 0.55 * high * np.exp(-6.91 * t / (rt60 * hf))
        ir *= 1 - np.exp(-t / 0.012)                       # mekši početak repa
        pd = int(predelay * SR)
        ir = np.concatenate([np.zeros(pd), ir])[:n]
        for _k in range(early):                            # rane refleksije s tribina
            d = int(r.uniform(0.018, 0.16) * SR)
            if d < n:
                ir[d] += r.uniform(0.25, 0.6) * (1 if r.random() > 0.5 else -1) * 6
        out.append(ir / np.sqrt(np.sum(ir ** 2)))
    return out


def convolve(x, ir):
    return np.fft.irfft(np.fft.rfft(x, NFFT) * np.fft.rfft(ir, NFFT), NFFT)[:N]


# ------------------------------------------------------------------ publika (glasovi)
VOWELS = {
    "a": (730, 1150, 2600), "e": (480, 1850, 2550), "i": (310, 2250, 2950),
    "o": (520, 880, 2450), "u": (340, 760, 2350), "ae": (620, 1600, 2500),
}


def formant_resp(F, scale=1.0, bw=(120, 160, 240), amps=(1.0, 0.55, 0.28)):
    def r(f):
        h = np.zeros_like(f)
        for Fk, Bk, Ak in zip(F, bw, amps):
            h += Ak / (1 + ((f - Fk * scale) / (Bk * scale / 2)) ** 2)
        tilt = 1 / (1 + (np.maximum(f, 1e-3) / 3200) ** 2)
        hp = (np.maximum(f, 1e-3) / 140) ** 2 / (1 + (np.maximum(f, 1e-3) / 140) ** 2)
        return (h + 0.015) * tilt * hp
    return r


def chatter_gate(r):
    """Slogovni ritam razgovora: fraze 0,8–3 s, stanke 0,3–2 s, 3–5,5 slogova/s."""
    g = np.zeros(N)
    t = r.uniform(0, 1.2)
    while t < TOTAL:
        end = min(TOTAL, t + r.uniform(0.8, 3.0))
        rate = r.uniform(3.0, 5.5)
        s = t
        while s < end:
            sl = r.uniform(0.6, 1.4) / rate
            i0, i1 = int(s * SR), min(N, int((s + sl * 0.85) * SR))
            if i1 > i0:
                w = np.sin(np.linspace(0, np.pi, i1 - i0)) ** 0.7
                np.maximum(g[i0:i1], r.uniform(0.45, 1.0) * w, out=g[i0:i1])
            s += sl
        t = end + r.uniform(0.3, 2.0)
    return g


def voice_source(f0, r, breath):
    ph = np.cumsum(f0) / SR
    saw = 2.0 * (ph % 1.0) - 1.0
    return saw + breath * r.standard_normal(N)


def crowd_murmur(n_voices=48, seed=11):
    """Žamor: mnogo glasova, svaki s vlastitom visinom, samoglasnikom, položajem i ritmom."""
    r = np.random.default_rng(seed)
    keys = list(VOWELS)
    L = np.zeros(N)
    R = np.zeros(N)
    groups = {}
    for v in range(n_voices):
        scale = 1.0 if v % 2 == 0 else 1.17                 # muški / ženski i dječji glasovi
        groups.setdefault((keys[v % len(keys)], scale), []).append(v)
    for (vk, scale), members in groups.items():
        gL = np.zeros(N)
        gR = np.zeros(N)
        for v in members:
            base = r.uniform(95, 170) if scale == 1.0 else r.uniform(170, 290)
            f0 = base * (1 + 0.07 * slow_noise(0.9, 1000 + v) + 0.015 * slow_noise(6.0, 2000 + v))
            src = voice_source(f0, r, 0.22) * chatter_gate(r)
            pl, pr_ = pan_gains(r.uniform(-0.9, 0.9))
            g = r.uniform(0.35, 1.0)
            gL += src * g * pl
            gR += src * g * pr_
        resp = formant_resp(VOWELS[vk], scale)
        L += filt(gL, resp)
        R += filt(gR, resp)
    n = np.sqrt(np.mean(L ** 2) + np.mean(R ** 2)) + 1e-9
    return L / n, R / n


ROAR_PTS = [(0, -90), (3.9, -90), (4.25, -12), (5.4, -19), (6.6, -45), (7.2, -90),
            (34.1, -90), (34.8, -24), (36.15, -11), (36.35, -15), (36.78, -1), (38.0, -4),
            (39.4, -15), (40.6, -42), (41.2, -90),
            (55.9, -90), (56.6, -17), (57.4, -13), (58.25, -4), (59.7, -9), (61.0, -60)]


def crowd_roar(n_voices=36, seed=23):
    """Navijači: "ooo" napetost, erupcija na gol, završno slavlje — otvoreni samoglasnici, visoki tonovi."""
    r = np.random.default_rng(seed)
    E = env_db(ROAR_PTS)
    En = E / E.max()
    L = np.zeros(N)
    R = np.zeros(N)
    groups = {}
    for v in range(n_voices):
        scale = 1.0 if v % 3 else 1.17
        groups.setdefault((("a", "o", "e")[v % 3], scale), []).append(v)
    for (vk, scale), members in groups.items():
        gL = np.zeros(N)
        gR = np.zeros(N)
        for v in members:
            base = r.uniform(150, 260) if scale == 1.0 else r.uniform(240, 420)
            f0 = base * (1 + 0.22 * En) * (1 + 0.02 * slow_noise(5.0, 3000 + v) + 0.04 * slow_noise(0.7, 4000 + v))
            gate = env_db(ROAR_PTS, shift=r.uniform(0.0, 0.28))
            gate *= np.clip(0.62 + 0.5 * slow_noise(1.4, 5000 + v), 0.12, 1.0)
            src = voice_source(f0, r, 0.55) * gate
            pl, pr_ = pan_gains(r.uniform(-0.95, 0.95))
            g = r.uniform(0.4, 1.0)
            gL += src * g * pl
            gR += src * g * pr_
        resp = formant_resp(VOWELS[vk], scale, bw=(150, 210, 300))
        L += filt(gL, resp)
        R += filt(gR, resp)
    # širokopojasni dio vike (ne kratki udisaj — traje sekundama, ide uz glasove, ~8 dB ispod njih)
    Erms = np.sqrt(np.mean(E ** 2)) + 1e-12
    for tgt, s in ((L, 91), (R, 92)):
        nz = filt(np.random.default_rng(s).standard_normal(N), formant_resp(VOWELS["a"], 1.08, bw=(400, 600, 900)))
        nz /= np.std(nz) + 1e-9
        tgt += 0.4 * nz * E * (np.std(tgt) / Erms)
    n = np.sqrt(np.mean(L ** 2) + np.mean(R ** 2)) + 1e-9
    return L / n, R / n


# ------------------------------------------------------------------ zvukovi
def ball_kick(strength=1.0):
    n = int(0.26 * SR)
    t = np.arange(n) / SR
    f = 92 + 170 * np.exp(-t / 0.012)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    slap = filt(rng.standard_normal(n), bp(900, 3800)) * np.exp(-t / 0.006)
    slap /= np.max(np.abs(slap)) + 1e-9
    thud = np.sin(2 * np.pi * 62 * t) * np.exp(-t / 0.06)
    return (0.9 * body + 0.55 * slap + 0.45 * thud) * strength * (1 - np.exp(-t / 0.0008)) * 0.7


def ref_whistle(dur, f0=3050):
    n = int(dur * SR)
    t = np.arange(n) / SR
    trill = 2 * np.pi * np.cumsum(28 + 4 * np.sin(2 * np.pi * 0.8 * t)) / SR    # kuglica u zviždaljci
    fm = f0 + 140 * np.sin(trill)
    ph = 2 * np.pi * np.cumsum(fm) / SR
    am = 0.72 + 0.28 * np.sin(trill + 0.8)
    s = (np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)) * am
    air = filt(rng.standard_normal(n), bp(2600, 5200)) * 0.035
    return (s + air) * envelope(n, 0.012, 0.06) * 0.5


def fan_whistle():
    """Zvižduk navijača prstima — kratki tonski 'fiju'."""
    d = rng.uniform(0.28, 0.6)
    n = int(d * SR)
    t = np.arange(n) / SR
    f1, f2 = rng.uniform(1900, 2400), rng.uniform(2700, 3400)
    up = rng.random() > 0.4
    f = f1 + (f2 - f1) * np.sin(np.pi * t / d) ** 2 if up else f2 - (f2 - f1) * (t / d)
    ph = 2 * np.pi * np.cumsum(f + 25 * np.sin(2 * np.pi * 7 * t)) / SR
    return (np.sin(ph) + 0.12 * np.sin(2 * ph)) * envelope(n, 0.03, 0.08) * 0.3


def heart_pair():
    """'lub-dub' — osnovni ton + harmonici (čuje se i na malim zvučnicima)."""
    n = int(0.6 * SR)
    t = np.arange(n) / SR

    def thump(t0, fh, fl, dec, amp):
        out = np.zeros(n)
        m = t >= t0
        x = t[m] - t0
        f = fl + (fh - fl) * np.exp(-x / 0.025)
        ph = 2 * np.pi * np.cumsum(f) / SR
        e = (1 - np.exp(-x / 0.004)) * np.exp(-x / dec)
        out[m] = amp * (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.22 * np.sin(3 * ph)) * e
        return out

    s = thump(0.0, 96, 48, 0.05, 1.0) + thump(0.29, 124, 62, 0.038, 0.72)
    return filt(s, lp(700)) * 0.9


def drum_hit(strength=1.0):
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = 56 + 74 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    body += 0.35 * np.sin(2 * 2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)
    click = filt(rng.standard_normal(n), bp(1800, 5000)) * np.exp(-t / 0.003)
    click /= np.max(np.abs(click)) + 1e-9
    return (body + 0.25 * click) * strength * (1 - np.exp(-t / 0.001)) * 0.8


CLAP_KERNELS = []
for _k in range(6):
    _n = int(0.05 * SR)
    _t = np.arange(_n) / SR
    _c = filt(np.random.default_rng(700 + _k).standard_normal(_n), bp(rng.uniform(800, 1300), rng.uniform(2600, 4200)))
    _c *= (1 - np.exp(-_t / 0.0007)) * np.exp(-_t / rng.uniform(0.006, 0.013))
    CLAP_KERNELS.append(_c / (np.max(np.abs(_c)) + 1e-9))


def claps_from_times(times, gains, pans, bus, gain=1.0):
    """Svaki pljesak je zaseban kratki prasak (8–15 ms) — ne dulji šum."""
    for k in range(len(CLAP_KERNELS)):
        imp = [np.zeros(N), np.zeros(N)]
        sel = np.arange(len(times)) % len(CLAP_KERNELS) == k
        for T, g, p in zip(np.asarray(times)[sel], np.asarray(gains)[sel], np.asarray(pans)[sel]):
            i = int(T * SR)
            if 0 <= i < N:
                gl, gr = pan_gains(p)
                imp[0][i] += g * gl
                imp[1][i] += g * gr
        for ch in (0, 1):
            if imp[ch].any():
                y = np.fft.irfft(np.fft.rfft(imp[ch], NFFT) * np.fft.rfft(CLAP_KERNELS[k], NFFT), NFFT)[:N]
                (bus.L if ch == 0 else bus.R)[:] += y * gain


def blip(f1=880, f2=1320):
    n = int(0.07 * SR)
    t = np.arange(n) / SR
    e = envelope(n, 0.003, 0.05)
    out = np.zeros(int(0.17 * SR))
    out[:n] += np.sin(2 * np.pi * f1 * t) * e
    k = int(0.08 * SR)
    out[k:k + n] += np.sin(2 * np.pi * f2 * t) * e
    return out


def alert_ping():
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    e = envelope(n, 0.003, 0.07)
    out = np.zeros(int(0.42 * SR))
    for j, f in enumerate((1046.5, 1318.5, 1568.0)):
        k = int(j * 0.11 * SR)
        out[k:k + n] += (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * e
    return out


def sub_boom(dur=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 36 + 30 * np.exp(-t / 0.06)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = (np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.exp(-t * 1.7)
    return s * envelope(n, 0.01, 0.4) * 0.8


def squeak(dur=None):
    d = dur or rng.uniform(0.08, 0.16)
    n = int(d * SR)
    t = np.arange(n) / SR
    f0, f1 = rng.uniform(1700, 2100), rng.uniform(2900, 3500)
    f = f0 + (f1 - f0) * (t / d) ** 0.7 + 90 * np.sin(2 * np.pi * 95 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.35 * np.sin(2 * ph)) * np.sin(np.pi * t / d) ** 0.6 * 0.32


def ball_slap(body_f=230, bright=1.0):
    n = int(0.2 * SR)
    t = np.arange(n) / SR
    slap = filt(rng.standard_normal(n), bp(1000, 4200)) * np.exp(-t / 0.008)
    slap /= np.max(np.abs(slap)) + 1e-9
    body = np.sin(2 * np.pi * body_f * t) * np.exp(-t / 0.04)
    return (bright * 0.7 * slap + 0.6 * body) * (1 - np.exp(-t / 0.0006)) * 0.7



# ------------------------------------------------------------------ v3: alati za glazbu
def hpf(lo, order=2):
    def r(f):
        a = (np.maximum(f, 1e-3) / lo) ** (2 * order)
        return a / (1 + a)
    return r


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def additive(f0, n, amps, decays=None, cents=0.0, vib=0.0, vib_rate=5.5, vib_delay=0.15, phase=0.0):
    """Aditivna sinteza bez aliasinga (harmonici iznad 16 kHz se preskaču)."""
    t = np.arange(n) / SR
    f = f0 * 2 ** (cents / 1200.0)
    if vib:
        depth = vib * np.clip((t - vib_delay) / 0.25, 0, 1)
        ph = 2 * np.pi * np.cumsum(f * (1 + depth * np.sin(2 * np.pi * vib_rate * t))) / SR
    else:
        ph = 2 * np.pi * f * t
    out = np.zeros(n)
    for k, a in enumerate(amps, start=1):
        if a == 0 or k * f > 16000:
            continue
        p = np.sin(k * ph + phase * k)
        if decays is not None:
            p *= np.exp(-t / decays[k - 1])
        out += a * p
    return out


def note_env(n, dur, att=0.004, rel=0.08):
    """Napad + otpuštanje nakon trajanja note (bez klikova)."""
    t = np.arange(n) / SR
    e = np.clip(t / max(att, 1e-4), 0, 1)
    m = t > dur
    e[m] *= np.exp(-(t[m] - dur) / rel)
    k = max(1, int(0.004 * SR))
    e[-k:] *= np.linspace(1, 0, k)
    return e


def chirp(f_of_t):
    return 2 * np.pi * np.cumsum(f_of_t) / SR


# ------------------------------------------------------------------ v3: instrumenti (vedra sportska pjesma)
@lru_cache(maxsize=None)
def i_kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    body = np.sin(chirp(47 + 125 * np.exp(-t / 0.026))) * np.exp(-t / 0.26)
    click = filt(np.random.default_rng(801).standard_normal(n), bp(1800, 7000)) * np.exp(-t / 0.0025)
    click /= np.max(np.abs(click)) + 1e-9
    return (body + 0.1 * click) * (1 - np.exp(-t / 0.0006)) * note_env(n, 0.4, 0.0001, 0.01)


@lru_cache(maxsize=None)
def i_clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    nz = filt(np.random.default_rng(802).standard_normal(n), bp(950, 5200))
    nz /= np.max(np.abs(nz)) + 1e-9
    env = np.zeros(n)
    for d, a in ((0.0, 0.75), (0.008, 0.8), (0.017, 1.0)):         # tri brza praska = pljesak
        m = t >= d
        env[m] += a * np.exp(-(t[m] - d) / 0.0045)
    m = t >= 0.02
    env[m] += 0.5 * np.exp(-(t[m] - 0.02) / 0.075)
    body = np.sin(2 * np.pi * 205 * t) * np.exp(-t / 0.028) * 0.22
    return (nz * env * 0.75 + body) * (1 - np.exp(-t / 0.0004))


@lru_cache(maxsize=None)
def i_hat(open_=False):
    n = int((0.3 if open_ else 0.07) * SR)
    t = np.arange(n) / SR
    nz = filt(np.random.default_rng(803 if open_ else 804).standard_normal(n), hpf(6500 if open_ else 7600))
    nz /= np.max(np.abs(nz)) + 1e-9
    met = sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate((5310.0, 6870.0, 8120.0, 9930.0))) / 4
    s = (0.8 * nz + 0.22 * met) * np.exp(-t / (0.085 if open_ else 0.016))
    return s * (1 - np.exp(-t / 0.0003))


@lru_cache(maxsize=None)
def i_crash():
    n = int(2.4 * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(805)
    nz = filt(r.standard_normal(n), hpf(3200))
    nz /= np.std(nz) + 1e-9
    met = np.zeros(n)
    for _ in range(9):
        met += np.sin(2 * np.pi * r.uniform(2800, 9500) * t + r.uniform(0, 6.28)) * np.exp(-t / r.uniform(0.3, 0.9))
    s = (0.5 * nz * np.exp(-t / 0.65) + 0.12 * met) * (1 - np.exp(-t / 0.0008))
    return s / (np.max(np.abs(s)) + 1e-9)


@lru_cache(maxsize=None)
def i_snare():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    nz = filt(np.random.default_rng(806).standard_normal(n), bp(1400, 7500))
    nz /= np.max(np.abs(nz)) + 1e-9
    tone = np.sin(2 * np.pi * 188 * t) * np.exp(-t / 0.045) + 0.5 * np.sin(2 * np.pi * 335 * t) * np.exp(-t / 0.03)
    return (0.75 * nz * np.exp(-t / 0.055) + 0.45 * tone) * (1 - np.exp(-t / 0.0005))


@lru_cache(maxsize=None)
def i_tom(f0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    body = np.sin(chirp(f0 * (0.72 + 0.28 * np.exp(-t / 0.05)))) * np.exp(-t / 0.2)
    return body * (1 - np.exp(-t / 0.0008)) * 0.9


BASS_AMPS = [1.0 / k for k in range(1, 25)]
BASS_DEC = [0.6 / (1 + 0.45 * (k - 1)) for k in range(1, 25)]   # viši harmonici brže trnu = "pluck" bas


@lru_cache(maxsize=None)
def i_bass(m, dur):
    n = int((dur + 0.06) * SR)
    f = mtof(m)
    t = np.arange(n) / SR
    s = additive(f, n, BASS_AMPS, BASS_DEC) * 0.6 + 0.4 * np.sin(2 * np.pi * f * t)
    return s * note_env(n, dur, 0.004, 0.02) * 0.5


KEY_AMPS = [1.0, 0.7, 0.5, 0.36, 0.26, 0.18, 0.12, 0.08, 0.05]
KEY_DEC = [1.1, 0.6, 0.38, 0.27, 0.2, 0.15, 0.12, 0.09, 0.07]


@lru_cache(maxsize=None)
def i_keys(m, dur):
    n = int((dur + 0.35) * SR)
    f = mtof(m)
    s = additive(f, n, KEY_AMPS, KEY_DEC, cents=4) + additive(f, n, KEY_AMPS, KEY_DEC, cents=-4, phase=0.7)
    return s * note_env(n, dur, 0.002, 0.07) * 0.5


PLUCK_AMPS = [1.0, 0.5, 0.33, 0.25, 0.2, 0.16, 0.12, 0.1]
PLUCK_DEC = [0.13, 0.085, 0.062, 0.05, 0.042, 0.036, 0.031, 0.027]


@lru_cache(maxsize=None)
def i_pluck(m):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    return additive(mtof(m), n, PLUCK_AMPS, PLUCK_DEC) * (1 - np.exp(-t / 0.001)) * note_env(n, 0.25, 0.0005, 0.02)


LEAD_AMPS = [math.exp(-(k - 1) / 10.0) / k for k in range(1, 18)]


@lru_cache(maxsize=None)
def i_lead(m, dur):
    n = int((dur + 0.18) * SR)
    f = mtof(m)
    t = np.arange(n) / SR
    s = additive(f, n, LEAD_AMPS, None, 7, vib=0.0045) + additive(f, n, LEAD_AMPS, None, -7, vib=0.0045, phase=1.3)
    s += 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.05)   # jasniji napad note
    return s * note_env(n, dur, 0.008, 0.09) * 0.4


PAD_AMPS = [math.exp(-(k - 1) / 4.5) / k for k in range(1, 13)]


@lru_cache(maxsize=None)
def i_pad(notes, dur, att=0.35):
    n = int((dur + 0.7) * SR)
    s = np.zeros(n)
    for m in notes:
        for c, ph in ((-11, 0.0), (-4, 1.1), (0, 2.3), (5, 0.4), (12, 1.7)):
            s += additive(mtof(m), n, PAD_AMPS, None, c, phase=ph)
    t = np.arange(n) / SR
    e = (1 - np.cos(np.pi * np.clip(t / att, 0, 1))) / 2
    m_ = t > dur
    e[m_] *= np.exp(-(t[m_] - dur) / 0.25)
    k = int(0.004 * SR)
    e[-k:] *= np.linspace(1, 0, k)
    return s * e / (5 * len(notes)) * 1.6


@lru_cache(maxsize=None)
def i_glock(m):
    n = int(1.5 * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.9) + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.32)
         + 0.12 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / 0.11))
    return s * (1 - np.exp(-t / 0.0008)) * note_env(n, 1.45, 0.0005, 0.02)


# ------------------------------------------------------------------ v3: aranžman (D-dur, 120 BPM)
BPM = 120.0
BEAT = 60.0 / BPM
E8 = BEAT / 2
S16 = BEAT / 4

CHORDS = {                       # (bas, akord)
    "D": (38, (62, 66, 69, 74)),
    "A": (33, (61, 64, 69, 73)),
    "Bm": (35, (59, 62, 66, 71)),
    "G": (31, (59, 62, 67, 71)),
    "Gadd9": (31, (55, 59, 62, 69)),
    "Asus4": (33, (57, 62, 64, 69)),
}
HOOK = {                         # melodija (MIDI nota, broj osminki)
    "D": [(74, 1), (74, 1), (76, 1), (74, 1), (71, 2), (69, 2)],
    "A": [(69, 1), (71, 1), (73, 2), (76, 2), (73, 2)],
    "Bm": [(74, 1), (74, 1), (76, 1), (74, 1), (71, 2), (66, 2)],
    "G": [(67, 1), (69, 1), (71, 2), (69, 2), (66, 1), (69, 1)],
    "G2": [(71, 1), (69, 1), (67, 1), (69, 1)],
    "A2": [(71, 1), (73, 1), (76, 1), (73, 1)],
}
FULL = "kick clap hat ohat bass keys pad lead"
GROOVE = "kick clap hat ohat bass keys arp"
ARP_ORDER = (0, 1, 2, 3, 1, 2, 3, 2)


def arrangement():
    """Taktovi pjesme usklađeni sa scenama filma (vidi SCENES u build_film.py)."""
    B = []

    def bar(t, ch, flags, lvl=1.0, beats=4, hook=None):
        B.append(dict(t=t, beats=beats, ch=ch, f=set(flags.split()), lvl=lvl, hook=hook))

    bar(4.0, "D", FULL)                                   # dan utakmice — cijela pjesma s melodijom
    bar(6.0, "A", FULL)
    for i, ch in enumerate(("Bm", "G", "D", "A", "Bm")):  # uređaji — ritam + arpeggio, ispod zvukova sportova
        bar(8.0 + 2 * i, ch, GROOVE, 0.85)
    bar(21.0, "D", "hat ohat bass keys pad", 0.75)        # dvorana (UWB) — lagano
    bar(23.0, "G", GROOVE, 0.85)
    for i, ch in enumerate(("D", "A", "Bm")):            # LIVE utakmica
        bar(27.0 + 2 * i, ch, FULL)
    bar(33.0, "G", FULL, beats=2, hook=HOOK["G"][:3])
    g = 36.7                                              # GOL → nova mreža taktova od trenutka gola
    seq = [("D", FULL, 1.0), ("A", FULL, 1.0), ("Bm", GROOVE + " pad", 0.9), ("G", GROOVE + " pad", 0.9),
           ("D", GROOVE + " pad", 0.9), ("A", "kick clap hat ohat bass keys pad", 0.8),
           ("Bm", "kick clap hat ohat bass keys pad", 0.8), ("G", "kick clap hat bass keys", 0.8),
           ("D", GROOVE, 0.9), ("A", FULL, 1.0)]
    for i, (ch, fl, lv) in enumerate(seq):
        bar(g + 2 * i, ch, fl, lv)
    bar(g + 20.0, "G", FULL, beats=2, hook=HOOK["G2"])   # IV – V ... pa završni D-dur na 58,7 s
    bar(g + 21.0, "A", FULL, beats=2, hook=HOOK["A2"])
    return B


def render_bar(b, tonal, drums, kicks):
    t0, nb, lv, f = b["t"], b["beats"], b["lvl"], b["f"]
    root, notes = CHORDS[b["ch"]]
    if "kick" in f:
        for k in range(nb):
            drums.add(i_kick(), t0 + k * BEAT, 0.6 * lv)
            kicks.append(t0 + k * BEAT)
    if "clap" in f:
        for k in (1, 3):
            if k < nb:
                drums.add(i_clap(), t0 + k * BEAT, 0.55 * lv, pan=0.05)
    if "hat" in f:
        vel = (0.55, 0.3, 0.0 if "ohat" in f else 0.8, 0.3)
        for j in range(4 * nb):
            if vel[j % 4]:
                drums.add(i_hat(False), t0 + j * S16, 0.45 * vel[j % 4] * lv, pan=0.3)
    if "ohat" in f:
        for k in range(nb):
            drums.add(i_hat(True), t0 + k * BEAT + E8, 0.3 * lv, pan=0.25)
    if "bass" in f:
        pat = (0, 0, 12, 0, 0, 12, 0, 12)                # "disco" oktave
        for j in range(2 * nb):
            tonal.add(i_bass(root + pat[j % 8], 0.21), t0 + j * E8, 0.4 * lv)
    if "keys" in f:
        for j in (0, 3, 6):                              # 3-3-2 ritam akorda (vedar pop)
            if j < 2 * nb:
                for m in notes:
                    tonal.add(i_keys(m, 0.3), t0 + j * E8, 0.24 * lv, pan=-0.2)
    if "pad" in f:
        tonal.add(i_pad(tuple(notes), nb * BEAT - 0.05), t0, 0.32 * lv)
    if "arp" in f:
        hi = [m + 12 for m in notes]
        for j in range(4 * nb):
            tonal.add(i_pluck(hi[ARP_ORDER[j % 8]]), t0 + j * S16, 0.12 * lv, pan=0.35 if j % 2 else -0.35)
    if "lead" in f:
        T = t0
        for m, e8 in (b["hook"] or HOOK[b["ch"]]):
            tonal.add(i_lead(m, e8 * E8 * 0.9), T, 0.32 * lv)
            T += e8 * E8


def build_music():
    """Vedra instrumentalna sportska pjesma (bez vokala), 120 BPM, D-dur."""
    tonal, drums = Bus(), Bus()
    kicks = []
    # uvod 0–4 s: vedri akord na prvom kadru, arpeggio se otvara, kratki prijelaz bubnja
    tonal.add(i_pad(CHORDS["D"][1], 1.95, 0.5), 0.0, 0.22)
    tonal.add(i_pad(CHORDS["A"][1], 1.95, 0.3), 2.0, 0.26)
    for m in CHORDS["D"][1]:
        tonal.add(i_keys(m, 0.9), 0.25, 0.2, pan=-0.1)
    drums.add(i_crash(), 0.25, 0.22, pan=0.2)
    drums.add(i_kick(), 0.25, 0.7)
    for j in range(28):
        T = 0.5 + j * S16
        hi = [m + 12 for m in CHORDS["D" if T < 2.0 else "A"][1]]
        tonal.add(i_pluck(hi[ARP_ORDER[j % 8]]), T, 0.03 + 0.06 * j / 27, pan=0.35 if j % 2 else -0.35)
    for T, gn in ((3.0, 0.3), (3.25, 0.38), (3.5, 0.45), (3.625, 0.52), (3.75, 0.6), (3.875, 0.7)):
        drums.add(i_snare(), T, gn, pan=-0.1)
    drums.add(i_tom(190.0), 3.5, 0.35, pan=-0.4)
    drums.add(i_tom(140.0), 3.75, 0.4, pan=0.4)

    # sat 18–21 s: glazba se povuče — mekani akordi i zvončići točno na otkucaje srca
    tonal.add(i_pad(CHORDS["Gadd9"][1], 1.95, 0.4), 18.0, 0.3)
    tonal.add(i_pad(CHORDS["Asus4"][1], 0.95, 0.3), 20.0, 0.3)
    for T, m in ((18.05, 86), (18.88, 83), (19.72, 81), (20.55, 76)):
        tonal.add(i_glock(m), T, 0.16, pan=0.25)

    # gradacija 25–27 s: rastući arpeggio, bubanj koji se zgušnjava, kratki predah pa početak utakmice
    tonal.add(i_pad(CHORDS["A"][1], 1.8, 0.6), 25.0, 0.3)
    for k in range(4):
        drums.add(i_kick(), 25.0 + k * BEAT, 0.6)
        kicks.append(25.0 + k * BEAT)
    for j in range(7):
        tonal.add(i_bass(33 + (12 if j % 2 else 0), 0.21), 25.0 + j * E8, 0.5)
    for j, m in enumerate((69, 71, 73, 74, 76, 78, 80, 81, 83, 85, 86, 88, 90, 92, 93)):
        tonal.add(i_pluck(m), 25.0 + j * S16, 0.05 + 0.07 * j / 14, pan=0.3 if j % 2 else -0.3)
    roll = [25.0 + j * E8 for j in range(4)] + [26.0 + j * S16 for j in range(4)] + [26.5 + j * S16 / 2 for j in range(6)]
    for j, T in enumerate(roll):
        drums.add(i_snare(), T, 0.22 + 0.55 * j / (len(roll) - 1), pan=-0.05)

    # napetost 34,0–36,7 s: bez bubnjeva, samo akord — otkucaji srca su u prvom planu
    tonal.add(i_pad(CHORDS["Asus4"][1], 1.45, 0.5), 34.0, 0.24)
    tonal.add(i_pad(CHORDS["A"][1], 1.15, 0.3), 35.5, 0.28)

    for T, gn in ((4.0, 0.3), (12.0, 0.12), (27.0, 0.36), (36.7, 0.42), (54.7, 0.3)):
        drums.add(i_crash(), T, gn, pan=0.15)
    for b in arrangement():
        render_bar(b, tonal, drums, kicks)

    # završni akord D-dur (58,7 s)
    E = 58.7
    for m in CHORDS["D"][1]:
        tonal.add(i_keys(m, 1.6), E, 0.2, pan=-0.1)
    tonal.add(i_pad(CHORDS["D"][1], 2.1, 0.05), E, 0.34)
    tonal.add(i_bass(38, 1.4), E, 0.55)
    tonal.add(i_lead(74, 1.7), E, 0.32)
    drums.add(i_kick(), E, 0.7)
    kicks.append(E)
    drums.add(i_crash(), E, 0.4, pan=0.15)

    # "pumpanje" uz bas bubanj (sidechain) — moderni, poskočni osjećaj
    pump = np.ones(N)
    for T in kicks:
        i0 = int(T * SR)
        if i0 >= N:
            continue
        x = np.arange(min(int(0.32 * SR), N - i0)) / SR
        gk = 1 - 0.5 * np.exp(-x / 0.11) * np.clip(x / 0.006, 0, 1)
        np.minimum(pump[i0:i0 + len(x)], gk, out=pump[i0:i0 + len(x)])
    TL, TR = tonal.L * pump, tonal.R * pump
    ir = make_ir(1.0, 1.6, 9, predelay=0.012, hf=0.5, early=6)
    L = drums.L + TL + 0.22 * convolve(TL + 0.3 * drums.L, ir[0])
    R = drums.R + TR + 0.22 * convolve(TR + 0.3 * drums.R, ir[1])
    shelf = lambda f: 1 + 0.78 * (f / 2500.0) ** 2 / (1 + (f / 2500.0) ** 2)   # +5 dB "zraka"
    return filt(L, shelf), filt(R, shelf)


# ------------------------------------------------------------------ v3: zvukovi raznih sportova
def tennis_hit():
    n = int(0.2 * SR)
    t = np.arange(n) / SR
    ping = np.sin(chirp(1480 + 60 * np.exp(-t / 0.004))) * np.exp(-t / 0.011)      # žice reketa
    body = np.sin(2 * np.pi * 430 * t) * np.exp(-t / 0.03) + 0.5 * np.sin(2 * np.pi * 770 * t) * np.exp(-t / 0.02)
    crack = filt(rng.standard_normal(n), bp(1500, 6000)) * np.exp(-t / 0.003)
    crack /= np.max(np.abs(crack)) + 1e-9
    return (0.45 * ping + 0.8 * body + 0.55 * crack) * (1 - np.exp(-t / 0.0003)) * 0.6


def tennis_bounce():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    tock = np.sin(chirp(300 + 80 * np.exp(-t / 0.006))) * np.exp(-t / 0.018)
    tap = filt(rng.standard_normal(n), bp(700, 2600)) * np.exp(-t / 0.0025)
    tap /= np.max(np.abs(tap)) + 1e-9
    return (tock + 0.35 * tap) * (1 - np.exp(-t / 0.0004)) * 0.35


def dribble():
    """Košarkaška lopta na parketu: duboki 'bum' + zvonjenje lopte + pljesak dlana."""
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    boom = np.sin(chirp(82 + 60 * np.exp(-t / 0.01))) * np.exp(-t / 0.055)
    ring = 0.3 * np.sin(2 * np.pi * 285 * t) * np.exp(-t / 0.035)
    slap = filt(rng.standard_normal(n), bp(600, 2400)) * np.exp(-t / 0.005)
    slap /= np.max(np.abs(slap)) + 1e-9
    return (boom + ring + 0.45 * slap) * (1 - np.exp(-t / 0.0005)) * 0.7


def splash():
    """Skok u vodu: oštar udar, duboki 'plunk' i mjehurići (tonski cvrkuti)."""
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    imp = filt(rng.standard_normal(n), bp(250, 3200)) * (1 - np.exp(-t / 0.002)) * np.exp(-t / 0.13)
    imp /= np.max(np.abs(imp)) + 1e-9
    thump = np.sin(chirp(70 + 50 * np.exp(-t / 0.02))) * np.exp(-t / 0.09)
    bub = np.zeros(n)
    for _ in range(16):
        t0, d, f0 = rng.uniform(0.04, 0.75), rng.uniform(0.02, 0.05), rng.uniform(450, 1400)
        m = (t >= t0) & (t < t0 + d)
        x = t[m] - t0
        bub[m] += (np.sin(chirp(f0 * (1 + 0.8 * x / d))) * np.exp(-x / (d / 2.5))
                   * rng.uniform(0.3, 1.0) * math.exp(-(t0 - 0.04) / 0.4))
    return (0.6 * imp + 0.55 * thump + 0.35 * bub) * 0.8


def start_beep():
    n = int(0.2 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1050 * t) + 0.25 * np.sin(2 * np.pi * 2100 * t)) * note_env(n, 0.17, 0.003, 0.01) * 0.3


def step(spike=1.0):
    """Korak trkača: tupi udarac + (sprinterice) kratki oštri dodir staze."""
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    thud = np.sin(chirp(95 + 40 * np.exp(-t / 0.008))) * np.exp(-t / 0.028)
    tk = filt(rng.standard_normal(n), bp(1500, 5500)) * np.exp(-t / 0.005)
    tk /= np.max(np.abs(tk)) + 1e-9
    return (0.8 * thud + 0.4 * spike * tk) * (1 - np.exp(-t / 0.0005)) * 0.5


def bike_bell():
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f, a, d in ((2093.0, 1.0, 0.9), (2101.0, 0.5, 0.9), (2870.0, 0.55, 0.6), (4710.0, 0.3, 0.35), (6410.0, 0.12, 0.2)):
        s += a * np.sin(2 * np.pi * f * t) * np.exp(-t / d)
    strike = filt(rng.standard_normal(n), hpf(3000)) * np.exp(-t / 0.0018)
    strike /= np.max(np.abs(strike)) + 1e-9
    return (s / 2.5 + 0.25 * strike) * (1 - np.exp(-t / 0.0005)) * 0.5


def freewheel(dur=1.2):
    """Slobodni hod stražnjeg kotača bicikla: sitni klikovi koji usporavaju."""
    n = int(dur * SR)
    out = np.zeros(n)
    T = 0.0
    while T < dur - 0.01:
        i = int(T * SR)
        x = np.arange(min(int(0.006 * SR), n - i)) / SR
        out[i:i + len(x)] += np.sin(2 * np.pi * 3300 * x) * np.exp(-x / 0.0012) * (1 - 0.5 * T / dur)
        T += 1.0 / (30 - 16 * T / dur)
    return out * 0.18


def oar_catch():
    """Veslo ulazi u vodu ('plunk') + klik ležaja vesla."""
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    plunk = np.sin(chirp(150 + 90 * np.exp(-t / 0.015))) * np.exp(-t / 0.07)
    water = filt(rng.standard_normal(n), bp(300, 2000)) * (1 - np.exp(-t / 0.003)) * np.exp(-t / 0.06)
    water /= np.max(np.abs(water)) + 1e-9
    clack = np.sin(2 * np.pi * 1150 * t) * np.exp(-t / 0.007)
    return (0.7 * plunk + 0.35 * water + 0.5 * clack) * 0.6


def hockey_slap():
    """Hokej: udarac palicom + pak udara u ogradu."""
    n = int(0.75 * SR)
    t = np.arange(n) / SR
    crack = filt(rng.standard_normal(n), bp(1000, 6500)) * np.exp(-t / 0.0035)
    crack /= np.max(np.abs(crack)) + 1e-9
    wood = np.sin(2 * np.pi * 690 * t) * np.exp(-t / 0.014) + 0.4 * np.sin(2 * np.pi * 1310 * t) * np.exp(-t / 0.01)
    out = (0.6 * crack + 0.5 * wood) * (1 - np.exp(-t / 0.0003))
    i = int(0.32 * SR)
    x = t[i:] - 0.32
    rattle = filt(rng.standard_normal(len(x)), bp(250, 1300)) * np.exp(-x / 0.05)
    rattle /= np.max(np.abs(rattle)) + 1e-9
    out[i:] += 0.6 * (np.sin(chirp(95 + 30 * np.exp(-x / 0.01))) * np.exp(-x / 0.07) + 0.5 * rattle) * (1 - np.exp(-x / 0.0008))
    return out * 0.6


# ------------------------------------------------------------------ miks (v3)
MUSIC_REL = 0.75        # razina glazbe u odnosu na zvukove sporta (RMS cijelog filma)
# razina glazbe po scenama (dB): ispod zvukova sportova se povuče, kod gola i na kraju pojača
MUSIC_SCENE_DB = [(0, 2), (3.9, 2), (4.0, 1), (7.8, 1), (8.2, -8), (17.8, -8), (18.0, 0), (20.9, 0), (21.1, -8),
                  (23.9, -8), (24.1, 1), (26.9, 1), (27.0, -7), (34.0, -7), (34.1, 0), (36.6, 0), (36.7, 5),
                  (38.8, 5), (39.4, 0), (45.8, 0), (46.2, -8), (55.3, -8), (55.7, 4), (61.0, 4)]


def build_audio(path, stems=None):
    dry = Bus()          # izravni zvukovi
    stad = Bus()         # slanje u jeku stadiona
    hall = Bus()         # slanje u jeku dvorane (UWB scena, košarka, bazen, hokej)
    heart = Bus()        # samo za mjerenje (otkucaji srca moraju se jasno čuti iznad glazbe)

    # 1) žamor stadiona — tiši u scenama uređaja (tamo su sada zvukovi raznih sportova)
    mL, mR = crowd_murmur()
    M = env_db([(0, -60), (0.4, -40), (2.0, -26), (3.5, -20), (4.1, -10), (7.6, -11), (8.3, -22), (17.6, -23),
                (18.15, -30), (20.8, -30), (21.2, -28), (23.8, -28), (24.3, -16), (26.8, -14),
                (27.2, -10), (34.0, -9), (36.2, -8), (36.7, -6), (39.0, -11), (39.4, -16),
                (46.0, -18), (49.3, -18), (49.7, -20), (52.3, -20), (52.7, -22), (55.0, -20), (55.8, -10),
                (59.5, -9), (61.0, -60)])
    stad.L += 0.75 * mL * M
    stad.R += 0.75 * mR * M
    dry.L += 0.35 * mL * M
    dry.R += 0.35 * mR * M

    # 2) navijači: napetost, gol, završno slavlje (glasni)
    rL, rR = crowd_roar()
    stad.L += 0.55 * rL
    stad.R += 0.55 * rR
    dry.L += 0.25 * rL
    dry.R += 0.25 * rR

    # 3) bubnjevi navijača — sada u taktu s glazbom (120 BPM)
    pattern = [1, 0, 1, 0, 1, 1, 1, 0]
    for (s, e, g, full) in ((4.5, 8.0, 0.26, False), (24.5, 34.0, 0.2, False),
                            (GOAL, GOAL + 2.5, 0.32, True), (56.7, 58.7, 0.26, False)):
        k = 0
        T = s
        while T < e - 1e-6:
            if full or pattern[k % 8]:
                stad.add(drum_hit(rng.uniform(0.85, 1.0)), T + rng.normal(0, 0.004), g, pan=-0.35)
            T += 0.25
            k += 1

    # 4) ritmični pljesak tribina (na dobe glazbe) + slobodan pljesak (gol, kraj)
    times, gains, pans = [], [], []
    for (s, e, g) in ((5.0, 7.8, 0.5), (27.5, 34.0, 0.5)):
        beat = s
        k = 0
        while beat < e:
            if k % 4 != 3:
                for _ in range(42):
                    times.append(beat + rng.normal(0, 0.014))
                    gains.append(g * rng.uniform(0.3, 1.0))
                    pans.append(rng.uniform(-0.95, 0.95))
            beat += 0.5
            k += 1
    for (s, e, rate) in ((37.3, 40.2, 160), (57.6, 60.9, 320), (22.55, 23.7, 40)):
        n_ = int((e - s) * rate)
        ts_ = np.sort(rng.uniform(s, e, n_))
        dens = np.sin(np.pi * (ts_ - s) / (e - s)) ** 0.5
        times += list(ts_)
        gains += list(0.32 * dens * rng.uniform(0.3, 1.0, n_))
        pans += list(rng.uniform(-0.95, 0.95, n_))
    hallmask = np.array([22.5 <= T <= 23.75 for T in times])
    claps_from_times(np.array(times)[~hallmask], np.array(gains)[~hallmask], np.array(pans)[~hallmask], stad, 0.5)
    claps_from_times(np.array(times)[hallmask], np.array(gains)[hallmask], np.array(pans)[hallmask], hall, 0.8)

    # 5) zvižduci navijača
    for (s, e, cnt) in ((4.4, 5.8, 2), (36.9, 39.2, 6), (57.7, 60.4, 6)):
        for T in np.sort(rng.uniform(s, e, cnt)):
            stad.add(fan_whistle(), T, 0.5, pan=rng.uniform(-0.9, 0.9))

    # 6) sudačka zviždaljka: početak i kraj (kratko-kratko-dugo)
    dry.add(ref_whistle(0.55), 4.15, 0.42, pan=0.15)
    stad.add(ref_whistle(0.55), 4.15, 0.25, pan=0.15)
    for T, d in ((57.1, 0.26), (57.55, 0.26), (58.0, 1.1)):
        dry.add(ref_whistle(d), T, 0.42, pan=0.1)
        stad.add(ref_whistle(d), T, 0.25, pan=0.1)

    # 7) otkucaji srca (zadržani): scena sata (72 BPM) + napetost prije udarca (ubrzava 96→132)
    T = 18.05
    while T < 20.85:
        dry.add(heart_pair(), T, 2.4)
        heart.add(heart_pair(), T, 2.4)
        T += 60.0 / 72
    T = 34.35
    while T < SHOT - 0.15:
        u = (T - 34.35) / (SHOT - 34.35)
        dry.add(heart_pair(), T, 1.9)
        heart.add(heart_pair(), T, 1.9)
        T += 60.0 / (96 + 36 * u)

    # 8) nogomet: dodavanja, udarac, gol
    for (t0, t1), p in zip(PASSES, PASS_PAN):
        dry.add(ball_kick(0.8), L0 + t0, 1.2, pan=p)
        stad.add(ball_kick(0.8), L0 + t0, 0.18, pan=p)
        dry.add(ball_kick(0.35), L0 + t1, 0.55, pan=min(0.9, p + 0.2))
    dry.add(ball_kick(1.45), SHOT, 1.0, pan=0.6)
    stad.add(ball_kick(1.45), SHOT, 0.35, pan=0.6)
    stad.add(drum_hit(1.0), GOAL + 0.02, 0.45, pan=0.0)

    # 9) odbojka u dvorani (UWB): škripa tenisica, smeč, odskok
    for T in (21.35, 21.9, 22.75, 23.3):
        hall.add(squeak(), T, 1.2, pan=rng.uniform(-0.6, 0.6))
        dry.add(squeak(), T, 0.75, pan=rng.uniform(-0.6, 0.6))
    hall.add(ball_slap(260, 1.0), 22.15, 1.9, pan=0.2)
    dry.add(ball_slap(260, 1.0), 22.15, 1.4, pan=0.2)
    hall.add(ball_slap(140, 0.5), 22.42, 0.6, pan=0.35)

    # 10) trening: dva udarca i kratki zvižduk trenera
    for T, p in ((50.05, -0.3), (51.25, 0.25)):
        dry.add(ball_kick(0.85), T, 1.25, pan=p)
        stad.add(ball_kick(0.85), T, 0.15, pan=p)
    dry.add(ref_whistle(0.18), 51.9, 0.6, pan=-0.2)
    dry.add(ref_whistle(0.18), 52.12, 0.6, pan=-0.2)

    # 11) sučelje / nadzorne ploče (diskretno) + ACWR alarm
    dry.add(alert_ping(), ALERT, 0.16, pan=0.25)
    for T in (39.1, 42.6, 46.1, 52.6):
        dry.add(blip(), T, 0.07, pan=0.0)

    # 12) uvodni udar — lakši nego u v2 (vedri akord nosi početak); bez tamnog "booma" na kraju
    dry.add(sub_boom(), 0.25, 0.7)

    # 13) RAZNI SPORTOVI (v3)
    # tenis — izmjena udaraca lijevo/desno (8,5–11,3 s)
    for T, p in ((8.5, -0.55), (9.5, 0.55), (10.5, -0.55)):
        dry.add(tennis_hit(), T, 1.5, pan=p)
        stad.add(tennis_hit(), T, 0.2, pan=p)
        dry.add(tennis_bounce(), T + 0.55, 2.0, pan=-0.3 * p)
    dry.add(tennis_hit(), 11.25, 1.25, pan=0.55)
    # košarka — vođenje lopte u ritmu glazbe + škripa tenisica (11,5–14,3 s)
    for T in (11.5, 12.0, 12.5, 13.0, 13.25, 13.5, 14.0):
        hall.add(dribble(), T, 1.1, pan=-0.2)
        dry.add(dribble(), T, 0.8, pan=-0.2)
    for T in (12.25, 13.75):
        hall.add(squeak(), T, 1.35, pan=0.3)
        dry.add(squeak(), T, 0.75, pan=0.3)
    # plivanje — skok u vodu uz kadar "IP67" (14,6 s)
    hall.add(splash(), 14.6, 1.3, pan=0.1)
    dry.add(splash(), 14.6, 1.05, pan=0.1)
    # atletika — elektronički start i sprint skupine trkača (16,0–17,9 s)
    dry.add(start_beep(), 16.0, 1.6, pan=-0.1)
    stad.add(start_beep(), 16.0, 0.35, pan=-0.1)
    for off, rate, p in ((0.0, 4.4, -0.35), (0.07, 4.6, 0.0), (0.13, 4.3, 0.35)):
        T = 16.2 + off
        while T < 17.9:
            stad.add(step(1.0), T, 1.15, pan=p)
            dry.add(step(1.0), T, 1.75, pan=p)
            T += 1.0 / rate
    # kontrolna soba (do 12 pločica) — hokej, veslanje, tenis, košarka (46–49,5 s)
    hall.add(hockey_slap(), 46.2, 3.0, pan=-0.5)
    dry.add(hockey_slap(), 46.2, 2.3, pan=-0.5)
    dry.add(oar_catch(), 47.2, 1.3, pan=0.45)
    stad.add(oar_catch(), 47.2, 0.15, pan=0.45)
    dry.add(tennis_hit(), 48.2, 1.3, pan=-0.3)
    dry.add(tennis_bounce(), 48.7, 1.0, pan=-0.1)
    for T in (48.95, 49.2):
        hall.add(dribble(), T, 1.2, pan=0.4)
        dry.add(dribble(), T, 0.75, pan=0.4)
    # za svakog sportaša — trčanje, biciklističko zvonce, slobodni hod kotača (52,6–55,0 s)
    T = 52.65
    while T < 54.4:
        dry.add(step(0.35), T, 1.1, pan=-0.25)
        T += 1 / 2.8
    dry.add(bike_bell(), 53.2, 1.45, pan=0.45)
    dry.add(bike_bell(), 53.38, 1.25, pan=0.45)
    dry.add(freewheel(1.2), 53.8, 1.45, pan=0.4)

    # jeka
    irS = make_ir(1.9, 3.0, 5)
    irH = make_ir(1.25, 2.0, 6, predelay=0.012, hf=0.6, early=10)
    sL = dry.L + 0.8 * convolve(stad.L, irS[0]) + 0.25 * stad.L + 0.7 * convolve(hall.L, irH[0]) + 0.3 * hall.L
    sR = dry.R + 0.8 * convolve(stad.R, irS[1]) + 0.25 * stad.R + 0.7 * convolve(hall.R, irH[1]) + 0.3 * hall.R

    # 14) GLAZBA (v3): vedra instrumentalna pjesma ispod zvukova sporta
    gL, gR = build_music()
    rs = math.sqrt((np.mean(sL ** 2) + np.mean(sR ** 2)) / 2) + 1e-12
    rm = math.sqrt((np.mean(gL ** 2) + np.mean(gR ** 2)) / 2) + 1e-12
    km = MUSIC_REL * rs / rm
    MG = env_db(MUSIC_SCENE_DB)
    gL *= km * MG
    gR *= km * MG
    L = sL + gL
    R = sR + gR
    if stems is not None:
        stems.update(sfx=(sL, sR), music=(gL, gR), heart=(heart.L, heart.R))

    # obrada: DC, blagi kompresor (RMS 10 ms, 3:1), meki limiter
    L -= np.mean(L)
    R -= np.mean(R)
    pk = max(np.max(np.abs(L)), np.max(np.abs(R))) + 1e-9
    L /= pk
    R /= pk
    blk = int(0.01 * SR)
    nb = N // blk
    rms = np.sqrt(((L[:nb * blk] ** 2 + R[:nb * blk] ** 2) / 2).reshape(nb, blk).mean(1) + 1e-12)
    lvl = 20 * np.log10(rms)
    thr, ratio = -26.0, 3.0
    target = np.where(lvl > thr, thr + (lvl - thr) / ratio, lvl) - lvl
    g = np.zeros(nb)
    cur = 0.0
    for k in range(nb):
        a = 0.35 if target[k] < cur else 0.03          # brzi napad / spori otpust
        cur += a * (target[k] - cur)
        g[k] = cur
    gs = 10 ** (np.interp(np.arange(N), np.arange(nb) * blk + blk / 2, g) / 20)
    L *= gs
    R *= gs
    fade = np.ones(N)
    fade[:int(0.2 * SR)] = np.linspace(0, 1, int(0.2 * SR))
    fade[-int(1.4 * SR):] *= np.linspace(1, 0, int(1.4 * SR)) ** 1.5
    L *= fade
    R *= fade
    pk = max(np.max(np.abs(L)), np.max(np.abs(R))) + 1e-9
    L = np.tanh(1.3 * L / pk) / np.tanh(1.3)
    R = np.tanh(1.3 * R / pk) / np.tanh(1.3)
    mix = np.stack([L, R], 1) * 0.89
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())
    return path


# ------------------------------------------------------------------ zamjena zvuka u MP4
def remux(src_mp4, wav, out_mp4, ff=None):
    if ff is None:
        import imageio_ffmpeg
        ff = imageio_ffmpeg.get_ffmpeg_exe()
    p = subprocess.run([ff, "-hide_banner", "-nostats", "-i", wav, "-af",
                        "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    txt = p.stderr
    st = json.loads(txt[txt.rindex("{"):txt.rindex("}") + 1])
    ln = ("loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={input_i}:measured_TP={input_tp}:"
          "measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset}:linear=true").format(**st)
    subprocess.run([ff, "-y", "-hide_banner", "-loglevel", "error", "-i", src_mp4, "-i", wav,
                    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-af", ln + ",aresample=44100",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", out_mp4], check=True)
    return st


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--wav":
        build_audio(sys.argv[2])
        print("WAV ✓", sys.argv[2])
    elif len(sys.argv) == 3:
        w = "/tmp/spt_film_audio_v3.wav"
        build_audio(w)
        print("audio ✓", flush=True)
        st = remux(sys.argv[1], w, sys.argv[2])
        print("mp4 ✓", sys.argv[2], os.path.getsize(sys.argv[2]) // 1024, "KB · ulaz", st["input_i"], "LUFS")
    else:
        print(__doc__)
        sys.exit(1)
