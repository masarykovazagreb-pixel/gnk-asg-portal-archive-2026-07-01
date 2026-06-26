export const VERSION='GNK_ASG_INDEX_SERVER_HYDRATION_V1_20260626';

const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

async function read(env,key,fallback){
  const kv=store(env);
  if(!kv)return fallback;
  try{
    const raw=await kv.get(key);
    return raw?JSON.parse(raw):fallback;
  }catch{return fallback;}
}

async function assetJson(request,env,path,fallback){
  if(!env.ASSETS?.fetch)return fallback;
  try{
    const response=await env.ASSETS.fetch(new Request(new URL(path,request.url),{headers:{accept:'application/json'}}));
    return response.ok?await response.json():fallback;
  }catch{return fallback;}
}

function list(value){return Array.isArray(value)?value:Array.isArray(value?.items)?value.items:[];}
function stamp(item){const value=Date.parse(item?.publishedAt||item?.published_at||item?.createdAt||'');return Number.isFinite(value)?value:0;}
function unique(items,limit=100){
  const seen=new Set();
  return items.filter(Boolean).sort((a,b)=>stamp(b)-stamp(a)).filter(item=>{
    const key=clean(item.id||item.url||item.sourceUrl||item.slug||item.title).toLowerCase();
    if(!key||seen.has(key))return false;
    seen.add(key);return true;
  }).slice(0,limit);
}
function title(item,en){return clean(en?(item.titleEn||item.title||item.titleHr):(item.titleHr||item.title||item.titleEn));}
function summary(item,en){return clean(en?(item.summaryEn||item.summary||item.description||item.excerpt):(item.summaryHr||item.summary||item.description||item.excerpt));}
function itemUrl(item,en,fallback){return clean(en?(item.enUrl||item.url||item.sourceUrl||item.publicUrl):(item.hrUrl||item.url||item.sourceUrl||item.publicUrl))||fallback;}
function formatDate(value,en){
  const date=new Date(value||'');
  if(Number.isNaN(date.getTime()))return'';
  return new Intl.DateTimeFormat(en?'en-GB':'hr-HR',{dateStyle:'medium',timeZone:'Europe/Zagreb'}).format(date);
}
function formatNumber(value,en,max=2){
  const number=Number(value);
  if(!Number.isFinite(number))return null;
  return new Intl.NumberFormat(en?'en-GB':'hr-HR',{maximumFractionDigits:max,minimumFractionDigits:number<10?Math.min(2,max):0}).format(number);
}

function replaceBlock(html,startPattern,endPattern,replacement){
  const pattern=new RegExp(`(${startPattern})[\\s\\S]*?(${endPattern})`,'i');
  return html.replace(pattern,`$1${replacement}$2`);
}

function hydrateNews(html,items,en){
  const fallback=en?'/news/':'/vijesti/';
  if(!items.length){
    const empty=`<a class="news-item" href="${fallback}"><strong>${en?'News are temporarily unavailable':'Vijesti su privremeno nedostupne'}</strong><small>${en?'Automatic refresh remains active':'Automatsko osvježavanje ostaje aktivno'}</small></a>`;
    return html.replace(/<div id="latestNews">[\s\S]*?<\/div>/i,`<div id="latestNews">${empty}</div>`);
  }
  const offset=Math.floor(Date.now()/10000)%items.length;
  const rotated=[...items.slice(offset),...items.slice(0,offset)];
  const featured=rotated[0];
  const links=rotated.slice(0,5).map(item=>`<a class="news-item" href="${esc(itemUrl(item,en,fallback))}"><strong>${esc(title(item,en))}</strong><small>${esc(item.source||item.category||'GNK ASG Intelligence Desk')}</small></a>`).join('');
  html=html.replace(/<h3 id="featuredTitle">[\s\S]*?<\/h3>/i,`<h3 id="featuredTitle">${esc(title(featured,en))}</h3>`);
  html=html.replace(/<p id="featuredSummary">[\s\S]*?<\/p>/i,`<p id="featuredSummary">${esc(summary(featured,en)||title(featured,en))}</p>`);
  html=html.replace(/<a class="btn" id="featuredLink"[^>]*>[\s\S]*?<\/a>/i,`<a class="btn" id="featuredLink" href="${esc(itemUrl(featured,en,fallback))}">${en?'Open source':'Otvori izvor'}</a>`);
  return html.replace(/<div id="latestNews">[\s\S]*?<\/div>/i,`<div id="latestNews">${links}</div>`);
}

