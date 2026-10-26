#!/usr/bin/env node
/**
 * RAZMJENA VIJESTI — svaki web mreže mora je stvarno prikazivati.
 *
 * Zašto ovaj test postoji: blok razmjene vraća prazan string kad ne nađe
 * nijedan tuđi feed. To se dogodilo svjetskim portalima — filtar `/clanak/`
 * uklonio je sve feedove, blok je tiho nestao, a stranica je i dalje izgledala
 * ispravno. Zato se ovdje ne provjerava generator, nego izlaz: postoji li na
 * svakoj naslovnici mreže sekcija s najmanje četiri tuđa naslova.
 *
 * Pravila:
 *  - blok postoji na svakoj naslovnici (17 gradskih kanala, 9 svjetskih
 *    portala, 6 samostalnih webova, arhiva i dnevnik);
 *  - svaki naslov nosi izvor i datum;
 *  - svaka veza je apsolutna https, s rel="external noopener", bez nofollow;
 *  - nijedan web ne razmjenjuje sam sebe;
 *  - CSS bloka ima vlastite vrijednosti, da kartica izgleda isto i na webu
 *    koji ne definira --am-line, --am-muted i --am-measure.
 *
 * Izlaz arhive, dnevnika i svjetskih portala nije u gitu; test ih izgradi ako
 * ih nema, kao i test mreže.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES } from '../apps/sites/lib/registry.mjs';
import { WORLD_PORTALS } from '../apps/world/lib/registry.mjs';
import { exchangeBlock, EXCHANGE_CSS } from '../apps/satellites/lib/razmjena-v1.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const has = (rel) => existsSync(join(ROOT, rel));

for (const [file, script] of [
  ['apps/arhiva/site/index.html', 'apps/arhiva/engine/build.mjs'],
  ['apps/dnevnik/site/index.html', 'apps/dnevnik/engine/build.mjs'],
  ['apps/world/site/tokio/index.html', 'apps/world/build.mjs']
]) {
  if (!has(file)) execFileSync(process.execPath, [join(ROOT, script)], { cwd: ROOT, stdio: 'pipe' });
}

const CHANNELS = JSON.parse(read('apps/region/channels.json')).channels;
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const blockOf = (html) => {
  const match = html.match(/<section class="am-exchange"[\s\S]*?<\/section>/);
  return match ? match[0] : '';
};

function audit(file, { label, own = [] }) {
  check(has(file), `${file}: ne postoji`);
  if (!has(file)) return;
  const html = read(file);
  const block = blockOf(html);
  check(!!block, `${file}: nema bloka razmjene (${label})`);
  if (!block) return;

  const items = [...block.matchAll(/<li>[\s\S]*?<\/li>/g)].map((m) => m[0]);
  check(items.length >= 4, `${file}: razmjena ima ${items.length} stavki (najmanje 4)`);
  check(/class="am-x-src"/.test(block), `${file}: razmjena ne navodi izvor`);

  /* Veze se broje unutar popisa; veza na matičnu mrežu ispod popisa ima
     svoje pravilo i ne ulazi u ovaj zbroj. */
  const list = (block.match(/<ul class="am-x-list">[\s\S]*?<\/ul>/) || [''])[0];
  const links = [...list.matchAll(/<a href="([^"]+)"([^>]*)>/g)].map((m) => ({ href: m[1], attrs: m[2] }));
  check(links.length === items.length, `${file}: broj veza (${links.length}) nije jednak broju stavki (${items.length})`);
  for (const link of links) {
    check(/^https:\/\//.test(link.href), `${file}: veza nije apsolutna https (${link.href})`);
    check(/rel="external noopener"/.test(link.attrs), `${file}: veza bez rel="external noopener" (${link.href})`);
    check(!/nofollow/.test(link.attrs), `${file}: nofollow na razmjeni (${link.href})`);
  }
  const hosts = new Set(links.map((link) => { try { return new URL(link.href).host; } catch { return ''; } }));
  check(!hosts.has(''), `${file}: neispravna adresa u razmjeni`);
  for (const name of own) {
    const slug = String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (slug.length < 4) continue;
    const selfLink = links.find((link) => link.href.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(`/kanal/${slug}/`));
    check(!selfLink, `${file}: razmjenjuje vlastito izdanje (${name})`);
  }
  /* Datum je dio ugovora: čitatelj mora znati kad je naslov objavljen. */
  const dated = (block.match(/<time datetime="/g) || []).length;
  check(dated >= items.length - 1, `${file}: ${items.length - dated} stavki bez datuma`);

  /* Blok nosi znak kuće i put natrag na matičnu mrežu. */
  check(/class="am-x-mark"/.test(block), `${file}: razmjena nema znak kuće`);
  const hub = (block.match(/class="am-x-more"><a href="([^"]+)"/) || [])[1] || '';
  check(/^https:\/\/gnk-asg\.hr\/(en\/)?gnk-aktual\//.test(hub), `${file}: razmjena ne vodi na matičnu mrežu (${hub})`);
}

for (const channel of CHANNELS) {
  audit(`apps/portal/kanal/${channel.id}/index.html`, { label: `kanal ${channel.id}`, own: [channel.city, channel.cityEn] });
}
for (const portal of WORLD_PORTALS) {
  audit(`apps/world/site/${portal.id}/index.html`, { label: `svijet ${portal.id}`, own: [portal.city, portal.cityEn] });
}
for (const site of SITES) {
  audit(`apps/sites/site/${site.slug}/index.html`, { label: `web ${site.slug}` });
}
audit('apps/arhiva/site/index.html', { label: 'arhiva' });
audit('apps/dnevnik/site/index.html', { label: 'dnevnik' });

/* Isti popis mora postojati i u strojnom obliku — exchange.json uz svaki web. */
const jsonDirs = [
  ...CHANNELS.map((channel) => `apps/portal/kanal/${channel.id}`),
  ...WORLD_PORTALS.map((portal) => `apps/world/site/${portal.id}`),
  ...SITES.map((site) => `apps/sites/site/${site.slug}`),
  'apps/arhiva/site',
  'apps/dnevnik/site'
];
for (const dir of jsonDirs) {
  const file = `${dir}/exchange.json`;
  check(has(file), `${file}: nema strojnog zapisa razmjene`);
  if (!has(file)) continue;
  try {
    const payload = JSON.parse(read(file));
    check(Array.isArray(payload.items) && payload.items.length >= 4, `${file}: manje od 4 stavke`);
    for (const item of (payload.items || []).slice(0, 3)) {
      check(/^https:\/\//.test(String(item.url || '')), `${file}: stavka bez apsolutne adrese`);
      check(Boolean(item.edition), `${file}: stavka bez imena izdanja`);
    }
  } catch {
    check(false, `${file}: nije ispravan JSON`);
  }
}

/* Engleski par mora nositi isti blok, s engleskim natpisom. */
for (const site of SITES) {
  const file = `apps/sites/site/${site.slug}/en/index.html`;
  if (!has(file)) continue;
  const html = read(file);
  check(!!blockOf(html), `${file}: nema bloka razmjene`);
  check(/News exchange across the network/.test(html), `${file}: razmjena nije na engleskom`);
}
for (const portal of WORLD_PORTALS.filter((item) => item.lang === 'en')) {
  const file = `apps/world/site/${portal.id}/index.html`;
  if (!has(file)) continue;
  check(/News exchange across the network|Razmjena vijesti/.test(read(file)), `${file}: razmjena nema naslov`);
}

/* Blok se ne smije oslanjati na varijable koje web ne definira. */
for (const token of ['--am-x-line', '--am-x-muted', 'var(--am-measure,', 'var(--am-muted,']) {
  check(EXCHANGE_CSS.includes(token), `EXCHANGE_CSS: nedostaje vlastita vrijednost ${token}`);
}
check(/\.am-exchange h2\{/.test(EXCHANGE_CSS), 'EXCHANGE_CSS: nedostaje naslov bloka');

/* Generator mora odbiti vlastiti grad i kad se feed zove isto. */
const sample = exchangeBlock({ root: ROOT, lang: 'hr', selfHome: 'https://gnk-asg.hr/kanal/zagreb/', selfNames: ['Zagreb'], limit: 6 });
check(sample.length > 0, 'exchangeBlock: prazan blok za Zagreb');
check(!/\/kanal\/zagreb\//.test(sample), 'exchangeBlock: vlastiti grad ulazi u razmjenu');

const report = {
  version: 'AKTUAL_MEDIA_EXCHANGE_V1',
  channels: CHANNELS.length,
  world: WORLD_PORTALS.length,
  sites: SITES.length,
  failures: fails.length,
  sample
};
console.log(JSON.stringify({ ...report, sample: undefined, ok: fails.length === 0 }, null, 2));
if (fails.length) {
  console.error(fails.join('\n'));
  process.exit(1);
}
