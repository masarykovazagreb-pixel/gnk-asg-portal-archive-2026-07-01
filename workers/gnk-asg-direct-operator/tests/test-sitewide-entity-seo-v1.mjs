import assert from 'node:assert/strict';
import {enhancePublicEntitySeo,VERSION} from '../src/sitewide-entity-seo-v1.js';

const html='<!doctype html><html><head><title>Tržišta</title><link rel="canonical" href="https://gnk-asg.hr/markets/"><meta property="og:image" content="https://gnk-asg.hr/assets/market.webp"></head><body><main>Tržišta</main></body></html>';
const request=new Request('https://gnk-asg.hr/markets/');
const response=new Response(html,{status:200,headers:{'content-type':'text/html'}});
const enriched=await enhancePublicEntitySeo(response,request);
const body=await enriched.text();
assert.equal(enriched.headers.get('x-gnk-entity-seo'),VERSION);
assert.match(body,/Nermin Sefi(?:ć|c)/);
assert.match(body,/GNK ASG d\.o\.o\./);
assert.match(body,/GNK DINAMO Ltd\./);
assert.match(body,/https:\/\/gnk-asg\.hr\/markets\//);
assert.match(body,/og:image:alt/);
assert.match(body,/ImageObject/);
assert.match(body,/data-gnk-entity-seo="v1"/);

const english=await enhancePublicEntitySeo(new Response(html.replace('https://gnk-asg.hr/markets/','https://gnk-asg.hr/en/markets/'),{headers:{'content-type':'text/html'}}),new Request('https://gnk-asg.hr/en/markets/'));
assert.match(await english.text(),/https:\/\/gnk-asg\.hr\/en\/markets\//);

const noindexHtml='<!doctype html><html><head><meta name="robots" content="noindex,follow"></head><body>private</body></html>';
const noindex=await enhancePublicEntitySeo(new Response(noindexHtml,{headers:{'content-type':'text/html'}}),new Request('https://gnk-asg.hr/private/'));
assert.equal(await noindex.text(),noindexHtml);
assert.equal(noindex.headers.get('x-gnk-entity-seo'),null);

const json='{"ok":true}';
const api=await enhancePublicEntitySeo(new Response(json,{headers:{'content-type':'application/json'}}),new Request('https://gnk-asg.hr/api/test'));
assert.equal(await api.text(),json);
assert.equal(api.headers.get('x-gnk-entity-seo'),null);

console.log(JSON.stringify({ok:true,version:VERSION}));
