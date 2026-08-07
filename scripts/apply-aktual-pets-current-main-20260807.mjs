import fs from 'node:fs';
import assert from 'node:assert/strict';

const file='scripts/gnk-news-refresh.mjs';
let src=fs.readFileSync(file,'utf8');
const marker="  { source: 'European Commission', group: 'international', category: 'world', url: 'https://ec.europa.eu/commission/presscorner/api/rss?language=en' },\n";
const block=`\n  // --- Kucni ljubimci --------------------------------------------------\n  // Prikazuje se samo naslov, slika/izvorni media URL kada ga RSS daje,\n  // kratak izvod i poveznica na izvornog izdavaca; puni tekst se ne pohranjuje.\n  { source: 'The Guardian Pets', group: 'ljubimci', category: 'pets', url: 'https://www.theguardian.com/lifeandstyle/pets/rss' },\n  { source: 'Dogster', group: 'ljubimci', category: 'dogs', url: 'https://www.dogster.com/feed' },\n  { source: 'Catster', group: 'ljubimci', category: 'cats', url: 'https://www.catster.com/feed' },\n`;
assert.ok(src.includes(marker),'international insertion marker missing');
for(const name of ['The Guardian Pets','Dogster','Catster']) assert.ok(!src.includes(`source: '${name}'`),`${name} already present`);
src=src.replace(marker,marker+block);
fs.writeFileSync(file,src,'utf8');
console.log(JSON.stringify({ok:true,file,added:['The Guardian Pets','Dogster','Catster']},null,2));
