#!/usr/bin/env python3
"""AKTUAL RADIO jingles: natural voice (pre-generated TTS, ./voice) + short bright synth sting.

Run:  python tools/radio-jingles/build_jingles.py   (needs numpy, scipy, imageio-ffmpeg)
Outputs (in apps/portal/radio/jingles, preview in ./preview — not committed):
  aktual-radio-jingle-1..4.mp3   final jingles, loudness-normalised (~-16 LUFS, -1.5 dBTP)
                                 ON AIR (owner-approved 2026-10-12): only no. 3 „Vi slušate AKTUAL MEDIA RADIO.
                                 Ostanite s nama!” as a tight ~4 s ident (short sting, shorter pause, +8 % tempo)
  demo-jingle-preko-pjesme.mp3   preview: synthwave bed, music ducks under a jingle, then returns
No noise swooshes are used (the sting is purely tonal).
"""
import os, subprocess, wave, json, re
import numpy as np
from scipy.signal import lfilter

try:
    import imageio_ffmpeg; FF = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FF = 'ffmpeg'
SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(REPO, 'apps', 'portal', 'radio', 'jingles'); os.makedirs(OUT, exist_ok=True)
PREVIEW = os.path.join(HERE, 'preview'); os.makedirs(PREVIEW, exist_ok=True)
TMP = os.path.join(HERE, '.work'); os.makedirs(TMP, exist_ok=True)
VOICES = ['j1', 'j2', 'j3', 'j4']
rng = np.random.default_rng(7)


def load_wav(p):
    w = wave.open(p); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1: x = x.reshape(-1, ch).mean(1)
    assert sr == SR, sr
    return x


def save_wav(p, x):
    x = np.clip(x, -1, 1)
    if x.ndim == 1: x = np.stack([x, x], 1)
    w = wave.open(p, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()


def trim(x, thr=0.01, pad=0.04):
    idx = np.where(np.abs(x) > thr)[0]
    a = max(0, idx[0] - int(pad * SR)); b = min(len(x), idx[-1] + int(pad * SR))
    y = x[a:b].copy()
    f = int(0.01 * SR); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    return y


def tighten(x, max_gap=0.2, thr_db=-38):
    """Shorten pauses inside speech to max_gap seconds (10 ms crossfades) — keeps the voice natural."""
    hop = int(0.01 * SR); n = len(x) // hop
    rms = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    db = 20 * np.log10(rms + 1e-9); on = db > db.max() + thr_db
    keep = np.ones(len(x), bool); i = 0
    while i < n:
        if not on[i]:
            j = i
            while j < n and not on[j]: j += 1
            if 0 < i and j < n and (j - i) * 0.01 > max_gap:          # internal pause only
                cut = int(((j - i) * 0.01 - max_gap) * SR); mid = (i + j) * hop // 2
                keep[mid - cut // 2: mid - cut // 2 + cut] = False
            i = j
        else:
            i += 1
    y = x[keep].copy()
    edges = np.where(np.diff(keep.astype(int)) == 1)[0]              # splice points in the kept signal
    f = int(0.01 * SR)
    for e in np.searchsorted(np.where(keep)[0], edges):
        if f < e < len(y) - f:
            y[e - f:e] *= np.linspace(1, 0.6, f); y[e:e + f] *= np.linspace(0.6, 1, f)
    return y


def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    return lfilter([1 - a], [1, -a], x)


def hp(x, fc):
    return x - onepole_lp(x, fc)


def voice_polish(v):
    v = hp(v, 85)                                   # rumble out
    # gentle presence: add a little of the 2-5 kHz band back
    band = hp(onepole_lp(v, 5000), 2000)
    v = v + 0.18 * band
    # soft compression (RMS follower, ratio ~2.5:1 above -24 dBFS)
    env = np.sqrt(onepole_lp(v * v, 12) + 1e-9)
    thr = 10 ** (-24 / 20)
    gain = np.where(env > thr, (env / thr) ** (1 / 2.5 - 1), 1.0)
    return v * gain


def note(f):
    return 440.0 * 2 ** ((f - 69) / 12)


def pluck(freq, dur, amp=0.25, detune=0.006):
    t = np.arange(int(dur * SR)) / SR; y = np.zeros_like(t)
    for d in (-detune, 0, detune):
        f = freq * (1 + d)
        for h in range(1, 14):
            if f * h > 15000: break
            y += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6.28)) / h * np.exp(-t * (3.2 + 1.1 * h))
    y *= amp / 3
    a = int(0.004 * SR); y[:a] *= np.linspace(0, 1, a)
    return y


