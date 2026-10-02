#!/usr/bin/env python3
from pathlib import Path
ROOT=Path.cwd()/"apps"/"portal"
SCRIPTS='''<script src="/assets/worker-live-desk-v1.js" defer></script>
<script src="/assets/regional-incident-desk-v1.js" defer></script>
<script src="/assets/aktual-radio-player-v1.js" defer></script>
<script src="/assets/workforce-evolution-desk-v1.js" defer></script>'''
CSS='''<style id="aktual-media-v1-style">
.ak-v1{max-width:1100px;margin:0 auto 28px;padding:0 20px}.ak-v1-panel{background:linear-gradient(135deg,#071426,#102238);border:1px solid rgba(212,175,55,.45);border-radius:14px;padding:20px;color:#e8edf3}.ak-v1 h2{margin:0 0 8px;color:#fff}.ak-v1 p{color:#cbd5e1}.ak-v1-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:18px}.radio-controls-panel{display:grid;gap:10px}.radio-select,.btn-radio-play,.btn-radio-next,.btn-vol-adj{padding:10px;border-radius:8px}.radio-now-playing{display:flex;justify-content:space-between;gap:16px;background:rgba(0,0,0,.25);padding:12px;border-radius:8px}.equalizer-visualizer{display:flex;align-items:flex-end;gap:3px;height:30px}.eq-bar{width:5px;height:4px;background:#d4af37}.incident-category-grid,.evolution-ideas-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.incident-item,.evolution-idea-card,.tabloid-wire-card{background:rgba(255,255,255,.05);border:1px solid rgba(212,175,55,.2);border-radius:8px;padding:12px}.incident-desk-wrapper,.evolution-desk-wrapper{background:#0d2038;border:1px solid #31506e;border-radius:12px;padding:16px}.wire-badge,.incident-pulse-badge,.evolution-pulse-badge{color:#ffd700;font-weight:800}.wire-card-top,.item-meta,.idea-top{display:flex;gap:8px;flex-wrap:wrap;font-size:.75rem}.tabloid-wire-stream{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}@media(max-width:760px){.ak-v1-grid,.incident-category-grid,.evolution-ideas-grid{grid-template-columns:1fr}}
</style>'''

def radio_block(en=False):
    bars=''.join('<span class="eq-bar"></span>' for _ in range(7))
    status='RADIO STANDBY' if en else 'RADIO U PRIPRAVNOSTI'
    stream='Internet audio streams' if en else 'Internetski audio streamovi'
    track='Live audio stream' if en else 'Audio stream uživo'
    meta='Track metadata unavailable' if en else 'Podaci o pjesmi nisu dostupni'
    play='START RADIO' if en else 'POKRENI RADIO'
    select='Select stream' if en else 'Odaberi stream'
    return f'''<section class="ak-v1" id="aktualRadioDeck"><div class="ak-v1-panel"><div class="ak-v1-grid"><div><div><span class="radio-status" id="radioStatusLabel">○ {status}</span></div><h2>📻 RADIO AKTUAL · USA &amp; WORLD</h2><p id="radioStationTag">{stream}</p><div class="radio-now-playing"><div><strong id="radioTrackName">{track}</strong><br><span id="radioTrackArtist">{meta}</span></div><div class="equalizer-visualizer" id="radioVisualizer">{bars}</div></div><div id="radioAnnounceBanner"></div></div><div class="radio-controls-panel"><label for="radioStationSelect">{select}</label><select id="radioStationSelect" class="radio-select"><option value="0">AKTUAL USA Top Hits &amp; Rock</option><option value="1">AKTUAL Lo-Fi Chill &amp; Business Lounge</option><option value="2">AKTUAL Synthwave &amp; Retro Tech</option></select><button type="button" id="radioPlayBtn" class="btn-radio-play">▶ {play}</button><button type="button" id="radioNextBtn" class="btn-radio-next">⏭ Info / promo</button><div><button id="radioVolDown" type="button" class="btn-vol-adj">−</button><input id="radioVolSlider" type="range" min="0" max="1" step=".05" value=".8" aria-label="Volume"><button id="radioVolUp" type="button" class="btn-vol-adj">+</button></div></div></div></div></section>'''

def blocks(en=False):
    title='Workforce control status' if en else 'Status digitalne radne snage'
    note=('1,573 modeled profiles/assignments; runtime evidence comes from production health and workflow runs.' if en else '1.573 modelirana profila/assignmenta; runtime dokaz dolazi iz production healtha i workflow runova.')
    return CSS+f'''<section class="ak-v1"><div class="ak-v1-panel"><h2>{title}</h2><p>{note}</p><div class="tabloid-wire-stream" id="workerWireStream"></div></div></section>'''+radio_block(en)+'''<section class="ak-v1"><div id="akRegionalIncidentMonitor"></div></section><section class="ak-v1"><div id="akWorkforceEvolutionDesk"></div></section>'''

def patch(path,en=False):
    s=path.read_text(encoding='utf-8')
    if 'id="aktualRadioDeck"' not in s:
        marker='<div class="ak-datahub-section" id="akDataHub">'
        if marker not in s:
            raise SystemExit(f'missing insertion marker in {path}')
        s=s.replace(marker,blocks(en)+'\n'+marker,1)
    for tag in SCRIPTS.splitlines():
        if tag not in s:
            s=s.replace('</body>',tag+'\n</body>',1)
    path.write_text(s,encoding='utf-8')

patch(ROOT/'gnk-aktual/index.html',False)
patch(ROOT/'en/gnk-aktual/index.html',True)

def radio_page(en=False):
    lang='en' if en else 'hr'
    canonical='https://gnk-asg.hr/en/radio/' if en else 'https://gnk-asg.hr/radio/'
    desc='Radio Aktual internet audio streams with explicit user playback controls.' if en else 'Radio Aktual internetski audio streamovi s korisničkim kontrolama reprodukcije.'
    back='/en/gnk-aktual/' if en else '/gnk-aktual/'
    return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Radio Aktual | GNK ASG</title><meta name="description" content="{desc}"><link rel="canonical" href="{canonical}">{CSS}</head><body style="margin:0;background:#071426;color:#e8edf3;font-family:Arial,sans-serif"><main style="max-width:1180px;margin:auto;padding:40px 20px"><p><a href="{back}" style="color:#e0bd69">← AKTUAL MEDIA</a></p><h1>Radio Aktual</h1><p>{desc}</p>{radio_block(en)}</main><script src="/assets/aktual-radio-player-v1.js" defer></script></body></html>'''

for rel,en in [('radio/index.html',False),('en/radio/index.html',True)]:
    p=ROOT/rel
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(radio_page(en),encoding='utf-8')
print('Applied Aktual Media decks and radio landing pages')
