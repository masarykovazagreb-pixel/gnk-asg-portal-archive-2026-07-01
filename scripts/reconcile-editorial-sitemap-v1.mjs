import fs from 'node:fs';
import path from 'node:path';

const portal='apps/portal';
const sitemapPath=path.join(portal,'editorial-sitemap.xml');
const collections=[
  ['objave','/objave/'],
  ['analize','/analize/'],
  ['komentari','/komentari/'],
  ['en/publications','/en/publications/'],
  ['en/analyses','/en/analyses/'],
  ['en/commentary','/en/commentary/']
];
const monthHr={siječnja:1,veljače:2,ožujka:3,travnja:4,svibnja:5,lipnja:6,srpnja:7,kolovoza:8,rujna:9,listopada:10,studenoga:11,prosinca:12};

function isoDate(html){
  const spans=[...html.matchAll(/<span>([^<]+)<\/span>/g)].map(m=>m[1].trim());
  for(const raw of spans){
    const en=new Date(raw);
    if(!Number.isNaN(en.getTime()) && /\b20\d{2}\b/.test(raw)) return en.toISOString().slice(0,10);
    const hr=raw.match(/^(\d{1,2})\.\s+([A-Za-zčćđšžČĆĐŠŽ]+)\s+(20\d{2})\.?$/u);
    if(hr && monthHr[hr[2].toLowerCase()]) return `${hr[3]}-${String(monthHr[hr[2].toLowerCase()]).padStart(2,'0')}-${String(hr[1]).padStart(2,'0')}`;
  }
  return null;
}

let sitemap=fs.readFileSync(sitemapPath,'utf8');
const existing=new Set([...sitemap.matchAll(/<loc>https:\/\/gnk-asg\.hr([^<]+)<\/loc>/g)].map(m=>m[1]));
const additions=[];

for(const [collection,prefix] of collections){
  const indexPath=path.join(portal,collection,'index.html');
  const indexHtml=fs.readFileSync(indexPath,'utf8');
  const routes=[...indexHtml.matchAll(new RegExp(`<a href="(${prefix}[^"#?]+/)"`,'g'))].map(m=>m[1]);
  for(const route of new Set(routes)){
    if(existing.has(route)) continue;
    const pagePath=path.join(portal,route.replace(/^\//,''),'index.html');
    if(!fs.existsSync(pagePath)) throw new Error(`Collection route has no physical page: ${route}`);
    const html=fs.readFileSync(pagePath,'utf8');
    const canonical=(html.match(/<link rel="canonical" href="https:\/\/gnk-asg\.hr([^"#?]+)"/)||[])[1];
    if(canonical!==route) throw new Error(`Canonical mismatch for ${route}: ${canonical||'missing'}`);
    const lastmod=isoDate(html);
    if(!lastmod) throw new Error(`Cannot derive publication date for ${route}`);
    additions.push({route,lastmod});
    existing.add(route);
  }
}

if(additions.length){
  const rows=additions
    .sort((a,b)=>a.route.localeCompare(b.route,'en'))
    .map(({route,lastmod})=>`  <url><loc>https://gnk-asg.hr${route}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.65</priority></url>`)
    .join('\n');
  sitemap=sitemap.replace(/\n<\/urlset>\s*$/u,`\n${rows}\n</urlset>\n`);
  fs.writeFileSync(sitemapPath,sitemap);
}

console.log(JSON.stringify({ok:true,collections:collections.length,added:additions.length,routes:additions},null,2));
