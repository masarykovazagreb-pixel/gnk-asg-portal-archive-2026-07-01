#!/usr/bin/env node
import {readFileSync} from 'node:fs';import {resolve,dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const rx=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function checkHubCounts(html,channels,counts,lang){
 const errors=[],total=counts.reduce((n,c)=>n+c.count,0),fmt=n=>new Intl.NumberFormat('hr-HR').format(n);const one=(r,msg)=>{if(!r.test(html))errors.push(msg)};
 one(new RegExp(`<p class="amm-count"><b>${rx(fmt(total))}</b>`),'zbroj na karti');one(new RegExp(`<h2 id="amcTitle">[^<]*${rx(new Intl.NumberFormat(lang==='en'?'en-US':'hr-HR').format(total))}[^<]*</h2>`),'zbroj u naslovu');
 const mastWord=lang==='en'?'texts':'tekstova', archiveWord=lang==='en'?'texts in the archive':'tekstova u arhivi';
 one(new RegExp(`<div class="am-mast-side right">AKTUAL MEDIA DESK<br>${rx(fmt(total))} ${mastWord} `),'zbroj u zaglavlju');
 one(new RegExp(`<ul class="amh-stats"><li><b>${rx(fmt(total))}</b><span>${archiveWord}</span>`),'zbroj u hero traci');
 const zagreb=counts.find(c=>c.id==='zagreb');
 if(zagreb) one(new RegExp(`<a href="/kanal/zagreb/"><b>Zagreb</b><i>${lang==='en'?'Croatia':'Hrvatska'} · ${zagreb.count} ${lang==='en'?'stories':'tekstova'}</i></a>`),'Zagreb u najavi');
 for(const c of channels){const x=counts.find(y=>y.id===c.id);if(!x){errors.push(`nedostaju brojevi ${c.id}`);continue}const w=lang==='en'?'stories':'tekstova';one(new RegExp(`<a class="amx-link" href="${rx(c.base)}"[^>]*aria-label="[^"]* — ${x.count} ${w} —`),`krug ${c.id}`)}
 const pins=[...html.matchAll(/<a class="amm-pin" href="([^"]+)"[^>]*aria-label="[^"]* — (\d+) (?:tekstova|stories) —/g)];if(pins.length!==8)errors.push('broj oznaka na karti');for(const [,href,n] of pins){let c=channels.find(x=>x.base===href);if(!c||counts.find(x=>x.id===c.id)?.count!==Number(n))errors.push(`oznaka karte ${href}`)}return errors;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{let channels=JSON.parse(readFileSync(join(ROOT,'apps/region/channels.json'))).channels,counts=JSON.parse(readFileSync(join(ROOT,'apps/portal/data/network-counts-v1.json'))).channels;let errors=[];for(const [path,lang] of [['apps/portal/gnk-aktual/index.html','hr'],['apps/portal/en/gnk-aktual/index.html','en']])errors.push(...checkHubCounts(readFileSync(join(ROOT,path),'utf8'),channels,counts,lang).map(e=>`${lang}: ${e}`));if(errors.length)throw Error(errors.join('\n'));console.log('Brojke huba HR/EN su usklađene.')}catch(e){console.error(e.message);process.exitCode=1}}
