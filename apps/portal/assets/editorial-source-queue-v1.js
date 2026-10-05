/* Shared adapter for review-only source-gated plans. No publishing side effects. */
(()=>{
'use strict';
const SCHEMA='gnk-asg-source-gated-editorial-queue/v1';
const TYPES=new Set(['source-linked-media-commentary','expert-analysis','foresight-scenario','aktual-channel-brief','projects-gnkc-workforce']);
const text=value=>typeof value==='string'&&value.trim().length>0;
const http=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password}catch{return false}};
function blockers(item){
  const errors=[];
  if(!['draft','source-review','approved-for-own-site'].includes(item.queueStatus)) errors.push('Stavka nije nacrt za odobravanje.');
  if(!text(item.slug)||!/^[a-z0-9-]+$/.test(item.slug)) errors.push('Nedostaje valjan slug.');
  for(const key of ['title','seoTitle','metaDescription','summary']) if(!text(item[key])) errors.push(`Nedostaje ${key}.`);
  const words=(item.body||[]).join(' ').match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu)||[];
  if(words.length<3000) errors.push('Nacrt nema najmanje 3000 riječi.');
  if(new Set((item.internalLinks||[]).filter(x=>typeof x==='string'&&x.startsWith('/')&&!x.startsWith('//'))).size<5) errors.push('Nedostaje pet internih poveznica.');
  if(!text(item.image)||!item.image.startsWith('/')||item.image.startsWith('//')) errors.push('Nedostaje lokalna slika.');
  const gate=item.sourceGate||{};
  if(!http(gate.source_url)||!http(gate.original_link)) errors.push('Nedostaje valjana izvorna poveznica.');
  for(const key of ['publisher','source_title','source_date','attribution','verified_by','verified_at']) if(!text(gate[key])) errors.push(`Nedostaje provjera izvora: ${key}.`);
  if(!Number.isFinite(Date.parse(gate.source_date))||!Number.isFinite(Date.parse(gate.verified_at))) errors.push('Datumi izvora i provjere nisu valjani.');
  if(!Array.isArray(gate.verified_facts)||!gate.verified_facts.length||!gate.verified_facts.every(text)) errors.push('Nedostaju provjerene činjenice.');
  if(item.type==='source-linked-media-commentary'&&(!Array.isArray(gate.source_hashtags)||!gate.source_hashtags.every(text))) errors.push('Evidentirajte izvorne hashtagove; prazan niz znači da ih izvor nema.');
  if(item.type==='foresight-scenario'){
    const s=item.scenario||{};
    if(s.label!=='SCENARIJ — nije prognoza ni činjenica') errors.push('Nedostaje oznaka scenarija.');
    for(const key of ['assumptions','evidence_basis','risks','falsification_conditions']) if(!Array.isArray(s[key])||!s[key].length||!s[key].every(text)) errors.push(`Nedostaje ${key}.`);
  }
  return errors;
}
function adapt(queue,file){
  if(queue?.schema!==SCHEMA||!Array.isArray(queue.items)) throw new Error('Nepodržana shema uredničkog reda.');
  const ids=new Set();
  return queue.items.map(item=>{
    if(!text(item.id)||ids.has(item.id)||!TYPES.has(item.type)||!queue.allowed_statuses?.includes(item.status)) throw new Error('Nevaljana ili duplicirana stavka uredničkog reda.');
    ids.add(item.id);
    return {...item,sourceQueue:file,queueStatus:item.status,sourceGate:item.source_gate||{},
      title:item.title||item.working_topic,topic:`${item.date} · ${item.slot}`,summary:item.summary||`Planirana jedinica · ${item.status}`,
      body:Array.isArray(item.paragraphs)?item.paragraphs:[],internalLinks:Array.isArray(item.links)?item.links:[],
      metaDescription:item.description||'',keywords:Array.isArray(item.keywords)?item.keywords:[]};
  });
}
globalThis.GNKEditorialSourceQueue=Object.freeze({schema:SCHEMA,adapt,blockers});
})();
