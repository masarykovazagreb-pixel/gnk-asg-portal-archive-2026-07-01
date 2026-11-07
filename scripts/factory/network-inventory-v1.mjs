#!/usr/bin/env node
// Deterministički inventar konfiguracije; ne provjerava HTTP ni prava uporabe.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SITES } from '../../apps/sites/lib/registry.mjs';
import { WORLD_PORTALS } from '../../apps/world/lib/registry.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const channels=read('apps/region/channels.json').channels;
const world=read('config/world-sources-v1.json').countries;
const esc=x=>String(x??'').replace(/[\r\n|]/g,' ').trim();
const link=(name,url)=>{try { const u=new URL(url); if(!['http:','https:'].includes(u.protocol))return esc(name); return `[${esc(name)}](${u.href.replace(/\)/g,'%29')})`; } catch {return esc(name)}};
const rows=(items,fn)=>items.map(fn).join('\n');
let out=`# Inventar mreže i izvora — konfiguracija V1\n\nOvo je inventar iz datoteka repozitorija, ne dokaz dostupnosti, vlasništva, licence ili odobrenja objave. Podaci se mijenjaju s registrima; provjere prava i dostupnosti provode se zasebno.\n\nGlavne stranice: ${link('GNK ASG','https://gnk-asg.hr/')} · ${link('AKTUAL MEDIA','https://gnk-asg.hr/gnk-aktual/')} · ${link('mreža','https://gnk-asg.hr/mreza/')} · ${link('mreža EN','https://gnk-asg.hr/en/network/')}\n\n## Gradska izdanja (${channels.length})\n\n| Izdanje | Država | Jezik | Kanonska adresa |\n|---|---|---|---|\n`;
out+=rows(channels,c=>`| ${esc(c.city)} | ${esc(c.country)} | ${esc(c.lang)} | ${link(c.base,c.base)} |`);
out+=`\n\n## Samostalni svjetski portali (${WORLD_PORTALS.length})\n\n| Izdanje | Jezik | Konfigurirana adresa |\n|---|---|---|\n`+rows(WORLD_PORTALS,c=>`| ${esc(c.city)} | ${esc(c.lang)} | ${link(c.base,c.base)} |`);
out+=`\n\n## Samostalne stranice (${SITES.length})\n\n| Naziv | Jezik | Konfigurirana adresa |\n|---|---|---|\n`+rows(SITES,s=>`| ${esc(s.name)} | ${esc(s.lang)} | ${link(s.base,s.base)} |`);
out+=`\n\n## Sateliti\n\n`+[['AKTUAL ARHIVA','https://gnk-asg-arhiva.pages.dev/'],['AKTUAL DNEVNIK','https://gnk-asg-dnevnik.pages.dev/'],['AKTUAL MEDIA KANAL','https://gnk-asg-kanal.pages.dev/'],['BUSINESS TJEDNIK','https://gnk-asg-tjednik.pages.dev/']].map(([n,u])=>`- ${link(n,u)}`).join('\n');
out+=`\n\n## Izvori po gradskim izdanjima\n\nKonfigurirani feed nije dokaz dozvole za preuzimanje, komercijalnu uporabu ili prikaz sadržaja.\n`;
for(const c of channels){out+=`\n### ${esc(c.city)}\n\n`;for(const s of c.sources||[])out+=`- ${esc(s.name)} (${esc(s.type)}): ${(s.urls||[]).map(u=>link(u,u)).join(' · ') || 'adresa nije navedena'}\n`;}
out+=`\n## Kandidati svjetskih izvora i zabilježene odluke\n\nStatusi u nastavku preneseni su iz registra kandidata i mogu biti zastarjeli. Samo odobrenje vlasnika portala nije dokaz prava trećih strana.\n`;
for(const [code,c] of Object.entries(world).sort(([a],[b])=>a.localeCompare(b))){out+=`\n### ${esc(c.country)} (${esc(code)})\n\n`;if(!c.sources?.length)out+=`- Nema konfiguriranih kandidata. ${esc(c.status_note)}\n`;for(const s of c.sources||[])out+=`- ${link(s.name,s.url)} — status: **${esc(s.status||'nije naveden')}**; ${esc(s.reason||s.terms||'uvjeti nisu navedeni')}\n`;}
out+='\nIzvori podataka: `apps/region/channels.json`, `apps/world/lib/registry.mjs`, `apps/sites/lib/registry.mjs`, `config/world-sources-v1.json`.\n';
const file=resolve(root,'docs/factory/INVENTAR-MREZE-V1.md');
if(process.argv.includes('--check')){if(readFileSync(file,'utf8')!==out){console.error('Inventar ne odgovara registrima.');process.exitCode=1}else console.log('Inventar odgovara registrima.');}else {writeFileSync(file,out);console.log(`Inventar: ${channels.length} izdanja, ${WORLD_PORTALS.length} svjetskih portala, ${SITES.length} stranica.`)}
