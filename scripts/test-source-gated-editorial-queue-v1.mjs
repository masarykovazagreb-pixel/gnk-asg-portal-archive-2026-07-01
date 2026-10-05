import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const context=vm.createContext({URL});
vm.runInContext(read('apps/portal/assets/editorial-source-queue-v1.js'),context);
const adapter=context.GNKEditorialSourceQueue;
const manifest=JSON.parse(read('apps/portal/data/editorial-plan/manifest.json'));
const entry=manifest.reviewQueues.find(x=>x.schema===adapter.schema);
assert.equal(entry.publicationMode,'review-only');
assert.equal(entry.consumer,'/admin-center/editorial-approval/');
assert(!manifest.packages.some(x=>(x.files||[]).includes(entry.file)));
const queue=JSON.parse(read(`apps/portal/data/editorial-plan/${entry.file}`));
const rows=adapter.adapt(queue,entry.file);
assert.equal(rows.length,300);
assert.equal(rows.filter(x=>x.queueStatus==='source-review').length,120);
assert(rows.every(x=>adapter.blockers(x).length>0));
assert.throws(()=>adapter.adapt({...queue,schema:'unknown'},entry.file));
assert.throws(()=>adapter.adapt({...queue,items:[queue.items[0],queue.items[0]]},entry.file));
const ready={...rows[0],slug:'test-source-review',title:'Test',seoTitle:'Test SEO',summary:'Summary',metaDescription:'Description',
  body:['word '.repeat(3000)],image:'/assets/test.webp',internalLinks:['/a/','/b/','/c/','/d/','/e/'],
  sourceGate:{source_url:'https://example.org/source',original_link:'https://example.org/source',publisher:'Example',source_title:'Source',
    source_date:'2026-10-04',attribution:'Example publisher',verified_by:'Human reviewer',verified_at:'2026-10-05T04:00:00Z',verified_facts:['A checked fact'],source_hashtags:[]}};
assert.equal(adapter.blockers(ready).length,0);
assert(adapter.blockers({...ready,sourceGate:{...ready.sourceGate,source_url:'javascript:alert(1)'}}).length>0);
assert(adapter.blockers({...ready,queueStatus:'published'}).length>0);
assert(adapter.blockers({...ready,type:'foresight-scenario',scenario:{}}).length>0);

// Exercise the actual UI decision paths, including stale local approvals and batch/export.
const ui=read('apps/portal/assets/editorial-approval-v1.js');
const elements=new Map();
const node=()=>({textContent:'',innerHTML:'',checked:false,addEventListener(){}});
const document={querySelector:s=>{if(!elements.has(s))elements.set(s,node());return elements.get(s)},querySelectorAll:()=>[]};
const uiContext=vm.createContext({URL,GNKEditorialSourceQueue:adapter,document,localStorage:{setItem(){}},console});
vm.runInContext(ui.replace(/if\(document.readyState==='loading'\)[\s\S]*?else boot\(\);/,
  'globalThis.testApi={state,statusOf,setDecision,applyBatch,exportDecisions,boot};'),uiContext);
const api=uiContext.testApi;
api.state.data={items:[rows[0],ready],editor:{approvalLineTemplate:'Review required'}};
// Give the complete fixture a distinct ID.
ready.id='TEST-READY';
api.state.decisions[rows[0].id]={status:'approved'};
assert.equal(api.statusOf(rows[0].id),'pending');
api.setDecision(rows[0].id,'approved');
assert.equal(api.statusOf(rows[0].id),'pending');
api.setDecision(ready.id,'approved');
assert.equal(api.statusOf(ready.id),'approved');
ready.sourceGate.attribution='Changed source attribution';
assert.equal(api.statusOf(ready.id),'pending');
api.setDecision(ready.id,'approved');
document.querySelectorAll=s=>s==='.item-select:checked'?[{value:rows[0].id},{value:ready.id}]:[];
api.applyBatch('approved');
assert.equal(api.statusOf(rows[0].id),'pending');
let payload;
uiContext.Blob=class{constructor(parts){payload=JSON.parse(parts.join(''))}};
uiContext.URL={createObjectURL:()=>'/blob',revokeObjectURL(){}};
document.createElement=()=>({click(){}});
api.exportDecisions();
assert.equal(payload.publicationAuthorized,false);
assert.equal(payload.decisions[rows[0].id].status,'pending');
assert.deepEqual(payload.approvedItems,['TEST-READY']);
const html=read('apps/portal/admin-center/editorial-approval/index.html');
assert(html.indexOf('/assets/editorial-source-queue-v1.js')<html.indexOf('/assets/editorial-approval-v1.js'));
const requests=[];
const apiData={items:[],editor:{approvalLineTemplate:'Review required'},projects:[],publicationPolicy:{},approvalWindow:{start:'2026-10-05',end:'2026-10-06'}};
document.documentElement={dataset:{}};
uiContext.setInterval=()=>0;
uiContext.localStorage.getItem=()=>null;
uiContext.fetch=async url=>{requests.push(url);return {ok:true,json:async()=>url==='/api/editorial-approval/queue'?structuredClone(apiData):url.endsWith('manifest.json')?manifest:queue}};
await api.boot();
assert.equal(api.state.data.items.length,300);
assert.equal(requests[0],'/api/editorial-approval/queue');
assert.equal(requests.length,3);
assert.equal(document.documentElement.dataset.editorialApproval,'ready-v1');
assert(document.querySelector('#editorialList').innerHTML.includes('AK30-300'));
requests.length=0;
uiContext.fetch=async url=>{requests.push(url);return {ok:false,status:401}};
await api.boot();
assert.equal(requests.length,1);
assert.equal(document.documentElement.dataset.editorialApproval,'error');
console.log('Source-gated queue discovery, review, approval blocking and export: PASS');