def bell(freq, dur, amp=0.12):
    t = np.arange(int(dur * SR)) / SR
    y = sum(w * np.sin(2 * np.pi * freq * r * t) * np.exp(-t * k) for r, w, k in ((1, 1, 2.2), (2.0, .35, 4), (3.01, .18, 6), (5.4, .08, 9)))
    return amp * y


def pad_chord(freqs, dur, amp=0.07):
    t = np.arange(int(dur * SR)) / SR; y = np.zeros_like(t)
    for f in freqs:
        for d in (-0.004, 0.004):
            ph = rng.uniform(0, 6.28)
            for h in range(1, 8):
                y += np.sin(2 * np.pi * f * (1 + d) * h * t + ph) / h
    env = np.minimum(1, t / 0.25) * np.exp(-t * 0.9)
    return onepole_lp(y * env * amp / len(freqs), 2600)


def sub_boom(dur=0.5, amp=0.35):
    t = np.arange(int(dur * SR)) / SR
    f = 70 * np.exp(-t * 6) + 42
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)


def reverb(x, mix=0.22):
    n = len(x) + int(1.6 * SR)
    xx = np.concatenate([x, np.zeros(n - len(x))])
    out = np.zeros(n)
    for dl, g in ((1557, .84), (1617, .83), (1491, .85), (1422, .86), (1277, .87), (1356, .86)):
        b = np.zeros(dl + 1); b[dl] = 1.0
        a = np.zeros(dl + 1); a[0] = 1.0; a[dl] = -g
        out += lfilter(b, a, xx)
    out = onepole_lp(out / 6, 6000)
    for dl, g in ((225, .5), (556, .5)):
        b = np.zeros(dl + 1); b[0] = -g; b[dl] = 1.0
        a = np.zeros(dl + 1); a[0] = 1.0; a[dl] = -g
        out = lfilter(b, a, out)
    return xx * (1 - mix) + out * mix


def place(buf, sig, t):
    i = int(t * SR); j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i]


def make_sting(total):
    s = np.zeros(int(total * SR))
    place(s, sub_boom(), 0.0)
    arp = [72, 76, 79, 83, 86]             # Cmaj9 rising: C5 E5 G5 B5 D6
    for k, m in enumerate(arp):
        place(s, pluck(note(m), 1.2, amp=0.22), 0.0 + k * 0.075)
        place(s, bell(note(m + 12), 1.0, amp=0.05), 0.0 + k * 0.075)
    place(s, pad_chord([note(60), note(64), note(67), note(71)], min(total, 3.2), amp=0.09), 0.05)
    return reverb(s, 0.25)[:len(s)]


def loudnorm(inp, outp, I=-16, TP=-1.5, LRA=7, br='160k'):
    r = subprocess.run([FF, '-hide_banner', '-i', inp, '-af', f'loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    m = json.loads(re.findall(r'\{[^{}]+\}', r.stderr)[-1])
    af = (f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y', '-i', inp, '-af', af, '-ar', str(SR), '-ac', '2',
                    '-c:a', 'libmp3lame', '-b:a', br, outp], check=True)
    return float(m['input_i'])


def build_jingle(name, idx, lead=0.42, tail=0.55, tempo=1.0, max_gap=None):
    wavp = os.path.join(TMP, name + '.wav')
    af = ['-af', f'atempo={tempo}'] if tempo != 1.0 else []
    subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y', '-i', os.path.join(HERE, 'voice', name + '.mp3'), *af, '-ac', '1', '-ar', str(SR), wavp], check=True)
    v = trim(load_wav(wavp))
    if max_gap: v = tighten(v, max_gap)
    v = voice_polish(v)
    v /= np.abs(v).max() + 1e-9; v *= 0.8
    total = lead + len(v) / SR + tail
    sting = make_sting(total)
    mix = np.zeros(int(total * SR)); place(mix, sting * 0.55, 0); place(mix, v, lead)
    # duck sting under voice (-9 dB) with smooth ramps
    g = np.ones_like(mix); a = int(lead * SR); b = a + len(v); r = int(0.12 * SR)
    g[a:b] = 0.35; g[max(0, a - r):a] = np.linspace(1, .35, a - max(0, a - r)); g[b:b + r] = np.linspace(.35, 1, len(g[b:b + r]))
    mix = mix - sting[:len(mix)] * 0.55 + sting[:len(mix)] * 0.55 * g
    f = int(0.25 * SR); mix[-f:] *= np.linspace(1, 0, f) ** 2
    tmp = os.path.join(TMP, f'_j{idx}.wav'); save_wav(tmp, mix * 0.9)
    outp = os.path.join(OUT, f'aktual-radio-jingle-{idx}.mp3'); loudnorm(tmp, outp)
    return outp, mix, total


# ---------- synthwave demo bed (only for the preview) ----------
def kick(amp=0.9):
    t = np.arange(int(0.42 * SR)) / SR; f = 110 * np.exp(-t * 28) + 46
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def snare(amp=0.35):
    t = np.arange(int(0.3 * SR)) / SR
    n = hp(rng.standard_normal(len(t)), 900) * np.exp(-t * 16)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 22)
    return amp * (0.55 * n + 0.6 * tone)


