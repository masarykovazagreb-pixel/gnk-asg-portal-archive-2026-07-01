#!/usr/bin/env python3
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = ROOT / "scripts" / "generate_media_kit_pdfs_original.py"
V5 = ROOT / "workers" / "gnk-asg-direct-operator" / "src" / "index-news-quality-v2.js"
V6 = ROOT / "workers" / "gnk-asg-direct-operator" / "src" / "publication-quality-core-v6.js"


def replace_required(value: str, old: str, new: str, label: str) -> str:
    if old not in value:
        raise RuntimeError(f"quality_patch_marker_missing:{label}")
    return value.replace(old, new, 1)


def patch_v5() -> None:
    value = V5.read_text(encoding="utf-8")
    changes = [
        ("const VERSION = 'GNK_ASG_NEWS_QUALITY_V5';", "const VERSION = 'GNK_ASG_NEWS_QUALITY_V8_20260625';", "v5_version"),
        ("const MOJIBAKE = /(?:\\uFFFD|Ã.|Â.|â€|â€™|â€“|â€”|Å.|Ä.|Ð.|Ñ.)/;", "const MOJIBAKE = /(?:\\uFFFD|Ã.|Â.|â€|â€™|â€“|â€”|Å.|Ä.|Ð.|Ñ.|Γ.|├.|┼.|╛|╕)/;", "v5_mojibake"),
        (": [' the ', ' and ', ' of ', ' to ', ' in ', ' for ', ' with ', ' market', ' business', ' technology', ' investment', ' economy'];", ": [' the ', ' and ', ' of ', ' to ', ' in ', ' for ', ' with ', ' market', ' business', ' technology', ' investment', ' economy', ' government', ' global', ' project', ' says', ' seeks', ' breaks', ' ground', ' energy'];", "v5_language_patterns"),
        (
            "  const combined = [titleHr, titleEn, summaryHr, summaryEn, bodyHr, bodyEn].join('\\n');",
            "  const combined = [titleHr, titleEn, summaryHr, summaryEn, bodyHr, bodyEn].join('\\n');\n"
            "  const hrText = `${titleHr}\\n${summaryHr}\\n${bodyHr}`;\n"
            "  const globalTitleEnglishScore = languageScore(titleHr, 'en');\n"
            "  const globalTitleCroatianScore = languageScore(titleHr, 'hr');\n"
            "  if (globalTitleEnglishScore >= 2 && globalTitleEnglishScore > globalTitleCroatianScore) reasons.push('hr_title_language');\n"
            "  if (/\\b(?:ko će|zvanično|akcioni plan|u oblasti|kompanije su|investirali su|trenutno realiziraju|komesar|faktori koji su doprinijeli|u zadnjih godina)\\b/i.test(hrText)) reasons.push('hr_nonstandard_language');",
            "v5_global_language_gate",
        ),
        ("    if (summaryHr.length < 70) reasons.push('short_hr_summary');", "    if (summaryHr.length < 120) reasons.push('short_hr_summary');", "v5_hr_summary"),
        ("    if (summaryEn.length < 70) reasons.push('short_en_summary');", "    if (summaryEn.length < 120) reasons.push('short_en_summary');", "v5_en_summary"),
        (
            "    if (!Array.isArray(item.sources) || !item.sources.some(source => /^https?:\\/\\//i.test(String(source?.url || '')))) {\n      reasons.push('missing_sources');\n    }",
            "    const sourceUrls = Array.isArray(item.sources) ? item.sources.map(source => String(source?.url || '').trim().toLowerCase()).filter(url => /^https?:\\/\\//i.test(url)) : [];\n    if (new Set(sourceUrls).size < 2) reasons.push('fewer_than_two_sources');",
            "v5_sources",
        ),
        ("  const last = await readJson(env, 'quality:publications:last', null);", "  const last = await readJson(env, 'quality:publications:v8:last', null);", "v5_cache_read"),
        ("  await writeJson(env, 'quality:publications:last', result);", "  await writeJson(env, 'quality:publications:v8:last', result);\n  await writeJson(env, 'quality:publications:last', result);", "v5_cache_write"),
        ("      lastCleanup: await readJson(env, 'quality:publications:last', null),", "      lastCleanup: await readJson(env, 'quality:publications:v8:last', null),", "v5_status"),
    ]
    for old, new, label in changes:
        value = replace_required(value, old, new, label)
    V5.write_text(value, encoding="utf-8")


