// GNK ASG — Content Factory queue: objavljuje READY stranice po kalendaru (Europe/Zagreb),
// upisuje ih u editorial-registry + editorial-sitemap, stanje u apps/portal/data/content-queue-state.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SITE='https://gnk-asg.hr';
const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const write=(p,s)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s)};
const nowZg=()=>{
  const d=new Date();
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zagreb'}).format(d);
  const time=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zagreb',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  return {date,time};
};
const TYPE={kolumne:'kolumna',komentari:'komentar',analize:'analiza',objave:'objava',tematske:'objava'};
const COLL={kolumna:'Kolumne',komentar:'Komentari',analiza:'Analize',objava:'Objave'};
const meta=(html,name)=>{const m=html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`,'i'))||html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:name|property)="${name}"`,'i'));return m?m[1]:''};
const camel=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 ]/g,' ').trim().split(/\s+/).map(w=>w[0]?w[0].toUpperCase()+w.slice(1):'').join('');

const queue=read('content/factory-queue/queue.json',{items:[],skipped:[]});
const skipped=new Set(queue.skipped||[]);
const statePath='apps/portal/data/content-queue-state.json';
const state=read(statePath,{version:'GNK_ASG_CONTENT_QUEUE_V1',published:{}});
const {date,time}=nowZg();
const due=queue.items.filter(x=>!skipped.has(x.id)&&!state.published[x.id]&&(x.date<date||(x.date===date&&x.time<=time)));
console.log(`Zagreb now: ${date} ${time} | due & unpublished: ${due.length} | skipped: ${skipped.size}`);
if(!due.length){console.log(JSON.stringify({changed:false}));process.exit(0);}

const registryPath='apps/portal/data/editorial-registry.json';
const registry=read(registryPath,{version:'GNK_ASG_EDITORIAL_REGISTRY_V1',site:SITE,items:[]});
const map=new Map((registry.items||[]).filter(x=>x&&x.path).map(x=>[x.path,x]));
const published=[];

for(const it of due){
  const src=`content/factory-queue/${it.category}/${it.slug}.html`;
  if(!existsSync(src)){console.log('MISSING SOURCE',src);continue;}
  let html=readFileSync(src,'utf8');
  const canonical=(html.match(/<link rel="canonical" href="([^"]+)"/i)||[])[1];
  if(!canonical||!canonical.startsWith(SITE)){console.log('BAD CANONICAL',src);continue;}
  const path=canonical.slice(SITE.length);
  const publishedAt=`${it.date}T${it.time}:00+02:00`;
  const title=(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[,''])[1].replace(/<[^>]+>/g,'').trim();
  const description=meta(html,'description');
  const image=meta(html,'og:image')||`${SITE}/assets/gnk-asg-social-card.png`;
  const lang=(html.match(/<html[^>]+lang="(\w+)"/i)||[,'hr'])[1];
  const keywords=meta(html,'keywords').split(',').map(s=>s.trim()).filter(Boolean);
  const type=TYPE[it.category]||'objava';
  const brand=lang==='hr'?['NerminSefic','GNKASG','gospodarstvo','poslovanje']:['NerminSefic','GNKASG','Business','Leadership'];
  const hashtags=[...new Set([...keywords.map(camel).filter(x=>x&&x.length>2),...brand])].slice(0,12);
  if(!html.includes('article:published_time')){
    html=html.replace('</head>',`<meta property="article:published_time" content="${publishedAt}"><meta property="article:author" content="Nermin Sefić"></head>`);
  }
  write('apps/portal'+path.replace(/\/$/,'/index.html'),html);
  map.set(path,{slug:it.slug,type,collection:COLL[type],path,url:canonical,title,description,keywords,hashtags,image,publishedAt,inPlan:true,seoComplete:true,language:lang});
  state.published[it.id]={path,url:canonical,at:new Date().toISOString()};
  published.push({id:it.id,url:canonical,title});
  console.log('PUBLISH',it.id,canonical);
}

registry.items=[...map.values()].sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
registry.total=registry.items.length;
registry.generatedAt=new Date().toISOString();
registry.inPlan=registry.items.filter(x=>x.inPlan).length;
registry.outsidePlan=registry.items.filter(x=>!x.inPlan).length;
registry.seoIncomplete=registry.items.filter(x=>!x.seoComplete).length;
registry.byType=registry.items.reduce((a,x)=>(a[x.type||'other']=(a[x.type||'other']||0)+1,a),{});
write(registryPath,JSON.stringify(registry,null,2)+'\n');
write(statePath,JSON.stringify(state,null,2)+'\n');

const smPath='apps/portal/editorial-sitemap.xml';
if(existsSync(smPath)&&published.length){
  let xml=readFileSync(smPath,'utf8');
  for(const p of published){
    if(xml.includes(`<loc>${p.url}</loc>`))continue;
    xml=xml.replace('</urlset>',`  <url><loc>${p.url}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n</urlset>`);
  }
  write(smPath,xml);
}
console.log(JSON.stringify({changed:published.length>0,published},null,2));
