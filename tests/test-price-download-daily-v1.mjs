import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEndpoint, validatePriceRows, fetchPrivate } from '../scripts/price-download-daily-v1.mjs';

test('API endpoint must be a private-key-safe HTTPS path at price.download',()=>{
  assert.equal(validateEndpoint('https://api.price.download/v1/prices'),'https://api.price.download/v1/prices');
  assert.throws(()=>validateEndpoint('http://price.download/v1/prices'));
  assert.throws(()=>validateEndpoint('https://elsewhere.example/v1/prices'));
  assert.throws(()=>validateEndpoint('https://price.download/v1/prices?key=secret'));
});
test('Never silently interpret an unknown provider payload',()=>{
  assert.throws(()=>validatePriceRows({data:[{price:4}]}), /SCHEMA_UNVERIFIED/);
  const rows=validatePriceRows({schema:'aktual-price-adapter-v1',items:[{
    id:'one',title:'Example',retailer:'Example retailer',price:2.5,
    currency:'EUR',observedAt:'2026-11-17T12:00:00Z',sourceUrl:'https://example.org/source'
  }]});
  assert.equal(rows.length,1);
  assert.equal(rows[0].price,2.5);
  assert.throws(()=>validatePriceRows({schema:'aktual-price-adapter-v1',items:[rows[0],rows[0]]}),/Invalid price row/);
});
test('Credentials sent only in request header, redirects rejected',async()=>{
  const received=[];
  const response=await fetchPrivate({
    endpoint:'https://api.price.download/v1/prices',apiKey:'dummy-not-real',
    fetchImpl:async(url,init)=>{
      received.push({url,init});
      return {ok:true,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify({schema:'aktual-price-adapter-v1',items:[]})};
    }
  });
  assert.equal(response.items.length,0);
  assert.equal(received[0].init.headers.Authorization,'Bearer dummy-not-real');
  assert.equal(received[0].init.redirect,'error');
  assert.ok(!received[0].url.includes('dummy-not-real'));
});

test('Reject false zero prices, credential-bearing URLs and future observation timestamps',()=>{
  const row={id:'one',title:'Example',retailer:'Example retailer',price:2.5,
    currency:'EUR',observedAt:'2026-11-17T12:00:00Z',sourceUrl:'https://example.org/source'};
  const check=(changes)=>validatePriceRows({schema:'aktual-price-adapter-v1',items:[{...row,...changes}]});
  for(const value of ['',null,'0','2.5',undefined,NaN,Infinity])
    assert.throws(()=>check({price:value}),/Invalid price row/,'price must be a finite number');
  for(const sourceUrl of [
    'https://user:password@example.org/source',
    'https://127.0.0.1/source',
    'https://service.local/source',
    'https://example.org/source#fragment'
  ]) assert.throws(()=>check({sourceUrl}),/Invalid price row/,'source URL must be safe for attribution');
  assert.throws(()=>check({observedAt:new Date(Date.now()+60*60_000).toISOString()}),/Invalid price row/);
  assert.throws(()=>check({observedAt:'November 17, 2026'}),/Invalid price row/);
  assert.deepEqual(check({price:0})[0].price,0,'actual numeric zero remains valid');
});
