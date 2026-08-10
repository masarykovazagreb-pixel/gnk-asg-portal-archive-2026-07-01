// GNK ASG — RSS 2.0 + Atom 1.0 feeds iz editorial-registryja.
// Piše: /feed.xml (HR RSS), /en/feed.xml (EN RSS), /atom.xml (HR Atom),
//       /en/atom.xml (EN Atom), plus /feed/index.html i /en/feed/index.html
// kao ljudske indeks stranice s linkovima na feedove.
// Feedovi sadrže 50 najnovijih stavki po jeziku, s punim titles/descriptions/authors.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SITE='https://gnk-asg.hr';
const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const write=(p,s)=>{const d=p.substring(0,p.lastIndexOf('/'));if(d)mkdirSync(d,{recursive:true});writeFileSync(p,s)};
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const cdata=s=>String(s||'').replace(/\]\]>/g,']]&gt;');

const reg=read('apps/portal/data/editorial-registry.json',{items:[]});
const items=(reg.items||[]).filter(x=>x?.path&&x?.url).sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));

function detectLang(it){
  if(it.language==='hr'||it.language==='en') return it.language;
  return it.path?.startsWith('/en/')?'en':'hr';
}
const byLang={hr:[],en:[]};
for(const it of items){ byLang[detectLang(it)].push(it); }

