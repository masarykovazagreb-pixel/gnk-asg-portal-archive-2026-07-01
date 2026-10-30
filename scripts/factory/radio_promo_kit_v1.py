#!/usr/bin/env python3
"""Agent A14: nacrti objava za AKTUAL MEDIA RADIO na vlastitim kanalima (V1).

Piše apps/portal/data/radio-promo-kit.json: po platformi i jeziku jedan nacrt
(predložak, bez LLM-a), s poveznicom na radio, hashtagovima i provjerom duljine.
NIŠTA NE OBJAVLJUJE. Svaki nacrt ima status "nacrt-čeka-odobrenje".

Pravila (AGENTS.md, pravilo 3 i 4): nacrt ne tvrdi vlasništvo nad streamovima trećih strana,
ne navodi ocjene ni brojke slušanosti, i nosi ime urednika samo kao „urednički voditelj”.
"""
import json
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "apps", "portal", "data", "radio-promo-kit.json")

HASHTAGS = "#AktualMediaRadio #NerminSefić #NerminSefic #AktualMedia #GNKASG"
LIMITS = {"x": 280, "linkedin": 3000, "facebook": 2000, "telegram": 4096, "instagram": 2200}

COPY = {
    "hr": {
        "text": "AKTUAL MEDIA RADIO: internetski audio streamovi uz GNK ASG portal. Player se otvara klikom i ne prekriva tekst. Stanice trećih strana ostaju njihove.",
        "cta": "Slušajte: https://gnk-asg.hr/radio/",
        "editor": "Urednički voditelj: Nermin Sefić.",
    },
    "en": {
        "text": "AKTUAL MEDIA RADIO: internet audio streams alongside the GNK ASG portal. The player opens with one click and does not cover the text. Third-party stations remain theirs.",
        "cta": "Listen: https://gnk-asg.hr/en/radio/",
        "editor": "Editorial lead: Nermin Sefić.",
    },
}


def draft(platform, lang):
    c = COPY[lang]
    body = f"{c['text']}\n{c['cta']}\n{c['editor']}\n{HASHTAGS}"
    if platform == "x":
        body = f"{c['text'][:150]}… {c['cta']} {HASHTAGS}"
    limit = LIMITS[platform]
    return {
        "platform": platform,
        "lang": lang,
        "text": body,
        "chars": len(body),
        "limit": limit,
        "fits": len(body) <= limit,
        "status": "nacrt-čeka-odobrenje",
    }


def main():
    drafts = [draft(p, l) for p in LIMITS for l in ("hr", "en")]
    kit = {
        "version": "RADIO_PROMO_KIT_V1",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "publishing": "nema; nacrti za ručnu objavu nakon odobrenja",
        "drafts": drafts,
    }
    if "--check" in sys.argv:
        bad = [d for d in drafts if not d["fits"]]
        print(json.dumps({"drafts": len(drafts), "too_long": len(bad)}))
        return 1 if bad else 0
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(kit, fh, ensure_ascii=False, indent=1)
    print(json.dumps({"drafts": len(drafts), "too_long": sum(1 for d in drafts if not d["fits"])}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
