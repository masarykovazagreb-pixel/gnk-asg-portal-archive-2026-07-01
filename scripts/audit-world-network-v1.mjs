#!/usr/bin/env node
// Read-only local inventory; this does not probe public URLs or prove indexing.
import fs from 'node:fs';
import path from 'node:path';
import {externalStationSection} from '../apps/shared/aktual-external-stations-v1.mjs';
const base='https://gnk-asg.hr/gnk-aktual/';
const portal='apps/portal/gnk-aktual';
const registry=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const directory=fs.readFileSync(path.join(portal,'media/index.html'),'utf8');
const sitemap=fs.readFileSync(path.join(portal,'media/sitemap.xml'),'utf8');
const problems=[],unverifiedExternal=[],titles=new Map(),descriptions=new Map();
const collect=(map,key,slug)=>{if(key){const arr=map.get(key)||[];arr.push(slug);map.set(key,arr);}};
for(const [type,items] of [['media',registry.countries],['grad',registry.cities]]) for(const item of items){
  const slug=item.slug,route=`${base}${type}/${slug}/`,file=path.join(portal,type,slug,'index.html'),feed=path.join(portal,type,slug,'feed.xml');
  if(!fs.existsSync(file)){problems.push({type:'missing-page',route});continue;}
  const html=fs.readFileSync(file,'utf8');
  if(!html.includes(`rel="canonical" href="${route}"`))problems.push({type:'canonical',route});
  if(!sitemap.includes(`<loc>${route}</loc>`))problems.push({type:'sitemap-missing',route});
  if(!directory.includes(`href="/gnk-aktual/${type}/${slug}/"`))problems.push({type:'directory-link-missing',route});
  if(!fs.existsSync(feed))problems.push({type:'feed-missing',route});
  collect(titles,html.match(/<title>([^<]*)<\/title>/i)?.[1],route);
  collect(descriptions,html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1],route);
  if(type==='media'&&!externalStationSection(slug).includes('?country='))unverifiedExternal.push({slug,code:item.code,name:item.nameEn});
}
const duplicates=map=>[...map].filter(([,routes])=>routes.length>1).map(([value,routes])=>({value,routes}));
const report={scope:'local registry and files only; no live availability, rights or search indexing checks',countries:registry.countries.length,cities:registry.cities.length,configuredSources:registry.countries.reduce((n,c)=>n+c.sourcesList.length,0),verifiedExternalMappings:registry.countries.length-unverifiedExternal.length,unverifiedExternal,problems,duplicateTitles:duplicates(titles),duplicateDescriptions:duplicates(descriptions)};
console.log(JSON.stringify(report,null,2));
if(problems.length)process.exitCode=1;
