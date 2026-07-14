import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('apps/portal');
const REPORT=path.resolve('artifacts/seo-visibility-report.json');
const STATUS=path.join(ROOT,'data/seo-visibility-status.json');
const groups=['objave','komentari','analize','en/publications','en/commentary','en/analyses'];
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const p=path.join(dir,entry.name);return entry.isDirectory()?walk(p):[p]}):[];
const files=groups.flatMap(group=>walk(path.join(ROOT,group))).filter(file=>file.endsWith('index.html'));
const route=file=>'/'+path.relative(ROOT,path.dirname(file)).split(path.sep).join('/')+'/';
const tag=(html,pattern)=>html.match(pattern)?.[1]?.trim()||'';
const esc=value=>String(value??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
let changed=0;
const pages=[];
for(const file of files){
  let html=fs.readFileSync(file,'utf8'),before=html,r=route(file),canonical=`https://gnk-asg.hr${r}`;
  const title=tag(html,/<title>([\s\S]*?)<\/title>/i)||tag(html,/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g,'')||'GNK ASG';
  const description=tag(html,/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)||tag(html,/<p[^>]+class=["'][^"']*lead[^"']*["'][^>]*>([\s\S]*?)<\/p>/i).replace(/<[^>]+>/g,'').slice(0,155);
  if(!/<meta[^>]+name=["']robots["']/i.test(html))html=html.replace('</head>','<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"></head>');
  if(!/<link[^>]+rel=["']canonical["']/i.test(html))html=html.replace('</head>',`<link rel="canonical" href="${canonical}"></head>`);
  const additions=[];
  if(!/<meta[^>]+property=["']og:title["']/i.test(html))additions.push(`<meta property="og:title" content="${esc(title)}">`);
  if(description&&!/<meta[^>]+property=["']og:description["']/i.test(html))additions.push(`<meta property="og:description" content="${esc(description)}">`);
  if(!/<meta[^>]+property=["']og:url["']/i.test(html))additions.push(`<meta property="og:url" content="${canonical}">`);
  if(!/<meta[^>]+name=["']twitter:card["']/i.test(html))additions.push('<meta name="twitter:card" content="summary_large_image">');
  if(additions.length)html=html.replace('</head>',`${additions.join('')}</head>`);
  if(html!==before){fs.writeFileSync(file,html);changed++;}
  pages.push({route:r,title:Boolean(title),description:Boolean(description),canonical:/rel=["']canonical/i.test(html),robots:/name=["']robots/i.test(html),openGraph:/property=["']og:title/i.test(html),jsonLd:/application\/ld\+json/i.test(html),h1:/<h1\b/i.test(html)});
}
const today=new Date().toISOString().slice(0,10);
const urls=pages.map(page=>`  <url><loc>https://gnk-asg.hr${page.route}</loc><lastmod>${today}</lastmod><changefreq>${page.route.split('/').filter(Boolean).length===1?'daily':'monthly'}</changefreq><priority>${page.route.split('/').filter(Boolean).length===1?'0.9':'0.8'}</priority></url>`);
fs.writeFileSync(path.join(ROOT,'editorial-sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
const summary={version:'GNK_ASG_SEO_VISIBILITY_CYCLE_V1_20260714',generatedAt:new Date().toISOString(),scope:'editorial-only',policy:{artificialTraffic:false,keywordStuffing:false,autoDeploy:false},pages:pages.length,changed,missing:{title:pages.filter(x=>!x.title).length,description:pages.filter(x=>!x.description).length,canonical:pages.filter(x=>!x.canonical).length,robots:pages.filter(x=>!x.robots).length,openGraph:pages.filter(x=>!x.openGraph).length,jsonLd:pages.filter(x=>!x.jsonLd).length,h1:pages.filter(x=>!x.h1).length}};
fs.mkdirSync(path.dirname(REPORT),{recursive:true});fs.writeFileSync(REPORT,JSON.stringify({summary,pages},null,2));fs.writeFileSync(STATUS,JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
if(summary.missing.title||summary.missing.description||summary.missing.canonical||summary.missing.h1)process.exitCode=1;
