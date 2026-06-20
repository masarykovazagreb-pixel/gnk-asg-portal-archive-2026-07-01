#!/usr/bin/env python3
"""Generate a professional daily public-market commentary from public datasets.

The output is deterministic commentary based on observed quote changes. It is
informational only and deliberately avoids recommendations or forecasts.
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)


def read(name: str, default):
    try:
        return json.loads((DATA / name).read_text(encoding="utf-8"))
    except Exception:
        return default


def save(payload: dict) -> None:
    (DATA / "daily_market_brief.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def signed(value: float | None) -> str:
    if value is None:
        return "—"
    return ("+" if value >= 0 else "") + f"{value:.2f}%"


def row_change(item: dict) -> float | None:
    value = item.get("change_percent")
    return float(value) if value is not None else None


def coin_change(item: dict) -> float | None:
    value = (item.get("changes_24h") or {}).get("usd")
    return float(value) if value is not None else None


def reference_session(indices: list[dict]) -> str:
    stamps = []
    for item in indices:
        value = item.get("market_time")
        if isinstance(value, (int, float)) and value > 0:
            stamps.append(int(value))
    if stamps:
        return dt.datetime.fromtimestamp(max(stamps), tz=dt.timezone.utc).date().isoformat()
    return (NOW.date() - dt.timedelta(days=1)).isoformat()


def describe_tone_hr(values: list[float]) -> str:
    positive = sum(1 for value in values if value >= 0)
    if positive == len(values):
        return "široko pozitivan"
    if positive == 0:
        return "široko negativan"
    if positive >= max(1, len(values) * 0.67):
        return "pretežno pozitivan"
    if positive <= len(values) * 0.33:
        return "pretežno negativan"
    return "mješovit"


def describe_tone_en(values: list[float]) -> str:
    positive = sum(1 for value in values if value >= 0)
    if positive == len(values):
        return "broadly positive"
    if positive == 0:
        return "broadly negative"
    if positive >= max(1, len(values) * 0.67):
        return "predominantly positive"
    if positive <= len(values) * 0.33:
        return "predominantly negative"
    return "mixed"


def main() -> None:
    indices = read("market_indices.json", {}).get("indices", [])
    market = read("market.json", {}).get("coins", [])
    stablecoins = read("stablecoins.json", {}).get("stablecoins", [])
    macro = read("macro_market.json", {}).get("assets", {})
    dated = reference_session(indices)
    valid_indices = [item for item in indices if row_change(item) is not None]
    index_values = [row_change(item) for item in valid_indices]
    index_values = [value for value in index_values if value is not None]
    top_indices = sorted(valid_indices, key=lambda item: row_change(item) or -999, reverse=True)
    coins = [item for item in market if item.get("symbol") in {"BTC", "ETH", "SOL", "XRP"} and coin_change(item) is not None]
    coins_sorted = sorted(coins, key=lambda item: coin_change(item) or -999, reverse=True)
    stable_sorted = sorted(stablecoins, key=lambda item: float(item.get("abs_deviation_percent") or 0), reverse=True)
    max_dev = stable_sorted[0] if stable_sorted else None
    macro_lines_hr, macro_lines_en = [], []
    for key, label_hr, label_en in (("btc", "Bitcoin", "Bitcoin"), ("gold", "zlato", "gold"), ("oil", "Brent nafta", "Brent crude")):
        item = macro.get(key) or {}
        if item.get("change_7d_percent") is not None:
            macro_lines_hr.append(f"{label_hr}: {signed(float(item['change_7d_percent']))} u sedmodnevnoj usporedbi")
            macro_lines_en.append(f"{label_en}: {signed(float(item['change_7d_percent']))} over the seven-day comparison")
    if index_values:
        market_tone_hr = describe_tone_hr(index_values)
        market_tone_en = describe_tone_en(index_values)
        leader = top_indices[0]
        laggard = top_indices[-1]
        equities_hr = f"Promatrani burzovni indeksi zabilježili su {market_tone_hr} raspored kretanja. Najjaču promjenu pokazao je {leader['label']} ({signed(row_change(leader))}), dok je najslabiji rezultat imao {laggard['label']} ({signed(row_change(laggard))})."
        equities_en = f"Observed equity indices showed a {market_tone_en} distribution of moves. {leader['label']} recorded the strongest change ({signed(row_change(leader))}), while {laggard['label']} was weakest ({signed(row_change(laggard))})."
    else:
        equities_hr = "Za promatrane burzovne indekse u trenutku izrade nije bilo dovoljno dostupnih javnih točaka za usporedbu sesije."
        equities_en = "At generation time, sufficient public observations for a comparative equity-session reading were not available."
    if coins_sorted:
        best, weakest = coins_sorted[0], coins_sorted[-1]
        crypto_hr = f"U promatranom skupu digitalne imovine {best['symbol']} je imao najizraženiju 24-satnu promjenu ({signed(coin_change(best))}), dok je {weakest['symbol']} zabilježio najslabije kretanje ({signed(coin_change(weakest))})."
        crypto_en = f"Within the observed digital-asset set, {best['symbol']} recorded the strongest 24-hour move ({signed(coin_change(best))}), while {weakest['symbol']} was weakest ({signed(coin_change(weakest))})."
    else:
        crypto_hr = "Dostupni podatci o digitalnoj imovini nisu bili dovoljni za usporedni komentar."
        crypto_en = "Available digital-asset observations were insufficient for comparative commentary."
    if max_dev:
        stable_hr = f"Najveće promatrano stablecoin odstupanje od referentne valute zabilježeno je kod {max_dev['symbol']} ({max_dev['deviation_percent']:+.4f}%). To je tržišno opažanje, a ne procjena rezervi ili otkupivosti."
        stable_en = f"The largest observed stablecoin deviation from its reference currency was recorded for {max_dev['symbol']} ({max_dev['deviation_percent']:+.4f}%). This is a market observation, not a reserve or redemption assessment."
    else:
        stable_hr = "Stablecoin nadzor još nema dovoljan broj dostupnih opažanja za komentar odstupanja."
        stable_en = "The stablecoin monitor does not yet have sufficient observations for deviation commentary."
    payload = {
        "generated_at": NOW.isoformat(), "reference_date": dated, "status": "published",
        "title": "Dnevni tržišni osvrt — prethodna raspoloživa sesija",
        "title_en": "Daily Market Brief — Previous Available Session",
        "headline": "Pregled posljednje raspoložive tržišne sesije temeljen na javno dostupnim podatcima o indeksima, digitalnoj imovini i stablecoin odstupanjima.",
        "headline_en": "Review of the latest available market session based on publicly available index, digital-asset and stablecoin-deviation observations.",
        "summary": [equities_hr, crypto_hr, stable_hr, "; ".join(macro_lines_hr) + "." if macro_lines_hr else "Sedmodnevni usporedni makro prikaz nije bio dostupan."],
        "summary_en": [equities_en, crypto_en, stable_en, "; ".join(macro_lines_en) + "." if macro_lines_en else "The seven-day comparative macro view was not available."],
        "risk_note": "Informativni analitički prikaz temeljen na javno dostupnim podatcima; nije investicijski savjet, preporuka ulaganja niti jamstvo budućeg kretanja.",
        "risk_note_en": "Informational analytical display based on publicly available data; it is not investment advice, an investment recommendation or a guarantee of future performance.",
        "sources": ["CoinGecko public market data", "Public market quote feed"]
    }
    save(payload)
    print(json.dumps({"generated_at": payload["generated_at"], "reference_date": payload["reference_date"], "status": payload["status"], "points_hr": len(payload["summary"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
