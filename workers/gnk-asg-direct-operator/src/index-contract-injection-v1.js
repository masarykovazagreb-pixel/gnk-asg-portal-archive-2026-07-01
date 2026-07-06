export const VERSION='GNK_ASG_INDEX_CONTRACT_INJECTION_V1_20260706';

const GOOGLE_VERIFY='vm8dzy11_wDnJ2GetbYVM_tYZWL3geHWH__riLIldjU';
const clean=value=>String(value||'').trim();
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function isIndexPath(path){return path==='/'||path==='/en';}
function contractBlock(lang){
  const en=lang==='en';
  return `\n<section id="gnk-index-contract-v1" class="wrap panel" data-index-contract="${VERSION}" aria-label="${en?'Live index contract':'Live index contract'}">\n  <div class="head"><div><p class="k">${en?'Live verification board':'Live verification board'}</p><h2>${en?'Financials, market, publications and network.':'Financije, tržište, objave i mreža.'}</h2></div><p>${en?'Runtime-safe contract targets for public data, validators and production JavaScript.':'Runtime-safe contract mete za javne podatke, validatore i produkcijski JavaScript.'}</p></div>\n  <div class="grid three">\n    <article class="card"><h3 id="featuredTitle">GNK ASG Intelligence</h3><p id="featuredSummary">${en?'Loading public news and publications.':'Učitavanje javnih vijesti i objava.'}</p><a id="featuredLink" class="btn gold" href="${en?'/news/':'/vijesti/'}">${en?'Open':'Otvori'}</a></article>\n    <article class="card"><h3>${en?'Market status':'Tržišni status'}</h3><div id="marketRows"><div class="market-row"><span>${en?'Loading market view…':'Učitavanje tržišnog pregleda…'}</span><b class="market-value">—</b></div></div></article>\n    <article class="card"><h3>${en?'Network':'Mreža'}</h3><div id="continentTabs" class="tabs"><button class="active" type="button">${en?'All':'Sve'}</button></div><div id="locationList"><div class="location"><b>GNK ASG d.o.o.</b><span>Zagreb · ${en?'Croatia':'Hrvatska'}</span></div></div><ul id="plannedList"><li>${en?'Loading planned locations…':'Učitavanje planiranih lokacija…'}</li></ul></article>\n  </div>\n  <div class="grid three">\n    <article class="card"><h3>${en?'Latest news':'Najnovije vijesti'}</h3><div id="latestNews"><a class="news-item" href="${en?'/news/':'/vijesti/'}"><strong>${en?'Loading…':'Učitavanje…'}</strong><small>GNK ASG Intelligence Desk</small></a></div></article>\n    <article class="card"><h3>${en?'Official publications':'Službene objave'}</h3><div id="publicationRows"><a class="publication-row" href="${en?'/publications/':'/objave/'}"><span>${en?'Loading publications…':'Učitavanje objava…'}</span><small>GNK ASG</small></a></div></article>\n    <article class="card"><h3>THE CODE</h3><p>${en?'Index contract restored without deployment-side mail or campaign actions.':'Index contract vraćen bez slanja maila, kampanja ili deploy radnji.'}</p></article>\n  </div>\n</section>\n`;
}
export async function patchIndexContractResponse(request,response){
  const path=pathOf(request);
  if(!isIndexPath(path)||request.method!=='GET'||response.status!==200)return response;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html'))return response;
  let body=await response.text();
  const lang=path==='/en'?'en':'hr';
  if(!body.includes('name="google-site-verification"')){
    body=body.replace('</head>',`<meta name="google-site-verification" content="${GOOGLE_VERIFY}">\n</head>`);
  }
  if(!body.includes('id="latestNews"')){
    body=body.replace('</main>',`${contractBlock(lang)}</main>`);
  }
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-index-contract-injection',VERSION);
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}