def patch_v6() -> None:
    value = V6.read_text(encoding="utf-8")
    changes = [
        ("const VERSION = 'GNK_ASG_PUBLICATION_QUALITY_CORE_V6_20260625';", "const VERSION = 'GNK_ASG_PUBLICATION_QUALITY_CORE_V8_20260625';", "v6_version"),
        ("const MOJIBAKE = /(?:\\uFFFD|Ã.|Â.|â€|â€™|â€“|â€”|Å.|Ä.|Ð.|Ñ.|ΓÇ|┼|╛|╕)/;", "const MOJIBAKE = /(?:\\uFFFD|Ã.|Â.|â€|â€™|â€“|â€”|Å.|Ä.|Ð.|Ñ.|Γ.|├.|┼.|╛|╕)/;", "v6_mojibake"),
        ("const PLACEHOLDER = /(?:lorem ipsum|\\bTODO\\b|\\bTBD\\b|undefined|null|\\[object Object\\]|test article|draft only|tekst će biti dodan|content coming soon)/i;", "const PLACEHOLDER = /(?:lorem ipsum|\\bTODO\\b|\\bTBD\\b|undefined|null|\\[object Object\\]|test article|draft only|tekst će biti dodan|content coming soon)/i;\nconst NONSTANDARD_HR = /\\b(?:ko će|zvanično|akcioni plan|u oblasti|kompanije su|investirali su|trenutno realiziraju|komesar|faktori koji su doprinijeli|u zadnjih godina)\\b/i;", "v6_nonstandard"),
        (": [' the ', ' and ', ' of ', ' to ', ' in ', ' for ', ' with ', ' market', ' business', ' technology', ' investment', ' economy', ' company', ' risk', ' opportunity'];", ": [' the ', ' and ', ' of ', ' to ', ' in ', ' for ', ' with ', ' market', ' business', ' technology', ' investment', ' economy', ' company', ' risk', ' opportunity', ' government', ' global', ' project', ' says', ' seeks', ' breaks', ' ground', ' energy'];", "v6_language_patterns"),
        (
            "  if (MOJIBAKE.test(combined)) reasons.push('broken_encoding');",
            "  if (MOJIBAKE.test(combined)) reasons.push('broken_encoding');\n"
            "  const globalTitleEnglishScore = languageScore(titleHr, 'en');\n"
            "  const globalTitleCroatianScore = languageScore(titleHr, 'hr');\n"
            "  if (globalTitleEnglishScore >= 2 && globalTitleEnglishScore > globalTitleCroatianScore) reasons.push('hr_title_language');\n"
            "  if (NONSTANDARD_HR.test(`${titleHr}\\n${summaryHr}\\n${bodyHr}`)) reasons.push('hr_nonstandard_language');",
            "v6_global_language_gate",
        ),
        ("  const previous = await readJson(env, 'quality:v6:last', null);", "  const previous = await readJson(env, 'quality:v8:last', null);", "v6_cache_read"),
        ("  await writeJson(env, 'quality:v6:last', result);", "  await writeJson(env, 'quality:v8:last', result);\n  await writeJson(env, 'quality:v6:last', result);", "v6_cache_write"),
        ("    lastCleanup: await readJson(env, 'quality:v6:last', null),", "    lastCleanup: await readJson(env, 'quality:v8:last', null),", "v6_status"),
    ]
    for old, new, label in changes:
        value = replace_required(value, old, new, label)
    V6.write_text(value, encoding="utf-8")


def main() -> None:
    patch_v5()
    patch_v6()
    runpy.run_path(str(ORIGINAL), run_name="__main__")


if __name__ == "__main__":
    main()
