#!/usr/bin/env node
// Read-only AKTUAL production ledger audit. Does not publish or imply that GitHub == live.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
// UTC timestamps can belong to the following Zagreb calendar day.
const localDay = value => {
  if (typeof value !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value+'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===value ? value : null;
  }
  // Never guess the timezone of an ambiguous timestamp.
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));
  return parts.year+'-'+parts.month+'-'+parts.day;
};
if (process.argv.includes('--self-test')) {
  const cases = [
    ['2026-11-25T23:30:00Z','2026-11-26'],
    ['2026-07-25T22:30:00Z','2026-07-26'],
    ['2026-11-25T21:30:00Z','2026-11-25'],
    ['2026-11-25T00:10:00+01:00','2026-11-25'],
    ['2026-11-25','2026-11-25'],
    ['2026-02-30',null],
    ['2026-11-25T22:30:00',null],
    ['invalid',null]
  ];
  for (const [value, expected] of cases) if (localDay(value)!==expected) throw Error('Local day mismatch: '+value);
  console.log(JSON.stringify({ok:true,cases:cases.length})); process.exit(0);
}
const dateArg=process.argv.find(x=>x.startsWith('--date='))?.slice(7);
const date=dateArg||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
if(localDay(date)!==date)throw Error('Expected --date=YYYY-MM-DD');
const queue=read('content/factory-queue/queue.json');
const state=read('apps/portal/data/content-queue-state.json');
const registry=read('apps/portal/data/editorial-registry.json');
const items=queue.items||[];
const published=state.published||{};
const holds=read('apps/portal/data/editorial-plan/publication-holds.json');
const unique=new Set();
const released=[];
let invalidPublicationDates=0;
const queueById=new Map(items.map(item=>[item.id,item]));
const registryByPath=new Map((registry.items||[]).map(item=>[item.path,item]));
for(const [id,val] of Object.entries(published)){
  const item=queueById.get(id);
  if(!item||item.category!=='komentari')continue;
  const publishedAt=typeof val==='string'?val:(val?.at||val?.publishedAt||val?.date||'');
  const publicationDay=localDay(publishedAt);
  if (!publicationDay) { invalidPublicationDates++; continue; }
  if(publicationDay!==date)continue;
  const route='/komentari/'+item.slug+'/';
  if(unique.has(route))continue;
  unique.add(route);
  const exists=existsSync(resolve(root,'apps/portal'+route+'index.html'));
  const registryEntry=registryByPath.get(route);
  released.push({id,route,repositoryHtml:exists,registered:!!registryEntry,status:exists&&registryEntry?'REPO_READY_NOT_LIVE_VERIFIED':'INCOMPLETE'});
}
const due=items.filter(item=>item.category==='komentari'&&!Object.hasOwn(published,item.id)&&item.date<=date&&!(queue.skipped||[]).includes(item.id));
const report={
  schema:'AKTUAL_DAILY_PUBLICATION_SCORECARD_V1',
  date,timeZone:'Europe/Zagreb',goalDaily:10,
  totalQueueItems:items.length,queuePublishedIds:Object.keys(published).length,
  newlyDueComments:due.length,
  invalidPublicationDates,heldEntries:(holds.holds||[]).length,
  repoVerifiedComments:released.filter(x=>x.status==='REPO_READY_NOT_LIVE_VERIFIED').length,
  verifiedLiveComments:null,
  liveEvidenceRequired:'Independently fetch 200 HTTP pages, canonical URLs, image URLs, and production SHA before claiming LIVE.',
  comments:released,
  remainingToTarget:null,
  note:'No network access is made; output must never be presented as a live-publication count.'
};
console.log(JSON.stringify(report,null,2));
