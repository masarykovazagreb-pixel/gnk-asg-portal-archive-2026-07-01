#!/usr/bin/env node
/**
 * Oporavak zapisa izdanja iz objavljenih stranica članaka (tvornica, V1).
 *
 * Zašto: dnevni ciklus (apps/region/engine/daily.mjs) držao je najviše 420
 * zapisa po kanalu, a stranice članaka ostajale su na disku. Tako su nastale
 * stranice bez zapisa u podacima (region-audit: "slug nije u podacima") i
 * sitemap koji ih ne sadrži. Ovaj skript vraća zapise iz samih stranica.
 *
 * Što radi:
 *  - za svaku apps/portal/kanal/<kanal>/clanak/<slug>/index.html koja nema zapis
 *    u apps/region/data/<kanal>.json, čita naslov (h1), datum (time), izvornik
 *    (poveznica u artmeta), sažetak izvora (blockquote), rubriku (kicker) i sliku;
 *  - temu dodjeljuje istim pravilom kao dnevni ciklus (themeFor iz lib.mjs);
 *  - dodaje zapis označen izvor_zapisa = "stranica" (vidljivo u podacima);
 *  - ne mijenja postojeće zapise, ne briše stranice, ne ograničava broj zapisa.
 *
 * Pokretanje:
 *   node scripts/region/recover-items-from-pages-v1.mjs          (piše)
 *   node scripts/region/recover-items-from-pages-v1.mjs --check  (samo broji; exit 1 ako ima sirotinja)
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decode, isCorrupt, stripTags, themeFor } from '../../apps/region/engine/lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = join(ROOT, 'apps', 'region', 'data');
const SITE = join(ROOT, 'apps', 'portal', 'kanal');
const CHANNELS = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;
const CHECK = process.argv.includes('--check');

const norm = (s = '') => s.toLowerCase().replace(/[^a-z0-9čćžšđ]+/gi, ' ').trim();

function sourceFor(channel, name, url) {
  const byName = (channel.sources || []).find((s) => norm(s.name) === norm(name));
  if (byName) return { id: byName.id, name: byName.name };
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  const byHost = (channel.sources || []).find((s) => (s.urls || []).some((u) => { try { return new URL(u).hostname.replace(/^www\./, '') === host; } catch { return false; } }));
  if (byHost) return { id: byHost.id, name: byHost.name || name };
  return { id: norm(name).replace(/\s+/g, '-') || 'izvor', name };
}

function imageFrom(src = '') {
  // Slike idu kroz posrednik: /api/img?u=<izvorni URL>&w=1200
  const m = src.match(/[?&]u=([^&]+)/);
  const url = m ? decodeURIComponent(m[1].replace(/&amp;/g, '&')) : src;
  return /^https:\/\//.test(url) && !/\.svg(?:[?#]|$)/i.test(url) ? url : '';
}

export function parsePage(html, channel, slug) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = h1 ? decode(stripTags(h1)).trim() : '';
  const meta = html.match(/<p class="artmeta">([\s\S]*?)<\/p>/i)?.[1] || '';
  const datetime = meta.match(/<time datetime="([^"]+)"/i)?.[1] || '';
  const link = meta.match(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  const url = link ? decode(link[1]) : '';
  const sourceName = link ? decode(stripTags(link[2])).replace(/\s*↗\s*$/, '').trim() : '';
  const summary = decode(stripTags(html.match(/<section class="quote">[\s\S]*?<blockquote>([\s\S]*?)<\/blockquote>/i)?.[1] || '')).trim();
  const kicker = decode(stripTags(html.match(/<p class="kicker">([\s\S]*?)<\/p>/i)?.[1] || ''));
  const section = kicker.includes('·') ? kicker.split('·').pop().trim() : '';
  const img = html.match(/<figure class="artimg">[\s\S]*?<img src="([^"]+)"(?:[^>]*alt="([^"]*)")?/i);
  const image = img ? imageFrom(decode(img[1])) : '';
  const imageAlt = img && img[2] ? decode(img[2]).slice(0, 180) : title.slice(0, 180);
  if (!title || !datetime || !url || !sourceName) return { error: 'nedostaje naslov, datum ili izvor' };
  if ([title, summary, sourceName].some(isCorrupt)) return { error: 'pokvareno kodiranje' };
  const src = sourceFor(channel, sourceName, url);
  const theme = themeFor(`${title} ${summary}`).id;
  return {
    item: {
      slug,
      title,
      summary,
      date: datetime,
      url,
      source: src.id,
      sourceName: src.name,
      categories: section ? [section] : [],
      author: '',
      theme,
      image,
      imageAlt: imageAlt || title,
      addedAt: datetime,
      izvor_zapisa: 'stranica'
    }
  };
}

function run() {
  const report = [];
  let totalOrphans = 0;
  let totalAdded = 0;
  let totalFailed = 0;
  for (const channel of CHANNELS) {
    const clanci = join(SITE, channel.id, 'clanak');
    if (!existsSync(clanci) || !statSync(clanci).isDirectory()) continue;
    const dataFile = join(DATA, `${channel.id}.json`);
    const data = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : { version: 1, channel: channel.id, lang: channel.lang, city: channel.city, country: channel.country, items: [] };
    const have = new Set((data.items || []).map((i) => i.slug));
    const orphans = readdirSync(clanci).filter((d) => existsSync(join(clanci, d, 'index.html')) && !have.has(d));
    totalOrphans += orphans.length;
    const added = [];
    const failed = [];
    for (const slug of orphans.sort()) {
      const res = parsePage(readFileSync(join(clanci, slug, 'index.html'), 'utf8'), channel, slug);
      if (res.error) failed.push(`${slug}: ${res.error}`);
      else added.push(res.item);
    }
    totalFailed += failed.length;
    report.push({ channel: channel.id, orphans: orphans.length, added: added.length, failed });
    if (CHECK || !added.length) continue;
    totalAdded += added.length;
    data.items = [...(data.items || []), ...added].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify({ mode: CHECK ? 'check' : 'write', orphans: totalOrphans, added: totalAdded, failed: totalFailed, channels: report.filter((r) => r.orphans) }, null, 2));
  if (CHECK) return totalOrphans || totalFailed ? 1 : 0;
  return totalFailed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = run();
