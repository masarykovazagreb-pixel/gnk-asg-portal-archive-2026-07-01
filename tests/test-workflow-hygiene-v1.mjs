#!/usr/bin/env node
/**
 * HIGIJENA WORKFLOWA — pravila koja se ne krše tiho.
 *
 * 337 datoteka u `.github/workflows/` znači 337 prilika da se raspored pokrene
 * dvaput, da dva posla pišu u istu granu u istu minutu ili da posao dobije
 * dopuštenje koje mu ne treba. Nijedno od toga ne ruši build — samo se jednog
 * dana commit pojavi dvaput ili se grana zaključa.
 *
 * Bez vanjskih zavisnosti: YAML se čita linijski, jer su ovi workflowi pisani
 * predvidljivo (ključevi na početku retka). Test provjerava:
 *   1. svaka datoteka ima `name`, `on` i `jobs`,
 *   2. raspored ima `concurrency`, `permissions` i `timeout-minutes` u svakom
 *      poslu (bez toga posao može visiti satima),
 *   3. cron ima točno pet polja,
 *   4. nijedan workflow ne koristi `pull_request_target` ni `write-all`,
 *   5. svaka skripta koja se zove postoji,
 *   6. nijedan `run:` ne ispisuje tajnu (`echo ${{ secrets.… }}`).
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, '.github/workflows');
const files = readdirSync(DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort();

const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const has = (text, re) => re.test(text);
let scheduled = 0;

for (const file of files) {
  const text = readFileSync(join(DIR, file), 'utf8');
  const lines = text.split('\n');

  check(has(text, /^name:/m), `${file}: nema name`);
  check(has(text, /^on:/m), `${file}: nema on`);
  check(has(text, /^jobs:/m), `${file}: nema jobs`);

  /* Raspored: cron, concurrency, permissions, timeout po poslu. */
  if (/^\s+schedule:/m.test(text)) {
    scheduled += 1;
    check(has(text, /^concurrency:/m), `${file}: raspored bez concurrency`);
    check(has(text, /^permissions:/m), `${file}: raspored bez permissions`);
    for (const match of text.matchAll(/cron:\s*['"]?([^'"\n]+)['"]?/g)) {
      const fields = match[1].trim().split(/\s+/);
      check(fields.length === 5, `${file}: cron nema pet polja (${match[1].trim()})`);
    }
    /* timeout-minutes mora biti u svakom poslu, ne samo u prvom. */
    const jobBlocks = text.split(/^ {2}[A-Za-z0-9_-]+:\s*$/m).slice(1);
    for (const [index, block] of jobBlocks.entries()) {
      if (!/^\s{4}(runs-on|uses):/m.test(block)) continue;
      check(/timeout-minutes:/.test(block), `${file}: posao #${index + 1} bez timeout-minutes`);
    }
  }

  check(!/pull_request_target/.test(text), `${file}: pull_request_target (rizik od izvršavanja tuđeg koda)`);
  check(!/permissions:\s*write-all/.test(text), `${file}: permissions: write-all`);
  /* `::add-mask::` je maskiranje, ne ispis — to je jedini dopušteni oblik. */
  for (const match of text.matchAll(/echo[^\n]*\$\{\{\s*secrets\.[^\n]*/gi)) {
    if (!/add-mask::/.test(match[0])) fails.push(`${file}: ispisuje tajnu u log`);
  }

  /* Skripte koje workflow zove moraju postojati. */
  for (const match of text.matchAll(/(?:node|python3?|bash|sh)\s+(?:--[\w-]+(?:=\S+)?\s+)*(scripts\/[\w./-]+\.(?:mjs|js|cjs|py|sh))/g)) {
    check(existsSync(join(ROOT, match[1])), `${file}: zove nepostojeću skriptu ${match[1]}`);
  }
  for (const match of text.matchAll(/(?:node|python3?)\s+(apps\/[\w./-]+\.(?:mjs|js|py))/g)) {
    check(existsSync(join(ROOT, match[1])), `${file}: zove nepostojeću skriptu ${match[1]}`);
  }
  /* Nijedan `run:` ne smije biti prazan blok. */
  for (const [index, line] of lines.entries()) {
    if (/^\s+run:\s*[|>]\s*$/.test(line)) {
      const next = lines[index + 1] || '';
      check(next.trim().length > 0, `${file}:${index + 1}: prazan run blok`);
    }
  }
}

const report = {
  version: 'AKTUAL_MEDIA_WORKFLOW_HYGIENE_V1',
  workflows: files.length,
  scheduled,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 25).join('\n'));
  if (fails.length > 25) console.error(`… i još ${fails.length - 25}`);
  process.exit(1);
}
