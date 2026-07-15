import fs from 'node:fs';
import assert from 'node:assert/strict';

const news=JSON.parse(fs.readFileSync('apps/portal/data/news.json','utf8'));
const item=news.find(entry=>entry.id==='19fa99e0723490d640');
assert.ok(item,'expected reference news item');
assert.equal(item.share_url,'/podijeli/vijest/19fa99e0723490d640/');
assert.match(item.url,/^https:\/\/www\.theverge\.com\/policy\//);

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