def hat(amp=0.06):
    t = np.arange(int(0.06 * SR)) / SR
    return amp * hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * 60)


def bass_note(freq, dur, amp=0.32):
    t = np.arange(int(dur * SR)) / SR; y = np.zeros_like(t)
    for h in range(1, 10):
        y += np.sin(2 * np.pi * freq * h * t) / h
    y = onepole_lp(y, 900) * np.exp(-t * 5) * amp
    a = int(0.003 * SR); y[:a] *= np.linspace(0, 1, a); y[-a:] *= np.linspace(1, 0, a)
    return y


def demo_bed(seconds):
    bpm = 108; beat = 60 / bpm; bar = 4 * beat
    prog = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [64, 67, 72]), (55, [67, 71, 74])]  # Am F C G
    L = int(seconds * SR); drums = np.zeros(L); music = np.zeros(L)
    nbars = int(np.ceil(seconds / bar))
    for b in range(nbars):
        root, ch = prog[b % 4]; t0 = b * bar
        place(music, pad_chord([note(m) for m in ch], bar + 0.4, amp=0.10), t0)
        for e in range(8):
            place(music, bass_note(note(root - 12 + (12 if e % 2 else 0)), beat / 2 * 0.95), t0 + e * beat / 2)
        for s16 in range(16):
            m = ch[s16 % 3] + (12 if (s16 // 3) % 2 else 0)
            place(music, pluck(note(m), 0.35, amp=0.07, detune=0.003), t0 + s16 * beat / 4)
        for q in range(4):
            place(drums, kick(), t0 + q * beat)
            if q in (1, 3): place(drums, snare(), t0 + q * beat)
        for e in range(8): place(drums, hat(), t0 + e * beat / 2 + beat / 4)
    music = reverb(music, 0.2)[:L]
    return 0.55 * music + 0.6 * drums


if __name__ == '__main__':
    # no. 3 = the on-air ident: sting starts with the voice, short tail, tighter pause, +8 % tempo → ~4 s
    COMPACT = {'j3': dict(lead=0.08, tail=0.28, tempo=1.08, max_gap=0.18)}
    built = [build_jingle(n, i + 1, **COMPACT.get(n, {})) for i, n in enumerate(VOICES)]
    # preview: 20 s bed, jingle 3 at 6.0 s, music ducked to ~30% and restored
    bed = demo_bed(20.0); L = len(bed)
    _, jmix, jdur = built[2]
    t0 = 6.0; g = np.ones(L)
    a = int((t0 - 0.15) * SR); r1 = int(0.35 * SR); b = int((t0 + jdur - 0.2) * SR); r2 = int(0.9 * SR)
    g[a:a + r1] = np.linspace(1, 0.3, r1); g[a + r1:b] = 0.3; g[b:b + r2] = np.linspace(0.3, 1, r2)
    demo = bed * g
    place(demo, jmix * 1.25, t0)
    f = int(1.0 * SR); demo[-f:] *= np.linspace(1, 0, f)
    tmp = os.path.join(TMP, '_demo.wav'); save_wav(tmp, demo / (np.abs(demo).max() + 1e-9) * 0.9)
    loudnorm(tmp, os.path.join(PREVIEW, 'demo-jingle-preko-pjesme.mp3'), I=-14, br='192k')
    import shutil; shutil.rmtree(TMP, ignore_errors=True)
    print('\n'.join(sorted(os.listdir(OUT))))
