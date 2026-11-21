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
