import assert from 'node:assert/strict';
import {servePublicTechRadar,loadTechRadar,MAX_ITEMS,REFRESH_SECONDS} from '../src/public-tech-radar-v1.js';

const originalFetch=globalThis.fetch;
const originalCaches=globalThis.caches;
const cache=new Map();
globalThis.caches={default:{async match(request){return cache.get(request.url)?.clone()||null;},async put(request,response){cache.set(request.url,response.clone());}}};
let calls=0;
globalThis.fetch=async url=>{
 calls++;
 const u=new URL(url);
 const query=u.searchParams.get('query')||'technology';
 const hits=Array.from({length:40},(_,i)=>({objectID:`${query}-${i}`,title:`${query} story ${i}`,url:`https://example.com/${encodeURIComponent(query)}/${i}`,created_at:new Date(Date.now()-i*60000).toISOString(),points:40-i,num_comments:i,author:'tester'}));
 return new Response(JSON.stringify({hits}),{status:200,headers:{'content-type':'application/json'}});
};

try{
 const items=await loadTechRadar();
 assert.ok(items.length>0);
 assert.ok(items.length<=MAX_ITEMS);
 assert.ok(items.every(item=>item.subcategory&&item.group));
 const request=new Request('https://gnk-asg.hr/api/public-tech-radar');
 const first=await servePublicTechRadar(request);
 assert.equal(first.status,200);
 const payload=await first.json();
 assert.equal(payload.persistent_storage,false);
 assert.equal(payload.refresh_seconds,REFRESH_SECONDS);
 assert.ok(payload.total<=200);
 const before=calls;
 const second=await servePublicTechRadar(request);
 assert.equal(second.headers.get('x-gnk-cache'),'hit');
 assert.equal(calls,before);
 console.log('public tech radar contract: ok');
}finally{
 globalThis.fetch=originalFetch;
 globalThis.caches=originalCaches;
}
