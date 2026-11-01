import { planPublication, planFallback, regionalFeedPath } from './publication-plan-core-v1.mjs';

// Samo lokalni pregled: nema slanja podataka, nema API-ja i nema objave.
export function mountPublicationPlan(doc, fetchRegistry = globalThis.fetch) {
  const form=doc.getElementById('factory-publication-plan');
  const data=doc.getElementById('factory-plan-countries');
  const result=doc.getElementById('factory-plan-result');
  if (!form || !data || !result) return false;
  let countries;
  try { countries=JSON.parse(data.textContent); if (!Array.isArray(countries)) return false; }
  catch { return false; }
  let generation = 0;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const current = ++generation;
    const scope = form.elements.scope.value, url = form.elements.url.value;
    result.replaceChildren();
    try {
      result.textContent='Učitavam urednički registar…';
      const response = await fetchRegistry('/data/editorial-registry.json', {cache:'no-store'});
      if (!response.ok) throw new Error('Urednički registar nije dostupan');
      const editorialRegistry = await response.json();
      if (current !== generation) return;
      let plan=planPublication({scope,url,countries,editorialRegistry});
      const feedPath=regionalFeedPath(url,countries);
      if (plan.evidence === 'not_found_in_editorial_registry' && feedPath) {
        let regionalFeed;
        try {
          const feedResponse=await fetchRegistry(feedPath,{cache:'no-store'});
          if (feedResponse.ok) regionalFeed=await feedResponse.json();
        } catch { /* nedostupan feed ne znači da zapis postoji */ }
        if (current !== generation) return;
        plan=planPublication({scope,url,countries,editorialRegistry,regionalFeed});
      }
      result.replaceChildren();
      const candidates=plan.destinations.filter(d=>d.decision==='candidate_requires_review');
      const blocked=plan.destinations.length-candidates.length;
      const summary=doc.createElement('p');
      summary.textContent=`PLAN, NIJE OBJAVLJENO · ${candidates.length} kandidata za uredničku provjeru · ${blocked} stavki na čekanju. ${plan.notice}`;
      const heading=doc.createElement('p');heading.textContent=`Adresa: ${plan.canonical} · ${plan.evidence === 'published_in_editorial_registry' ? 'pronađena u snimku uredničkog registra' : plan.evidence === 'listed_in_regional_feed' ? 'pronađena u regionalnom feedu; potrebno dodatno provjeriti' : 'nije potvrđena u dostupnim zapisima'} · datum registra: ${plan.registryGeneratedAt || 'nepoznat'}.`;
      const list=doc.createElement('ul');
      for (const d of plan.destinations) {
        const li=doc.createElement('li');
        li.textContent=`${d.country}: ${d.decision==='candidate_requires_review' ? 'kandidat za provjeru' : d.decision==='article_not_in_registry' ? 'članak nije potvrđen u registru' : 'nedostupno — nije aktivno izdanje'}`;
        list.append(li);
      }
      result.append(summary,heading,list);
    } catch(error) {
      if (current !== generation) return;
      result.replaceChildren();
      const message=doc.createElement('p');message.textContent=`Plan nije izrađen: ${error.message}`;result.append(message);
    }
  });
  form.hidden=false;
  return true;
}
if (typeof document !== 'undefined') mountPublicationPlan(document);

// Feedovi su javne datoteke na istoj domeni. Ne postoji objava ni slanje URL-a.
export function mountExchangePreview(doc, fetchFeed = globalThis.fetch, now = () => Date.now()) {
  const form=doc.getElementById('factory-exchange-form');
  const data=doc.getElementById('factory-plan-countries');
  const result=doc.getElementById('factory-exchange-result');
  if (!form || !data || !result) return false;
  let countries;
  try { countries=JSON.parse(data.textContent); if (!Array.isArray(countries)) return false; }
  catch { return false; }
  const ids=[...new Set(countries.filter(c=>c.status==='live' && /^[a-z0-9-]+$/.test(c.channelId || '')).map(c=>c.channelId))];
  if (!ids.length) return false;
  let generation=0;
  const get = async id => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response=await fetchFeed(`/kanal/${id}/feed.json`,{cache:'no-store',signal:controller.signal});
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
    finally { clearTimeout(timer); }
  };
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const current=++generation, target=form.elements.channel.value, feeds={};
    result.replaceChildren();result.textContent='Provjeravam feedove…';
    try {
      if (!ids.includes(target)) throw new Error('Nepoznato izdanje');
      feeds[target]=await get(target);
      if (current!==generation) return;
      let plan=planFallback({target,countries,feeds,now:now()});
      if (!['local_fresh','local_feed_unavailable'].includes(plan.status)) {
        const queue=ids.filter(id=>id!==target);
        const worker=async()=>{while(queue.length && current===generation){const id=queue.shift();feeds[id]=await get(id);}};
        await Promise.all(Array.from({length:Math.min(4,queue.length)},()=>worker()));
        if (current!==generation) return;
        plan=planFallback({target,countries,feeds,now:now()});
      }
      result.replaceChildren();
      const status=doc.createElement('p');
      const labels={local_fresh:'Lokalno izdanje ima svjež zapis; zamjena nije potrebna.',local_feed_unavailable:'Lokalni feed nije dostupan ili nije ispravan; ne možemo znati ima li novosti.',no_fresh_candidates:'U dostupnim feedovima nema svježih kandidata.',incomplete_feeds:'Dio feedova nije dostupan; rezultat je nepotpun.',candidates_require_review:'Pronađeni su kandidati za urednički pregled. Ništa nije objavljeno.'};
      status.textContent=labels[plan.status] || 'Provjera nije dovršena.';result.append(status);
      if (plan.unavailableChannels?.length) {const info=doc.createElement('p');info.textContent=`Nedostupni feedovi: ${plan.unavailableChannels.join(', ')}.`;result.append(info);}
      if (plan.candidates.length) {
        const list=doc.createElement('ul');
        for (const candidate of plan.candidates) {
          const li=doc.createElement('li'),link=doc.createElement('a');
          link.href=candidate.url;link.textContent=candidate.title;
          const info=doc.createElement('span');info.textContent=` — ${candidate.country} · ${candidate.date} · izvor: ${candidate.originalSource} · jezik: ${candidate.language || 'nije naveden'}`;
          li.append(link,info);list.append(li);
        }
        result.append(list);
      }
    } catch(error) {
      if (current!==generation) return;
      result.replaceChildren();const message=doc.createElement('p');message.textContent=`Provjera nije dovršena: ${error.message}`;result.append(message);
    }
  });
  form.hidden=false;
  return true;
}
if (typeof document !== 'undefined') mountExchangePreview(document);
