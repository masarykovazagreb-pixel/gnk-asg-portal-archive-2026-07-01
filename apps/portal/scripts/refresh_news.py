#!/usr/bin/env python3
"""Refresh GNK ASG public business news.

This script is intentionally dependency-free. It reads public RSS feeds, merges
new items with existing data/news.json and data/news_archive.json, keeps the
latest 500 public cards and the next 400 archive cards, and writes a heartbeat
status to data/update_status.json on every run.
"""

from __future__ import annotations

import email.utils
import hashlib
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
NEWS_PATH = DATA / "news.json"
ARCHIVE_PATH = DATA / "news_archive.json"
STATUS_PATH = DATA / "update_status.json"

PUBLIC_LIMIT = 500
ARCHIVE_LIMIT = 400
TIMEOUT = 10
USER_AGENT = "GNK-ASG-NewsMonitor/2.0 (+https://gnk-asg.hr/)"

# Public RSS sources and Google News RSS searches. No API keys required.
SOURCES = [
    # ------------------------------------------------------------------
    # Grupe odgovaraju blokovima na /gnk-aktual/:
    #   hrvatska | economy | technology | digital-assets | international
    #
    # VAZNO: prije je 28 od 40 izvora bilo oznaceno kao "international",
    # ukljucujuci CNBC, BBC Business, Guardian Business i MarketWatch.
    # Zato je blok "Svijet" imao 77 vijesti, a "Burza i biznis" samo jedan
    # medij. Grupe su sada rasporedene prema tome gdje vijest stvarno pripada.
    # ------------------------------------------------------------------

    # --- Hrvatska -----------------------------------------------------
    ("hrvatska", "economy", "Poslovni dnevnik", "https://www.poslovni.hr/feed"),
    ("hrvatska", "economy", "Index.hr Novac", "https://www.index.hr/rss/vijesti-novac"),
    ("hrvatska", "economy", "Index.hr", "https://www.index.hr/rss/vijesti"),
    ("hrvatska", "economy", "tportal", "https://www.tportal.hr/rss"),
    ("hrvatska", "economy", "Lider", "https://lidermedia.hr/feed/"),
    ("hrvatska", "economy", "SEEbiz", "https://www.seebiz.eu/rss/"),
    ("hrvatska", "technology", "Netokracija", "https://www.netokracija.com/feed"),
    ("hrvatska", "economy", "Google News HR Business", "https://news.google.com/rss/search?q=poslovanje+OR+ekonomija+OR+financije+Croatia&hl=hr&gl=HR&ceid=HR:hr"),
    ("hrvatska", "technology", "Google News HR Technology", "https://news.google.com/rss/search?q=tehnologija+OR+AI+OR+fintech+Croatia&hl=hr&gl=HR&ceid=HR:hr"),

    # --- Burza i biznis -----------------------------------------------
    ("economy", "economy", "CNBC", "https://www.cnbc.com/id/10001147/device/rss/rss.html"),
    ("economy", "economy", "CNBC Markets", "https://www.cnbc.com/id/100727362/device/rss/rss.html"),
    ("economy", "economy", "BBC Business", "https://feeds.bbci.co.uk/news/business/rss.xml"),
    ("economy", "economy", "The Guardian Business", "https://www.theguardian.com/uk/business/rss"),
    ("economy", "economy", "MarketWatch Top Stories", "https://feeds.content.dowjones.io/public/rss/mw_topstories"),
    ("economy", "economy", "Sky News Business", "https://feeds.skynews.com/feeds/rss/business.xml"),
    ("economy", "economy", "Euronews Business", "https://www.euronews.com/rss?level=theme&name=business"),
    ("economy", "economy", "DW Business", "https://rss.dw.com/xml/rss-en-bus"),
    ("economy", "economy", "The Independent Business", "https://www.independent.co.uk/news/business/rss"),
    ("economy", "economy", "Business Insider", "https://www.businessinsider.com/rss"),
    ("economy", "economy", "Fortune", "https://fortune.com/feed/"),
    ("economy", "economy", "Axios", "https://api.axios.com/feed/"),
    ("economy", "economy", "New York Times Business", "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml"),
    ("economy", "economy", "Al Jazeera Economy", "https://www.aljazeera.com/xml/rss/economy.xml"),
    ("economy", "economy", "Energy Oil", "https://news.google.com/rss/search?q=oil+energy+markets+business+investment&hl=en&gl=US&ceid=US:en"),
    ("economy", "economy", "Food Industry", "https://news.google.com/rss/search?q=food+industry+organic+products+edible+oil+protein+business&hl=en&gl=US&ceid=US:en"),

    # --- Tehnologija ---------------------------------------------------
    ("technology", "technology", "TechCrunch", "https://techcrunch.com/feed/"),
    ("technology", "technology", "The Verge", "https://www.theverge.com/rss/index.xml"),
    ("technology", "technology", "Wired", "https://www.wired.com/feed/rss"),
    ("technology", "technology", "WIRED Business", "https://www.wired.com/feed/category/business/latest/rss"),
    ("technology", "technology", "Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
    ("technology", "technology", "Engadget", "https://www.engadget.com/rss.xml"),
    ("technology", "technology", "ZDNet", "https://www.zdnet.com/news/rss.xml"),
    ("technology", "technology", "MIT Technology Review", "https://www.technologyreview.com/feed/"),
    ("technology", "technology", "BBC Technology", "https://feeds.bbci.co.uk/news/technology/rss.xml"),
    ("technology", "technology", "The Guardian Technology", "https://www.theguardian.com/uk/technology/rss"),
    ("technology", "technology", "Nature", "https://www.nature.com/nature.rss"),
    ("technology", "technology", "Google News AI", "https://news.google.com/rss/search?q=artificial+intelligence+business+investment+technology&hl=en&gl=US&ceid=US:en"),
    ("technology", "technology", "Sports Performance Technology", "https://news.google.com/rss/search?q=sports+performance+tracking+wearables+analytics+technology&hl=en&gl=US&ceid=US:en"),
    ("technology", "technology", "Mobility Technology", "https://news.google.com/rss/search?q=mobility+technology+electric+vehicles+markets&hl=en&gl=US&ceid=US:en"),

    # --- Digitalna imovina ---------------------------------------------
    ("digital-assets", "digital-assets", "CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
    ("digital-assets", "digital-assets", "Cointelegraph", "https://cointelegraph.com/rss"),
    ("digital-assets", "digital-assets", "Decrypt", "https://decrypt.co/feed"),
    ("digital-assets", "digital-assets", "The Block", "https://www.theblock.co/rss.xml"),
    ("digital-assets", "digital-assets", "Bitcoin Magazine", "https://bitcoinmagazine.com/feed"),
    ("digital-assets", "digital-assets", "CryptoSlate", "https://cryptoslate.com/feed/"),
    ("digital-assets", "digital-assets", "Google News Bitcoin", "https://news.google.com/rss/search?q=bitcoin+crypto+exchange+stablecoin+fintech+regulation&hl=en&gl=US&ceid=US:en"),
    ("digital-assets", "digital-assets", "Google News Stablecoin", "https://news.google.com/rss/search?q=stablecoin+regulation+central+bank+fintech&hl=en&gl=US&ceid=US:en"),

    # --- Svijet ----------------------------------------------------------
    ("international", "economy", "BBC News", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("international", "economy", "The Guardian", "https://www.theguardian.com/world/rss"),
    ("international", "economy", "Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
    ("international", "economy", "New York Times World", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"),
    ("international", "economy", "CNN World", "http://rss.cnn.com/rss/edition_world.rss"),
    ("international", "economy", "France 24", "https://www.france24.com/en/rss"),
    ("international", "economy", "NPR News", "https://feeds.npr.org/1001/rss.xml"),
    ("international", "economy", "The Economist International", "https://www.economist.com/international/rss.xml"),
    ("international", "economy", "Japan Times", "https://www.japantimes.co.jp/feed/"),
    ("international", "economy", "South China Morning Post", "https://www.scmp.com/rss/91/feed"),
    ("international", "economy", "ABC News Australia", "https://www.abc.net.au/news/feed/51120/rss.xml"),
    ("international", "economy", "DW Europe", "https://rss.dw.com/xml/rss-en-eu"),
    ("economy", "economy", "TIME", "https://time.com/feed/"),
    ("economy", "economy", "ProPublica", "https://www.propublica.org/feeds/propublica/main"),
    ("economy", "economy", "Reuters Business", "https://news.google.com/rss/search?q=Reuters+business+markets+economy&hl=en&gl=US&ceid=US:en"),
    ("economy", "economy", "AP Business", "https://news.google.com/rss/search?q=AP+business+economy+markets&hl=en&gl=US&ceid=US:en"),
    ("economy", "economy", "Asia Business", "https://news.google.com/rss/search?q=Asia+business+investment+markets+technology&hl=en&gl=US&ceid=US:en"),
    ("economy", "economy", "Africa Business", "https://news.google.com/rss/search?q=Africa+business+investment+markets+technology&hl=en&gl=US&ceid=US:en"),
    ("economy", "economy", "UAE Business", "https://news.google.com/rss/search?q=UAE+Dubai+business+investment+fintech&hl=en&gl=AE&ceid=AE:en"),
    ("economy", "economy", "India Business", "https://news.google.com/rss/search?q=India+business+fintech+technology+markets&hl=en&gl=IN&ceid=IN:en"),
    ("economy", "economy", "Singapore Business", "https://news.google.com/rss/search?q=Singapore+business+fintech+markets+technology&hl=en&gl=SG&ceid=SG:en"),
    ("economy", "economy", "Kenya Nigeria Ghana Business", "https://news.google.com/rss/search?q=Kenya+Nigeria+Ghana+business+fintech+technology&hl=en&gl=US&ceid=US:en"),
    ("hrvatska", "economy", "Google News Slovenia Business", "https://news.google.com/rss/search?q=Slovenija+gospodarstvo+OR+finance+OR+podjetja&hl=sl&gl=SI&ceid=SI:sl"),
    ("hrvatska", "economy", "Google News Serbia Business", "https://news.google.com/rss/search?q=Srbija+privreda+OR+ekonomija+OR+biznis&hl=sr&gl=RS&ceid=RS:sr"),
    ("hrvatska", "economy", "Google News BiH Business", "https://news.google.com/rss/search?q=Bosna+Hercegovina+ekonomija+OR+biznis+OR+privreda&hl=bs&gl=BA&ceid=BA:bs"),
    # Prosirenje izvora (srpanj 2026): dodatni mediji po kategoriji.
    ("technology", "technology", "VentureBeat", "https://venturebeat.com/feed/"),

    # --- Regije: Indija, Azija, Afrika, Latinska Amerika, Bliski istok --
    # Nova grupa "regije" - do sada nije postojala. Dodano da AKTUAL ima
    # sirovinu za regionalnu rubriku (vidi AKTUAL-PLAN.md na api-lab grani).
    ("regije", "indija", "The Hindu BusinessLine", "https://www.thehindubusinessline.com/feeder/default.rss"),
    ("regije", "indija", "Economic Times", "https://economictimes.indiatimes.com/rssfeedstopstories.cms"),
    ("regije", "indija", "Business Standard", "https://www.business-standard.com/rss/home_page_top_stories.rss"),
    ("regije", "indija", "Livemint", "https://www.livemint.com/rss/companies"),
    ("regije", "azija", "Nikkei Asia", "https://asia.nikkei.com/rss/feed/nar"),
    ("regije", "azija", "Channel News Asia", "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml"),
    ("regije", "afrika", "AllAfrica Business", "https://allafrica.com/tools/headlines/rdf/business/headlines.rdf"),
    ("regije", "afrika", "Nairametrics", "https://nairametrics.com/feed/"),
    ("regije", "afrika", "The East African", "https://www.theeastafrican.co.ke/rss"),
    ("regije", "latinska-amerika", "Agencia Brasil", "https://agenciabrasil.ebc.com.br/rss/economia/feed.xml"),
    ("regije", "bliski-istok", "Arab News Business", "https://www.arabnews.com/cat/3/rss.xml"),

    # --- Cibona - agregacija tudjih clanaka preko Google News RSS -----
    ("cibona", "kosarka", "Google News Cibona", "https://news.google.com/rss/search?q=Cibona+ko%C5%A1arka&hl=hr&gl=HR&ceid=HR:hr"),
    ("cibona", "kosarka", "Sportske Novosti Kosarka", "https://sportnet.hr/rss/kosarka/"),
    ("cibona", "kosarka", "Google News Cibona Slike", "https://news.google.com/rss/search?q=Cibona&hl=hr&gl=HR&ceid=HR:hr&num=20"),
    ("cibona", "kosarka", "24sata Kosarka", "https://www.24sata.hr/feeds/sport.xml"),
    ("cibona", "kosarka", "Reddit CroatianBasketball", "https://www.reddit.com/r/kosarka/.rss"),

    # --- Lifestyle: kucni ljubimci, kultura i film, zanimljivosti -----
    ("ljubimci", "zivotinje", "Google News Pets", "https://news.google.com/rss/search?q=cute+animals+pets+viral&hl=en-US&gl=US&ceid=US:en"),
    ("ljubimci", "zivotinje", "The Dodo", "https://www.thedodo.com/feeds/news.rss"),
    ("ljubimci", "zivotinje", "Good News for Pets", "https://goodnewsforpets.com/feed"),
    ("ljubimci", "zivotinje", "Reddit aww", "https://www.reddit.com/r/aww/.rss"),
    ("ljubimci", "zivotinje", "Cattitude Daily", "https://cattitudedaily.com/feed"),
    ("kultura", "film", "Google News Film", "https://news.google.com/rss/search?q=film+movies+entertainment+culture&hl=en-US&gl=US&ceid=US:en"),
    ("kultura", "film", "Variety Film", "https://variety.com/v/film/feed/"),
    ("kultura", "film", "Hollywood Reporter", "https://www.hollywoodreporter.com/feed/"),
    ("zanimljivosti", "obitelj", "Google News Fun", "https://news.google.com/rss/search?q=heartwarming+family+kids+good+news&hl=en-US&gl=US&ceid=US:en"),
    ("zanimljivosti", "obitelj", "Good News Network", "https://www.goodnewsnetwork.org/feed/"),
    ("zanimljivosti", "obitelj", "Positive.News", "https://www.positive.news/feed/"),
    ("zanimljivosti", "obitelj", "Reddit UpliftingNews", "https://www.reddit.com/r/UpliftingNews/.rss"),
    ("zanimljivosti", "obitelj", "Reddit MadeMeSmile", "https://www.reddit.com/r/MadeMeSmile/.rss"),

    # --- Auti i stil - agregacija, globalni upiti -----
    ("auti", "supercars", "Google News Supercars", "https://news.google.com/rss/search?q=supercars+luxury+cars+new+models&hl=en-US&gl=US&ceid=US:en"),
    ("auti", "supercars", "Car and Driver", "https://www.caranddriver.com/rss/all.xml/"),
    ("auti", "supercars", "Motor Authority", "https://www.motorauthority.com/rss/rss.xml"),
    ("stil", "moda", "Google News Fashion", "https://news.google.com/rss/search?q=fashion+style+beauty+trends&hl=en-US&gl=US&ceid=US:en"),
    ("stil", "moda", "Vogue", "https://www.vogue.com/feed/rss"),
]

BLOCKED_TITLE_PATTERNS = [
    re.compile(r"\bhoroscope\b", re.I),
    re.compile(r"\blottery\b", re.I),
    # First-person lifestyle/travel/food pieces that slip into otherwise
    # business-labeled feeds (e.g. Business Insider's general RSS mixes
    # personal essays, recipes and travel writeups into every category).
    re.compile(r"^i (tried|made|booked|visited|love|found)\b", re.I),
    re.compile(r"\brecipe\b", re.I),
    re.compile(r"\b(pasta|sandwich|pizza|dinner|breakfast|lunch|dessert)\b.{0,40}\btried\b", re.I),
    re.compile(r"\bI (tried|made)\b", re.I),
    re.compile(r"^(the cost of|forget actors)", re.I),
    re.compile(r"\betiquette coach\b", re.I),
    re.compile(r"\bunderrated gem\b", re.I),
    re.compile(r"\bfirst-class seat\b|\bfirst class fare\b", re.I),
    # Affiliate oglasi koje CNN-ov RSS ubacuje medu vijesti. Ciljaju se
    # promotivne formulacije, ne teme — vijest o kreditnim karticama prolazi,
    # ponuda kreditne kartice ne prolazi.
    re.compile(r"\b\d+\s*% intro apr\b", re.I),
    re.compile(r"\bcash ?back card\b", re.I),
    re.compile(r"\bhome equity (loan|line|into cash)\b", re.I),
    re.compile(r"\bbest .{0,30}\b(card|loan|rate)s? of \d{4}\b", re.I),
    re.compile(r"\bavoid credit card interest\b", re.I),
    re.compile(r"^(turn your|dream big|experts?:)\b", re.I),
    re.compile(r"\bcompare (the )?(top|best) .{0,25}(cards?|loans?|rates?)\b", re.I),
    re.compile(r"\brefinanc(e|ing) your\b", re.I),
    re.compile(r"\b(apply|shop|buy) now\b", re.I),
    re.compile(r"\bclick here\b", re.I),
    re.compile(r"\bit's official: now\b", re.I),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path, default):
    try:
        if not path.exists() or path.stat().st_size == 0:
            return default
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def clean_text(value: str) -> str:
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def parse_date(value: str) -> str:
    if not value:
        return now_iso()
    try:
        dt = email.utils.parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat()
    except Exception:
        return now_iso()


def item_id(url: str, title: str) -> str:
    return hashlib.sha1((url or title).encode("utf-8", "ignore")).hexdigest()[:18]


def fetch_url(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return response.read()


MEDIA_NS = "{http://search.yahoo.com/mrss/}"


def extract_image(node, raw_description: str) -> str:
    enclosure = node.find("enclosure")
    if enclosure is not None:
        url = enclosure.attrib.get("url", "")
        media_type = enclosure.attrib.get("type", "")
        if url and (not media_type or media_type.startswith("image/")):
            return url.strip()
    media_content = node.find(f"{MEDIA_NS}content")
    if media_content is not None:
        url = media_content.attrib.get("url", "")
        medium = media_content.attrib.get("medium", "")
        if url and (medium == "image" or not medium):
            return url.strip()
    media_thumb = node.find(f"{MEDIA_NS}thumbnail")
    if media_thumb is not None:
        url = media_thumb.attrib.get("url", "")
        if url:
            return url.strip()
    match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', raw_description or "", re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return ""


def parse_feed(raw: bytes, group: str, category: str, default_source: str):
    root = ET.fromstring(raw)
    channel_items = root.findall(".//item")
    atom_items = root.findall("{http://www.w3.org/2005/Atom}entry")
    items = []

    for node in channel_items:
        title = clean_text(node.findtext("title"))
        url = clean_text(node.findtext("link"))
        if not url:
            guid = clean_text(node.findtext("guid"))
            url = guid if guid.startswith("http") else ""
        if url.startswith("http://"):
            url = "https://" + url[len("http://"):]
        raw_description = node.findtext("description") or node.findtext("summary") or ""
        summary = clean_text(raw_description or title)
        pub = parse_date(node.findtext("pubDate") or node.findtext("dc:date") or "")
        source_node = node.find("source")
        source = clean_text(source_node.text if source_node is not None else "") or default_source
        image = extract_image(node, raw_description)
        if title and url:
            items.append(make_record(title, url, summary, source, group, category, pub, image))

    for node in atom_items:
        title = clean_text(node.findtext("{http://www.w3.org/2005/Atom}title"))
        link = ""
        for link_node in node.findall("{http://www.w3.org/2005/Atom}link"):
            href = link_node.attrib.get("href", "")
            if href:
                link = href
                break
        raw_description = node.findtext("{http://www.w3.org/2005/Atom}summary") or node.findtext("{http://www.w3.org/2005/Atom}content") or ""
        summary = clean_text(raw_description or title)
        pub = parse_date(node.findtext("{http://www.w3.org/2005/Atom}updated") or node.findtext("{http://www.w3.org/2005/Atom}published") or "")
        image = extract_image(node, raw_description)
        if title and link:
            items.append(make_record(title, link, summary, default_source, group, category, pub, image))
    return items


def make_record(title: str, url: str, summary: str, source: str, group: str, category: str, published_at: str, image: str = ""):
    title = clean_text(title)[:220]
    summary = clean_text(summary)[:360]
    url = url.strip()
    if url.startswith("http://"):
        url = "https://" + url[len("http://"):]
    # Google News sometimes wraps source links; keep the public URL, browser will resolve it.
    uid = item_id(url, title)
    safe_image = image.strip() if image and image.strip().lower().startswith(("http://", "https://")) else ""
    return {
        "id": uid,
        "title": title,
        "url": url,
        "summary": summary or title,
        "source": clean_text(source)[:80] or "Public RSS",
        "region": clean_text(source)[:80] or group,
        "group": group,
        "category": category,
        "published_at": published_at,
        "share_url": f"/podijeli/vijest/{uid}/",
        "image": safe_image,
        "image_attribution": clean_text(source)[:80] if safe_image else "",
    }


def is_blocked(item) -> bool:
    title = item.get("title", "")
    if not title or not item.get("url"):
        return True
    return any(pattern.search(title) for pattern in BLOCKED_TITLE_PATTERNS)


def stamp(item) -> float:
    try:
        return datetime.fromisoformat(str(item.get("published_at", "")).replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def merge_unique(*collections):
    seen = set()
    merged = []
    for collection in collections:
        for raw in collection or []:
            item = dict(raw)
            if not item.get("id"):
                item["id"] = item_id(item.get("url", ""), item.get("title", ""))
            key = item.get("id") or item.get("url")
            if not key or key in seen or is_blocked(item):
                continue
            seen.add(key)
            merged.append(item)
    merged.sort(key=stamp, reverse=True)
    return merged


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    fetched = []
    errors = []
    success = 0
    started = time.time()

    for group, category, source, url in SOURCES:
        try:
            raw = fetch_url(url)
            parsed = parse_feed(raw, group, category, source)
            fetched.extend(parsed)
            success += 1
        except (urllib.error.URLError, TimeoutError, ET.ParseError, Exception) as exc:
            errors.append({"source": source, "group": group, "error": str(exc)[:180]})

    existing_public = read_json(NEWS_PATH, [])
    existing_archive = read_json(ARCHIVE_PATH, [])
    merged = merge_unique(fetched, existing_public, existing_archive)
    public = merged[:PUBLIC_LIMIT]
    archive = merged[PUBLIC_LIMIT:PUBLIC_LIMIT + ARCHIVE_LIMIT]

    write_json(NEWS_PATH, public)
    write_json(ARCHIVE_PATH, archive)

    by_group = {}
    for item in public:
        by_group[item.get("group", "unknown")] = by_group.get(item.get("group", "unknown"), 0) + 1

    ratio = success / len(SOURCES) if SOURCES else 0
    status_name = "ok" if public and ratio >= 0.5 else "degraded" if public else "failed"
    ts = now_iso()
    status = read_json(STATUS_PATH, {}) if STATUS_PATH.exists() else {}
    status.update({
        "updated_at": ts,
        "news": {
            "updated_at": ts,
            "status": status_name,
            "engine": "github_actions_rss_refresh_v2",
            "cadence": "scheduled every 30 minutes plus manual workflow_dispatch",
            "source_success_policy": "publish_when_public_items_available_and_at_least_50_percent_sources_synced",
            "source_success_threshold": 0.5,
            "source_success_ratio": round(ratio, 3),
            "source_sync_status": "complete" if not errors else "partial_with_public_fallback",
            "configured_sources": len(SOURCES),
            "successful_sources": success,
            "failed_sources": len(errors),
            "storage_policy": "public_latest_500_archive_latest_400_older_overflow_removed",
            "public_items": len(public),
            "max_public_items": PUBLIC_LIMIT,
            "archive_items": len(archive),
            "max_archive_items": ARCHIVE_LIMIT,
            "discarded_archive_overflow_items": max(0, len(merged) - PUBLIC_LIMIT - ARCHIVE_LIMIT),
            "fetched_candidates": len(fetched),
            "duplicates_or_blocked_removed": max(0, len(fetched) + len(existing_public) + len(existing_archive) - len(merged)),
            "request_timeout_seconds": TIMEOUT,
            "network_workers": 1,
            "share_previews_ready": 0,
            "by_group": by_group,
            "errors": errors[:20],
            "preview_errors": [],
            "checked_at": ts,
            "last_attempt_at": ts,
            "heartbeat_policy": "news_status_updates_on_every_automation_run_even_when_content_is_unchanged",
            "stale_safe": True,
            "last_successful_refresh_at": ts if public else status.get("news", {}).get("last_successful_refresh_at"),
            "data_status": "fresh_or_reference_checked",
            "runtime_seconds": round(time.time() - started, 2),
        },
    })
    write_json(STATUS_PATH, status)
    print(f"news refresh: status={status_name}, public={len(public)}, archive={len(archive)}, sources={success}/{len(SOURCES)}")
    if errors:
        print("source errors:")
        for error in errors[:10]:
            print("-", error)
    return 0 if public else 1


if __name__ == "__main__":
    sys.exit(main())
