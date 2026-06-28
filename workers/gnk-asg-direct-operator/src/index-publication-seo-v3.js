import app from './index-article-automation-v2.js';

export const VERSION='GNK_ASG_PUBLICATION_SEO_V5_DYNAMIC_SITEMAPS_20260628';
const SITE='https://gnk-asg.hr';
const AUTHOR='Nermin Sefić';
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const xmlEsc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const safeJson=value=>JSON.stringify(value).replace(/</g,'\u003c');
const mojibake=value=>/[�]|(?:Ã.|Â.|Ä.|Å.)/.test(String(value||''));

async function read(env,key,fallback=[]){const kv=store(env);if(!kv)return fallback;try{const raw=await kv.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function html(body,status=200,extra={}){return new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=120, stale-while-revalidate=900','x-gnk-asg-publication-seo':VERSION,...extra}})}
function json(body,status=200){return new Response(JSON.stringify(body,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-publication-seo':VERSION}})}
function xml(body,extra={}){return new Response(body,{status:200,headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=300, stale-while-revalidate=1800','x-content-type-options':'nosniff','x-gnk-asg-publication-seo':VERSION,...extra}})}
function titleOf(item,en){return clean(en?(item.titleEn||item.titleHr||item.title):(item.titleHr||item.title||item.titleEn))}
function summaryOf(item,en){return clean(en?(item.summaryEn||item.summaryHr||item.summary):(item.summaryHr||item.summary||item.summaryEn))}
function bodyOf(item,en){return String(en?(item.bodyEn||item.bodyHr||item.body):(item.bodyHr||item.body||item.bodyEn)||'').trim()}
function absolute(value){const raw=clean(value);if(!raw)return'';try{const url=new URL(raw,SITE);return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}}
function imageOf(item){return absolute(item?.imageGenerated?.cover?.url||item?.imageUrl||item?.image||item?.seo?.image)}
function socialImageOf(item){return absolute(item?.imageGenerated?.social?.url||item?.ogImage||item?.seo?.ogImage||imageOf(item))}
function portraitImageOf(item){return absolute(item?.imageGenerated?.portrait?.url||item?.portraitImage||'')}
function imageTypeOf(value){const path=String(value||'').split('?')[0].toLowerCase();if(path.endsWith('.png'))return'image/png';if(path.endsWith('.webp'))return'image/webp';if(path.endsWith('.jpg')||path.endsWith('.jpeg'))return'image/jpeg';if(path.endsWith('.gif'))return'image/gif';return'image/svg+xml'}
function dateOf(item){const value=item.publishedAt||item.published_at||item.updatedAt||item.createdAt||'';const parsed=Date.parse(value);return Number.isFinite(parsed)?new Date(parsed).toISOString():''}
function renderable(item){const title=titleOf(item,false),body=bodyOf(item,false),image=imageOf(item);return Boolean(item?.slug&&item?.approvedForPublic!==false&&title.length>=10&&body.length>=600&&image&&!mojibake(`${title} ${body.slice(0,1500)}`))}
function validItems(items){return (Array.isArray(items)?items:[]).filter(renderable).sort((a,b)=>Date.parse(dateOf(b)||0)-Date.parse(dateOf(a)||0))}
function paragraphs(value){return String(value||'').split(/\n{2,}/).map(block=>clean(block)).filter(Boolean).map(block=>`<p>${esc(block)}</p>`).join('')}
function sourceItems(item){const list=Array.isArray(item.sources)?item.sources:[];if(list.length)return list.filter(source=>source?.url);return item.sourceUrl?[{title:item.titleHr||item.title,url:item.sourceUrl,source:item.source||'Izvor'}]:[]}
function widthOf(item){return Number(item?.imageGenerated?.cover?.width||item?.imageWidth||2400)}
function heightOf(item){return Number(item?.imageGenerated?.cover?.height||item?.imageHeight||1350)}
function socialWidthOf(item){return Number(item?.imageGenerated?.social?.width||1200)}
function socialHeightOf(item){return Number(item?.imageGenerated?.social?.height||630)}
function locale(en){return en?'en_US':'hr_HR'}

function sharedHead({en,title,summary,canonical,image,socialImage,imageWidth=2400,imageHeight=1350,type='article',published='',modified='',schema}){
  const other=en?canonical.replace('/publications/','/objave/'):canonical.replace('/objave/','/publications/');
  const share=socialImage||image;
  const shareWidth=share&&share!==image?1200:imageWidth;
  const shareHeight=share&&share!==image?630:imageHeight;
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(summary.slice(0,170))}"><meta name="author" content="${AUTHOR}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="${esc(canonical)}"><link rel="alternate" hreflang="${en?'en':'hr'}" href="${esc(canonical)}"><link rel="alternate" hreflang="${en?'hr':'en'}" href="${esc(other)}"><link rel="alternate" hreflang="x-default" href="${esc(canonical.replace('/publications/','/objave/'))}"><meta property="og:type" content="${type}"><meta property="og:site_name" content="GNK ASG"><meta property="og:locale" content="${locale(en)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(summary.slice(0,200))}"><meta property="og:url" content="${esc(canonical)}">${share?`<meta property="og:image" content="${esc(share)}"><meta property="og:image:secure_url" content="${esc(share)}"><meta property="og:image:type" content="${imageTypeOf(share)}"><meta property="og:image:width" content="${shareWidth}"><meta property="og:image:height" content="${shareHeight}"><meta property="og:image:alt" content="${esc(title)}">`:''}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(summary.slice(0,200))}">${share?`<meta name="twitter:image" content="${esc(share)}"><meta name="twitter:image:alt" content="${esc(title)}">`:''}${published?`<meta property="article:published_time" content="${esc(published)}">`:''}${modified?`<meta property="article:modified_time" content="${esc(modified)}">`:''}<meta property="article:author" content="${AUTHOR}">${schema?`<script type="application/ld+json">${safeJson(schema)}</script>`:''}`;
}

function listSchema(items,en,canonical){return{'@context':'https://schema.org','@type':'CollectionPage','@id':`${canonical}#collection`,name:en?'GNK ASG Publications':'GNK ASG Objave i analize',url:canonical,inLanguage:en?'en':'hr',publisher:{'@type':'Organization',name:'GNK ASG d.o.o.',url:SITE},mainEntity:{'@type':'ItemList',numberOfItems:items.length,itemListElement:items.slice(0,100).map((item,index)=>({'@type':'ListItem',position:index+1,url:`${SITE}${en?'/publications/':'/objave/'}${item.slug}/`,name:titleOf(item,en),image:imageOf(item)}))}}}
function imageObjects(item,en){const variants=[{url:imageOf(item),width:widthOf(item),height:heightOf(item),variant:'cover'},{url:socialImageOf(item),width:socialWidthOf(item),height:socialHeightOf(item),variant:'social'},{url:portraitImageOf(item),width:Number(item?.imageGenerated?.portrait?.width||1600),height:Number(item?.imageGenerated?.portrait?.height||2000),variant:'portrait'}];const seen=new Set();return variants.filter(entry=>entry.url&&!seen.has(entry.url)&&seen.add(entry.url)).map(entry=>({'@type':'ImageObject','@id':`${entry.url}#${entry.variant}`,contentUrl:entry.url,url:entry.url,width:entry.width,height:entry.height,name:item.imageAlt||titleOf(item,en),caption:item.imageAlt||titleOf(item,en),creditText:item.imageCredit||'GNK ASG Visual Index',creator:{'@type':'Organization',name:'GNK ASG d.o.o.'},representativeOfPage:entry.variant==='cover'}))}
function articleSchema(item,en,canonical){const sources=sourceItems(item),images=imageObjects(item,en);return{'@context':'https://schema.org','@graph':[{'@type':'NewsArticle','@id':`${canonical}#article`,headline:titleOf(item,en),alternativeHeadline:titleOf(item,!en),description:summaryOf(item,en),image:images.map(image=>({'@id':image['@id']})),thumbnailUrl:socialImageOf(item)||imageOf(item),datePublished:dateOf(item),dateModified:item.updatedAt||dateOf(item),inLanguage:en?'en':'hr',mainEntityOfPage:{'@type':'WebPage','@id':canonical},author:{'@type':'Person',name:AUTHOR,url:`${SITE}/`},publisher:{'@type':'Organization',name:'GNK ASG d.o.o.',url:SITE},articleSection:item.category||'business',keywords:Array.isArray(item?.seo?.keywords)?item.seo.keywords.join(', '):'',wordCount:Number(en?item.wordCountEn:item.wordCountHr)||undefined,isBasedOn:sources.map(source=>source.url).filter(Boolean)},...images,{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'GNK ASG',item:`${SITE}/`},{'@type':'ListItem',position:2,name:en?'Publications':'Objave',item:`${SITE}${en?'/publications/':'/objave/'}`},{'@type':'ListItem',position:3,name:titleOf(item,en),item:canonical}]}]}}

function latestDate(items){return items.map(dateOf).filter(Boolean).sort().at(-1)?.slice(0,10)||new Date().toISOString().slice(0,10)}
function sitemapUrl(loc,hr,en,lastmod,priority='0.7'){return `<url><loc>${xmlEsc(loc)}</loc><xhtml:link rel="alternate" hreflang="hr" href="${xmlEsc(hr)}"/><xhtml:link rel="alternate" hreflang="en" href="${xmlEsc(en)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${xmlEsc(hr)}"/><lastmod>${xmlEsc(lastmod)}</lastmod><changefreq>weekly</changefreq><priority>${priority}</priority></url>`}
async function publicationSitemap(env){
  const items=validItems(await read(env,'publish:approved',[]));
  const latest=latestDate(items);
  const entries=[
    sitemapUrl(`${SITE}/objave/`,`${SITE}/objave/`,`${SITE}/publications/`,latest,'0.9'),
    sitemapUrl(`${SITE}/publications/`,`${SITE}/objave/`,`${SITE}/publications/`,latest,'0.9'),
    ...items.flatMap(item=>{const hr=`${SITE}/objave/${item.slug}/`,en=`${SITE}/publications/${item.slug}/`,lastmod=(dateOf(item)||latest).slice(0,10);return[sitemapUrl(hr,hr,en,lastmod),sitemapUrl(en,hr,en,lastmod)]})
  ];
  return xml(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`,{'x-gnk-asg-sitemap-items':String(items.length)});
}
async function publicationImageSitemap(env){
  const items=validItems(await read(env,'publish:approved',[]));
  const entries=[];
  for(const item of items){
    const images=imageObjects(item,false);
    for(const [path,en] of [[`/objave/${item.slug}/`,false],[`/publications/${item.slug}/`,true]]){
      if(!images.length)continue;
      entries.push(`<url><loc>${xmlEsc(`${SITE}${path}`)}</loc>${images.map(image=>`<image:image><image:loc>${xmlEsc(image.contentUrl)}</image:loc><image:title>${xmlEsc(titleOf(item,en))}</image:title><image:caption>${xmlEsc(item.imageAlt||titleOf(item,en))}</image:caption></image:image>`).join('')}</url>`);
    }
  }
  return xml(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries.join('')}</urlset>`,{'x-gnk-asg-image-sitemap-items':String(items.length)});
}

const style=`<style>:root{--bg:#020812;--surface:#081a30;--surface2:#0c2441;--gold:#d7aa3c;--text:#f7f9fc;--muted:#a9b7c9;--line:rgba(215,170,60,.32)}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0,rgba(35,133,220,.2),transparent 30%),var(--bg);color:var(--text);font-family:Inter,Arial,sans-serif}main{width:min(1180px,calc(100% - 28px));margin:auto;padding:28px 0 70px}.top{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}.top a,.button{display:inline-flex;padding:10px 13px;border:1px solid var(--line);border-radius:999px;color:#ffe092;text-decoration:none;font-weight:800}.hero{padding:clamp(24px,5vw,52px);border:1px solid var(--line);border-radius:26px;background:linear-gradient(145deg,rgba(9,35,64,.98),rgba(3,13,26,.99));box-shadow:0 24px 70px rgba(0,0,0,.35)}.eyebrow{color:var(--gold);font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}h1{font:800 clamp(2.25rem,6vw,4.8rem)/1.02 Georgia,serif;margin:12px 0;text-wrap:balance}h2{font-size:1.3rem;line-height:1.2}.lead{max-width:850px;color:#d4dfec;font-size:1.08rem;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:15px;margin-top:18px}.card{overflow:hidden;border:1px solid var(--line);border-radius:20px;background:linear-gradient(145deg,var(--surface2),var(--surface));box-shadow:0 16px 44px rgba(0,0,0,.25)}.card img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.card-body{padding:18px}.card a{color:#fff;text-decoration:none}.meta{color:var(--gold);font-size:.78rem;font-weight:800}.card p{color:var(--muted);line-height:1.55}.article{padding:clamp(20px,5vw,52px);border:1px solid var(--line);border-radius:24px;background:linear-gradient(145deg,rgba(9,30,54,.99),rgba(3,12,24,.99));box-shadow:0 24px 70px rgba(0,0,0,.35)}.article>img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:18px;margin:16px 0 12px}.content{max-width:850px;margin:auto}.content p{font-family:Georgia,serif;color:#e3eaf3;font-size:1.08rem;line-height:1.85}.sources{margin-top:28px;padding:18px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.025)}.sources a{color:#ffe092;overflow-wrap:anywhere}.credit{color:var(--muted);font-size:.82rem}.empty{padding:25px;border:1px solid var(--line);border-radius:18px;color:var(--muted)}@media(max-width:620px){main{width:calc(100% - 12px);padding-top:10px}.hero,.article{border-radius:16px}.grid{grid-template-columns:1fr}}</style>`;

async function listPage(env,en){
  const items=validItems(await read(env,'publish:approved',[]));
  const canonical=`${SITE}${en?'/publications/':'/objave/'}`;
  const title=en?'Publications & Insights | GNK ASG':'Objave i analize | GNK ASG';
  const summary=en?'Verified bilingual publications, analyses and corporate insights from the GNK ASG Intelligence Desk.':'Provjerene dvojezične objave, analize i korporativni uvidi GNK ASG Intelligence Deska.';
  const cards=items.map(item=>{const image=imageOf(item),url=`${en?'/publications/':'/objave/'}${esc(item.slug)}/`;return`<article class="card">${image?`<a href="${url}"><img src="${esc(image)}" alt="${esc(item.imageAlt||titleOf(item,en))}" width="${widthOf(item)}" height="${heightOf(item)}" loading="lazy" decoding="async"></a>`:''}<div class="card-body"><div class="meta">${esc(item.category||'business')} · ${esc(dateOf(item).slice(0,10))}</div><h2><a href="${url}">${esc(titleOf(item,en))}</a></h2><p>${esc(summaryOf(item,en).slice(0,260))}</p><a class="button" href="${url}">${en?'Open publication':'Otvori objavu'} →</a></div></article>`}).join('');
  const first=items[0];
  return html(`<!doctype html><html lang="${en?'en':'hr'}"><head>${sharedHead({en,title,summary,canonical,image:imageOf(first),socialImage:socialImageOf(first),imageWidth:widthOf(first),imageHeight:heightOf(first),type:'website',schema:listSchema(items,en,canonical)})}${style}</head><body><main><nav class="top"><a href="${en?'/en/':'/'}">GNK ASG</a><a href="${en?'/objave/':'/publications/'}">${en?'HR':'EN'}</a><a href="${en?'/news/':'/vijesti/'}">${en?'News':'Vijesti'}</a><a href="/visual-index/${en?'?lang=en':''}">Visual Index</a></nav><section class="hero"><div class="eyebrow">GNK ASG Intelligence Desk</div><h1>${en?'Publications & Insights':'Objave i analize'}</h1><p class="lead">${esc(summary)}</p></section><section class="grid">${cards||`<div class="empty">${en?'No validated publications are currently available.':'Trenutačno nema validiranih objava.'}</div>`}</section></main></body></html>`);
}

async function detailPage(env,slug,en){
  const items=await read(env,'publish:approved',[]),item=(Array.isArray(items)?items:[]).find(entry=>String(entry?.slug)===String(slug));
  if(!item||!renderable(item))return html(`<!doctype html><html lang="${en?'en':'hr'}"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${en?'Publication not found':'Objava nije pronađena'}</title>${style}</head><body><main><div class="empty">${en?'Publication not found.':'Objava nije pronađena.'}</div></main></body></html>`,404);
  const title=titleOf(item,en),summary=summaryOf(item,en),body=bodyOf(item,en),image=imageOf(item),socialImage=socialImageOf(item),canonical=`${SITE}${en?'/publications/':'/objave/'}${item.slug}/`,published=dateOf(item),modified=item.updatedAt||published,sources=sourceItems(item);
  const sourceHtml=sources.length?`<section class="sources"><strong>${en?'Information sources':'Izvori informacija'}</strong><ol>${sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.source||source.title||source.url)}</a>${source.title?` — ${esc(source.title)}`:''}</li>`).join('')}</ol></section>`:'';
  return html(`<!doctype html><html lang="${en?'en':'hr'}"><head>${sharedHead({en,title:item?.seo?.[en?'titleEn':'titleHr']||title,summary:item?.seo?.[en?'descriptionEn':'descriptionHr']||summary,canonical,image,socialImage,imageWidth:widthOf(item),imageHeight:heightOf(item),published,modified,schema:articleSchema(item,en,canonical)})}${style}</head><body><main><nav class="top"><a href="${en?'/publications/':'/objave/'}">← ${en?'Publications':'Objave'}</a><a href="${en?`/objave/${item.slug}/`:`/publications/${item.slug}/`}">${en?'HR':'EN'}</a><a href="/visual-index/${en?'?lang=en':''}">Visual Index</a></nav><article class="article"><div class="eyebrow">${esc(item.category||'GNK ASG Intelligence Desk')} · ${esc(published.slice(0,10))}</div><h1>${esc(title)}</h1><p class="lead">${esc(summary)}</p>${image?`<img src="${esc(image)}" alt="${esc(item.imageAlt||title)}" width="${widthOf(item)}" height="${heightOf(item)}"><div class="credit">${esc(item.imageCredit||'GNK ASG Visual Index')} · ${widthOf(item)}×${heightOf(item)}</div>`:''}<div class="content">${paragraphs(body)}${sourceHtml}<p class="credit">${en?'Author':'Autor'}: ${AUTHOR}</p></div></article></main></body></html>`);
}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    if(request.method==='GET'&&path==='/data/publications.json'){
      const items=validItems(await read(env,'publish:approved',[]));
      return json({ok:true,version:VERSION,count:items.length,visualContract:{storage:'R2 GNK_ASG_MEDIA_ASSETS',canonicalPrefix:'generated-articles/YYYY/MM/article-id',cover:{width:2400,height:1350,mimeType:'image/svg+xml'},social:{width:1200,height:630,mimeType:'image/svg+xml'},portrait:{width:1600,height:2000,mimeType:'image/svg+xml'},manifest:true,visualIndex:true},items});
    }
    if(request.method==='GET'&&path==='/sitemap-objave.xml')return publicationSitemap(env);
    if(request.method==='GET'&&path==='/image-sitemap-objave.xml')return publicationImageSitemap(env);
    if(request.method==='GET'&&path==='/objave')return listPage(env,false);
    if(request.method==='GET'&&path==='/publications')return listPage(env,true);
    const hr=path.match(/^\/objave\/([^/]+)$/),en=path.match(/^\/publications\/([^/]+)$/);
    if(request.method==='GET'&&hr)return detailPage(env,hr[1],false);
    if(request.method==='GET'&&en)return detailPage(env,en[1],true);
    const response=await app.fetch(request,env,ctx);const headers=new Headers(response.headers);headers.set('x-gnk-asg-publication-seo',VERSION);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};