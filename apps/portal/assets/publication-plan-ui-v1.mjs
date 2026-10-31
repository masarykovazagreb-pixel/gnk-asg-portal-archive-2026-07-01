import { planPublication } from './publication-plan-core-v1.mjs';

// Samo lokalni pregled: nema slanja podataka, nema API-ja i nema objave.
export function mountPublicationPlan(doc) {
  const form=doc.getElementById('factory-publication-plan');
  const data=doc.getElementById('factory-plan-countries');
  const result=doc.getElementById('factory-plan-result');
  if (!form || !data || !result) return false;
  let countries;
  try { countries=JSON.parse(data.textContent); if (!Array.isArray(countries)) return false; }
  catch { return false; }
  form.addEventListener('submit', event => {
    event.preventDefault();
    result.replaceChildren();
    try {
      const plan=planPublication({scope:form.elements.scope.value,url:form.elements.url.value,countries});
      const candidates=plan.destinations.filter(d=>d.decision==='candidate_requires_review');
      const blocked=plan.destinations.length-candidates.length;
      const summary=doc.createElement('p');
      summary.textContent=`PLAN, NIJE OBJAVLJENO · ${candidates.length} kandidata za uredničku provjeru · ${blocked} nedostupnih izdanja. ${plan.notice}`;
      const heading=doc.createElement('p');heading.textContent=`Adresa za provjeru: ${plan.canonical}`;
      const list=doc.createElement('ul');
      for (const d of plan.destinations) {
        const li=doc.createElement('li');
        li.textContent=`${d.country}: ${d.decision==='candidate_requires_review' ? 'kandidat za provjeru' : 'nedostupno — nije aktivno izdanje'}`;
        list.append(li);
      }
      result.append(summary,heading,list);
    } catch(error) {
      const message=doc.createElement('p');message.textContent=`Plan nije izrađen: ${error.message}`;result.append(message);
    }
  });
  form.hidden=false;
  return true;
}
if (typeof document !== 'undefined') mountPublicationPlan(document);
