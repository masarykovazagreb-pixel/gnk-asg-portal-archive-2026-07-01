#!/usr/bin/env node
/**
 * POSREDNIK SLIKA — pokrivenost.
 *
 * Proxy dopušta samo poznate hostove, ali to samo po sebi nije licencija.
 * Generator od 2026-11-13 prikazuje VANJSKU RSS sliku samo ako je njezin
 * točan URL u publisher-owned rights registry, inače crta lokalnu ilustraciju.
 *
 * Zato se tehnička host provjera odnosi SAMO na fotografije koje je sustav
 * stvarno ovlašten prikazati. Ostale feed slike se EVIDENTIRAJU kao odbačene,
 * a ne maskiraju kao licencirane ili kao pokvaren render.
 * Ako licenciranu sliku dodamo iz novog hosta, test OBAVEZNO pada sve dok
 * taj host nije posebno odobren u proxy host registru.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGION_IMAGE_HOSTS } from '../workers/gnk-asg-direct-operator/src/image-hosts-v1.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const allowed = new Set(REGION_IMAGE_HOSTS.map(([host]) => host));
const rights=JSON.parse(readFileSync(join(ROOT,'apps','region','image-photo-rights-v1.json'),'utf8'));
if(rights.schema_version!=='AKTUAL_REGION_IMAGE_RIGHTS_V1'||!Array.isArray(rights.approved_images))
  fails.push('registar prava fotografija nije valjan');
const approvedImages=new Set();
for(const item of rights.approved_images||[]){
  let url,evidence;
  try{url=new URL(item.url);evidence=new URL(item.evidence_url)}
  catch{fails.push('registar prava sadrži nevaljan URL');continue}
  if(url.protocol!=='https:'||evidence.protocol!=='https:'||
     !['owned','licensed','public-domain'].includes(item.basis)||
     !String(item.credit||'').trim()||approvedImages.has(url.toString())){
     fails.push('registar prava sadrži nevaljan ili dupliciran unos');continue
  }
  approvedImages.add(url.toString());
}
let ignoredUnlicensedFeedImages=0;


if (allowed.size !== REGION_IMAGE_HOSTS.length) fails.push('popis hostova sadrži dvostruki unos');
for (const [host, outlet, country] of REGION_IMAGE_HOSTS) {
  if (!/^[a-z0-9.-]+$/.test(host)) fails.push(`${host}: host nije valjan`);
  if (host.includes('*')) fails.push(`${host}: džoker nije dopušten`);
  if (!outlet || !country) fails.push(`${host}: nema medij ili zemlju`);
  if (!/^[A-Z]{2}$/.test(country)) fails.push(`${host}: zemlja nije dvoslovna`);
}

/* Stvarni hostovi iz podataka svih gradskih izdanja. */
const dataDir = join(ROOT, 'apps', 'region', 'data');
const found = new Map();
for (const file of readdirSync(dataDir).filter((name) => /^[a-z]+\.json$/.test(name) && !name.startsWith('_') && name !== 'seed.json')) {
  let parsed;
  try { parsed = JSON.parse(readFileSync(join(dataDir, file), 'utf8')); } catch { continue; }
  for (const item of parsed.items || []) {
    if (!item.image) continue;
    // A raw feed image is *not* an approved publication asset.
    if (!approvedImages.has(item.image)){
      ignoredUnlicensedFeedImages+=1;
      continue;
    }
    let host;
    try { host = new URL(item.image).hostname.toLowerCase(); }
    catch { fails.push(`${file}: licencirana slika nema valjan URL`); continue; }
    found.set(host, (found.get(host) || 0) + 1);
  }
}

for (const [host, count] of found) {
  if (allowed.has(host)) continue;
  if (host === 'www.tportal.hr' || host === 'www.poslovni.hr') continue; // već u glavnom popisu
  fails.push(`${host} (${count} slika) nije na popisu — dodaj ga u image-hosts-v1.js s medijem i zemljom`);
}

const missing = [...allowed].filter((host) => !found.has(host) && host !== 'www.tportal.hr' && host !== 'www.poslovni.hr');
const stale = missing;

const report = {
  ok: fails.length === 0,
  version: 'GNK_ASG_IMAGE_HOST_LICENSED_COVERAGE_V2_20261113',
  allowedHosts: allowed.size,
  approvedImageUrls: approvedImages.size,
  ignoredUnlicensedFeedImages,
  hostsInData: found.size,
  imagesInData: [...found.values()].reduce((sum, n) => sum + n, 0),
  unusedAllowlistEntries: stale,
  failures: fails,
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) process.exit(1);
