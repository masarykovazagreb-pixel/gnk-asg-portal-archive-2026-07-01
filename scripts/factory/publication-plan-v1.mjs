#!/usr/bin/env node
// Planira; NIKAD ne objavljuje, ne mijenja stranice i ne poziva mrežu.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
function safeOwnArticle(value) {
  try {
    const u=new URL(value);
    if (u.protocol!=='https:' || u.hostname!=='gnk-asg.hr' || u.port || u.username || u.password || u.search || u.hash) return null;
    if (u.pathname==='/' || u.pathname.startsWith('/podijeli/vijest/') || /%2f|%5c/i.test(u.pathname)) return null;
    return u.href;
  } catch { return null; }
}
export function planPublication({scope, url, countries}) {
  if (!['hr','svijet'].includes(scope)) throw new Error('Odaberite hr ili svijet');
  const canonical=safeOwnArticle(url);
  if (!canonical) throw new Error('Potrebna je vlastita HTTPS adresa članka na gnk-asg.hr bez parametara');
  if (!Array.isArray(countries)) throw new Error('Nedostaje registar država');
  const selected=countries.filter(c=>scope==='svijet' || c.cca2==='HR');
  if (!selected.length) throw new Error('Nema odabranih država u registru');
  return {
    version:'FACTORY_PUBLICATION_PLAN_V1', scope, canonical,
    status:'plan_only_not_published',
    notice:'Ovo nije nalog za automatsku objavu. Potrebni su provjera sadržaja, prava, odobrenja spominjanja, urednički pregled i postojeći release postupak.',
    destinations:selected.map(c=>({id:c.id,country:c.country,registryStatus:c.status,
      decision:c.status==='live' && c.channelId && c.liveUrl ? 'candidate_requires_review' : 'not_available',
      reason:c.status==='live' && c.channelId && c.liveUrl ? 'Potrebne su provjere sadržaja, prava, urednika i odredišta.' : 'Izdanje nije potvrđeno kao live u registru.'}))
  };
}
function validFeedItem(item, channelId, nowMs, maxAgeHours) {
  if (!item?.title || typeof item.title!=='string' || !item.title.trim()) return false;
  const url=safeOwnArticle(item.url);
  if (!url || !new URL(url).pathname.startsWith(`/kanal/${channelId}/clanak/`)) return false;
  const date=Date.parse(item.date_published || item.date_modified || '');
  return Number.isFinite(date) && date<=nowMs && nowMs-date<=maxAgeHours*3600000;
}
export function planFallback({target, countries, feeds, now, maxAgeHours=48}) {
  if (!Number.isFinite(now) || !Number.isFinite(maxAgeHours) || maxAgeHours<=0) throw new Error('Nevaljan datum ili starost');
  if (!Array.isArray(countries) || !feeds || typeof feeds!=='object') throw new Error('Nedostaju podaci');
  const live=countries.filter(c=>c.status==='live' && c.channelId);
  if (!live.some(c=>c.channelId===target)) throw new Error('Odredište nije aktivan kanal u registru');
  const best=(id)=> (Array.isArray(feeds[id]?.items) ? feeds[id].items : [])
    .filter(i=>validFeedItem(i,id,now,maxAgeHours))
    .sort((a,b)=>Date.parse(b.date_published||b.date_modified)-Date.parse(a.date_published||a.date_modified))[0];
  if (best(target)) return {version:'FACTORY_FALLBACK_PLAN_V1',target,status:'local_fresh',candidates:[]};
  const candidates=live.filter(c=>c.channelId!==target).flatMap(c=>{
    const item=best(c.channelId); return item ? [{channel:c.channelId,country:c.country,title:item.title,url:item.url,date:item.date_published||item.date_modified}] : [];
  }).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date) || a.channel.localeCompare(b.channel));
  return {version:'FACTORY_FALLBACK_PLAN_V1',target,status:candidates.length?'candidates_require_review':'no_fresh_candidates',
    notice:'Samo kandidati za poveznicu na izvornu objavu; nije kopiranje, prijevod ni objava.',candidates};
}
function main() {
  const args=process.argv.slice(2), countries=JSON.parse(readFileSync(join(ROOT,'config/world-countries-v1.json'),'utf8')).countries;
  if (args[0]==='objavi') {
    let scope, offset;
    if (args[1]==='hr') {scope='hr';offset=2;}
    else if (args[1]==='cijeli' && args[2]==='svijet') {scope='svijet';offset=3;}
    else throw new Error('Koristite objavi hr ili objavi cijeli svijet');
    if(args.length!==offset+2 || args[offset]!=='--url') throw new Error('Potreban je --url ADRESA');
    console.log(JSON.stringify(planPublication({scope,url:args[offset+1],countries}),null,2));
  } else if (args[0]==='razmjena' && args.length===3 && args[1]==='--kanal') {
    const feeds={};
    for (const c of countries.filter(c=>c.status==='live' && c.channelId)) {
      if (!/^[a-z0-9-]+$/.test(c.channelId)) throw new Error('Nevaljan identifikator kanala');
      const path=join(ROOT,'apps/portal/kanal',c.channelId,'feed.json');
      if (existsSync(path)) {try {feeds[c.channelId]=JSON.parse(readFileSync(path,'utf8'));} catch {feeds[c.channelId]={};}}
    }
    console.log(JSON.stringify(planFallback({target:args[2],countries,feeds,now:Date.now()}),null,2));
  } else throw new Error('Upotreba: objavi hr --url URL | objavi cijeli svijet --url URL | razmjena --kanal ID');
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {main();} catch(e) {console.error(e.message);process.exitCode=1;}
}
