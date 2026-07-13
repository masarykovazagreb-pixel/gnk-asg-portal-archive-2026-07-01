(()=>{
'use strict';
if(window.__GNK_NEWSROOM_LIVE_V3__)return;window.__GNK_NEWSROOM_LIVE_V3__=true;
const path=location.pathname.replace(/\/+$/,'')||'/';
const english=document.documentElement.lang?.toLowerCase().startsWith('en')||path.startsWith('/en/');
const supported=path==='/newsroom'||path==='/en/newsroom'||path==='/sadrzaj'||path==='/en/content';
if(!supported)return;
const endpoint=`/api/public-news?limit=60&lang=${english?'en':'hr'}`;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const date=value=>{try{return new Intl.DateTimeFormat(english?'en-GB':'hr-HR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}catch{return'';}};
const host=document.querySelector('main.wrap')||document.querySelector('main')||document.body;
let section=document.getElementById('gnk-business-news-live');
if(!section){section=document.createElement('section');section.id='gnk-business-news-live';section.className=path.includes('newsroom')?'card':'container';const anchor=path.includes('newsroom')?[...host.querySelectorAll('section.card')].pop():host.lastElementChild;host.insertBefore(section,anchor||null);}
const title=english?'Live business news':'Poslovne vijesti uživo';
const lead=english?'Automatically refreshed business, technology and group news.':'Automatski osvježavane poslovne, tehnološke i grupne vijesti.';
const css=document.createElement('style');css.textContent=`#gnk-business-news-live{margin-top:28px;margin-bottom:28px}#gnk-business-news-live .gnk-news-head{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:18px}#gnk-business-news-live .gnk-news-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}#gnk-business-news-live article{border:1px solid #d8dee9;border-radius:18px;padding:18px;background:#fff}#gnk-business-news-live h3{margin:8px 0;color:#07162d;font-size:18px}#gnk-business-news-live p{color:#64748b;line-height:1.55}#gnk-business-news-live .meta{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#9a6d1f}#gnk-business-news-live a{font-weight:800;color:#143b6d;text-decoration:none}@media(max-width:900px){#gnk-business-news-live .gnk-news-grid{grid-template-columns:1fr 1fr}}@media(max-width:620px){#gnk-business-news-live .gnk-news-grid{grid-template-columns:1fr}.gnk-news-head{align-items:flex-start!important;flex-direction:column}}`;document.head.appendChild(css);
async function loadItems(){
  const items=[];
  try{const response=await fetch(`${endpoint}&_=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});if(response.ok){const data=await response.json();(Array.isArray(data.posts)?data.posts:Array.isArray(data.items)?data.items:Array.isArray(data.news)?data.news:[]).forEach(x=>items.push(x));}}catch{}
  if(!items.length){try{const response=await fetch('/data/news.json?v='+Date.now(),{cache:'no-store'});if(response.ok){const data=await response.json();(Array.isArray(data)?data:data.items||[]).slice(0,60).forEach(x=>items.push(x));}}catch{}}
  return items;
}
async function render(){
  section.innerHTML=`<div class="gnk-news-head"><div><p class="meta">${english?'LIVE FEED':'ŽIVI FEED'}</p><h2>${title}</h2><p>${lead}</p></div><small>${english?'Refreshing…':'Osvježavanje…'}</small></div><div class="gnk-news-grid"><article><h3>${english?'Loading news…':'Učitavanje vijesti…'}</h3></article></div>`;
  try{
    const posts=await loadItems();
    const grid=section.querySelector('.gnk-news-grid');const stamp=section.querySelector('small');stamp.textContent=`${english?'Updated':'Ažurirano'}: ${new Date().toLocaleTimeString(english?'en-GB':'hr-HR',{hour:'2-digit',minute:'2-digit'})}`;
    if(!posts.length){grid.innerHTML=`<article><h3>${english?'No published news yet.':'Još nema objavljenih vijesti.'}</h3><p>${english?'The feed is active and waiting for published items.':'Feed je aktivan i čeka objavljene stavke.'}</p></article>`;return;}
    grid.innerHTML=posts.map(post=>{const href=post.slug?`${english?'/en':''}/newsroom/${encodeURIComponent(post.slug)}/`:(post.url||post.href||`${english?'/en':''}/newsroom/`);return `<article><span class="meta">${esc(post.category||post.sourceName||post.source||'News')}</span><h3>${esc(post.title||'News')}</h3><p>${esc(post.summary||post.description||'')}</p><p><small>${esc(date(post.publishedAt||post.createdAt||post.published_at||post.date))}</small></p><a href="${esc(href)}"${/^https?:/i.test(href)?' target="_blank" rel="noopener nofollow"':''}>${english?'Read more':'Otvori vijest'} →</a></article>`;}).join('');
  }catch(error){section.innerHTML=`<div class="gnk-news-head"><div><p class="meta">${english?'LIVE FEED':'ŽIVI FEED'}</p><h2>${title}</h2></div></div><div class="gnk-news-grid"><article><h3>${english?'News feed temporarily unavailable.':'Feed vijesti privremeno nije dostupan.'}</h3><p>${esc(error?.message||'')}</p></article></div>`;}
}
render();setInterval(render,300000);
})();