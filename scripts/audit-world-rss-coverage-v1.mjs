#!/usr/bin/env node
// Local registry evidence only; neither network availability nor RSS rights are checked.
import fs from 'node:fs';
import {safeUrl} from './lib/aktual-world-feed-http-v1.mjs';
const registry=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const threshold=10;
const countryRows=registry.countries.map(c=>{
 const native=(c.sourcesList||[]).filter(s=>s.language===c.language&&safeUrl(s.rss));
 const distinct=new Map();
 for(const s of native){const host=new URL(s.rss).hostname.toLowerCase().replace(/^www\./,'');if(host!=='news.google.com'&&!distinct.has(host))distinct.set(host,s.name);}
 return {slug:c.slug,country:c.nameEn,language:c.language,configuredEntries:(c.sourcesList||[]).length,nativeConfiguredFeeds:native.length,directPublisherHosts:distinct.size,gapToTen:Math.max(0,threshold-distinct.size),directSources:[...distinct.values()]};
});
const result={version:'WORLD_RSS_COVERAGE_V1',scope:'Registry entries only: not verified live, language, ownership or licence; aggregator feeds excluded from publisher count.',threshold,countries:countryRows.length,configuredEntries:countryRows.reduce((n,c)=>n+c.configuredEntries,0),countriesAtLeastTenDirect:countryRows.filter(c=>c.gapToTen===0).length,countriesWithoutDirectFeeds:countryRows.filter(c=>c.directPublisherHosts===0).length,countryRows};
console.log(JSON.stringify(result,null,2));
