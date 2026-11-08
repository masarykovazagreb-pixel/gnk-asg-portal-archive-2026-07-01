#!/usr/bin/env node
// Public directory from configuration. Regeneration replaces only its marked content,
// preserving the page shell and any centrally applied layers.
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {SITES} from '../../apps/sites/lib/registry.mjs';
import {WORLD_PORTALS} from '../../apps/world/lib/registry.mjs';
import {applyHouseRibbon} from '../lib/house-ribbon-v1.mjs';
import {authorBand} from '../../apps/shared/author-band-v1.mjs';
import {withDesignTokensLink} from '../../apps/shared/design-system-v1.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const load=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const channels=load('apps/region/channels.json').channels;
const countries=load('config/world-sources-v1.json').countries;
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function a(label,url){try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))return esc(label);return `<a href="${esc(u.href)}" rel="external noopener">${esc(label)}</a>`}catch{return esc(label)}}
const START='<!-- NETWORK-INVENTORY:START -->',END='<!-- NETWORK-INVENTORY:END -->';
const sections=(en)=>{
 const t=en?{ed:'City editions',world:'World portals',sites:'Independent sites',sources:'Sources configured by city',candidates:'World-source candidates and recorded statuses',empty:'No candidate recorded.',status:'Status',warning:'The directory reflects repository configuration. It does not verify availability, ownership, licences or permission to publish. Source decisions may be outdated; review rights before reuse.',sourceWarning:'A configured feed does not grant rights to reproduce or use its content commercially.',lead:'Addresses and sources',other:'Hrvatski',home:'Main portal',central:'AKTUAL MEDIA',sat:'Other publications'}:{ed:'Gradska izdanja',world:'Svjetski portali',sites:'Samostalne stranice',sources:'Izvori konfigurirani po gradu',candidates:'Kandidati svjetskih izvora i zabilježeni statusi',empty:'Nema zabilježenih kandidata.',status:'Status',warning:'Popis prikazuje konfiguraciju u repozitoriju. Ne potvrđuje dostupnost, vlasništvo, licencu ni dopuštenje za objavu. Odluke o izvorima mogu biti zastarjele; prije uporabe provjerite prava.',sourceWarning:'Konfigurirani feed ne daje pravo na preuzimanje ni komercijalno korištenje njegova sadržaja.',lead:'Adrese i izvori',other:'English',home:'Glavni portal',central:'AKTUAL MEDIA',sat:'Ostala izdanja'};
 const listing=(arr,fn)=>`<ul>${arr.map(x=>`<li>${fn(x)}</li>`).join('')}</ul>`;
 const citySources=channels.map(c=>`<section><h3>${esc(c.city)}</h3>${listing(c.sources||[],s=>`${esc(s.name)} (${esc(s.type)}): ${(s.urls||[]).map(u=>a(u,u)).join(' · ')}`)}</section>`).join('');
 const worldSources=Object.entries(countries).sort(([x],[y])=>x.localeCompare(y)).map(([code,c])=>`<section><h3>${esc(c.country)} (${esc(code)})</h3>${c.sources?.length?listing(c.sources,s=>`${a(s.name,s.url)} — ${t.status}: <strong>${esc(s.status||'unknown')}</strong>; ${esc(s.reason||s.terms||'')}`):`<p>${t.empty}</p>`}</section>`).join('');
 const satellites=[['AKTUAL ARHIVA','https://gnk-asg-arhiva.pages.dev/'],['AKTUAL DNEVNIK','https://gnk-asg-dnevnik.pages.dev/'],['AKTUAL MEDIA KANAL','https://gnk-asg-kanal.pages.dev/'],['BUSINESS TJEDNIK','https://gnk-asg-tjednik.pages.dev/']];
 const search=en?`<section class="pts" data-public-title-search aria-label="Search"><h2>Search by word or topic</h2><p>Local: selected approved titles only, not full articles or the entire website. Public: Google search.</p><form><label>Word or topic<input type="search" name="q" maxlength="128" required></label><label>Scope<select name="scope"><option value="local">Selected titles on our portal</option><option value="public">Public internet</option></select></label><button type="submit">Search</button></form><p role="status" aria-live="polite"></p><ol></ol><noscript>Search requires JavaScript.</noscript></section>`:`<section class="pts" data-public-title-search aria-label="Pretraga"><h2>Pretraži po riječi ili temi</h2><p>Interno: samo odabrani odobreni naslovi, ne cijeli web ni sadržaj članaka. Javno: Google pretraga interneta.</p><form><label>Riječ ili tema<input type="search" name="q" maxlength="128" required></label><label>Opseg<select name="scope"><option value="local">Odabrani naslovi našeg portala</option><option value="public">Javno na internetu</option></select></label><button type="submit">Traži</button></form><p role="status" aria-live="polite"></p><ol></ol><noscript>Pretraga zahtijeva JavaScript.</noscript></section>`;
 return `${START}\n<h1>${t.lead}</h1><p>${t.warning}</p><nav aria-label="${t.lead}"><a href="${en?'/':'/en/'}mreza/izvori/" hreflang="${en?'hr':'en'}">${t.other}</a> · <a href="${en?'/en/':'/'}">${t.home}</a> · <a href="${en?'/en/gnk-aktual/':'/gnk-aktual/'}">${t.central}</a></nav>${search}<section><h2>${t.ed} (${channels.length})</h2>${listing(channels,c=>`${a(c.city,c.base)} — ${esc(c.country)}, ${esc(c.lang)}`)}</section><section><h2>${t.world} (${WORLD_PORTALS.length})</h2>${listing(WORLD_PORTALS,c=>`${a(c.city,c.base)} — ${esc(c.lang)}`)}</section><section><h2>${t.sites} (${SITES.length})</h2>${listing(SITES,s=>`${a(s.name,s.base)} — ${esc(s.lang)}`)}</section><section><h2>${t.sat}</h2>${listing(satellites,([n,u])=>a(n,u))}</section><section><h2>${t.sources}</h2><p>${t.sourceWarning}</p>${citySources}</section><section><h2>${t.candidates}</h2><p>${t.warning}</p>${worldSources}</section>\n${END}`;
};
const check=process.argv.includes('--check');let changed=0;
for(const en of [false,true]){
 const lang=en?'en':'hr',rel=en?'en/mreza/izvori/':'mreza/izvori/',file=resolve(root,'apps/portal',rel),path=resolve(file,'index.html');
 const title=en?'Network addresses and sources | AKTUAL MEDIA':'Adrese i izvori mreže | AKTUAL MEDIA';
 const description=en?'A directory of configured editions, websites and source candidates, with notes on availability and rights.':'Popis konfiguriranih izdanja, webova i kandidata izvora, uz napomene o dostupnosti i pravima.';
 const hreflang=`<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/mreza/izvori/"><link rel="alternate" hreflang="en" href="https://gnk-asg.hr/en/mreza/izvori/"><link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/mreza/izvori/">`;
 const website=JSON.stringify({'@context':'https://schema.org','@type':'WebSite','@id':'https://gnk-asg.hr/#website',url:'https://gnk-asg.hr/',name:'GNK ASG',inLanguage:['hr','en'],publisher:{'@id':'https://gnk-asg.hr/#gnk-asg'}}).replaceAll('<','\\u003c');
 const shell=`<!doctype html>\n<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><meta property="og:description" content="${description}"><meta name="twitter:description" content="${description}"><meta name="robots" content="index,follow"><link rel="canonical" href="https://gnk-asg.hr/${rel}">${hreflang}<script type="application/ld+json">${website}</script><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/network-inventory-v1.css"><link rel="stylesheet" href="/assets/public-title-search-v1.css"><script src="/assets/public-title-search-v1.js" defer></script></head><body><header><a href="/gnk-aktual/">AKTUAL MEDIA</a></header><main id="sadrzaj">\n${START}\n${END}\n</main><footer><p>AKTUAL MEDIA · Nermin Sefić · GNK ASG · GNK DINAMO Ltd.</p><p>#NerminSefić #NerminSefic #AKTUALMEDIA #GNKASG</p><a href="${en?'/en/legal/':'/legal/'}">${en?'Legal information':'Pravne napomene'}</a></footer></body></html>\n`;
 const counts=load('apps/portal/data/network-counts-v1.json');
 const day=counts.dataDay||counts.generatedAt;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))throw Error('Nedostaje podatkovni dan');
 const band=authorBand(lang,null,{portrait:'/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp'});
 const prepared=shell.replace('<body>','<body><a class="skip-to-content" href="#sadrzaj">'+(en?'Skip to content':'Preskoči na sadržaj')+'</a>').replace('</head>','<link rel="stylesheet" href="/assets/author-band-v1.css?v=20261025"></head>').replace('</footer>',`${band}</footer>`);
 const newShell=withDesignTokensLink(applyHouseRibbon(prepared).html).replace('</body>',`<script src="/assets/am-refresh-v1.js?v=${day}" data-am-netday="${day}" defer></script></body>`);
 const current=existsSync(path)?readFileSync(path,'utf8'):newShell;
 const start=current.indexOf(START),end=current.indexOf(END,start);if(start<0||end<0)throw Error(`Nedostaje oznaka sadržaja: ${path}`);
 const next=current.slice(0,start)+sections(en)+current.slice(end+END.length);
 if(!existsSync(path)||next!==current){changed++;if(!check){mkdirSync(file,{recursive:true});writeFileSync(path,next)}}
}
for (const [relative,en] of [['apps/portal/index.html',false],['apps/portal/en/index.html',true],['apps/portal/gnk-aktual/index.html',false],['apps/portal/en/gnk-aktual/index.html',true]]) {
 const path=resolve(root,relative),current=readFileSync(path,'utf8');
 const marker='data-network-inventory-link="v1"';
 const target=en?'/en/mreza/izvori/':'/mreza/izvori/';
 const text=en?'Network websites and sources':'Popis webova i izvora mreže';
 if(!current.includes(marker)){
  if(!current.includes('</main>'))throw Error(`Nema main završetka: ${relative}`);
  changed++;if(!check)writeFileSync(path,current.replace('</main>',`<p ${marker}><a href="${target}">${text} →</a></p>\n</main>`));
 } else if(!current.includes(`href="${target}"`))throw Error(`Neispravna veza inventara: ${relative}`);
}
console.log(JSON.stringify({pages:2,entryPages:4,changed,check}));if(check&&changed)process.exitCode=1;
