#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPT film — zvučni zapis v2 (bez naracije i govora; samo zvukovi sporta i sučelja)

Što je novo u odnosu na v1:
  * izbačeni šumni "whoosh" prijelazi između scena (zvučali su kao šmrcanje / udah)
  * publika: žamor stadiona sintetiziran iz ~48 "glasova" (formanti samoglasnika,
    slogovni ritam, raspon visina) + jeka stadiona — umjesto filtriranog šuma
  * navijači glasniji: bubnjevi, ritmični pljesak, zvižduci navijača,
    "ooo" napetost dok #9 sprinta, erupcija na gol, završni pljesak
  * otkucaji srca zadržani i pojačani (scena sata + napetost prije udarca),
    s harmonicima da se čuju i na zvučnicima mobitela/laptopa
  * realističniji udarci lopte, sudačka zviždaljka (kuglica), dvorana u UWB sceni
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


# ------------------------------------------------------------------ miks
def build_audio(path):
    dry = Bus()          # izravni zvukovi
    stad = Bus()         # slanje u jeku stadiona
    hall = Bus()         # slanje u jeku dvorane (UWB scena)

    # 1) žamor stadiona (razina po scenama) — glasniji nego u v1
    mL, mR = crowd_murmur()
    M = env_db([(0, -60), (0.4, -34), (2.0, -19), (3.5, -15), (4.1, -9), (7.6, -10), (8.3, -14), (17.6, -15),
                (18.15, -25), (20.8, -25), (21.2, -27), (23.8, -27), (24.3, -14), (26.8, -12),
                (27.2, -9), (34.0, -8), (36.2, -7), (36.7, -6), (39.0, -10), (39.4, -13),
                (49.3, -13), (49.7, -19), (52.3, -19), (52.7, -13), (55.0, -13), (55.8, -9),
                (59.5, -9), (61.0, -60)])
    stad.L += 0.75 * mL * M
    stad.R += 0.75 * mR * M
    dry.L += 0.35 * mL * M
    dry.R += 0.35 * mR * M

    # 2) navijači: napetost, gol, završno slavlje
    rL, rR = crowd_roar()
    stad.L += 0.55 * rL
    stad.R += 0.55 * rR
    dry.L += 0.25 * rL
    dry.R += 0.25 * rR

    # 3) bubnjevi navijača (120 BPM, "BUM . BUM . BUM BUM BUM .")
    pattern = [1, 0, 1, 0, 1, 1, 1, 0]
    for (s, e, g, full) in ((4.3, 7.9, 0.30, False), (8.0, 17.8, 0.12, False), (24.4, 34.3, 0.24, False),
                            (36.8, 39.3, 0.36, True), (56.3, 59.8, 0.30, False)):
        k = 0
        T = s
        while T < e:
            if full or pattern[k % 8]:
                stad.add(drum_hit(rng.uniform(0.85, 1.0)), T + rng.normal(0, 0.006), g, pan=-0.35)
            T += 0.25
            k += 1

    # 4) ritmični pljesak tribina (na dobe) + slobodan pljesak (gol, kraj)
    times, gains, pans = [], [], []
    for (s, e, g) in ((5.0, 7.8, 0.5), (27.4, 34.0, 0.55)):
        beat = s
        k = 0
        while beat < e:
            if k % 4 != 3:                                   # "pljes pljes pljes ."
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

    # 7) otkucaji srca: scena sata (72 BPM) + napetost prije udarca (ubrzava 96→132)
    T = 18.05
    while T < 20.85:
        dry.add(heart_pair(), T, 2.4)
        T += 60.0 / 72
    T = 34.35
    while T < SHOT - 0.15:
        u = (T - 34.35) / (SHOT - 34.35)
        dry.add(heart_pair(), T, 1.9)
        T += 60.0 / (96 + 36 * u)

    # 8) utakmica: dodavanja, udarac
    for (t0, t1), p in zip(PASSES, PASS_PAN):
        dry.add(ball_kick(0.8), L0 + t0, 0.8, pan=p)
        stad.add(ball_kick(0.8), L0 + t0, 0.18, pan=p)
        dry.add(ball_kick(0.35), L0 + t1, 0.55, pan=min(0.9, p + 0.2))
    dry.add(ball_kick(1.45), SHOT, 1.0, pan=0.6)
    stad.add(ball_kick(1.45), SHOT, 0.35, pan=0.6)
    stad.add(drum_hit(1.0), GOAL + 0.02, 0.45, pan=0.0)

    # 9) dvorana (UWB sidra, odbojka): škripa tenisica, smeč, odskok
    for T in (21.35, 21.9, 22.75, 23.3):
        hall.add(squeak(), T, 0.9, pan=rng.uniform(-0.6, 0.6))
        dry.add(squeak(), T, 0.55, pan=rng.uniform(-0.6, 0.6))
    hall.add(ball_slap(260, 1.0), 22.15, 1.4, pan=0.2)
    dry.add(ball_slap(260, 1.0), 22.15, 1.0, pan=0.2)
    hall.add(ball_slap(140, 0.5), 22.42, 0.6, pan=0.35)

    # 10) trening: dva udarca i kratki zvižduk trenera
    for T, p in ((50.05, -0.3), (51.25, 0.25)):
        dry.add(ball_kick(0.85), T, 0.7, pan=p)
        stad.add(ball_kick(0.85), T, 0.12, pan=p)
    dry.add(ref_whistle(0.18), 51.9, 0.28, pan=-0.2)
    dry.add(ref_whistle(0.18), 52.12, 0.28, pan=-0.2)

    # 11) sučelje / nadzorne ploče (diskretno) + ACWR alarm
    dry.add(alert_ping(), ALERT, 0.16, pan=0.25)
    for T in (39.1, 42.6, 46.1, 52.6):
        dry.add(blip(), T, 0.07, pan=0.0)

    # 12) filmski "boom" na početku i na odjavnoj špici (bez šuma)
    dry.add(sub_boom(), 0.25, 1.6)
    dry.add(sub_boom(), 55.6, 0.6)

    # jeka
    irS = make_ir(1.9, 3.0, 5)
    irH = make_ir(1.25, 2.0, 6, predelay=0.012, hf=0.6, early=10)
    L = dry.L + 0.8 * convolve(stad.L, irS[0]) + 0.25 * stad.L + 0.7 * convolve(hall.L, irH[0]) + 0.3 * hall.L
    R = dry.R + 0.8 * convolve(stad.R, irS[1]) + 0.25 * stad.R + 0.7 * convolve(hall.R, irH[1]) + 0.3 * hall.R

    # obrada: DC, blagi kompresor (RMS 20 ms, 2.2:1), meki limiter
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
        w = "/tmp/spt_film_audio_v2.wav"
        build_audio(w)
        print("audio ✓", flush=True)
        st = remux(sys.argv[1], w, sys.argv[2])
        print("mp4 ✓", sys.argv[2], os.path.getsize(sys.argv[2]) // 1024, "KB · ulaz", st["input_i"], "LUFS")
    else:
        print(__doc__)
        sys.exit(1)
