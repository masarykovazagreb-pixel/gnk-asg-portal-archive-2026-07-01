import {readFile,writeFile} from 'node:fs/promises';
const input=process.argv[2];
if(!input) throw Error('Usage: node refresh-source-headlines.mjs <news.json>');
const target=new URL('../src/index.mjs',import.meta.url);
const raw=JSON.parse(await readFile(input,'utf8'));
if(!Array.isArray(raw)) throw Error('Expected news array');
const seen=new Set(), titles=new Set(), rows=[];
for(const x of raw){
 if(typeof x.title!=='string'||typeof x.source!=='string')continue;
 let u;try{u=new URL(x.url)}catch{continue}
 if(u.protocol!=='https:'||u.username||u.password)continue;
 u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_/i.test(k)||['fbclid','gclid'].includes(k))u.searchParams.delete(k);
 const date=Date.parse(x.publishedAt||x.published_at);
 if(!Number.isFinite(date)||date<Date.now()-72*3600000||date>Date.now()+300000)continue;
 const title=x.title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 if(!title||seen.has(u.href)||titles.has(title))continue;
 seen.add(u.href);titles.add(title);
 rows.push({title:x.title,url:u.href,source:x.source,date:new Date(date).toISOString()});
}
if(rows.length<50)throw Error('Insufficient fresh headlines; preserving previous snapshot');
const old=await readFile(target,'utf8');
const marker=/^const legacyHeadlines=.*;$/m;
if(!marker.test(old))throw Error('Snapshot marker missing');
const next=old.replace(marker,()=> 'const legacyHeadlines='+JSON.stringify(rows.slice(0,300))+';');
new Function(next.replace(/^import .*$/gm,'').replace(/^export default /gm,'return ').replace(/^export /gm,''));
if(next!==old)await writeFile(target,next);
console.log(JSON.stringify({count:Math.min(rows.length,300),changed:next!==old}));
