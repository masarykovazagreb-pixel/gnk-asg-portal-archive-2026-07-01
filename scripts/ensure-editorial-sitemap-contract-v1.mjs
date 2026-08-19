import fs from 'node:fs';

const sitemapPath='apps/portal/editorial-sitemap.xml';
const pagePath='apps/portal/en/analyses/capital-structure-and-operational-resilience/index.html';
const url='https://gnk-asg.hr/en/analyses/capital-structure-and-operational-resilience/';

if(!fs.existsSync(pagePath)||!fs.statSync(pagePath).size){
  throw new Error(`Cannot register missing editorial page: ${pagePath}`);
}
if(!fs.existsSync(sitemapPath)||!fs.statSync(sitemapPath).size){
  throw new Error(`Missing editorial sitemap: ${sitemapPath}`);
}

let xml=fs.readFileSync(sitemapPath,'utf8');
if(!xml.includes('<urlset')||!xml.includes('</urlset>')){
  throw new Error('Editorial sitemap is malformed');
}

if(!xml.includes(url)){
  const entry=`  <url><loc>${url}</loc><lastmod>2026-08-12</lastmod><changefreq>monthly</changefreq><priority>0.65</priority></url>\n`;
  const anchor='  <url><loc>https://gnk-asg.hr/en/commentary/';
  const idx=xml.indexOf(anchor);
  if(idx>=0) xml=xml.slice(0,idx)+entry+xml.slice(idx);
  else xml=xml.replace('</urlset>',entry+'</urlset>');
  fs.writeFileSync(sitemapPath,xml);
  console.log(`Registered ${url} in ${sitemapPath}`);
}else{
  console.log(`Editorial sitemap already contains ${url}`);
}
