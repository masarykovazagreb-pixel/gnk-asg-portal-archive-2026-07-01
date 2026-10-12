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
const issueMonday=new Date(Date.UTC(maxDate.getUTCFullYear(),maxDate.getUTCMonth(),maxDate.getUTCDate()));
const day=issueMonday.getUTCDay()||7; issueMonday.setUTCDate(issueMonday.getUTCDate()-day+1);
const issueWeek=issueMonday.toISOString().slice(0,10);
if(process.env.AKTUAL_WEEKLY_FORCE!=='1'&&fs.existsSync(OUT)){
  try{
    const prev=JSON.parse(fs.readFileSync(OUT,'utf8'));
    if(prev.issue_week===issueWeek){console.log(JSON.stringify({changed:false,issue_week:issueWeek}));process.exit(0)}
  }catch(_){}
}
const from=new Date(maxDate); from.setUTCDate(from.getUTCDate()-13);
const recent=items.filter(x=>new Date(x._published)>=from);

const text=x=>String(x||'').toLowerCase();
const hay=x=>[x.title,x.summary,x.category,x.group,x.source].map(text).join(' ');
const category=x=>String(x.category||'').toLowerCase();
const group=x=>String(x.group||'').toLowerCase();

const heavy=/\b(war|ukraine|russia|attack|attacker|killed|dies|death|dead|rape|sexual assault|assault|murder|crime|criminal|cancer|disease|poison|poisoned|crisis|accident|injury|injured|hospital|funeral|ceasefire|shooting|bomb|flood|wildfire|lawsuit|trial|court|police|gambling|casino|prediction market|betting|derailment|homeless|abuse|neglect|missing person|missing people|fine|ban|sanction|recall|leak oil)\b/i;
const lightPositive=/\b(best|beautiful|beauty|style|fashion|travel|holiday|spa|food|recipe|restaurant|cycling|hiking|lake|island|pet|pets|dog|dogs|cat|cats|garden|design|luxury|music|culture|film|show|sport|champion|win|wins|success|festival|art|nature|discover|discovery|celebrate|award|honour|reunion|birthday|wedding|record|photogenic|autumn|wellness|escape|collection|runway|denim|shoes|dress|road trip|concept car|sports car)\b/i;

const rules={
  'zene-stil':{
    allow:/\b(woman|women|female|actress|singer|model|fashion|beauty|designer|dress|makeup|skincare|jewelry|jewellery|shoe|shoes|wardrobe|salon|style|styling|motherhood|wellness)\b/i,
    deny:/\b(airport|runway expansion|heathrow|court|police|crime|finance|shares|earnings|strike|fine|ban)\b/i
  },
  moda:{
    allow:/\b(fashion|designer|dress|clothing|runway|collection|jewelry|jewellery|shoe|shoes|wardrobe|denim|jeans|coat|jacket|style|styling|couture|street style|handbag|bag|loafers|boots|sneakers|knitwear)\b/i,
    deny:/\b(airport|heathrow|runway expansion|airline|parking|trade talks|factory|earnings|finance|shares)\b/i
  },
  ljubimci:{
    allow:/\b(pet|pets|dog|dogs|cat|cats|puppy|puppies|kitten|kittens|dachshund|maine coon|bengal|animal welfare|therapy dog|therapy dogs|pet friendly)\b/i,
    deny:/\b(flood|earthquake|wildfire|storm|attack|crime|court|war|hospital)\b/i
  },
  auto:{
    allow:/\b(car|cars|automobil|automobile|vehicle|vehicles|bmw|mercedes|audi|ferrari|porsche|tesla|peugeot|fiat|alfa romeo|honda|toyota|mustang|corvette|suv|sports car|concept car|electric vehicle|\bev\b|motoring|roadster|supercar)\b/i,
    deny:/\b(car park|parking app|lake|cycling|hiking|property group|trade deal|tariff)\b/i
  },
  putovanja:{
    allow:/\b(travel|holiday|spa|hotel|lake|hiking|cycling|island|city break|destination|tourism|tourist|autumn break|escape|resort|beach|mountain|road trip|croatia|paris|menorca|seychelles|fiji|tohoku|montenegro|new zealand|morocco|peru)\b/i,
    deny:/\b(holiday hunger|airport expansion|factory|agentic ai|tariff|trade deal|lawsuit|police)\b/i
  },
  sport:{
    allow:/\b(sport|football|soccer|boxing|basketball|tennis|athlete|champion|title|win|wins|victory|medal|stadium|olympic|ufc|wrc|race|cycling)\b/i,
    deny:/\b(fine|ban|injury|hospital|death|abuse|crime|court)\b/i
  },
  hrana:{
    allow:/\b(food|recipe|restaurant|chef|cooking|cafe|wine|coffee|dessert|olive oil|pršut|prosciutto|gastronomy|gastro|vineyard|tasting)\b/i,
    deny:/\b(poison|recall|illness|drought|price rise|crisis)\b/i
  },
  kultura:{
    allow:/\b(culture|film|festival|art|artist|museum|exhibition|music|concert|theatre|theater|book|cinema|family reunion|heritage|gallery)\b/i,
    deny:/\b(death|dies|crime|court|war|funeral)\b/i
  },
  'dobre-price':{
    allow:/\b(success|celebrate|celebrates|birthday|reunion|award|honour|record|beautiful|discover|discovery|therapy dog|rescue|restored|opens|opening|named among|world leader|good news|joy|community)\b/i,
    deny:/\b(death|dies|crime|court|war|attack|hospital|flood|wildfire|injury|ban|fine)\b/i
  }
};

