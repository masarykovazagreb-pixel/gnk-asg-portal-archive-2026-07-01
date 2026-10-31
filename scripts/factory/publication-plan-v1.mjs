#!/usr/bin/env node
// Planira; NIKAD ne objavljuje, ne mijenja stranice i ne poziva mrežu.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
import { planPublication, planFallback } from '../../apps/portal/assets/publication-plan-core-v1.mjs';
export { planPublication, planFallback } from '../../apps/portal/assets/publication-plan-core-v1.mjs';

function main() {
  const args=process.argv.slice(2), countries=JSON.parse(readFileSync(join(ROOT,'config/world-countries-v1.json'),'utf8')).countries;
  if (args[0]==='objavi') {
    let scope, offset;
    if (args[1]==='hr') {scope='hr';offset=2;}
    else if (args[1]==='cijeli' && args[2]==='svijet') {scope='svijet';offset=3;}
    else throw new Error('Koristite objavi hr ili objavi cijeli svijet');
    if(args.length!==offset+2 || args[offset]!=='--url') throw new Error('Potreban je --url ADRESA');
    const editorialRegistry=JSON.parse(readFileSync(join(ROOT,'apps/portal/data/editorial-registry.json'),'utf8'));
    console.log(JSON.stringify(planPublication({scope,url:args[offset+1],countries,editorialRegistry}),null,2));
  } else if (args[0]==='razmjena' && args.length===3 && args[1]==='--kanal') {
    const feeds={};
    for (const c of countries.filter(c=>c.status==='live' && c.channelId)) {
      if (!/^[a-z0-9-]+$/.test(c.channelId)) throw new Error('Nevaljan identifikator kanala');
      const path=join(ROOT,'apps/portal/kanal',c.channelId,'feed.json');
      if (existsSync(path)) {try {feeds[c.channelId]=JSON.parse(readFileSync(path,'utf8'));} catch {feeds[c.channelId]={};}}
    }
    console.log(JSON.stringify(planFallback({target:args[2],countries,feeds,now:Date.now()}),null,2));
  } else throw new Error('Upotreba: objavi hr --url URL | objavi cijeli svijet --url URL | razmjena --kanal ID');
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {main();} catch(e) {console.error(e.message);process.exitCode=1;}
}
