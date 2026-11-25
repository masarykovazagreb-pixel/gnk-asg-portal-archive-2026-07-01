// Deterministic attributed country roundups. No article bodies, invented facts,
// external calls, approval or publication. Only the trusted coordinator output
// is accepted here, created directly from the registry and cache.
import {masterAgent} from './coordinator-v1.mjs';
import {safeUrl} from '../../../scripts/lib/aktual-world-feed-http-v1.mjs';

export function writeRoundups(registry, cache, {now=Date.now(),slug=null}={}) {
 const report=masterAgent(registry,cache,{now,slug});
 const bySlug=new Map(registry.countries.map(c=>[c.slug,c]));
 const drafts=report.countries.filter(c=>c.briefs.length).map(c=>{
  const country=bySlug.get(c.slug);
  const name=country.nameLocal || country.nameEn || c.slug;
  return {
   slug:c.slug, country:name, sourceLanguage:c.language, state:'review-required',
   leads:c.briefs.map(b=>({title:b.headline,source:b.source,url:b.url,publishedAt:b.publishedAt})),
   hr:{title:`Pregled izvora: ${name}`, paragraphs:[
    `Ovaj automatski pripremljen pregled za ${name} okuplja odabrane naslove s poveznicama na izvornike.`,
    'Naslovi su prikazani na jeziku izvora i nisu neovisno provjerene činjenice. Prije objave treba provjeriti točnost, jezik i prava.'
   ]},
   en:{title:`Source roundup: ${name}`, paragraphs:[
    `This automatically prepared roundup for ${name} brings together selected headlines linked to their original sources.`,
    'Headlines remain in their source language and are not independently verified facts. Accuracy, language and rights require review before publication.'
   ]}
  };
 });
 return {version:'AKTUAL_WORLD_ROUNDUPS_V1',generatedAt:report.generatedAt,scope:report.scope,
  countriesConsidered:report.summary.countries, countriesWithDrafts:drafts.length,
  automaticPublication:false, published:false, drafts};
}

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderPreview(result) {
 if(!Array.isArray(result?.drafts)||result.drafts.some(d=>!Array.isArray(d.leads)||d.leads.some(item=>!safeUrl(item.url)))) throw Error('Invalid preview leads');
 const sections=result.drafts.map(d=>`<section><h2>${esc(d.country)}</h2>${['hr','en'].map(lang=>{
  const text=d[lang];
  return `<article lang="${lang}"><h3>${esc(text.title)}</h3>${text.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}<ul>${d.leads.map(item=>`<li><a href="${esc(item.url)}" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer"><span translate="no">${esc(item.title)}</span></a> — <span translate="no">${esc(item.source)}</span> <time datetime="${esc(item.publishedAt)}">${esc(item.publishedAt)}</time></li>`).join('')}</ul></article>`;
 }).join('')}</section>`).join('');
 return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WORLD — interni pregled nacrta</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:960px;margin:auto;padding:1rem;color:#1d2632}h1,h2,h3{line-height:1.2}section{border-top:2px solid #9d1725;padding-block:1rem}article{padding:1rem;margin:1rem 0;border:1px solid #bbb;border-radius:.5rem}a{color:#174e86}li{margin:.6rem 0}.notice{background:#fff4d8;padding:1rem}</style></head><body><main><h1>Interni pregled nacrta / Internal draft preview</h1><p class="notice">Nije odobreno za objavu. Naslovi i poveznice nisu provjerene činjenice; potrebna je provjera izvora, prava i jezika. / Not approved for publication; sources, rights and language require review.</p><p>UTC: ${esc(result.generatedAt)} · ${result.countriesWithDrafts} / ${result.countriesConsidered}</p>${sections || '<p>Nema svježih leadova. / No fresh leads.</p>'}</main></body></html>\n`;
}
