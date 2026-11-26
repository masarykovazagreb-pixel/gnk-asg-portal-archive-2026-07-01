import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { safeUrl, fetchFeedXml } from '../scripts/lib/aktual-world-feed-http-v1.mjs';

const validRss='<rss version="2.0"><channel><title>Example</title></channel></rss>';
test('HTTPS RSS fetch works with no redirects', async () => {
  const xml=await fetchFeedXml('https://news.example.org/rss',{fetchImpl:async()=>new Response(validRss,{status:200,headers:{'content-type':'text/xml'}})});
  assert.equal(xml,validRss);
});
test('follows at most two safe HTTPS redirects including a relative Location', async () => {
  const visited=[];
  const fetchImpl=async url=>{
    visited.push(url);
    if(visited.length===1) return new Response(null,{status:301,headers:{location:'/feeds/new.xml'}});
    if(visited.length===2) return new Response(null,{status:302,headers:{location:'https://cdn.example.org/feed.xml'}});
    return new Response(validRss,{status:200});
  };
  assert.equal(await fetchFeedXml('https://news.example.org/rss',{fetchImpl}),validRss);
  assert.deepEqual(visited,[
    'https://news.example.org/rss',
    'https://news.example.org/feeds/new.xml',
    'https://cdn.example.org/feed.xml'
  ]);
});
test('rejects redirects to insecure or private endpoints', async () => {
  for(const location of ['http://public.example.org/rss','https://127.0.0.1/rss','https://user:secret@example.org/rss','https://localhost/rss']){
    await assert.rejects(fetchFeedXml('https://news.example.org/rss',{
      fetchImpl:async()=>new Response(null,{status:302,headers:{location}})
    }),/unsafe/);
  }
  assert.equal(safeUrl('http://news.example.org/rss'),'');
  assert.equal(safeUrl('https://127.0.0.1/rss'),'');
});
test('rejects loops, excess redirects, oversized and non-RSS bodies', async () => {
  await assert.rejects(fetchFeedXml('https://news.example.org/rss',{
    fetchImpl:async()=>new Response(null,{status:302,headers:{location:'/rss'}})
  }),/loop/);
  await assert.rejects(fetchFeedXml('https://news.example.org/rss',{
    fetchImpl:async url=>new Response(null,{status:302,headers:{location:url.replace('rss','rss2')}})
  }),/limit/);
  await assert.rejects(fetchFeedXml('https://news.example.org/rss',{
    fetchImpl:async()=>new Response('<html>Not a feed</html>',{status:200})
  }),/not RSS/);
  await assert.rejects(fetchFeedXml('https://news.example.org/rss',{
    fetchImpl:async()=>new Response(validRss,{status:200,headers:{'content-length':'800001'}})
  }),/800 KB/);
});
test('transient failures retry once without bypassing server backoff',async()=>{
  const waits=[], sleep=async ms=>waits.push(ms);let count=0;
  const xml=await fetchFeedXml('https://news.example.org/rss',{sleep,fetchImpl:async()=>{
    count++;return count===1?new Response(null,{status:503,headers:{'retry-after':'1'}}):new Response(validRss,{status:200});
  }});
  assert.equal(xml,validRss);assert.equal(count,2);assert.deepEqual(waits,[1000]);
  count=0;await assert.rejects(fetchFeedXml('https://news.example.org/rss',{sleep,fetchImpl:async()=>{count++;return new Response(null,{status:429,headers:{'retry-after':'60'}});}}),/HTTP 429/);assert.equal(count,1);
  count=0;await assert.rejects(fetchFeedXml('https://news.example.org/rss',{sleep,fetchImpl:async()=>{count++;return new Response(null,{status:403});}}),/HTTP 403/);assert.equal(count,1);
  count=0;await assert.rejects(fetchFeedXml('https://news.example.org/rss',{sleep,fetchImpl:async()=>{count++;throw Error('network');}}),/network/);assert.equal(count,2);
});
test('limits streamed response by bytes and cancels it rather than buffering indefinitely',async()=>{
  let cancelled=false;
  const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('é'.repeat(30)));controller.enqueue(new TextEncoder().encode('more'));},cancel(){cancelled=true;}});
  await assert.rejects(fetchFeedXml('https://news.example.org/rss',{maxBytes:50,fetchImpl:async()=>new Response(stream,{status:200})}),/800 KB/);
  assert.equal(cancelled,true);
  await assert.rejects(fetchFeedXml('https://news.example.org/rss',{maxBytes:15,fetchImpl:async()=>({ok:true,status:200,headers:{get:()=>null},text:async()=>'<rss>éééé</rss>'})}),/800 KB/);
});
test('refresh workflow saves diagnostic artifacts and reports push and PR failures separately',()=>{
 const workflow=fs.readFileSync('.github/workflows/aktual-world-source-refresh-v1.yml','utf8');
 assert.match(workflow,/vars\.GNK_ASG_RELEASE_FENCE != 'true'/);
 assert.match(workflow,/AKTUAL_WORLD_RUN_REPORT: \$\{\{ runner\.temp \}\}\/world-refresh-run\.json/);
 assert.match(workflow,/!cancelled\(\) && steps\.fetch_headlines\.outcome != 'skipped'/);
 assert.ok(workflow.indexOf('Save update patch for recovery')<workflow.indexOf('Push source-update branch'));
 assert.ok(workflow.indexOf('Push source-update branch')<workflow.indexOf('Open source-update PR'));
 assert.match(workflow,/GITHUB_RUN_ID}-\$\{GITHUB_RUN_ATTEMPT}/);
 assert.doesNotMatch(workflow,/gh pr merge|--auto/);
});
