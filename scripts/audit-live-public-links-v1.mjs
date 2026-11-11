#!/usr/bin/env node
/**
 * READ-ONLY production smoke audit: GET/HEAD only, no form submits or mutation.
 * Every city channel is checked; a deterministic sample of sitemap links and
 * top missing-static route candidates is checked over HTTPS.
 * 403/429/network blocks are INCONCLUSIVE, not proof of a broken link.
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT='artifacts/quality/live-link-probe-v1.json';
const SITE='https://gnk-asg.hr';
const summary=JSON.parse(fs.readFileSync('artifacts/quality/all-pages-link-audit-v1.json','utf8'));
const cities=JSON.parse(fs.readFileSync('apps/region/channels.json','utf8')).channels.map(x=>x.id);
const core=['/','/en/','/gnk-aktual/','/en/gnk-aktual/','/ai/hr/','/ai/','/izdanja/','/gnk-aktual/media/','/status/','/en/status/','/sitemap-index.xml','/assets/favicon.svg'];
const allLocal=[
 ...core,...cities.map(id=>'/kanal/'+id+'/'),
 ...summary.missingLocalTargets.filter(x=>x.kind==='page').slice(0,35).map(x=>x.target),
 ...summary.missingLocalTargets.filter(x=>x.kind!=='page').slice(0,18).map(x=>x.target)
];
const sitemap='apps/portal/sitemap.xml';
if(fs.existsSync(sitemap)){
 const xml=fs.readFileSync(sitemap,'utf8');
 const urls=[...xml.matchAll(/<loc>\s*(https:\/\/(?:www\.)?gnk-asg\.hr[^<]+)<\/loc>/g)].map(x=>x[1]);
 const step=Math.max(1,Math.floor(urls.length/45));
 for(let i=0;i<urls.length&&allLocal.length<220;i+=step)allLocal.push(new URL(urls[i]).pathname);
}
const routes=[...new Set(allLocal.map(x=>x.split('?')[0]))];
const rawExternal=[
 'https://gnk-asg-tjednik.pages.dev/',
 'https://www.bbc.com/',
 'https://www.theguardian.com/',
 'https://www.reuters.com/',
 'https://www.euronews.com/',
 'https://www.nasa.gov/',
 'https://www.esa.int/',
 'https://j1hex9qg03f0-d.space-z.ai/'
];
const external=rawExternal.filter((u,i)=>rawExternal.indexOf(u)===i);
const startedAt=new Date().toISOString();
async function probe(url,type){
 let state='unknown',status=null,finalUrl='',detail='';
 try{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),14000);
   try{
     const response=await fetch(url,{
       method:type==='external'?'HEAD':'GET',
       redirect:'follow',signal:controller.signal,
       headers:{'accept':type==='external'?'*/*':'text/html,application/xhtml+xml,application/xml,image/*;q=0.8,*/*;q=0.5',
                'user-agent':'GNK-ASG-public-link-health/1.0'}
     });
     status=response.status;finalUrl=response.url;
     if(response.status>=200&&response.status<400)state='ok';
     else if([401,403,405,406,408,409,425,429].includes(response.status))state='blocked';
     else if(response.status===404||response.status===410)state='broken';
     else if(response.status>=500)state='server_error';
     else state='unknown';
     // Read only a small body prefix: never fetch whole third-party articles.
     if(type==='internal'&&state==='ok'&&/text\/html/i.test(response.headers.get('content-type')||'')){
       const reader=response.body?.getReader();
       if(reader){
         const chunk=await reader.read();await reader.cancel().catch(()=>{});
         const snippet=new TextDecoder().decode(chunk.value||new Uint8Array());
         if(/<title>\s*(?:404|not found)|stranica nije pronađena/i.test(snippet)){state='soft_404';detail='soft 404 marker';}
       }
     }
   }finally{clearTimeout(timeout)}
 }catch(error){state='inconclusive';detail=String(error?.name||error).slice(0,100)}
 return {url,type,state,status,finalUrl:finalUrl||undefined,detail:detail||undefined};
}
const targets=[
 ...routes.map(p=>({url:SITE+p,type:'internal'})),
 ...external.map(url=>({url,type:'external'}))
];
let cursor=0;const results=[];
async function worker(){
 while(cursor<targets.length){
   const target=targets[cursor++];
   const result=await probe(target.url,target.type);results.push(result);
 }
}
await Promise.all(Array.from({length:6},()=>worker()));
results.sort((a,b)=>a.url.localeCompare(b.url));
const totals={checked:results.length,internal:routes.length,external:external.length};
for(const result of results)totals[result.state]=(totals[result.state]||0)+1;
const report={
 version:'GNK_ASG_PRODUCTION_LINK_PROBE_V1',startedAt,completedAt:new Date().toISOString(),
 scope:'Representative live HTTP checks for all 17 cities, key HR/EN pages, sampled sitemap URLs, high-frequency local route candidates and selected external origins',
 totals,results,limitations:[
  'NOT a complete live crawl of tens of thousands of pages; static script examines every HTML file',
  '403, 429 and network timeout can reflect bot protections, not broken links',
  'External-origin probes are not full deep-link checks',
  'No mail, forms, logins, private routes or production writes were executed'
 ]
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
const critical=results.filter(x=>['broken','soft_404','server_error'].includes(x.state)&&x.type==='internal');
const lines=['# Public production HTTP link audit','',
 'Probed '+totals.checked+' URLs ('+totals.internal+' internal, '+totals.external+' external).',
 'HTTP success: '+(totals.ok||0)+', broken/soft 404: '+((totals.broken||0)+(totals.soft_404||0))+
 ', server errors: '+(totals.server_error||0)+', blocked/inconclusive: '+((totals.blocked||0)+(totals.inconclusive||0)),
 '','## Actual HTTP failures, if any',
 ...critical.slice(0,75).map(x=>'- '+x.url+' — '+x.state+' '+(x.status||'')),
 '','## Network- or access-blocked URLs (inconclusive)',
 ...results.filter(x=>x.state==='blocked'||x.state==='inconclusive').slice(0,30).map(x=>'- '+x.url+' — '+x.state+' '+(x.status||'')),
 '','_This is a bounded production smoke test, not a full remote crawl. Read the JSON for individual results._'];
fs.writeFileSync(OUT.replace('.json','.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({totals,critical:critical.slice(0,40),blocked:results.filter(x=>x.state==='blocked').slice(0,15)},null,2));
if(critical.length)process.exitCode=1;
