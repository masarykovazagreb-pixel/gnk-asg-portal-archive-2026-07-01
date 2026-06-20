#!/usr/bin/env python3
"""Ažurira poslovne vijesti, medijske objave i tržišne podatke digitalne imovine.

Skripta koristi javno dostupne RSS/XML i JSON izvore, ne zahtijeva API ključ.
Sve pronađene javne vijesti prikazuju se automatski, dok se neželjene stavke
mogu ukloniti dodavanjem URL-a ili izraza u data/blocked_news.json.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import ssl
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
UA = "GNK-ASG-Public-Portal/1.0 (+https://aktualmedia.github.io/gnk-asg/)"
CTX = ssl.create_default_context()

GOOGLE_RSS = [
    ("Hrvatska · poslovanje", "hrvatska", "business", "poslovanje OR gospodarstvo OR tvrtke Hrvatska"),
    ("Slovenija · poslovanje", "slovenija", "business", "business OR gospodarstvo Slovenija"),
    ("Srbija · poslovanje", "srbija", "business", "biznis OR kompanije OR investicije Srbija"),
    ("BiH · poslovanje", "bih", "business", "biznis OR kompanije OR investicije Bosna Hercegovina"),
    ("Global Business", "international", "business", "global business OR markets OR companies"),
    ("AI & Technology", "technology", "technology", "artificial intelligence OR technology OR software industry"),
    ("Digital Assets", "international", "digital-assets", "bitcoin OR blockchain OR digital assets market"),
]
MENTION_QUERY = '"GNK ASG" OR "GNK DINAMO Ltd" OR "Nermin Sefić"'
COINS = "bitcoin,ethereum,solana,ripple,binancecoin,tether,usd-coin,cardano"
FIATS = "eur,usd,gbp,chf,jpy"


def read_json(name: str, default):
    try:
        return json.loads((DATA / name).read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(name: str, payload) -> None:
    (DATA / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, application/json, */*"})
    with urllib.request.urlopen(request, context=CTX, timeout=25) as response:
        return response.read()


def text(value: str | None) -> str:
    cleaned = re.sub(r"<[^>]*>", " ", value or "")
    return re.sub(r"\s+", " ", cleaned).strip()


def google_feed(query: str) -> str:
    return "https://news.google.com/rss/search?q=" + urllib.parse.quote(query) + "&hl=hr&gl=HR&ceid=HR:hr"


def parse_rss(xml_bytes: bytes, source: str, group: str, category: str) -> list[dict]:
    entries = []
    root = ET.fromstring(xml_bytes)
    for item in root.findall(".//item")[:18]:
        title = text(item.findtext("title"))
        url = text(item.findtext("link"))
        summary = text(item.findtext("description"))
        date = text(item.findtext("pubDate"))
        if title and url:
            identity = hashlib.sha256((title + url).encode("utf-8")).hexdigest()[:18]
            entries.append({"id": identity, "title": title, "url": url, "summary": summary[:230], "source": source, "group": group, "category": category, "date": date})
    return entries


def blocked(item: dict, rules: dict) -> bool:
    target_url = item.get("url", "").lower()
    title = item.get("title", "").lower()
    return any(str(x).lower() in target_url for x in rules.get("urls", []) if x) or any(str(x).lower() in title for x in rules.get("title_terms", []) if x)


def update_news() -> dict:
    rules = read_json("blocked_news.json", {"urls": [], "title_terms": []})
    articles, errors = [], []
    for source, group, category, query in GOOGLE_RSS:
        try:
            articles.extend(parse_rss(fetch(google_feed(query)), source, group, category))
        except Exception as exc:
            errors.append({"source": source, "error": str(exc)[:100]})
    try:
        mentions = parse_rss(fetch(google_feed(MENTION_QUERY)), "GNK ASG media monitor", "mentions", "mentions")
    except Exception as exc:
        mentions = []
        errors.append({"source": "GNK ASG media monitor", "error": str(exc)[:100]})
    unique = {}
    for article in mentions + articles:
        if not blocked(article, rules):
            unique.setdefault(article["id"], article)
    public_news = list(unique.values())[:150]
    write_json("news.json", public_news)
    write_json("mentions_found.json", {"generated_at": NOW, "public_display": True, "removable_via": "data/blocked_news.json", "items": [x for x in public_news if x.get("group") == "mentions"][:30]})
    return {"public_items": len(public_news), "public_mentions": len([x for x in public_news if x.get("group") == "mentions"]), "errors": errors}


def update_market() -> dict:
    url = "https://api.coingecko.com/api/v3/simple/price?ids=" + COINS + "&vs_currencies=" + FIATS + "&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true"
    payload = json.loads(fetch(url).decode("utf-8"))
    labels = {"bitcoin": "BTC", "ethereum": "ETH", "solana": "SOL", "ripple": "XRP", "binancecoin": "BNB", "tether": "USDT", "usd-coin": "USDC", "cardano": "ADA"}
    coins = []
    for coin, values in payload.items():
        coins.append({"id": coin, "symbol": labels.get(coin, coin.upper()), "prices": {currency: values.get(currency) for currency in FIATS.split(",")}, "changes_24h": {currency: values.get(currency + "_24h_change") for currency in FIATS.split(",")}})
    write_json("market.json", {"updated_at": NOW, "source": "CoinGecko public market data", "status": "ok", "coins": coins})
    return {"coins": len(coins)}


def main() -> None:
    status = {"updated_at": NOW}
    try:
        status["news"] = update_news()
    except Exception as exc:
        status["news"] = {"error": str(exc)[:140]}
    try:
        status["market"] = update_market()
    except Exception as exc:
        status["market"] = {"error": str(exc)[:140]}
    write_json("update_status.json", status)
    print(json.dumps(status, ensure_ascii=False))


if __name__ == "__main__":
    main()
