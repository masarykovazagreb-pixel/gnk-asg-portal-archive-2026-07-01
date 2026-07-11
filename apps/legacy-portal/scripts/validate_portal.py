#!/usr/bin/env python3
"""Validate GNK ASG portal, SEO, location panels, sharing and public datasets."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
SITE = 'https://gnk-asg.hr/'
DEFAULT_IMAGE = SITE + 'assets/gnk-asg-social-card.png'
ERRORS: list[str] = []
PASSED: list[str] = []
PAGES = [
    ('index.html', SITE), ('en/index.html', SITE + 'en/'),
    ('trzista/index.html', SITE + 'trzista/'), ('en/markets/index.html', SITE + 'en/markets/'),
    ('sadrzaj/index.html', SITE + 'sadrzaj/'), ('financije/index.html', SITE + 'financije/'),
    ('en/finance/index.html', SITE + 'en/finance/'), ('tehnologija/index.html', SITE + 'tehnologija/'),
    ('en/technology/index.html', SITE + 'en/technology/'), ('intelligence-desk/index.html', SITE + 'intelligence-desk/'),
    ('en/intelligence-desk/index.html', SITE + 'en/intelligence-desk/'), ('registri/index.html', SITE + 'registri/'),
    ('en/registries/index.html', SITE + 'en/registries/'), ('instalacija/index.html', SITE + 'instalacija/')
]
PAGE_IMAGES = {
    'trzista/index.html': SITE + 'assets/share-trzista.png', 'en/markets/index.html': SITE + 'assets/share-trzista.png',
    'financije/index.html': SITE + 'assets/share-financije.png', 'en/finance/index.html': SITE + 'assets/share-financije.png',
    'tehnologija/index.html': SITE + 'assets/share-tehnologija.png', 'en/technology/index.html': SITE + 'assets/share-tehnologija.png',
    'teme/index.html': SITE + 'assets/share-teme.png'
}

def ok(text: str) -> None:
    PASSED.append(text); print('PASS: ' + text)

def fail(text: str) -> None:
    ERRORS.append(text); print('FAIL: ' + text, file=sys.stderr)

def load(path: Path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc:
        fail(f'JSON nije moguće učitati: {path.relative_to(ROOT)} ({exc})'); return None

def needed(path: str) -> None:
    p = ROOT / path
    if p.exists() and p.stat().st_size > 0: ok('Datoteka postoji: ' + path)
    else: fail('Nedostaje datoteka: ' + path)

def check_structure(seo: bool = False) -> None:
    required = [
        'index.html','en/index.html','trzista/index.html','en/markets/index.html','financije/index.html','en/finance/index.html',
        'tehnologija/index.html','en/technology/index.html','intelligence-desk/index.html','en/intelligence-desk/index.html',
        'registri/index.html','en/registries/index.html','admin/index.html','webmail/index.html','sw.js','manifest.webmanifest',
        'package.json','playwright.config.js','tests/market-centre.spec.js','assets/app.js','assets/language-routing.js',
        'assets/portal-navigation.js','assets/mobile-navigation.js','assets/site-share.js','assets/content-share.js',
        'assets/share-routing-fix.js','assets/floating-intelligence.js','assets/floating-intelligence.css',
        'assets/bpp-public-card.js','assets/bpp-public-card.css','assets/group-network.js','assets/network-motion.js',
        'assets/group-globe-3d.js','assets/group-google-map.js','assets/group-google-map.css','assets/group-location-weather.js',
        'assets/group-location-weather.css','assets/group-overview-panel.js','assets/portal-layout.js','assets/portal-integration.css',
        'assets/public-tools.js','assets/market-centre.css','assets/market-centre-panels.css','assets/market-centre-data.js',
        'assets/market-constellation.js','assets/gnk-asg-social-card.svg','assets/favicon.svg','assets/app-icon-192.svg',
        'assets/app-icon-512.svg','assets/admin-status-only.js','data/group_network.json','data/group_network_geo.json',
        'data/media_approved.json','data/media_monitor_status.json','data/stablecoins.json','data/exchange_compare.json',
        'data/market_indices.json','data/fast_market_status.json','data/daily_market_brief.json','scripts/news_publication.py',
        'scripts/update_macro_data.py','scripts/update_fast_market.py','scripts/generate_daily_market_brief.py','scripts/generate_social_preview.py',
        'scripts/discover_corporate_media.py','scripts/generate_seo.py','scripts/validate_portal.py',
        '.github/workflows/autonomous-public-live-refresh.yml','.github/workflows/fast-market-update.yml',
        '.github/workflows/daily-market-brief.yml','.github/workflows/daily-seo-refresh.yml',
        '.github/workflows/media-monitor-status.yml','.github/workflows/manage-approved-media.yml',
        '.github/workflows/portal-validation.yml','podijeli/bpp/index.html'
    ]
    for path in required: needed(path)
    if seo:
        for image in ['assets/gnk-asg-social-card.png','assets/share-bpp.png','assets/share-financije.png','assets/share-grupa.png','assets/share-trzista.png','assets/share-tehnologija.png','assets/share-vijesti.png','assets/share-teme.png','assets/share-dokumenti.png']:
            needed(image)
    obsolete = ['data/corporate_review_queue.json','data/corporate_review_decisions.json','.github/workflows/queue-item-action.yml','.github/workflows/review-queue-refresh.yml','scripts/apply_review_decision.py','assets/admin-console.js','.github/workflows/hourly-news-update.yml','.github/workflows/hourly-data-update.yml','.github/workflows/news-feed-archive-refresh.yml','scripts/update_feeds_v2.py','scripts/update_feeds_resilient.py','scripts/trim_news_archive.py','scripts/generate_news_share_previews.py']
    for path in obsolete:
        if (ROOT / path).exists(): fail('Neželjeni ili duplicirani javni artefakt: ' + path)
        else: ok('Nije prisutno: ' + path)
    app = (ROOT/'assets/app.js').read_text(encoding='utf-8'); nav = (ROOT/'assets/portal-navigation.js').read_text(encoding='utf-8'); lang = (ROOT/'assets/language-routing.js').read_text(encoding='utf-8'); mobile = (ROOT/'assets/mobile-navigation.js').read_text(encoding='utf-8'); sharing = (ROOT/'assets/site-share.js').read_text(encoding='utf-8')
    for name in ['group-globe-3d.js','network-motion.js','portal-layout.js','group-google-map.js','group-location-weather.js','bpp-public-card.js','share-routing-fix.js']:
        ok('Aplikacija učitava: ' + name) if name in app else fail('Aplikacija ne učitava: ' + name)
    if "'/trzista/'" in nav and "'/en/markets/'" in nav and '/webmail/' in nav and '/gnk-asg/' not in nav: ok('Glavna navigacija koristi rute vlastite domene')
    else: fail('Navigacija nema ispravne rute vlastite domene')
    if "'/en/'" in lang and "'/'" in lang and '/gnk-asg/' not in lang: ok('Promjena jezika koristi rute vlastite domene')
    else: fail('Promjena jezika još koristi staru putanju')
    if '/webmail/' in mobile and '/admin/' in mobile and '/gnk-asg/' not in mobile: ok('Mobilni izbornik koristi rute vlastite domene i webmail')
    else: fail('Mobilni izbornik nema ispravne nove rute')
    if "const ROOT = '/';" in sharing and 'COUNTER_BASE = 3056' in sharing and '/gnk-asg/' not in sharing: ok('Dijeljenje i indikativni brojač koriste novu potvrđenu osnovicu 3056')
    else: fail('Dijeljenje ili osnovica brojača nisu usklađeni')
    for page in ['trzista/index.html','en/markets/index.html']:
        html = (ROOT/page).read_text(encoding='utf-8')
        if 'market-centre-data.js' in html and 'market-constellation.js' in html and 'marketConstellation' in html: ok('Market Intelligence prikaz povezan: ' + page)
        else: fail('Market Intelligence prikaz nije potpuno povezan: ' + page)
    admin = (ROOT/'admin/index.html').read_text(encoding='utf-8'); webmail = (ROOT/'webmail/index.html').read_text(encoding='utf-8')
    if 'media-monitor-status.yml' in admin and 'name="robots" content="noindex,nofollow,noarchive"' in admin: ok('Admin je statusni i izvan indeksa')
    else: fail('Admin nema očekivani sigurnosni/noindex model')
    if 'info@gnk-asg.hr' in webmail and 'noindex, nofollow, noarchive' in webmail and 'Aktivacija u pripremi' in webmail: ok('Webmail ulaz je pripremljen bez javnog prihvata zaporke')
    else: fail('Webmail ulaz nema očekivani sigurnosni model')
    news_flow = (ROOT/'.github/workflows/autonomous-public-live-refresh.yml').read_text(encoding='utf-8'); fast = (ROOT/'.github/workflows/fast-market-update.yml').read_text(encoding='utf-8'); daily = (ROOT/'.github/workflows/daily-market-brief.yml').read_text(encoding='utf-8')
    if "cron: '7,22,37,52 * * * *'" in news_flow and 'scripts/news_publication.py' in news_flow and 'update_fast_market.py' not in news_flow and 'cancel-in-progress: false' in news_flow: ok('Jedini automatski workflow izolirano obrađuje i objavljuje vijesti')
    else: fail('Automatski workflow vijesti nije jedinstven ili nije izoliran')
    if "cron: '2-57/5 * * * *'" in fast and 'fast_market_status.json' in fast and 'update_status.json' not in fast and 'update_fast_market.py' in fast: ok('Petominutni tržišni workflow izoliran je i izvršava se izvan pune minute')
    else: fail('Petominutni tržišni workflow nije pravilno izoliran ili raspored nije usklađen')
    if 'generate_daily_market_brief.py' in daily: ok('Dnevni tržišni osvrt ima workflow')
    else: fail('Nedostaje workflow dnevnog osvrta')

def check_seo() -> None:
    tokens = ['<title>','name="description"','name="robots"','rel="canonical"','property="og:title"','property="og:description"','property="og:url"','property="og:image"','property="og:image:type" content="image/png"','name="twitter:card"','name="twitter:image"','type="application/ld+json"','SEO:BEGIN generated by scripts/generate_seo.py']
    for file, page_url in PAGES:
        page = (ROOT/file).read_text(encoding='utf-8'); missing = [token for token in tokens if token not in page]; expected_image = PAGE_IMAGES.get(file, DEFAULT_IMAGE)
        if missing: fail(f'SEO paket nije potpun za {file}: {missing}')
        elif f'href="{page_url}"' not in page or f'content="{page_url}"' not in page or expected_image not in page: fail('Canonical ili PNG social preview nije usklađen za ' + file)
        else: ok('Potpuni SEO paket: ' + file)
    bpp = (ROOT/'podijeli/bpp/index.html').read_text(encoding='utf-8')
    if 'assets/share-bpp.png' in bpp and 'GNK ASG d.o.o. ne upravlja' in bpp and 'property="og:title"' in bpp: ok('BPP share preview ima vlastitu sliku i pravnu napomenu')
    else: fail('BPP share preview nije potpun')
    sitemap = (ROOT/'sitemap.xml').read_text(encoding='utf-8'); missing = [page_url for _, page_url in PAGES if page_url not in sitemap]
    if missing: fail('Sitemap nema sve javne rute: ' + ', '.join(missing))
    else: ok('Sitemap sadrži svih četrnaest javnih ruta')
    robots = (ROOT/'robots.txt').read_text(encoding='utf-8')
    if 'Disallow: /admin/' in robots and SITE+'sitemap.xml' in robots: ok('Robots politika zadržava admin izvan indeksa')
    else: fail('Robots politika nije ispravna')

def check_network() -> None:
    network = load(DATA/'group_network.json') or {}; geo = load(DATA/'group_network_geo.json') or {}; nodes = network.get('nodes',[]); total = len(nodes) + (1 if network.get('center') else 0)
    if total == network.get('counts',{}).get('expanded_total') == 45: ok('3D korporativna mreža ima 45 lokacija')
    else: fail('3D korporativna mreža nije potpuna')
    missing = [node.get('id') for node in nodes if node.get('id') not in geo.get('nodes',{})]
    if geo.get('center',{}).get('id') == network.get('center',{}).get('id') and not missing: ok('Sve lokacije imaju 3D koordinate')
    else: fail('Nedostaju 3D koordinate: ' + str(missing))

def check_data(post_fetch: bool) -> None:
    news = load(DATA/'news.json'); market = load(DATA/'market.json') or {}; btc = load(DATA/'btc_chart.json') or {}; macro = load(DATA/'macro_market.json') or {}; stable = load(DATA/'stablecoins.json') or {}; exchanges = load(DATA/'exchange_compare.json') or {}; indices = load(DATA/'market_indices.json') or {}; fast = load(DATA/'fast_market_status.json') or {}; brief = load(DATA/'daily_market_brief.json') or {}; monitor = load(DATA/'media_monitor_status.json') or {}; hourly = load(DATA/'update_status.json') or {}
    if isinstance(news,list) and 0 < len(news) <= 500: ok(f'Vijesti su dostupne: {len(news)} stavki')
    else: fail('Vijesti nedostaju ili prelaze javni limit')
    if isinstance(news,list) and any(item.get('share_url') for item in news[:80]): ok('Vijesti sadrže individualne share URL-ove')
    elif post_fetch: fail('Vijesti nemaju individualne share URL-ove')
    if len(market.get('coins',[])) >= 8: ok(f'Digital Assets sadrži {len(market.get("coins",[]))} valuta')
    elif post_fetch: fail('Digital Assets nema najmanje osam valuta')
    if len(btc.get('prices',[])) >= 7: ok(f'BTC graf sadrži {len(btc.get("prices",[]))} točaka')
    elif post_fetch: fail('BTC graf nije popunjen')
    if all(key in macro.get('assets',{}) for key in ['btc','gold','oil','usd']): ok('Makro usporedba sadrži BTC, zlato, Brent i USD/EUR')
    else: fail('Makro usporedba nije potpuna')
    if post_fetch:
        if len(stable.get('stablecoins',[])) >= 3: ok(f'Stablecoin monitor sadrži {len(stable.get("stablecoins",[]))} tokena')
        else: fail('Stablecoin monitor nema dovoljno opažanja')
        if len(exchanges.get('exchanges',[])) >= 1: ok(f'Usporedba burzi sadrži {len(exchanges.get("exchanges",[]))} izvora')
        else: fail('Usporedba burzi je prazna')
        if len(indices.get('indices',[])) >= 3: ok(f'Globalni indeksi sadrže {len(indices.get("indices",[]))} tržišta')
        else: fail('Usporedba indeksa nema dovoljno tržišta')
        if not fast.get('errors') and fast.get('digital_assets',{}).get('coins',0) >= 8 and fast.get('cadence') == 'scheduled every five minutes': ok('Petominutni status potvrđuje tržišni dohvat')
        else: fail('Petominutni tržišni status sadrži pogrešku')
        news_status = hourly.get('news', {})
        if 'market' not in hourly and news_status.get('engine') == 'single_publication_engine_v1' and news_status.get('public_items',0) > 0 and news_status.get('archive_items',0) <= 400: ok('Status potvrđuje jedinstveni odvojeni proces vijesti')
        else: fail('Status vijesti nije iz novog jedinstvenog procesa')
        if brief.get('status') == 'published' and len(brief.get('summary',[])) >= 3 and len(brief.get('summary_en',[])) >= 3: ok('Dnevni stručni osvrt je objavljen dvojezično')
        else: fail('Dnevni stručni osvrt nije potpuno generiran')
        if not macro.get('errors'): ok('Makro tržišni dohvat nema pogrešaka')
        else: fail('Makro tržišni dohvat ima pogreške')
        if monitor.get('status') in {'ok','partial'} and monitor.get('public_display_policy') == 'manual_approval_only': ok('Medijski monitor zadržava ručno odobravanje')
        else: fail('Politika media monitora nije ispravna')

def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument('--post-fetch', action='store_true'); parser.add_argument('--seo', action='store_true'); args = parser.parse_args()
    check_structure(args.seo); check_network(); check_data(args.post_fetch)
    if args.seo: check_seo()
    print(f'\nRezultat: {len(PASSED)} provjera prošlo; {len(ERRORS)} provjera nije prošlo.')
    if ERRORS:
        for err in ERRORS: print(' - ' + err, file=sys.stderr)
        return 1
    return 0
if __name__ == '__main__': raise SystemExit(main())