function hydrateArticles(html,items,en){
  const fallback=en?'/publications/':'/objave/';
  const selected=items.slice(0,5);
  const rows=selected.length?selected.map(item=>`<a class="publication-row" href="${esc(itemUrl(item,en,fallback))}"><span>${esc(title(item,en))}</span><small>${esc(formatDate(item.publishedAt||item.published_at||item.createdAt,en))}</small></a>`).join(''):`<a class="publication-row" href="${fallback}"><span>${en?'No published articles yet':'Još nema objavljenih članaka'}</span></a>`;
  html=html.replace(/<div id="publicationRows">[\s\S]*?<\/div>/i,`<div id="publicationRows">${rows}</div>`);
  const modal=selected.slice(0,4).map(item=>`<article class="modal-item"><h4>${esc(title(item,en))}</h4><p>${esc(summary(item,en).slice(0,240))}</p><a href="${esc(itemUrl(item,en,fallback))}">${en?'Open publication':'Otvori objavu'} →</a></article>`).join('')||`<article class="modal-item"><h4>${en?'No published articles yet':'Još nema objavljenih članaka'}</h4></article>`;
  return html.replace(/(<div class="modal" id="auto-editor-modal">[\s\S]*?<div class="modal-grid">)[\s\S]*?(<\/div><div class="actions">)/i,`$1${modal}$2`);
}

function hydrateMarket(html,payload,en){
  const assets=payload?.assets||{};
  const entries=[
    [en?'ASG Gold Reference':'ASG Gold Reference',assets.asg_gold_reference?.value_eur,' EUR',2],
    ['Bitcoin / EUR',assets.bitcoin?.price_eur,' EUR',2],
    ['USD / EUR',assets.usd_eur?.rate,'',5],
    ['Brent',assets.brent?.price_usd,' USD',2]
  ];
  const rows=entries.map(([label,value,suffix,max])=>{
    const formatted=formatNumber(value,en,max);
    const display=formatted===null?(en?'Unavailable':'Nedostupno'):`${formatted}${suffix}`;
    return `<div class="market-row"><span>${esc(label)}</span><b class="market-value">${esc(display)}</b></div>`;
  }).join('');
  return replaceBlock(html,'<div id="marketRows">','<\\/div><a class="btn" href="\\/(?:trzista|markets)\\/">',rows);
}

function hydrateNetwork(html,data,en){
  const nodes=Array.isArray(data?.nodes)?data.nodes:[];
  const active=nodes.filter(node=>node.status!=='planned');
  const planned=nodes.filter(node=>node.status==='planned');
  const center=data?.center?[data.center]:[];
  const selected=[...center,...active].slice(0,14);
  const locations=selected.map(node=>`<div class="location"><b>${esc(en?(node.name_en||node.name):(node.name_hr||node.name))}</b><span>${esc(en?(node.place_en||node.place):(node.place_hr||node.place))}${node.region?` · ${esc(node.region)}`:''}</span></div>`).join('')||`<div class="location"><b>${en?'Network data unavailable':'Podaci mreže nisu dostupni'}</b><span>${en?'Automatic refresh remains active':'Automatsko osvježavanje ostaje aktivno'}</span></div>`;
  const regions=[...new Set(active.map(node=>node.region).filter(Boolean))];
  const tabs=`<button class="active" data-region="all">${en?'All':'Sve'}</button>${regions.map(region=>`<button data-region="${esc(region)}">${esc(region)}</button>`).join('')}`;
  const plannedRows=planned.map(node=>`<li>${esc(en?(node.name_en||node.name_hr):(node.name_hr||node.name_en))}</li>`).join('');
  html=html.replace(/<div class="tabs" id="continentTabs">[\s\S]*?<\/div>/i,`<div class="tabs" id="continentTabs">${tabs}</div>`);
  html=html.replace(/<div class="location-list" id="locationList">[\s\S]*?<\/div><\/article><aside class="expansion">/i,`<div class="location-list" id="locationList">${locations}</div></article><aside class="expansion">`);
  html=html.replace(/<ul id="plannedList">[\s\S]*?<\/ul>/i,`<ul id="plannedList">${plannedRows}</ul>`);
  return html;
}

export async function hydrateIndexHtml(html,request,env,en=false){
  const [externalNews,manualNews,articles,market,network]=await Promise.all([
    read(env,'data:news:external',{items:[]}),
    read(env,'data:news:items',[]),
    read(env,'publish:approved',[]),
    read(env,'data:market:live:v1',null),
    assetJson(request,env,'/data/group_network.json',null)
  ]);
  const external=list(externalNews);
  const manual=list(manualNews).filter(item=>item?.source!=='GNK ASG Intelligence Desk'&&item?.kind!=='article');
  const news=unique([...external,...manual],100);
  const publications=unique(list(articles).filter(item=>item?.kind==='article'||item?.type==='article'||item?.approvedForPublic),100);
  let body=hydrateNews(html,news,en);
  body=hydrateArticles(body,publications,en);
  body=hydrateMarket(body,market,en);
  body=hydrateNetwork(body,network,en);
  return body;
}
