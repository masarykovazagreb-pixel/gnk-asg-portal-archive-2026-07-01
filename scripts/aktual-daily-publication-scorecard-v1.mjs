#!/usr/bin/env node
// Read-only AKTUAL production ledger audit. Does not publish or imply that GitHub == live.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const dateArg=process.argv.find(x=>x.startsWith('--date='))?.slice(7);
const date=dateArg||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Expected --date=YYYY-MM-DD');
const queue=read('content/factory-queue/queue.json');
const state=read('apps/portal/data/content-queue-state.json');
const registry=read('apps/portal/data/editorial-registry.json');
const items=queue.items||[];
const published=state.published||{};
const holds=read('apps/portal/data/editorial-plan/publication-holds.json');
const unique=new Set();
const released=[];
for(const [id,val] of Object.entries(published)){
  const item=items.find(q=>q.id===id);
  if(!item||item.category!=='komentari')continue;
  const publishedAt=typeof val==='string'?val:(val?.at||val?.publishedAt||val?.date||'');
  const publicationDay=publishedAt.slice(0,10);
  if(publicationDay!==date)continue;
  const route='/komentari/'+item.slug+'/';
  if(unique.has(route))continue;
  unique.add(route);
  const exists=existsSync(resolve(root,'apps/portal'+route+'index.html'));
  const registryEntry=(registry.items||[]).find(e=>e.path===route);
  released.push({id,route,repositoryHtml:exists,registered:!!registryEntry,status:exists&&registryEntry?'REPO_READY_NOT_LIVE_VERIFIED':'INCOMPLETE'});
}
const due=items.filter(item=>item.category==='komentari'&&!Object.hasOwn(published,item.id)&&item.date<=date&&!(queue.skipped||[]).includes(item.id));
const report={
  schema:'AKTUAL_DAILY_PUBLICATION_SCORECARD_V1',
  date,timeZone:'Europe/Zagreb',goalDaily:10,
  totalQueueItems:items.length,queuePublishedIds:Object.keys(published).length,
  newlyDueComments:due.length,heldEntries:(holds.holds||[]).length,
  repoVerifiedComments:released.filter(x=>x.status==='REPO_READY_NOT_LIVE_VERIFIED').length,
  verifiedLiveComments:null,
  liveEvidenceRequired:'Independently fetch 200 HTTP pages, canonical URLs, image URLs, and production SHA before claiming LIVE.',
  comments:released,
  remainingToTarget:null,
  note:'No network access is made; output must never be presented as a live-publication count.'
};
console.log(JSON.stringify(report,null,2));