function rss(lang, list){
  const isHr=lang==='hr';
  const title=isHr?'GNK ASG — najnovije objave':'GNK ASG — latest publications';
  const desc=isHr?'Analize, kolumne i komentari · Nermin Sefić · GNK ASG (GNK DINAMO Ltd. Group)':'Analyses, columns and commentary · Nermin Sefić · GNK ASG (GNK DINAMO Ltd. Group)';
  const link=isHr?`${SITE}/objave/`:`${SITE}/en/publications/`;
  const selfHref=isHr?`${SITE}/feed.xml`:`${SITE}/en/feed.xml`;
  const now=new Date().toUTCString();
  const entries=list.slice(0,50).map(it=>{
    const pub=it.publishedAt?new Date(it.publishedAt).toUTCString():now;
    const img=it.image?`      <enclosure url="${esc(it.image)}" type="${it.image.endsWith('.jpg')?'image/jpeg':'image/webp'}" length="0"/>\n      <media:content url="${esc(it.image)}" medium="image"/>\n`:'';
    const cats=(it.hashtags||[]).slice(0,8).map(t=>`      <category>${esc(t)}</category>`).join('\n');
    return `    <item>
      <title>${esc(it.title||it.slug)}</title>
      <link>${esc(it.url)}</link>
      <guid isPermaLink="true">${esc(it.url)}</guid>
      <pubDate>${pub}</pubDate>
      <dc:creator>Nermin Sefić</dc:creator>
      <description><![CDATA[${cdata(it.description||'')}]]></description>
${img}${cats}
    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(link)}</link>
    <description>${esc(desc)}</description>
    <language>${isHr?'hr-HR':'en'}</language>
    <copyright>© GNK ASG d.o.o. / Nermin Sefić</copyright>
    <managingEditor>it@gnk-asg.hr (Nermin Sefić)</managingEditor>
    <webMaster>it@gnk-asg.hr (Nermin Sefić)</webMaster>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>GNK ASG feeds v1</generator>
    <atom:link href="${esc(selfHref)}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE}/assets/logo-gnk-asg-canonical.svg</url>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
    </image>
${entries}
  </channel>
</rss>
`;
}
function atom(lang, list){
  const isHr=lang==='hr';
  const title=isHr?'GNK ASG — najnovije objave':'GNK ASG — latest publications';
  const desc=isHr?'Analize, kolumne i komentari · Nermin Sefić · GNK ASG':'Analyses, columns and commentary · Nermin Sefić · GNK ASG';
  const link=isHr?`${SITE}/objave/`:`${SITE}/en/publications/`;
  const selfHref=isHr?`${SITE}/atom.xml`:`${SITE}/en/atom.xml`;
  const now=new Date().toISOString();
  const entries=list.slice(0,50).map(it=>{
    const pub=it.publishedAt||now;
    return `  <entry>
    <title>${esc(it.title||it.slug)}</title>
    <link href="${esc(it.url)}" rel="alternate"/>
    <id>${esc(it.url)}</id>
    <updated>${esc(pub)}</updated>
    <published>${esc(pub)}</published>
    <author><name>Nermin Sefić</name><uri>${SITE}/nermin-sefic/</uri></author>
    <summary><![CDATA[${cdata(it.description||'')}]]></summary>
    ${it.image?`<link rel="enclosure" href="${esc(it.image)}"/>`:''}
    ${(it.hashtags||[]).slice(0,8).map(t=>`<category term="${esc(t)}"/>`).join('')}
  </entry>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${isHr?'hr':'en'}">
  <title>${esc(title)}</title>
  <subtitle>${esc(desc)}</subtitle>
  <link href="${esc(link)}" rel="alternate"/>
  <link href="${esc(selfHref)}" rel="self"/>
  <id>${esc(selfHref)}</id>
  <updated>${now}</updated>
  <rights>© GNK ASG d.o.o. / Nermin Sefić</rights>
  <generator uri="${SITE}/">GNK ASG feeds v1</generator>
  <icon>${SITE}/assets/logo-gnk-asg-canonical.svg</icon>
${entries}
</feed>
`;
}
function feedIndex(lang){
  const isHr=lang===' hr';
  const t=lang==='hr'?'Feedovi · GNK ASG':'Feeds · GNK ASG';
  const desc=lang==='hr'?'Pretplati se na najnovije analize, kolumne i komentare — Nermin Sefić / GNK ASG.':'Subscribe to the latest analyses, columns and commentary — Nermin Sefić / GNK ASG.';
  const rss=lang==='hr'?'/feed.xml':'/en/feed.xml';
  const at=lang==='hr'?'/atom.xml':'/en/atom.xml';
  const canonical=lang==='hr'?`${SITE}/feed/`:`${SITE}/en/feed/`;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${esc(t)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="Nermin Sefić">
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="application/rss+xml" title="RSS" href="${rss}">
<link rel="alternate" type="application/atom+xml" title="Atom" href="${at}">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(t)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/assets/people/nermin-sefic/og/nermin-sefic-01-official-desk-portrait.jpg">
<meta property="og:site_name" content="GNK ASG">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/assets/people/nermin-sefic/og/nermin-sefic-01-official-desk-portrait.jpg">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:(lang==='hr'?'Naslovnica':'Home'),item:(lang==='hr'?SITE+'/':SITE+'/en/')},{'@type':'ListItem',position:2,name:(lang==='hr'?'Feedovi':'Feeds'),item:canonical}]})}</script>
<style>body{font:16px/1.55 system-ui,Segoe UI,Arial,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;color:#eee;background:#0b0d10}a{color:#8bd}code{background:#151a20;padding:2px 6px;border-radius:4px}</style>
</head>
<body>
<h1>${esc(t)}</h1>
<p>${esc(desc)}</p>
<h2>${lang==='hr'?'Kanali':'Channels'}</h2>
<ul>
<li><strong>RSS 2.0:</strong> <a href="${rss}"><code>${rss}</code></a></li>
<li><strong>Atom 1.0:</strong> <a href="${at}"><code>${at}</code></a></li>
</ul>
<p>${lang==='hr'?'Feedovi se ažuriraju automatski nakon svake nove objave.':'Feeds refresh automatically after each new publication.'}</p>
</body></html>`;
}

write('apps/portal/feed.xml', rss('hr', byLang.hr));
write('apps/portal/en/feed.xml', rss('en', byLang.en));
write('apps/portal/atom.xml', atom('hr', byLang.hr));
write('apps/portal/en/atom.xml', atom('en', byLang.en));
write('apps/portal/feed/index.html', feedIndex('hr'));
write('apps/portal/en/feed/index.html', feedIndex('en'));

console.log(JSON.stringify({rss_hr:byLang.hr.length,rss_en:byLang.en.length,items:items.length,wrote:['/feed.xml','/en/feed.xml','/atom.xml','/en/atom.xml','/feed/','/en/feed/']},null,2));
