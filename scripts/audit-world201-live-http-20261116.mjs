import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = 'https://gnk-asg.hr/world/';
const entries = readdirSync('apps/portal/world',{withFileTypes:true})
  .filter(d => d.isDirectory()).map(d => d.name).sort();
assert.equal(entries.length,201,'must have exactly 201 static world route directories');
const fetchOnce=async (url) => {
  for(let attempt=0;attempt<2;attempt++){
    try{
      const res=await fetch(url+(url.includes('?')?'&':'?')+'verify-world201='+process.env.GITHUB_RUN_ID, {
        signal:AbortSignal.timeout(18000),headers:{'Cache-Control':'no-cache','Accept':'text/html'},redirect:'follow'
      });
      return {status:res.status,body:await res.text(),finalUrl:res.url};
    }catch(e){if(attempt===1)throw e;await new Promise(resolve=>setTimeout(resolve,600));}
  }
};
const top=await fetchOnce(base);
assert.equal(top.status,200,'index HTTP status');
assert.match(top.body,/<title>AKTUAL MEDIA WORLD/,'index title');
const matches=[...top.body.matchAll(/class="tile" data-key="[^"]+" href="\/world\/[^"]+\/"/g)];
assert.equal(matches.length,201,'index public tile count');
const errors=[], successes=[];
let next=0;
async function worker(){
  for(;;){
    const i=next++;if(i>=entries.length)return;
    const slug=entries[i];
    const url=base+encodeURIComponent(slug)+'/';
    try{
      const res=await fetchOnce(url);
      if(res.status!==200)throw Error('HTTP '+res.status);
      if(!res.body.includes('<title>')||!res.body.includes('AKTUAL MEDIA WORLD'))throw Error('missing WORLD title');
      if(!res.body.includes('rel="canonical"')||!res.body.includes('/world/'+slug+'/'))throw Error('canonical absent');
      if(!res.body.includes('name="robots" content="noindex,follow"'))throw Error('unexpected indexing policy');
      successes.push(slug);
    }catch(e){errors.push({slug,error:String(e.message).slice(0,140)});}
  }
}
await Promise.all(Array.from({length:8},worker));
const report={ok:errors.length===0,total:entries.length,verified:successes.length,errors:errors.slice(0,25),liveIndex:top.status,run:process.env.GITHUB_RUN_ID||null};
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
