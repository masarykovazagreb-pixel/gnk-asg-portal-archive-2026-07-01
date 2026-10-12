#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SPT showcase — statički višejezični generator za gnk-asg.hr/spt/.

Iz i18n/<jezik>.json + templates/*.html generira:
  /spt/                       glavna stranica (hr)   + /spt/<jezik>/
  /spt/film/                  stranica filma         + /spt/<jezik>/film/
  /spt/galerija/              galerija               + /spt/<jezik>/galerija/
  /spt/galerija/<slika>/      zasebna stranica SVAKE slike (meta, OG, Twitter, ImageObject)
  /spt/spt-l10n.js            nazivi jezika za prijedlog jezika
  /spt-sitemap.xml            hreflang + image:image + video:video
Opcija --assets generira OG isječke (1200x630, bez ikakvih natpisa) i 720px sličice.
Jezici bez prijevoda neke sekcije padaju na engleski i označeni su s lang="en".

produced by GNK ASG · Nermin Sefić
"""
import json
import math
import re
import sys
from pathlib import Path
from html.parser import HTMLParser

from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import escape
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
PORTAL = REPO / "apps" / "portal"
OUT = PORTAL / "spt"
SRC_PNG = Path("/home/user/spt-src")
SITE = "https://gnk-asg.hr"
PUBLISHED = "2026-10-12T10:00:00+02:00"
LASTMOD = "2026-10-12"
V = "20261012a"
ARTICLE_SLUG = "spt-sports-performance-tracking-gnk-asg"

LANGS = [
    ("hr", "Hrvatski", "hr_HR"), ("en", "English", "en_US"), ("de", "Deutsch", "de_DE"),
    ("it", "Italiano", "it_IT"), ("es", "Español", "es_ES"), ("fr", "Français", "fr_FR"),
    ("pt", "Português", "pt_PT"), ("nl", "Nederlands", "nl_NL"), ("pl", "Polski", "pl_PL"),
    ("sl", "Slovenščina", "sl_SI"), ("cs", "Čeština", "cs_CZ"), ("sk", "Slovenčina", "sk_SK"),
    ("hu", "Magyar", "hu_HU"), ("ro", "Română", "ro_RO"), ("bg", "Български", "bg_BG"),
    ("el", "Ελληνικά", "el_GR"), ("tr", "Türkçe", "tr_TR"), ("ru", "Русский", "ru_RU"),
    ("uk", "Українська", "uk_UA"), ("sr", "Српски", "sr_RS"), ("fi", "Suomi", "fi_FI"),
    ("sv", "Svenska", "sv_SE"), ("da", "Dansk", "da_DK"), ("no", "Norsk", "nb_NO"),
]

# key, group, anchor on main page — order = gallery / prev-next order
IMAGES = [
    ("hero_stadium_usa", "scenes", "showcase"),
    ("dashboard_laptop", "screens", "screens"),
    ("analytics_screen", "screens", "screens"),
    ("control_room", "screens", "screens"),
    ("coach_tablet", "screens", "screens"),
    ("mobile_app", "screens", "screens"),
    ("live_hud_sprint", "screens", "screens"),
    ("live_hud_alert", "screens", "screens"),
    ("live_hud_goal", "screens", "screens"),
    ("vest_front", "hw", "hw"),
    ("vest_back", "hw", "hw"),
    ("chip_pod", "hw", "hw"),
    ("watch", "hw", "hw"),
    ("strap_hr", "hw", "hw"),
    ("smart_scale", "hw", "hw"),
    ("uwb_anchor", "hw", "hw"),
    ("edge_server", "hw", "hw"),
    ("training_vests", "scenes", "showcase"),
    ("recreational_runner", "scenes", "who"),
    ("indoor_volleyball_uwb", "scenes", "who"),
    ("oem_cloud", "scenes", "oem"),
]
FILM = {"src": "/spt/film/spt-film.mp4", "poster": "/spt/film/spt-film-poster.webp"}
CHAPTERS = [(0, 4, "@intro"), (4, 8, "hero_stadium_usa"), (8, 11.5, "vest_front"), (11.5, 14.5, "vest_back"),
            (14.5, 18, "chip_pod"), (18, 21, "watch"), (21, 24, "uwb_anchor"), (24, 27, "edge_server"),
            (27, 39, "dashboard_laptop"), (39, 42.5, "coach_tablet"), (42.5, 46, "analytics_screen"),
            (46, 49.5, "control_room"), (49.5, 52.5, "training_vests"), (52.5, 55.5, "mobile_app"),
            (55.5, 61, "@outro")]


def slug_of(key):
    return key.replace("_", "-")


def paths_of(key):
    if key.startswith("live_hud_"):
        n = slug_of(key)
        return f"/spt/film/{n}.webp", f"/spt/img/{n}-720.webp"
    return f"/spt/img/{key}.webp", f"/spt/img/{key}-720.webp"


# ------------------------------------------------------------------ fallback
class FB(str):
    """Engleski tekst na stranici drugog jezika — u HTML-u omotan u <span lang="en">."""

    def __html__(self):
        return '<span lang="en">%s</span>' % escape(str.__str__(self))


def P(x):
    return str.__str__(x) if isinstance(x, str) else x


def wrap(node):
    if isinstance(node, dict):
        return {k: wrap(v) for k, v in node.items()}
    if isinstance(node, list):
        return [wrap(v) for v in node]
    if isinstance(node, str):
        return FB(node)
    return node


WARN = []



def _author_token(x):
    """Pravilo vlasnika (scripts/enforce-approved-author-markers-v1.mjs): ime autora ne ide u meta keywords."""
    import unicodedata
    f = "".join(ch for ch in unicodedata.normalize("NFD", x) if unicodedata.category(ch) != "Mn").lower()
    return bool(re.search(r"nermin|sefic", re.sub(r"[^a-z]", "", f))) or bool(re.search(r"нермин|сефи[чћ]", x.lower()))


def noauthor(s):
    return ", ".join(t.strip() for t in str(s).split(",") if t.strip() and not _author_token(t))


TITLES: dict = {}


def merge(en, xx, path):
    if xx is None:
        return wrap(en)
    if isinstance(en, dict):
        if not isinstance(xx, dict):
            WARN.append(f"{path}: tip"); return wrap(en)
        out = {k: merge(v, xx.get(k), f"{path}.{k}") for k, v in en.items()}
        for k, v in xx.items():
            if k not in out:
                out[k] = v
        return out
    if isinstance(en, list):
        if not isinstance(xx, list):
            WARN.append(f"{path}: tip"); return wrap(en)
        if len(xx) != len(en):
            if path.endswith(".list"):
                return xx
            WARN.append(f"{path}: duljina {len(xx)} != {len(en)}")
            return xx
        return [merge(a, b, f"{path}[{i}]") for i, (a, b) in enumerate(zip(en, xx))]
    return xx


def load_lang(code, en):
    raw = json.loads((HERE / "i18n" / f"{code}.json").read_text("utf-8"))
    if code == "en":
        return raw, set()
    fbsec = {k for k in en if k not in raw and k not in ("lang", "locale", "name")}
    return merge(en, raw, code), fbsec


# ------------------------------------------------------------------ assets
def build_assets(force=False):
    (OUT / "img" / "og").mkdir(parents=True, exist_ok=True)

    def og_from(im, dst):
        im = im.convert("RGB")
        w, h = im.size
        tr = 1200 / 630
        if w / h > tr:
            nw = int(h * tr); x0 = (w - nw) // 2; im = im.crop((x0, 0, x0 + nw, h))
        else:
            nh = int(w / tr); y0 = (h - nh) // 2; im = im.crop((0, y0, w, y0 + nh))
        im.resize((1200, 630), Image.LANCZOS).save(dst, "JPEG", quality=84, optimize=True, progressive=True)

    n = 0
    for key, _g, _a in IMAGES:
        slug = slug_of(key)
        dst = OUT / "img" / "og" / f"{slug}.jpg"
        src, thumb = paths_of(key)
        if key.startswith("live_hud_"):
            full = PORTAL / src.lstrip("/")
            t = PORTAL / thumb.lstrip("/")
            if force or not t.exists():
                im = Image.open(full).convert("RGB")
                im.resize((720, round(720 * im.height / im.width)), Image.LANCZOS).save(t, "WEBP", quality=80, method=6)
                n += 1
            if force or not dst.exists():
                og_from(Image.open(full), dst); n += 1
        else:
            if force or not dst.exists():
                png = SRC_PNG / f"{key}.png"
                og_from(Image.open(png) if png.exists() else Image.open(PORTAL / src.lstrip("/")), dst); n += 1
    film_og = OUT / "img" / "og" / "film.jpg"
    if force or not film_og.exists():
        og_from(Image.open(PORTAL / FILM["poster"].lstrip("/")), film_og); n += 1
    print(f"assets: {n} datoteka generirano")


_DIM = {}


def dims(webpath):
    if webpath not in _DIM:
        with Image.open(PORTAL / webpath.lstrip("/")) as im:
            _DIM[webpath] = im.size
    return _DIM[webpath]


# ------------------------------------------------------------------ URLs
def urls(code):
    p = "/spt/" if code == "hr" else f"/spt/{code}/"
    return {"main": p, "film": p + "film/", "gallery": p + "galerija/", "img": p + "galerija/"}


def ext_links(code):
    if code == "hr":
        return {"contact": "/contact/", "author": "/nermin-sefic/", "article": f"/objave/{ARTICLE_SLUG}/"}
    return {"contact": "/en/contact/", "author": "/en/nermin-sefic/", "article": f"/en/publications/{ARTICLE_SLUG}/"}


def image_records(L, code):
    U = urls(code)
    scr = {it["img"]: it for it in L["screens"]["items"]}
    hw = {it["img"]: it for it in L["hw"]["items"]}
    glabel = {"scenes": L["nav"]["showcase"], "screens": L["nav"]["screens"], "hw": L["nav"]["hw"]}
    recs = []
    for key, group, anchor in IMAGES:
        src, thumb = paths_of(key)
        w, h = dims(src); tw, th = dims(thumb)
        why = None
        if key in hw:
            t, x, why = hw[key]["t"], hw[key]["x"], hw[key]["w"]
        elif key in scr:
            t, x = scr[key]["t"], scr[key]["x"]
        else:
            t, x = L["scenes"][key]["t"], L["scenes"][key]["x"]
        slug = slug_of(key)
        recs.append({
            "key": key, "slug": slug, "group": group, "group_label": glabel[group], "anchor": anchor,
            "src": src, "thumb": thumb, "w": w, "h": h, "tw": tw, "th": th,
            "title": t, "desc": x, "why": why,
            "fb": isinstance(t, FB) and isinstance(x, FB),
            "alt": f"{P(t)} — SPT Sports Performance Tracking · GNK ASG",
            "url": U["img"] + slug + "/", "og": f"/spt/img/og/{slug}.jpg",
            "share_text": f"{P(t)} — SPT · GNK ASG · Nermin Sefić",
        })
    return recs


def trim(s, n=160):  # meta description ≤ 160 znakova (apps/portal/tests/seo-quality)
    s = re.sub(r"\s+", " ", P(s)).strip()
    return s if len(s) <= n else s[: n - 1].rsplit(" ", 1)[0] + "…"


# ------------------------------------------------------------------ JSON-LD
ORG_ID = SITE + "/#organization"
PERSON_ID = SITE + "/nermin-sefic/#person"
BRAND_ID = SITE + "/spt/#brand"


def common_nodes(L):
    return [
        {"@type": "Organization", "@id": ORG_ID, "name": "GNK ASG", "url": SITE + "/",
         "logo": SITE + "/assets/logo-gnk-asg-canonical.svg"},
        {"@type": "Person", "@id": PERSON_ID, "name": "Nermin Sefić", "url": SITE + "/nermin-sefic/",
         "image": SITE + "/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp",
         "worksFor": {"@id": ORG_ID}},
        {"@type": "Brand", "@id": BRAND_ID, "name": "SPT — Sports Performance Tracking", "alternateName": "SPT",
         "logo": SITE + "/spt/img/spt-icon-192.png", "description": P(L["meta"]["og_desc"])},
    ]


def crumbs(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": P(n), "item": SITE + u} for i, (n, u) in enumerate(items)]}


def video_node(L, page_url, code, chapters=None):
    v = {"@type": "VideoObject", "@id": SITE + page_url + "#video", "name": P(L["film"]["title"]) + " — SPT",
         "description": trim(L["film"]["sub"], 500),
         "thumbnailUrl": [SITE + "/spt/img/og/film.jpg", SITE + FILM["poster"]],
         "uploadDate": PUBLISHED, "duration": "PT1M1S", "contentUrl": SITE + FILM["src"],
         "width": 1280, "height": 720, "publisher": {"@id": ORG_ID}, "creator": {"@id": PERSON_ID},
         "isFamilyFriendly": True, "keywords": "SPT, GNK ASG, Nermin Sefić, sports performance tracking"}
    if chapters:
        v["hasPart"] = [{"@type": "Clip", "name": P(c["name"]), "startOffset": c["s"], "endOffset": c["e"],
                         "url": SITE + page_url + f"#t={c['s']}"} for c in chapters]
    return v


def dumps_ld(graph):
    s = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":"))
    return s.replace("</", "<\\/")


# ------------------------------------------------------------------ build
class LinkCollector(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []; self.ids = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        for k in ("href", "src", "poster"):
            if a.get(k):
                self.links.append(a[k])
        if a.get("srcset"):
            self.links += [p.strip().split(" ")[0] for p in a["srcset"].split(",")]


def minify(html):
    html = re.sub(r"\n[ \t]+", "\n", html)
    return re.sub(r"\n{2,}", "\n", html)


def build():
    en = json.loads((HERE / "i18n" / "en.json").read_text("utf-8"))
    active = [l for l in LANGS if (HERE / "i18n" / f"{l[0]}.json").exists()]
    codes = [l[0] for l in active]
    env = Environment(loader=FileSystemLoader(str(HERE / "templates")), autoescape=select_autoescape(["html"]),
                      trim_blocks=True, lstrip_blocks=True)
    env.filters["plain"] = P
    env.filters["noauthor"] = noauthor

    for f in OUT.rglob("index.html"):
        f.unlink()
    for d in sorted([p for p in OUT.rglob("*") if p.is_dir()], key=lambda p: -len(p.parts)):
        if not any(d.iterdir()):
            d.rmdir()

    def alts_for(kind, slug=None):
        res = []
        for c, name, loc in active:
            u = urls(c)
            url = u["img"] + slug + "/" if kind == "image" else u[kind]
            res.append({"code": c, "name": name, "locale": loc, "url": url})
        return res

    def xdef(alts):
        m = {a["code"]: a["url"] for a in alts}
        return m.get("en", m["hr"])

    sitemap = []
    l10n = {}
    written = 0
    total_bytes = 0
    for code, name, locale in active:
        L, fbsec = load_lang(code, en)
        L["lang"], L["locale"], L["name"] = code, locale, name
        U = urls(code)
        X = ext_links(code)
        imgs = image_records(L, code)
        IMG = {r["key"]: r for r in imgs}
        l10n[code] = {"n": name, "s": P(L["ui"]["suggest"]), "g": P(L["ui"]["suggest_go"]), "c": P(L["ui"]["close"])}
        base_ctx = dict(L=L, lang=code, FB=fbsec, U=U, SITE=SITE, V=V, FILM=FILM, PUBLISHED=PUBLISHED,
                        contact_url=X["contact"], author_url=X["author"], article_url=X["article"],
                        images=imgs, IMG=IMG)
        tags = ["SPT", "GNK ASG", "Nermin Sefić", "Sports Performance Tracking"]
        _parts = P(L["meta"]["title"]).split(" | ")
        seg = _parts[1] if len(_parts) > 2 else "Sports Performance Tracking"
        nodes = common_nodes(L)

        def emit(url, tpl, page, extra, sm_images, sm_video=None, kind="main", slug=None):
            nonlocal written, total_bytes
            alts = alts_for(kind, slug)
            page.update({"url": url, "xdefault": xdef(alts), "tags": tags})
            TITLES.setdefault(page["title"], []).append(url)
            html = env.get_template(tpl).render(**base_ctx, page=page, alts=alts, **extra)
            html = minify(html)
            dst = PORTAL / url.lstrip("/") / "index.html"
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(html, "utf-8")
            written += 1; total_bytes += len(html.encode("utf-8"))
            sitemap.append({"loc": SITE + url, "alts": alts, "images": sm_images, "video": sm_video})

        # ---- main
        main_url = U["main"]
        graph = [{"@type": "WebPage", "@id": SITE + main_url + "#webpage", "url": SITE + main_url,
                  "name": P(L["meta"]["title"]), "description": P(L["meta"]["description"]), "inLanguage": code,
                  "isPartOf": {"@type": "WebSite", "@id": SITE + "/#website", "name": "GNK ASG", "url": SITE + "/"},
                  "about": {"@id": BRAND_ID}, "author": {"@id": PERSON_ID}, "publisher": {"@id": ORG_ID},
                  "datePublished": PUBLISHED, "dateModified": PUBLISHED,
                  "primaryImageOfPage": {"@type": "ImageObject", "url": SITE + "/spt/img/og-spt.jpg", "width": 1200, "height": 630},
                  "image": [SITE + r["src"] for r in imgs[:8]],
                  "video": {"@id": SITE + main_url + "#video"}},
                 video_node(L, main_url, code),
                 crumbs([("GNK ASG", "/"), ("SPT", main_url)])] + nodes
        if "faq" not in fbsec:
            graph.append({"@type": "FAQPage", "@id": SITE + main_url + "#faq", "mainEntity": [
                {"@type": "Question", "name": P(q["q"]), "acceptedAnswer": {"@type": "Answer", "text": P(q["a"])}}
                for q in L["faq"]["items"]]})
        page = {"kind": "main", "title": P(L["meta"]["title"]), "description": trim(L["meta"]["description"]),
                "keywords": P(L["meta"]["keywords"]), "og_type": "website", "og_title": P(L["meta"]["og_title"]),
                "og_desc": trim(L["meta"]["og_desc"]), "og_image": "/spt/img/og-spt.jpg",
                "og_image_alt": P(L["meta"]["img_alt"]), "video": True, "jsonld": dumps_ld(graph)}
        emit(main_url, "main.html", page, {}, [r["src"] for r in imgs], None, "main")

        # ---- film
        chapters = []
        for s, e, k in CHAPTERS:
            nm = "SPT" if k == "@intro" else ("gnk-asg.hr/spt · produced by GNK ASG" if k == "@outro" else IMG[k]["title"])
            chapters.append({"s": int(s), "e": int(math.ceil(e)), "ts": f"{int(s)//60}:{int(s)%60:02d}", "name": nm})
        film_url = U["film"]
        ftitle = f"{P(L['film']['title'])} · {seg} | GNK ASG · Nermin Sefić"
        graph = [{"@type": "WebPage", "@id": SITE + film_url + "#webpage", "url": SITE + film_url, "name": ftitle,
                  "inLanguage": code, "about": {"@id": BRAND_ID}, "author": {"@id": PERSON_ID},
                  "publisher": {"@id": ORG_ID}, "datePublished": PUBLISHED,
                  "video": {"@id": SITE + film_url + "#video"}},
                 video_node(L, film_url, code, chapters),
                 crumbs([("GNK ASG", "/"), ("SPT", main_url), (P(L["nav"]["film"]), film_url)])] + nodes
        page = {"kind": "film", "title": ftitle, "description": trim(L["film"]["sub"]),
                "keywords": "SPT film, " + P(L["meta"]["keywords"]), "og_type": "video.other",
                "og_title": P(L["film"]["title"]) + " — SPT", "og_desc": trim(L["film"]["sub"], 200),
                "og_image": "/spt/img/og/film.jpg", "og_image_alt": P(L["film"]["title"]) + " — SPT, produced by GNK ASG",
                "video": True, "jsonld": dumps_ld(graph)}
        emit(film_url, "film.html", page, {"chapters": chapters}, [FILM["poster"]],
             {"title": P(L["film"]["title"]) + " — SPT", "desc": trim(L["film"]["sub"], 1000)}, "film")

        # ---- gallery
        gal_url = U["gallery"]
        groups = []
        for gk in ("screens", "hw", "scenes"):
            groups.append({"key": gk, "label": imgs[[r["group"] for r in imgs].index(gk)]["group_label"],
                           "images": [r for r in imgs if r["group"] == gk]})
        gtitle = f"{P(L['ui']['gallery'])} — SPT · {seg} | GNK ASG · Nermin Sefić"
        graph = [{"@type": "CollectionPage", "@id": SITE + gal_url + "#webpage", "url": SITE + gal_url, "name": gtitle,
                  "inLanguage": code, "about": {"@id": BRAND_ID}, "author": {"@id": PERSON_ID},
                  "publisher": {"@id": ORG_ID},
                  "hasPart": [{"@type": "ImageObject", "name": P(r["title"]), "contentUrl": SITE + r["src"],
                               "url": SITE + r["url"], "creditText": "SPT · produced by GNK ASG",
                               "creator": {"@id": PERSON_ID}, "copyrightNotice": "© 2026 GNK ASG"} for r in imgs]},
                 crumbs([("GNK ASG", "/"), ("SPT", main_url), (P(L["ui"]["gallery"]), gal_url)])] + nodes
        page = {"kind": "gallery", "title": gtitle, "description": trim(L["meta"]["og_desc"]),
                "keywords": P(L["meta"]["keywords"]), "og_type": "website",
                "og_title": f"{P(L['ui']['gallery'])} — SPT · GNK ASG", "og_desc": trim(L["meta"]["og_desc"]),
                "og_image": "/spt/img/og-spt.jpg", "og_image_alt": P(L["meta"]["img_alt"]), "video": False,
                "jsonld": dumps_ld(graph)}
        emit(gal_url, "gallery.html", page, {"groups": groups}, [r["src"] for r in imgs], None, "gallery")

        # ---- image pages
        for i, r in enumerate(imgs):
            prev, nxt = imgs[i - 1], imgs[(i + 1) % len(imgs)]
            d = P(r["desc"]) + ((" " + P(L["hw"]["why"]) + ": " + P(r["why"])) if r["why"] else "")
            ititle = f"{P(r['title'])} — SPT · {seg} | GNK ASG"
            graph = [{"@type": "WebPage", "@id": SITE + r["url"] + "#webpage", "url": SITE + r["url"], "name": ititle,
                      "description": trim(d), "inLanguage": code, "isPartOf": {"@id": SITE + gal_url + "#webpage"},
                      "about": {"@id": BRAND_ID}, "author": {"@id": PERSON_ID}, "publisher": {"@id": ORG_ID},
                      "datePublished": PUBLISHED, "primaryImageOfPage": {"@id": SITE + r["url"] + "#image"}},
                     {"@type": "ImageObject", "@id": SITE + r["url"] + "#image", "contentUrl": SITE + r["src"],
                      "url": SITE + r["src"], "thumbnailUrl": SITE + r["thumb"], "width": r["w"], "height": r["h"],
                      "encodingFormat": "image/webp", "name": P(r["title"]), "caption": P(r["desc"]),
                      "description": trim(d, 500), "inLanguage": code, "representativeOfPage": True,
                      "creator": {"@id": PERSON_ID}, "creditText": "SPT · produced by GNK ASG",
                      "copyrightNotice": "© 2026 GNK ASG", "copyrightHolder": {"@id": ORG_ID}},
                     crumbs([("GNK ASG", "/"), ("SPT", main_url), (P(L["ui"]["gallery"]), gal_url),
                             (P(r["title"]), r["url"])])] + nodes
            page = {"kind": "image", "title": ititle, "description": trim(d),
                    "keywords": f"{P(r['title'])}, " + P(L["meta"]["keywords"]), "og_type": "article",
                    "og_title": f"{P(r['title'])} — SPT · GNK ASG", "og_desc": trim(d, 200), "og_image": r["og"],
                    "og_image_alt": r["alt"], "video": False, "jsonld": dumps_ld(graph)}
            emit(r["url"], "image.html", page, {"im": r, "prev": prev, "next": nxt}, [r["src"]], None, "image", r["slug"])

    # ---- l10n js
    (OUT / "spt-l10n.js").write_text(
        "/* SPT showcase — nazivi jezika · produced by GNK ASG */\nwindow.SPT_L10N=" +
        json.dumps(l10n, ensure_ascii=False, separators=(",", ":")) + ";\n", "utf-8")

    # ---- sitemap
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<!-- SPT — Sports Performance Tracking · produced by GNK ASG · Nermin Sefić -->',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" '
           'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" '
           'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">']
    for e in sitemap:
        out.append(f"<url><loc>{e['loc']}</loc><lastmod>{LASTMOD}</lastmod><changefreq>weekly</changefreq>"
                   f"<priority>{'0.9' if e['loc'].endswith(('/spt/', ) ) else '0.7'}</priority>")
        for a in e["alts"]:
            out.append(f'<xhtml:link rel="alternate" hreflang="{a["code"]}" href="{SITE}{a["url"]}"/>')
        xd = next((a["url"] for a in e["alts"] if a["code"] == "en"), e["alts"][0]["url"])
        out.append(f'<xhtml:link rel="alternate" hreflang="x-default" href="{SITE}{xd}"/>')
        for im in e["images"]:
            out.append(f"<image:image><image:loc>{SITE}{im}</image:loc></image:image>")
        if e["video"]:
            v = e["video"]
            out.append("<video:video><video:thumbnail_loc>%s/spt/img/og/film.jpg</video:thumbnail_loc>"
                       "<video:title>%s</video:title><video:description>%s</video:description>"
                       "<video:content_loc>%s%s</video:content_loc><video:duration>61</video:duration>"
                       "<video:publication_date>%s</video:publication_date><video:family_friendly>yes</video:family_friendly>"
                       "</video:video>" % (SITE, escape(v["title"]), escape(v["desc"]), SITE, FILM["src"], PUBLISHED))
        out.append("</url>")
    out.append("</urlset>")
    (PORTAL / "spt-sitemap.xml").write_text("\n".join(out) + "\n", "utf-8")

    print(f"jezici: {len(active)} ({', '.join(codes)})")
    print(f"stranica: {written}, HTML ukupno {total_bytes/1024/1024:.2f} MB, sitemap URL-ova: {len(sitemap)}")
    dups = {t: u for t, u in TITLES.items() if len(u) > 1}
    print(f"naslovi: {len(TITLES)} jedinstvenih" + (f" — UPOZORENJE duplikati: {len(dups)}" if dups else ""))
    for t, u in list(dups.items())[:10]:
        print("  DUP", t, u[:3])
    if WARN:
        print("UPOZORENJA strukture prijevoda:")
        for w in sorted(set(WARN))[:60]:
            print("  ", w)
    return codes


def check():
    missing = {}
    pages = list(OUT.rglob("index.html"))
    for f in pages:
        lc = LinkCollector()
        lc.feed(f.read_text("utf-8"))
        for link in lc.links:
            if not link.startswith("/") or link.startswith("//"):
                continue
            p = link.split("#")[0].split("?")[0]
            if not p:
                continue
            target = PORTAL / p.lstrip("/")
            ok = (target / "index.html").exists() if p.endswith("/") else target.exists()
            if not ok:
                missing.setdefault(p, set()).add(str(f.relative_to(PORTAL)))
    print(f"provjera: {len(pages)} stranica")
    for p, srcs in sorted(missing.items()):
        print(f"  NEDOSTAJE {p}  (npr. {sorted(srcs)[0]}, ukupno {len(srcs)})")
    return missing


if __name__ == "__main__":
    if "--assets" in sys.argv:
        build_assets(force="--force" in sys.argv)
    build()
    check()
