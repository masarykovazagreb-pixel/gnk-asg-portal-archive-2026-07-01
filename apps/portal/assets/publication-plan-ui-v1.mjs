import { planPublication } from './publication-plan-core-v1.mjs';

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
      const plan=planPublication({scope,url,countries,editorialRegistry});
      result.replaceChildren();
      const candidates=plan.destinations.filter(d=>d.decision==='candidate_requires_review');
      const blocked=plan.destinations.length-candidates.length;
      const summary=doc.createElement('p');
      summary.textContent=`PLAN, NIJE OBJAVLJENO · ${candidates.length} kandidata za uredničku provjeru · ${blocked} stavki na čekanju. ${plan.notice}`;
      const heading=doc.createElement('p');heading.textContent=`Adresa: ${plan.canonical} · ${plan.evidence === 'published_in_editorial_registry' ? 'pronađena u snimku uredničkog registra' : 'nije pronađena u snimku uredničkog registra'} · datum registra: ${plan.registryGeneratedAt || 'nepoznat'}.`;
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
