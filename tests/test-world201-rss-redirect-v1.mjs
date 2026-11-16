import test from 'node:test';
import assert from 'node:assert/strict';
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
