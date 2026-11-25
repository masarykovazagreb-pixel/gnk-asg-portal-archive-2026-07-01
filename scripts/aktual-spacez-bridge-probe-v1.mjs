#!/usr/bin/env node
/**
 * Space-Z workspace export: read-only partner API bridge probe.
 * Never publishes, sends secrets, imports source text/photos, or asserts editorial verification.
 * Partner API currently emits historical Surge URLs: retain as unverified provenance, do not rewrite.
 * Usage: node scripts/aktual-spacez-bridge-probe-v1.mjs [--self-test]
 */
import assert from 'node:assert/strict';
const SPACE = 'https://j1hex9qg03f0-d.space-z.ai';
const OLD = 'https://aktual-media.surge.sh';
const MAX_BYTES = 2_000_000;
const trim=(x,n)=>typeof x==='string'?x.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
export function candidates(payload) {
  if(payload?.ok!==true || !Array.isArray(payload.articles) || payload.articles.length>20) throw Error('Invalid partner article envelope');
  const seen=new Set(), out=[];
  for(const a of payload.articles){
    const id=trim(a?.id,120), title=trim(a?.title,200), date=trim(a?.publishedAt,50);
    if(!/^[a-zA-Z0-9_-]{1,120}$/.test(id)||title.length<10||seen.has(id))continue;
    const stamp=Date.parse(date);
    if(!Number.isFinite(stamp)||stamp>Date.now()+300000)continue;
    let u;try{u=new URL(a.url)}catch{continue}
    if(![SPACE,OLD].includes(u.origin)||u.username||u.password||u.pathname!=='/article/'+id||u.search||u.hash)continue;
    seen.add(id);
    out.push({externalId:'spacez:'+id,title,sourceUrl:u.href,sourceHost:u.hostname,publishedAt:new Date(stamp).toISOString(),country:trim(a.country,70),topic:trim(a.topic,70),language:trim(a.language,12),status:'RESEARCH_CANDIDATE',sourceUrlVerified:false,independentFactCheck:false,imageRightsVerified:false,editorApproved:false,publicUrl:null});
  }
  return out;
}
async function jsonFrom(path,fetcher=fetch){
  const r=await fetcher(SPACE+path,{method:'GET',redirect:'error',headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('Partner HTTP '+r.status);
  if(!/^application\/(?:json|[^;]+\+json)\b/i.test(r.headers.get('content-type')||''))throw Error('Partner did not return JSON');
  if(Number(r.headers.get('content-length'))>MAX_BYTES)throw Error('Partner response too large');
  if(!r.body)throw Error('Partner empty body');
  const reader=r.body.getReader(), decoder=new TextDecoder('utf-8',{fatal:true});
  let bytes=0, body='';
  try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_BYTES)throw Error('Partner response too large');body+=decoder.decode(value,{stream:true});}body+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
  return JSON.parse(body);
}
async function main(){
  if(process.argv.includes('--self-test')){
    const fixture={ok:true,articles:[{id:'test1',title:'Dovoljno dug naslov vijesti',url:OLD+'/article/test1',publishedAt:'2025-01-01T12:00:00Z',body:'UNTRUSTED',imageUrl:'https://example.invalid/asset.jpg'}]};
    const result=candidates(fixture);assert.equal(result.length,1);assert.equal(result[0].status,'RESEARCH_CANDIDATE');assert.equal(result[0].editorApproved,false);assert.equal(result[0].sourceUrlVerified,false);assert.equal(result[0].publicUrl,null);assert.ok(!('body'in result[0]));assert.ok(!('imageUrl'in result[0]));assert.equal(candidates({ok:true,articles:[...fixture.articles,...fixture.articles]}).length,1);
    assert.equal(candidates({ok:true,articles:[{...fixture.articles[0],url:'https://example.invalid/article/test1'}]}).length,0);
    assert.throws(()=>candidates({ok:false,articles:[]}));
    const fake=async()=>new Response(JSON.stringify(fixture),{headers:{'content-type':'application/json'}});
    assert.equal((await jsonFrom('/api/v1/articles?limit=20',fake)).articles.length,1);
    await assert.rejects(()=>jsonFrom('/api/health',async()=>new Response('html',{headers:{'content-type':'text/html'}})));
    console.log('PASS: Space-Z bridge read-only contract, fixture only; live network not tested');return;
  }
  const health=await jsonFrom('/api/health');
  if(health?.status!=='ok')throw Error('Partner health not OK');
  const payload=await jsonFrom('/api/v1/articles?limit=20');
  const items=candidates(payload);
  console.log(JSON.stringify({ok:true,status:'READ_ONLY_RESEARCH_CANDIDATES',origin:SPACE,observedAt:new Date().toISOString(),candidateCount:items.length,publications:0,items},null,2));
}
main().catch(e=>{console.error(JSON.stringify({ok:false,status:'BLOCKED',publications:0,error:trim(e.message,200)}));process.exitCode=1;});
