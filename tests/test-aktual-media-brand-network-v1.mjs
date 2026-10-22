#!/usr/bin/env node
/**
 * AKTUAL MEDIA named edition and region hierarchy regression test.
 * Read only: no network calls, no output mutations or publish action.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strengthenAktualBrand} from '../apps/region/engine/aktual-central.mjs';
const root='apps/portal';
const brand='https://gnk-asg.hr/gnk-aktual/#news-organization';
const cities={
  zagreb:'hr_HR', beograd:'sr_RS', sarajevo:'bs_BA', budimpesta:'hu_HU',
  ljubljana:'sl_SI', rim:'it_IT', sofija:'bg_BG', bukurest:'ro_RO'
};
const get=x=>readFileSync(x,'utf8');
const scripts=x=>[...x.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  .flatMap(match=>{const j=JSON.parse(match[1]);return j['@graph']||[j]});
const hub=get(root+'/gnk-aktual/index.html');
const org=scripts(hub).filter(n=>n['@type']==='NewsMediaOrganization'&&n['@id']===brand);
assert.equal(org.length,1,'newsroom must have one publisher');
assert.equal(org[0].name,'AKTUAL MEDIA d.o.o.','canonical legal publisher name');
const page=scripts(hub).filter(n=>n['@type']==='CollectionPage'
  && n.url==='https://gnk-asg.hr/gnk-aktual/');
assert.equal(page.length,1,'newsroom CollectionPage must not duplicate');
assert.equal(page[0].publisher['@id'],brand);
const index=scripts(get(root+'/izdanja/index.html'));
assert(index.some(x=>x['@type']==='NewsMediaOrganization'&&x['@id']===brand));
assert(index.some(x=>x['@type']==='WebSite'
  && x.publisher?.['@id']==='https://gnk-asg.hr/#gnk-asg'),'keep corporate root identity');
const profile=get(root+'/nermin-sefic/index.html');
let regional=0;
for(const [city,locale] of Object.entries(cities)){
 const p=root+'/kanal/'+city+'/index.html';
 const h=get(p);
 assert(h.includes('AKTUAL MEDIA KANAL'),'brand missing '+city);
 assert(h.includes('property="og:locale" content="'+locale+'"'),'locale mismatch '+city);
 assert(h.includes(brand),'publisher missing '+city);
 assert(h.includes('/gnk-aktual/'),'newsroom backlink missing '+city);
 assert(profile.includes('../kanal/'+city+'/'),'editor network link missing '+city);
 const xml=get(root+'/kanal/'+city+'/sitemap.xml');
 const count=(xml.match(/<loc>/g)||[]).length;
 assert(count>=400,'region article sitemap too small '+city);
 regional+=count;
}
const generator=get('apps/region/engine/build.mjs');
assert(generator.includes('#edition')&&generator.includes("name: channel.title"));
assert(generator.includes('channel.base')&&generator.includes("isPartOf: { '@id':"));
assert(generator.includes("publisher: { '@id': AKTUAL_NEWS_ENTITY_ID }"),'article must use main publisher constant');
assert(generator.includes("editor: { '@type': 'Person'"));
assert(generator.includes('item.sourceName'),'source attribution must be retained');
const hubSource=get('apps/region/engine/hub.mjs');
assert(hubSource.includes('MEDIA_ENTITY_NODE')&&hubSource.includes('NewsMediaOrganization'));
assert(hubSource.includes("numberOfItems: Math.min(20, items.length)"));
const dataSource=get('apps/region/engine/data-desk.mjs');
assert(dataSource.includes('BRAND_ID'),'data desk must retain shared publisher identity');
const central=get('apps/region/engine/aktual-central.mjs');
assert(central.includes("strengthenAktualBrand(html, 'hr', jsonld)"), 'central published writer must preserve publisher entity');
const destinations=page[0].mainEntity;
assert.equal(destinations.numberOfItems,destinations.itemListElement.length,'edition/topic item count must match');
assert(destinations.numberOfItems>=17,'keep all eight editions and nine topic desks');
for(const lang of ['hr','en']){
 const url=lang==='en'?'https://gnk-asg.hr/en/gnk-aktual/':'https://gnk-asg.hr/gnk-aktual/';
 const publisher={'@type':'NewsMediaOrganization','@id':brand,name:'AKTUAL MEDIA d.o.o.',logo:{url:'https://gnk-asg.hr/brand.webp'}};
 const schema=x=>'<script type="application/ld+json">'+JSON.stringify(x)+'</script>';
 const marker='<!-- AKTUAL-MEDIA-SEO-ENTITY:START -->'+schema({'@graph':[publisher]})+'<!-- AKTUAL-MEDIA-SEO-ENTITY:END -->';
 const fixture='<head>'+schema({'@type':'CollectionPage',url,publisher:{'@id':'old'}})+
   (lang==='hr'?schema(publisher):'')+marker+'</head>';
 let html=fixture;
 for(let cycle=0;cycle<2;cycle++){
  html=strengthenAktualBrand(html,lang,{'@type':'ItemList',numberOfItems:17,itemListElement:Array.from({length:17},(_,i)=>({'@type':'ListItem',position:i+1}))});
  const nodes=scripts(html);
  assert.equal(nodes.filter(n=>n['@type']==='NewsMediaOrganization'&&n['@id']===brand).length,1,'publisher survives repeated '+lang+' regeneration');
  const collection=nodes.find(n=>n['@type']==='CollectionPage'&&n.url===url);
  assert.equal(collection.publisher['@id'],brand);
  assert.equal(collection.mainEntity.numberOfItems,17);
  if(lang==='hr')assert.equal(nodes.find(n=>n['@type']==='NewsMediaOrganization').logo.url,publisher.logo.url,'preserve current brand logo');
 }
}
console.log(JSON.stringify({pass:true,namedRegionalEditions:8,regionalSitemapLocations:regional,
  topicDesks:9,editor:'Nermin Sefić',brand:'AKTUAL MEDIA',scope:'repository only'}));
