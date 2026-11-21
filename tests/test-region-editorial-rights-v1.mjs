#!/usr/bin/env node
/**
 * Source-quoting and image-rights invariant after the regional generator.
 * A proxy URL provides technical access, NOT copyright or media rights.
 * Sample the generated Beograd edition (same generator drives 17 cities).
 */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
const channel=process.argv.includes('--channel')?process.argv[process.argv.indexOf('--channel')+1]:'beograd';
assert(/^[a-z]+$/.test(channel),'invalid channel');
const base=join(ROOT,'apps/portal/kanal',channel,'clanak');
const registry=JSON.parse(readFileSync(join(ROOT,'apps/region/image-photo-rights-v1.json'),'utf8'));
assert.equal(registry.schema_version,'AKTUAL_REGION_IMAGE_RIGHTS_V1');
assert(Array.isArray(registry.approved_images));
const dirList=readdirSync(base).sort().filter(n=>statSync(join(base,n)).isDirectory());
assert(dirList.length>=1,'no generated articles to inspect');
let checked=0;
for(const slug of dirList.slice(0,20)){
 const html=readFileSync(join(base,slug,'index.html'),'utf8');
 assert(html.includes('class="artimg"'),'article must show visual illustration or licensed photograph');
 const match=html.match(/<section class="quote">[\s\S]*?<blockquote>([\s\S]*?)<\/blockquote>/);
 assert(match,'source quote block missing');
 const quote=match[1].replace(/<[^>]+>/g,'');
 assert((quote.match(/\S+/g)||[]).length<=20, 'source quote exceeds 20 words');
 assert(!quote.includes('\uFFFD'),'corrupt quote characters');
 if(registry.approved_images.length===0){
  assert(!html.includes('/api/img?u='),'unlicensed external RSS photography exposed');
  assert(html.includes('/assets/desk/art/'),'branded local illustration missing');
  assert(html.includes('AKTUAL MEDIA</figcaption>'),'local illustration attribution missing');
 }
 assert(html.includes('rel="external noopener nofollow"'),'source link missing');
 checked+=1;
}
console.log(JSON.stringify({channel,checked,licensedExternalImages:registry.approved_images.length,sourceQuoteWordsMax:20,ok:true}));
