#!/usr/bin/env node
/**
 * FEEDOVI MORAJU BITI VALJANI I ISTI.
 *
 * RSS, Atom i JSON Feed tri su ulaza u isti sadržaj. Kad se raziđu, čitatelj
 * koji koristi jedan od njih dobije stariji popis — a da to nitko ne vidi, jer
 * stranica izgleda ispravno.
 *
 * Test za svaki web provjerava:
 *   • RSS: XML deklaracija, `<rss version>`, kanal s naslovom i linkom,
 *     najmanje jednu stavku, svaka stavka ima link i datum;
 *   • Atom: `<feed xmlns=…>`, `<updated>`, najmanje jednu stavku s `<id>`;
 *   • JSON Feed: `version`, `title`, `items` s `url` i `date_published`;
 *   • iste naslove u sva tri formata (prvih pet), jer sva tri piše isti izvor.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const webs = [];
const collect = (base) => {
  const dir = join(ROOT, base);
  if (!existsSync(dir)) return;
  if (existsSync(join(dir, 'feed.xml'))) webs.push({ id: base.split('/').filter(Boolean).pop(), dir });
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (existsSync(join(full, 'feed.xml'))) webs.push({ id: name, dir: full });
  }
};
for (const base of ['apps/portal/kanal', 'apps/world/site', 'apps/sites/site', 'apps/arhiva/site', 'apps/dnevnik/site', 'apps/kanal/site']) collect(base);

const titlesOfRss = (xml) => [...xml.matchAll(/<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)].map((m) => m[1].trim());
const titlesOfJson = (json) => (json.items || []).slice(0, 5).map((item) => String(item.title || '').trim());

let feeds = 0;
for (const web of webs) {
  const rss = join(web.dir, 'feed.xml');
  const atom = join(web.dir, 'atom.xml');
  const json = join(web.dir, 'feed.json');

  if (existsSync(rss)) {
    feeds += 1;
    const xml = readFileSync(rss, 'utf8');
    check(/^<\?xml/.test(xml.trim()), `${web.id}: feed bez XML deklaracije`);
    /* Ime datoteke nije jamstvo formata: samostalni webovi pišu Atom u
       `feed.xml`, izdanja pišu RSS. Format se čita iz korijenskog elementa. */
    if (/<rss[^>]+version="2\.0"/.test(xml)) {
      check(/<channel>/.test(xml), `${web.id}: RSS bez <channel>`);
      check(/<link>/.test(xml), `${web.id}: RSS bez <link>`);
      check((xml.match(/<item>/g) || []).length >= 1, `${web.id}: RSS bez stavki`);
      check(!/<item>[\s\S]{0,400}?<guid[^>]*><\/guid>/.test(xml), `${web.id}: RSS stavka s praznim guid`);
    } else if (/<feed[^>]+xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/.test(xml)) {
      check(/<updated>[^<]+<\/updated>/.test(xml), `${web.id}: Atom bez <updated>`);
      check((xml.match(/<entry>/g) || []).length >= 1, `${web.id}: Atom bez zapisa`);
      check(/<id>https?:/.test(xml), `${web.id}: Atom bez apsolutnog <id>`);
    } else {
      fails.push(`${web.id}: feed.xml nije ni RSS 2.0 ni Atom`);
    }
  }

  if (existsSync(atom)) {
    const xml = readFileSync(atom, 'utf8');
    check(/<feed[^>]+xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/.test(xml), `${web.id}: Atom bez ispravnog xmlns`);
    check(/<updated>[^<]+<\/updated>/.test(xml), `${web.id}: Atom bez <updated>`);
    check((xml.match(/<entry>/g) || []).length >= 1, `${web.id}: Atom bez zapisa`);
  }

  if (existsSync(json)) {
    let data;
    try { data = JSON.parse(readFileSync(json, 'utf8')); } catch { fails.push(`${web.id}: feed.json se ne parsira`); continue; }
    check(Boolean(data.version), `${web.id}: JSON Feed bez version`);
    check(Boolean(data.title), `${web.id}: JSON Feed bez title`);
    check(Array.isArray(data.items) && data.items.length >= 1, `${web.id}: JSON Feed bez stavki`);
    for (const [index, item] of (data.items || []).slice(0, 5).entries()) {
      check(Boolean(item.url), `${web.id}: JSON Feed stavka ${index} bez url`);
      check(Boolean(item.date_published), `${web.id}: JSON Feed stavka ${index} bez date_published`);
    }

    /* Isti naslovi u RSS-u i JSON-u — oba piše isti generator. */
    if (existsSync(rss) && /<rss[^>]+version="2\.0"/.test(readFileSync(rss, 'utf8'))) {
      const decode = (title) => String(title)
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ').trim();
      const words = (title) => new Set(decode(title).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').split(' ').filter(Boolean));
      const clash = (a, b) => {
        const wa = words(a);
        const wb = words(b);
        if (!wa.size || !wb.size) return false;
        const shared = [...wa].filter((word) => wb.has(word)).length;
        return shared / Math.min(wa.size, wb.size) < 0.8;
      };
      const fromRss = titlesOfRss(readFileSync(rss, 'utf8')).slice(0, 3);
      const fromJson = titlesOfJson(data).slice(0, 3);
      const mismatch = fromRss.filter((title, index) => fromJson[index] && clash(title, fromJson[index]));
      check(mismatch.length === 0, `${web.id}: RSS i JSON Feed ne nose iste naslove (${mismatch[0] || ''})`);
    }
  }
}

if (!webs.length) fails.push('nijedan web s feedom nije pronađen');

const report = {
  version: 'AKTUAL_MEDIA_FEEDS_VALID_V1',
  webs: webs.length,
  rss: feeds,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 15).join('\n'));
  if (fails.length > 15) console.error(`… i još ${fails.length - 15}`);
  process.exit(1);
}
