import fs from 'node:fs';
import assert from 'node:assert/strict';
import {editorialAssetPath,servePublicEditorialAsset,EDITORIAL_ROOTS,VERSION} from '../workers/gnk-asg-direct-operator/src/public-editorial-asset-router-v1.js';

const cases=new Map([
 ['/objave','/objave/index.html'],
 ['/objave/','/objave/index.html'],
 ['/objave/globalne-kamatne-stope-nakon-inflacijskog-soka','/objave/globalne-kamatne-stope-nakon-inflacijskog-soka/index.html'],
 ['/komentari/brzina-bez-kontrole-nije-inovacija','/komentari/brzina-bez-kontrole-nije-inovacija/index.html'],
 ['/analize','/analize/index.html'],
 ['/en/publications','/en/publications/index.html'],
 ['/en/commentary/innovation-without-trust-is-not-progress','/en/commentary/innovation-without-trust-is-not-progress/index.html'],
 ['/en/analyses','/en/analyses/index.html']
]);
for(const[path,expected]of cases)assert.equal(editorialAssetPath(path.replace(/\/+$/,'')||'/'),expected,path);
for(const path of ['/api/public-news','/objave/a/b','/objave/../admin','/komentari/a.html','/en/publications/a/b'])assert.equal(editorialAssetPath(path),'',path);
assert.deepEqual(EDITORIAL_ROOTS,[ '/objave','/komentari','/analize','/en/publications','/en/commentary','/en/analyses' ]);

const seen=[];
const env={ASSETS:{async fetch(request){
 const url=new URL(request.url);seen.push({path:url.pathname,method:request.method});
 const local=`apps/portal${url.pathname}`;
 if(!fs.existsSync(local))return new Response('missing',{status:404,headers:{'content-type':'text/plain'}});
 return new Response(request.method==='HEAD'?null:fs.readFileSync(local),{status:200,headers:{'content-type':'text/html','etag':'old','content-length':'10'}});
}}};
for(const [path,assetPath] of cases){
 const response=await servePublicEditorialAsset(new Request(`https://gnk-asg.hr${path}`,{method:'GET'}),env,'TEST_OWNER');
 assert.ok(response,`response ${path}`);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-gnk-explicit-html-route'),assetPath);
 assert.equal(response.headers.get('x-gnk-editorial-assets'),VERSION);
 assert.equal(response.headers.get('x-gnk-route-owner'),'TEST_OWNER');
 assert.equal(response.headers.get('etag'),null);
 assert.match(await response.text(),/<html|<!doctype html/i);
}
const head=await servePublicEditorialAsset(new Request('https://gnk-asg.hr/objave/',{method:'HEAD'}),env,'TEST_OWNER');
assert.ok(head);assert.equal(await head.text(),'');
assert.equal(await servePublicEditorialAsset(new Request('https://gnk-asg.hr/api/public-news'),env,'TEST_OWNER'),null);
assert.equal(await servePublicEditorialAsset(new Request('https://gnk-asg.hr/objave/ne-postoji'),env,'TEST_OWNER'),null);

const plan=JSON.parse(fs.readFileSync('apps/portal/data/editorial-plan/manifest.json','utf8'));
for(const pack of plan.packages){
 for(const planFile of pack.files){
  for(const item of JSON.parse(fs.readFileSync(`apps/portal/data/editorial-plan/${planFile}`,'utf8'))){
   const root=item.type==='objava'?'/objave':'/komentari';
   const route=`${root}/${item.slug}`;
   const asset=editorialAssetPath(route);
   assert.equal(asset,`${route}/index.html`);
   if(pack.status==='published')assert.ok(fs.existsSync(`apps/portal${asset}`),`missing published asset ${asset}`);
  }
 }
}
const config=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
assert.match(config,/main = "src\/index-unified-auth-v23\.js"/);
const wrapper=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js','utf8');
assert.match(wrapper,/servePublicEditorialAsset/);
assert.match(wrapper,/GNK_ASG_UNIFIED_AUTH_V33_PUBLIC_EDITORIAL_ASSETS/);
console.log(JSON.stringify({ok:true,version:VERSION,roots:EDITORIAL_ROOTS.length,runtimeCases:cases.size,assetFetches:seen.length,plannedPackages:plan.packages.length},null,2));
