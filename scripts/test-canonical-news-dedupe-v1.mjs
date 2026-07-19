import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 VERSION,
 newsItemSourceUrl,
 normalizeNewsUrl,
 normalizeCanonicalNewsItems
} from '../workers/gnk-asg-direct-operator/src/canonical-news-feed-v1.js';

assert.equal(VERSION,'GNK_ASG_CANONICAL_NEWS_FEED_V1_20260719_URL_DEDUPLICATION');
assert.equal(
 normalizeNewsUrl('https://Example.com/story/?utm_source=rss&b=2&a=1#section'),
 'https://example.com/story?a=1&b=2'
);
assert.equal(newsItemSourceUrl({sourceUrl:'https://source.example/a',url:'https://fallback.example/a'}),'https://source.example/a');

const items=[
 {id:'older-duplicate',title:'Older',url:'https://example.com/story/?utm_source=rss',published_at:'2026-07-18T10:00:00Z'},
 {id:'newer-duplicate',title:'Newer',sourceUrl:'https://example.com/story#top',published_at:'2026-07-19T10:00:00Z'},
 {id:'unique-b',title:'B',url:'https://example.com/b?z=2&y=1',published_at:'2026-07-19T09:00:00Z'},
 {id:'same-b-query-order',title:'B copy',url:'https://example.com/b?y=1&z=2',published_at:'2026-07-18T09:00:00Z'},
 {id:'invalid',title:'No URL',published_at:'2026-07-20T00:00:00Z'},
 {id:'unique-c',title:'C',href:'https://example.com/c',published_at:'2026-07-17T09:00:00Z'}
];

const normalized=normalizeCanonicalNewsItems(items,100);
assert.deepEqual(normalized.map(item=>item.id),['newer-duplicate','unique-b','unique-c']);
assert.equal(normalizeCanonicalNewsItems({items},2).length,2);
assert.equal(normalizeCanonicalNewsItems(items,0).length,0);

const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js','utf8');
assert.match(worker,/normalizeCanonicalNewsItems\(items,100\)/);
assert.match(worker,/canonical-normalized-feed-v3-assets-primary-url-deduped/);

const verifier=fs.readFileSync('scripts/verify-production-release-v38.sh','utf8');
assert.match(verifier,/canonical-normalized-feed-v3-assets-primary-url-deduped/);
assert.match(verifier,/duplicate canonical news URLs/);

console.log(JSON.stringify({
 ok:true,
 version:VERSION,
 input:items.length,
 output:normalized.length,
 retained:normalized.map(item=>item.id)
},null,2));
