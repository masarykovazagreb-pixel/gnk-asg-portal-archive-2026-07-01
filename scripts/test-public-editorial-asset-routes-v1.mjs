import fs from 'node:fs';
import assert from 'node:assert/strict';
import {editorialAssetPath,editorialAssetRequestPath,servePublicEditorialAsset,EDITORIAL_ROOTS,VERSION} from '../workers/gnk-asg-direct-operator/src/public-editorial-asset-router-v1.js';

const cases=new Map([
 ['/objave',{assetPath:'/objave/index.html',requestPath:'/objave/'}],
 ['/objave/',{assetPath:'/objave/index.html',requestPath:'/objave/'}],
 ['/objave/globalne-kamatne-stope-nakon-inflacijskog-soka',{assetPath:'/objave/globalne-kamatne-stope-nakon-inflacijskog-soka/index.html',requestPath:'/objave/globalne-kamatne-stope-nakon-inflacijskog-soka/'}],
 ['/komentari/brzina-bez-kontrole-nije-inovacija',{assetPath:'/komentari/brzina-bez-kontrole-nije-inovacija/index.html',requestPath:'/komentari/brzina-bez-kontrole-nije-inovacija/'}],
 ['/analize',{assetPath:'/analize/index.html',requestPath:'/analize/'}],
 ['/en/publications',{assetPath:'/en/publications/index.html',requestPath:'/en/publications/'}],
 ['/en/commentary/innovation-without-trust-is-not-progress',{assetPath:'/en/commentary/innovation-without-trust-is-not-progress/index.html',requestPath:'/en/commentary/innovation-without-trust-is-not-progress/'}],
 ['/en/analyses',{assetPath:'/en/analyses/index.html',requestPath:'/en/analyses/'}]
]);
for(const[path,{assetPath,requestPath}]of cases){
 const normalized=path.replace(/\/+$/,'')||'/';
 assert.equal(editorialAssetPath(normalized),assetPath,path);
 assert.equal(editorialAssetRequestPath(assetPath),requestPath,`${path} canonical request`);
}
for(const path of ['/api/public-news','/objave/a/b','/objave/../admin','/komentari/a.html','/en/publications/a/b'])assert.equal(editorialAssetPath(path),'',path);
assert.equal(editorialAssetRequestPath('/objave/not-index.html'),'');
assert.deepEqual(EDITORIAL_ROOTS,[ '/objave','/komentari','/analize','/en/publications','/en/commentary','/en/analyses' ]);

const seen=[];
const env={ASSETS:{async fetch(request){
 const url=new URL(request.url);seen.push({path:url.pathname,method:request.method,redirect:request.redirect});
 const local=url.pathname.endsWith('/index.html')?`apps/portal${url.pathname}`:`apps/portal${url.pathname}index.html`;
 if(!fs.existsSync(local))return new Response('missing',{status:404,headers:{'content-type':'text/plain'}});
 return new Response(request.method==='HEAD'?null:fs.readFileSync(local),{status:200,headers:{'content-type':'text/html','etag':'old','content-length':'10'}});
}}};
for(const [path,{assetPath,requestPath}] of cases){
 const before=seen.length;
 const response=await servePublicEditorialAsset(new Request(`https://gnk-asg.hr${path}`,{method:'GET'}),env,'TEST_OWNER');
 assert.ok(response,`response ${path}`);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-gnk-explicit-html-route'),assetPath);
 assert.equal(response.headers.get('x-gnk-editorial-request-path'),requestPath);
 assert.equal(response.headers.get('x-gnk-editorial-assets'),VERSION);
 assert.equal(response.headers.get('x-gnk-route-owner'),'TEST_OWNER');
 assert.equal(response.headers.get('etag'),null);
 assert.deepEqual(seen[before],{path:assetPath,method:'GET',redirect:'follow'});
 const isCollection=EDITORIAL_ROOTS.some(root=>assetPath===`${root}/index.html`);
 if(isCollection)assert.equal(response.headers.get('cache-control'),'no-store, max-age=0',`collection cache ${path}`);
 else assert.equal(response.headers.get('cache-control'),'public, max-age=120, stale-while-revalidate=300',`article cache ${path}`);
 assert.match(await response.text(),/<html|<!doctype html/i);
}
const fallbackSeen=[];
const fallbackEnv={ASSETS:{async fetch(request){
 const url=new URL(request.url);fallbackSeen.push(url.pathname);
 if(url.pathname.endsWith('/index.html'))return new Response('missing',{status:404,headers:{'content-type':'text/plain'}});
 const local=`apps/portal${url.pathname}index.html`;
 return fs.existsSync(local)?new Response(fs.readFileSync(local),{status:200,headers:{'content-type':'text/html'}}):new Response('missing',{status:404,headers:{'content-type':'text/plain'}});
}}};
const fallback=await servePublicEditorialAsset(new Request('https://gnk-asg.hr/objave/globalne-kamatne-stope-nakon-inflacijskog-soka/'),fallbackEnv,'TEST_OWNER');
assert.ok(fallback);
assert.deepEqual(fallbackSeen,['/objave/globalne-kamatne-stope-nakon-inflacijskog-soka/index.html','/objave/globalne-kamatne-stope-nakon-inflacijskog-soka/']);
const head=await servePublicEditorialAsset(new Request('https://gnk-asg.hr/objave/',{method:'HEAD'}),env,'TEST_OWNER');
assert.ok(head);assert.equal(await head.text(),'');
assert.equal(head.headers.get('cache-control'),'no-store, max-age=0');
assert.equal(head.headers.get('x-gnk-editorial-request-path'),'/objave/');
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
   assert.equal(editorialAssetRequestPath(asset),`${route}/`);
   if(pack.status==='published')assert.ok(fs.existsSync(`apps/portal${asset}`),`missing published asset ${asset}`);
  }
 }
}
const config=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
assert.match(config,/main = "src\/index-unified-auth-v23\.js"/);
assert.match(config,/html_handling = "auto-trailing-slash"/);
const wrapper=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js','utf8');
assert.match(wrapper,/servePublicEditorialAsset/);
assert.match(wrapper,/GNK_ASG_UNIFIED_AUTH_V34_PUBLIC_EDITORIAL_ASSETS/);
console.log(JSON.stringify({ok:true,version:VERSION,roots:EDITORIAL_ROOTS.length,runtimeCases:cases.size,assetFetches:seen.length,plannedPackages:plan.packages.length,physicalIndexFirst:true,canonicalFallback:true,cache:{collections:'no-store',articles:'120s'}},null,2));
