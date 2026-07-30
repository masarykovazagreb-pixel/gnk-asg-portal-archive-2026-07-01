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
    # 90% ovog dijela treba biti agregacija, ne izvorni tekst - isti
    # dokazan mehanizam kao HR poslovne/tech vijesti gore, ne novi izvor.
    ("cibona", "kosarka", "Google News Cibona", "https://news.google.com/rss/search?q=Cibona+ko%C5%A1arka&hl=hr&gl=HR&ceid=HR:hr"),

    # --- Lifestyle: kucni ljubimci, kultura i film, zanimljivosti -----
    # Svjetski upiti (ne HR-centricno), agregacija preko Google News RSS -
    # isti dokazan mehanizam, bez novog tehnickog troska.
    ("ljubimci", "zivotinje", "Google News Pets", "https://news.google.com/rss/search?q=cute+animals+pets+viral&hl=en-US&gl=US&ceid=US:en"),
    ("kultura", "film", "Google News Film", "https://news.google.com/rss/search?q=film+movies+entertainment+culture&hl=en-US&gl=US&ceid=US:en"),
    ("zanimljivosti", "obitelj", "Google News Fun", "https://news.google.com/rss/search?q=heartwarming+family+kids+good+news&hl=en-US&gl=US&ceid=US:en"),
]