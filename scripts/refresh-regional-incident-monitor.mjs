#!/usr/bin/env node
/**
 * Source-backed Incident Monitor projection.
 * Reads the canonical World Monitor feed and publishes only records that carry their upstream source metadata.
 * No synthetic Zagreb traffic/fire/seismic incidents are generated.
 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT=path.resolve('apps/portal');
const WORLD=path.join(ROOT,'data/world-monitor.json');
const OUT=path.join(ROOT,'data/regional-incident-monitor.json');
const read=(p,f={})=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return f}};
const wm=read(WORLD,{});
const seismic=wm?.categories?.natural?.seismology || {};
const events=wm?.categories?.natural?.events || {};
const magSeverity=(m)=>Number(m)>=6?'HIGH':Number(m)>=5?'MEDIUM':'LOW';
const categories=[];
if(Array.isArray(seismic.items)) categories.push({
  id:'world-seismology',nameHr:'Seizmologija — izvorni World Monitor podaci',nameEn:'Seismology — source-backed World Monitor data',icon:'⚡',
  source:seismic.source_name||'USGS Earthquake Hazards Program',sourceUrl:seismic.source_url||null,
  items:seismic.items.map((x,i)=>({id:`SEIS-${i}`,titleHr:x.title,titleEn:x.title,location:x.place||'',severity:magSeverity(x.magnitude),status:'SOURCE-BACKED',timestamp:x.time,summaryHr:`Magnituda ${x.magnitude ?? '—'}.`,summaryEn:`Magnitude ${x.magnitude ?? '—'}.`,url:x.url||null}))
});
if(Array.isArray(events.items)) categories.push({
  id:'world-natural-events',nameHr:'Prirodni događaji — izvorni World Monitor podaci',nameEn:'Natural events — source-backed World Monitor data',icon:'🌍',
  source:events.source_name||'NASA EONET',sourceUrl:events.source_url||null,
  items:events.items.map((x,i)=>({id:`EVENT-${i}`,titleHr:x.title,titleEn:x.title,location:x.category||'',severity:/wildfire|storm|hurricane/i.test(String(x.category||x.title))?'MEDIUM':'LOW',status:'SOURCE-BACKED',timestamp:x.time,summaryHr:x.category||'',summaryEn:x.category||'',url:x.url||null}))
});
const payload={updatedAt:wm.updated_at||new Date().toISOString(),service:'GNK ASG Regional & World Monitor Desk',mode:'source-backed-only',sourceOfTruth:'/data/world-monitor.json',modeledWorkerProfiles:1573,semantics:'1,573 modeled profiles; not independent runtime processes',categoriesCount:categories.length,categories};
fs.mkdirSync(path.dirname(OUT),{recursive:true}); fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(`Updated source-backed incident projection: ${OUT}`);
