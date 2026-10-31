// Čista logika planiranja; nema mrežnih poziva ni objave.
function safeOwnArticle(value) {
  try {
    const u=new URL(value);
    if (u.protocol!=='https:' || u.hostname!=='gnk-asg.hr' || u.port || u.username || u.password || u.search || u.hash) return null;
    if (u.pathname==='/' || u.pathname.startsWith('/podijeli/vijest/') || /%2f|%5c/i.test(u.pathname)) return null;
    return u.href;
  } catch { return null; }
}
export function planPublication({scope, url, countries, editorialRegistry}) {
  if (!['hr','svijet'].includes(scope)) throw new Error('Odaberite hr ili svijet');
  const canonical=safeOwnArticle(url);
  if (!canonical) throw new Error('Potrebna je vlastita HTTPS adresa članka na gnk-asg.hr bez parametara');
  if (!Array.isArray(countries)) throw new Error('Nedostaje registar država');
  const records = editorialRegistry?.items;
  if (!Array.isArray(records)) throw new Error('Urednički registar nije dostupan; plan je zaustavljen');
  const article = records.find(item => item?.status === 'published' && safeOwnArticle(item.url) === canonical);
  const selected=countries.filter(c=>scope==='svijet' || c.cca2==='HR');
  if (!selected.length) throw new Error('Nema odabranih država u registru');
  return {
    version:'FACTORY_PUBLICATION_PLAN_V1', scope, canonical,
    status:'plan_only_not_published',
    evidence:article ? 'published_in_editorial_registry' : 'not_found_in_editorial_registry',
    registryGeneratedAt:editorialRegistry.generatedAt || null,
    notice:'Ovo nije nalog za automatsku objavu. Potrebni su provjera sadržaja, prava, odobrenja spominjanja, urednički pregled i postojeći release postupak.',
    destinations:selected.map(c=>({id:c.id,country:c.country,registryStatus:c.status,
      decision:c.status==='live' && c.channelId && c.liveUrl ? (article ? 'candidate_requires_review' : 'article_not_in_registry') : 'not_available',
      reason:c.status!=='live' || !c.channelId || !c.liveUrl ? 'Izdanje nije potvrđeno kao live u registru.' : article ? 'Potrebne su provjere sadržaja, prava, urednika i odredišta.' : 'Objava nije pronađena kao objavljena u uredničkom registru.'}))
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