const defs=[
  {id:'zene-stil',hr:'Žene & stil',en:'Women & style'},
  {id:'moda',hr:'Moda',en:'Fashion'},
  {id:'ljubimci',hr:'Ljubimci',en:'Pets'},
  {id:'auto',hr:'Auto',en:'Cars'},
  {id:'putovanja',hr:'Putovanja',en:'Travel'},
  {id:'sport',hr:'Sport',en:'Sport'},
  {id:'hrana',hr:'Hrana & uživanje',en:'Food & pleasure'},
  {id:'kultura',hr:'Kultura & scena',en:'Culture & scene'},
  {id:'dobre-price',hr:'Lijepe priče',en:'Good stories'}
].map(def=>({
  ...def,
  test:x=>{
    const h=hay(x),r=rules[def.id];
    if(heavy.test(h)||r.deny.test(h)||!r.allow.test(h)) return false;
    if(def.id==='sport'&&category(x)!=='sport'&&!/\b(sport|football|boxing|basketball|tennis|athlete|champion|stadium|olympic|ufc|wrc)\b/i.test(h)) return false;
    if(def.id==='ljubimci'&&category(x)!=='pets'&&!/\b(pet|dog|cat|puppy|kitten|dachshund|therapy dog)\b/i.test(h)) return false;
    if(def.id==='putovanja'&&category(x)!=='travel'&&group(x)!=='turizam'&&!/\b(travel|tourism|destination|hotel|spa|island|city break|hiking|cycling|holiday|escape)\b/i.test(h)) return false;
    return lightPositive.test(h)||['pets','travel','food','culture','sport'].includes(category(x));
  }
}));
const clean=recent.filter(x=>!heavy.test(hay(x)));
const used=new Set();

function score(x,section){
  let s=0;
  const h=hay(x);
  if(section.test(x))s+=5;
  if(lightPositive.test(h))s+=2;
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
  issue_week:issueWeek,
  issue_date:issueDate,
  window:{from:from.toISOString(),to:maxDate.toISOString()},
  editorial_rule:'Positive/lifestyle weekly selection from canonical source-linked news feed; serious negative topics excluded by policy.',
  cover,
  counts:{source_items:source.length,recent_items:recent.length,selected_items:sections.reduce((n,s)=>n+s.items.length,0),sources:sourceCount,sections:sections.length},
  sections
};

fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({changed:true,issue_week:issueWeek,...out.counts},null,2));
