#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const NEWS='apps/portal/data/news.json';
const OUT='apps/portal/data/aktual-weekly.json';

const raw=JSON.parse(fs.readFileSync(NEWS,'utf8'));
const source=Array.isArray(raw)?raw:(raw.items||[]);
const items=source
  .filter(x=>x&&x.title&&x.url&&x.image&&x.verified!==false)
  .map(x=>({...x,_published:x.published_at||x.publishedAt||''}))
  .filter(x=>!Number.isNaN(new Date(x._published).getTime()))
  .sort((a,b)=>new Date(b._published)-new Date(a._published));

if(!items.length) throw new Error('news.json has no valid source-linked items');

const maxDate=new Date(items[0]._published);
const from=new Date(maxDate); from.setUTCDate(from.getUTCDate()-13);
const recent=items.filter(x=>new Date(x._published)>=from);

const text=x=>String(x||'').toLowerCase();
const hay=x=>[x.title,x.summary,x.category,x.group,x.source].map(text).join(' ');
const negative=/\b(war|ukraine|russia|attack|attacker|killed|dies|death|dead|rape|sexual assault|assault|murder|crime|criminal|cancer|disease|poison|poisoned|crisis|accident|injury|injured|hospital|funeral|ceasefire|shooting|bomb|flood|wildfire|mosquito|haze|risk|threat|lawsuit|trial|court|police|gambling|casino|prediction market|betting)\b/i;
const positive=/\b(best|beautiful|beauty|style|fashion|travel|holiday|spa|food|recipe|restaurant|cycling|hiking|lake|alps|pet|pets|dog|dogs|cat|cats|wildlife|garden|design|luxury|car|cars|automobil|auto|music|culture|film|show|sport|champion|win|wins|success|good news|festival|art|nature|released back|planting|record|discover|discovery)\b/i;

const defs=[
  {id:'zene-stil',hr:'Žene & stil',en:'Women & style',test:x=>['culture','family','hrvatska','travel','business'].includes(String(x.category||'').toLowerCase())&&/\b(woman|women|female|actress|singer|model|fashion|beauty|designer|dress|makeup|skincare|jewelry|shoe|wardrobe|salon)\b/i.test(hay(x))},
  {id:'moda',hr:'Moda',en:'Fashion',test:x=>['culture','family','hrvatska','travel','business'].includes(String(x.category||'').toLowerCase())&&/\b(fashion|designer|dress|clothing|runway|collection|jewelry|shoe|wardrobe)\b/i.test(hay(x))},
  {id:'ljubimci',hr:'Ljubimci',en:'Pets',test:x=>String(x.category||'').toLowerCase()==='pets'||/\b(pet|pets|dog|dogs|cat|cats|puppy|kitten)\b/i.test(hay(x))},
  {id:'auto',hr:'Auto',en:'Cars',test:x=>/\b(car|cars|automobil|auto|vehicle|vehicles|bmw|mercedes|audi|ferrari|porsche|tesla|ev\b|motoring)\b/i.test(hay(x))},
  {id:'putovanja',hr:'Putovanja',en:'Travel',test:x=>String(x.category||'').toLowerCase()==='travel'||/\b(travel|holiday|spa|hotel|lake|hiking|cycling|alps|island|city break|destination)\b/i.test(hay(x))},
  {id:'sport',hr:'Sport',en:'Sport',test:x=>String(x.category||'').toLowerCase()==='sport'},
  {id:'hrana',hr:'Hrana & uživanje',en:'Food & pleasure',test:x=>String(x.category||'').toLowerCase()==='food'||/\b(food|recipe|restaurant|chef|cooking|cafe|wine|coffee|dessert)\b/i.test(hay(x))},
  {id:'kultura',hr:'Kultura & scena',en:'Culture & scene',test:x=>String(x.category||'').toLowerCase()==='culture'&&positive.test(hay(x))},
  {id:'dobre-price',hr:'Dobre priče',en:'Good stories',test:x=>['family','nature','culture','travel','food','pets'].includes(String(x.category||'').toLowerCase())&&positive.test(hay(x))}
];

const clean=recent.filter(x=>!negative.test(hay(x)));
const used=new Set();

function score(x,section){
  let s=0;
  const h=hay(x);
  if(section.test(x))s+=5;
  if(positive.test(h))s+=2;
  if(String(x.category||'').toLowerCase()==='hrvatska')s+=1;
  const age=(maxDate-new Date(x._published))/86400000;
  s+=Math.max(0,3-age/4);
  return s;
}
function take(section,n=6){
  return clean.filter(x=>section.test(x)&&!used.has(x.url))
    .map(x=>({x,s:score(x,section)})).sort((a,b)=>b.s-a.s||new Date(b.x._published)-new Date(a.x._published))
    .slice(0,n).map(({x})=>{used.add(x.url);return x});
}
function slim(x){
  return {
    title:x.title, summary:x.summary||'', url:x.url, image:x.image,
    imageAlt:x.imageAlt||x.title, source:x.source||'', category:x.category||'', group:x.group||'',
    published_at:x._published
  };
}

const sections=[];
for(const def of defs){
  const picked=take(def,6).map(slim);
  if(picked.length)sections.push({id:def.id,label_hr:def.hr,label_en:def.en,items:picked});
}

let cover=sections.flatMap(s=>s.items).sort((a,b)=>new Date(b.published_at)-new Date(a.published_at))[0]||slim(clean[0]);
const sourceCount=new Set(sections.flatMap(s=>s.items).map(x=>x.source).filter(Boolean)).size;
const issueDate=maxDate.toISOString().slice(0,10);
const issueId='aktual-media-tjedni-'+issueDate;

const out={
  version:'AKTUAL_MEDIA_WEEKLY_V1',
  issue_id:issueId,
  issue_date:issueDate,
  window:{from:from.toISOString(),to:maxDate.toISOString()},
  editorial_rule:'Positive/lifestyle weekly selection from canonical source-linked news feed; serious negative topics excluded by policy.',
  cover,
  counts:{source_items:source.length,recent_items:recent.length,selected_items:sections.reduce((n,s)=>n+s.items.length,0),sources:sourceCount,sections:sections.length},
  sections
};

fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.counts,null,2));
