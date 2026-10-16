// Jednokratni backfill: objavljuje samo DOSPJELE nezapočete queue stavke.
// Buduce stavke nikada ne smiju postati live samo zato sto backfill postoji.
// Zadrzava originalno zakazane datume/vremena kao publishedAt.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { articleAuthorFor, isVerifiedNerminAuthor } from './lib/editorial-attribution-v1.mjs';
import { normalizeEditorialAttributionHtml, extractSocialHashtags } from './lib/editorial-html-attribution-v1.mjs';
const SITE='https://gnk-asg.hr';
const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const write=(p,s)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s)};
const TYPE={kolumne:'kolumna',komentari:'komentar',analize:'analiza',objave:'objava',tematske:'objava'};
const COLL={kolumna:'Kolumne',komentar:'Komentari',analiza:'Analize',objava:'Objave'};
const meta=(html,name)=>{const m=html.match(new RegExp(`<meta[^>]+(?:name|property)=\"${name}\"[^>]+content=\"([^\"]*)\"`,'i'))||html.match(new RegExp(`<meta[^>]+content=\"([^\"]*)\"[^>]+(?:name|property)=\"${name}\"`,'i'));return m?m[1]:''};
const hasVisibleNerminByline=html=>/<(?:div|p|span|aside)\b[^>]*class=["'][^"']*\b(?:article-meta|meta-row|byline|author-box|author-card|article-author)\b[^"']*["'][^>]*>[\s\S]*?nermin\s+sefi[cć][\s\S]*?<\/(?:div|p|span|aside)>/i.test(html);
const nowZg=()=>{
  const d=new Date();
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zagreb'}).format(d);
  const time=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zagreb',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  return {date,time};
};

const queue=read('content/factory-queue/queue.json',{items:[],skipped:[]});
const skipped=new Set(Array.isArray(queue.skipped)?queue.skipped:[]);
const statePath='apps/portal/data/content-queue-state.json';
const state=read(statePath,{version:'GNK_ASG_CONTENT_QUEUE_V1',published:{}});
const {date,time}=nowZg();
const pending=queue.items.filter(x=>
  !skipped.has(x.id) &&
  !state.published[x.id] &&
  (x.date<date || (x.date===date && x.time<=time))
);
const futurePending=queue.items.filter(x=>
  !skipped.has(x.id) &&
  !state.published[x.id] &&
  (x.date>date || (x.date===date && x.time>time))
);
console.log(`Backfill Zagreb now=${date} ${time} | queue=${queue.items.length} | already published=${Object.keys(state.published).length} | due backfill=${pending.length} | future protected=${futurePending.length} | skipped=${skipped.size}`);
if(!pending.length){console.log(JSON.stringify({changed:false,futureProtected:futurePending.length}));process.exit(0);}

const registryPath='apps/portal/data/editorial-registry.json';
const registry=read(registryPath,{version:'GNK_ASG_EDITORIAL_REGISTRY_V1',site:SITE,items:[]});
const map=new Map((registry.items||[]).filter(x=>x&&x.path).map(x=>[x.path,x]));
const published=[];

for(const it of pending){
  const src=`content/factory-queue/${it.category}/${it.slug}.html`;
  if(!existsSync(src)){console.log('MISSING SOURCE',src);continue;}
  let html=readFileSync(src,'utf8');
  const canonical=(html.match(/<link rel=\"canonical\" href=\"([^\"]+)\"/i)||[])[1];
  if(!canonical||!canonical.startsWith(SITE)){console.log('BAD CANONICAL',src);continue;}
  const path=canonical.slice(SITE.length);
  const publishedAt=`${it.date}T${it.time}:00+02:00`;
  const title=(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[,''])[1].replace(/<[^>]+>/g,'').trim();
  const description=meta(html,'description');
  const image=meta(html,'og:image')||`${SITE}/assets/gnk-asg-social-card.png`;
  const lang=(html.match(/<html[^>]+lang=\"(\w+)\"/i)||[,'hr'])[1];
  const type=TYPE[it.category]||'objava';
  const brand=lang==='hr'?['GNKASG','gospodarstvo','poslovanje']:['GNKASG','Business','Leadership'];
  const hasVerifiedSourceByline=it.author==='Nermin Sefić'
    &&it.authorSchemaVerified===true
    &&it.authorAttributionBasis==='visible-editorial-byline-and-person-schema'
    &&hasVisibleNerminByline(html);
  const attributionItem=hasVerifiedSourceByline
    ? it
    : it.author==='GNK ASG Intelligence Desk'
      ? it
      : {...it,author:null,authorSchemaVerified:false,authorAttributionBasis:null};
  const extractedHashtags=extractSocialHashtags(html,attributionItem,brand);
  const attribution=normalizeEditorialAttributionHtml(html,attributionItem);
  html=attribution.html;
  const keywords=meta(html,'keywords').split(',').map(s=>s.trim()).filter(Boolean);
  const hashtags=extractedHashtags;
  if(!html.includes('article:published_time')) html=html.replace('</head>',`<meta property=\"article:published_time\" content=\"${publishedAt}\"></head>`);
  write('apps/portal'+path.replace(/\/$/,'/index.html'),html);
  const author=articleAuthorFor(attributionItem);
  const authorSchemaVerified=isVerifiedNerminAuthor(attributionItem);
  map.set(path,{slug:it.slug,type,collection:COLL[type],path,url:canonical,title,description,keywords,hashtags,image,publishedAt,inPlan:true,seoComplete:true,language:lang,author:author?.name||null,authorUrl:authorSchemaVerified?`${SITE}/nermin-sefic/`:null,authorSchemaVerified,authorAttributionBasis:authorSchemaVerified?'visible-editorial-byline-and-person-schema':null});
  state.published[it.id]={path,url:canonical,at:new Date().toISOString(),backfilled:true};
  published.push({id:it.id,url:canonical,title,date:it.date});
  console.log('PUBLISH DUE',it.id,'('+it.date+' '+it.time+')',canonical);
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

const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zagreb'}).format(new Date());
const smPath='apps/portal/editorial-sitemap.xml';
if(existsSync(smPath)&&published.length){
  let xml=readFileSync(smPath,'utf8');
  for(const p of published){
    if(xml.includes(`<loc>${p.url}</loc>`))continue;
    xml=xml.replace('</urlset>',`  <url><loc>${p.url}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n</urlset>`);
  }
  write(smPath,xml);
}
console.log(JSON.stringify({changed:published.length>0,publishedCount:published.length,futureProtected:futurePending.length},null,2));
