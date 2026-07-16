import fs from 'node:fs';
import assert from 'node:assert/strict';

const news=JSON.parse(fs.readFileSync('apps/portal/data/news.json','utf8'));
assert.ok(Array.isArray(news)&&news.length>0,'expected non-empty news feed');
const item=news.find(entry=>{
 const id=String(entry?.id||'').trim();
 const url=String(entry?.url||entry?.sourceUrl||'').trim();
 const share=String(entry?.share_url||'').trim();
 return /^[a-z0-9]{10,40}$/i.test(id)&&/^https:\/\//i.test(url)&&share===`/podijeli/vijest/${id}/`;
});
assert.ok(item,'expected current news item with canonical source URL and matching share route');
assert.equal(item.share_url,`/podijeli/vijest/${item.id}/`);
assert.match(item.url,/^https:\/\//i);

const runtime=fs.readFileSync('apps/portal/assets/index-editorial-order-v6.js','utf8');
assert.match(runtime,/item\.sourceUrl\|\|item\.url\|\|item\.href\|\|item\.share_url/);
assert.doesNotMatch(runtime,/item\.href\|\|item\.sourceUrl\|\|item\.share_url\|\|item\.url/);

const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js','utf8');
assert.match(worker,/SHARE_ROUTE=\/\^\\\/podijeli\\\/vijest/);
assert.match(worker,/status:302/);
assert.match(worker,/location:target/);
assert.match(worker,/x-gnk-news-share':'source-redirect/);
assert.match(worker,/item\?\.sourceUrl\|\|item\?\.url\|\|item\?\.href/);

const shell=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js','utf8');
assert.match(shell,/index-editorial-order-v6\.js\?v=20260715-source-links-v2/);

console.log(JSON.stringify({
 ok:true,
 referenceId:item.id,
 sourceUrl:item.url,
 legacyShareRoute:item.share_url,
 cardTargetPriority:'sourceUrl-url-href-share_url',
 redirectStatus:302,
 cacheBust:'20260715-source-links-v2'
},null,2));
