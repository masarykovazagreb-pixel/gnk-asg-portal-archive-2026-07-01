(()=>{
'use strict';
if(window.__GNK_INDEX_EDITORIAL_ORDER_V3__)return;window.__GNK_INDEX_EDITORIAL_ORDER_V3__=true;
const path=location.pathname.replace(/\/+$/,'')||'/';
const en=document.documentElement.lang?.toLowerCase().startsWith('en')||path==='/en'||path.startsWith('/en/');
if(path!=='/'&&path!=='/en')return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const externalHref=href=>/^https?:\/\//i.test(String(href||''));
const style=document.createElement('style');style.textContent=`.gnk-editorial-section{margin-top:28px}.gnk-editorial-section-head{display:flex;justify-content:space-between;gap:18px;align-items:end;margin-bottom:14px}.gnk-editorial-section-head h3{margin:0;color:#071a38;font:800 clamp(24px,3vw,34px)/1.15 Georgia,serif}.gnk-editorial-section-head a{font-weight:800;color:#9a6d1f;text-decoration:none}.gnk-editorial-section .gnk-grid{margin-top:0}.gnk-index-empty{grid-column:1/-1;margin:0;padding:18px;border:1px solid rgba(7,26,56,.12);border-radius:14px;background:#fff;color:#52606f}.gnk-card[data-source="external"] .gnk-meta::after{content:" ↗"}@media(max-width:680px){.gnk-editorial-section-head{align-items:flex-start;flex-direction:column}}`;document.head.appendChild(style);
const card=(meta,title,summary,href,{external=false}={})=>{const safeHref=esc(href||'#'),attrs=external?' target="_blank" rel="noopener noreferrer nofollow" data-source="external"':'';return `<a class="gnk-card" href="${safeHref}"${attrs}><span class="gnk-meta">${esc(meta)}</span><h3>${esc(title)}</h3><p>${esc(summary)}</p></a>`};
const publications=()=>en?[card('Publication','Investor confidence through transparency','Corporate transparency as the basis of long-term trust.','/objave/povjerenje-investitora-kroz-transparentnost/'),card('Publication','Cybersecurity and business continuity','Operational resilience and responsible digital-risk governance.','/objave/kiberneticka-sigurnost-i-poslovni-kontinuitet/')]:[card('Objava','Povjerenje investitora kroz transparentnost','Korporativna transparentnost kao temelj dugoročnog povjerenja.','/objave/povjerenje-investitora-kroz-transparentnost/'),card('Objava','Kibernetička sigurnost i poslovni kontinuitet','Operativna otpornost i odgovorno upravljanje digitalnim rizicima.','/objave/kiberneticka-sigurnost-i-poslovni-kontinuitet/')];
const analyses=()=>en?[card('Analysis','AI infrastructure and energy consumption','Computing capacity, data centres and energy as one strategic business question.','/analize/ai-infrastruktura-i-potrosnja-energije/'),card('Analysis','Data transparency as business infrastructure','Documented data and audit trails as the foundation of trust and risk control.','/analize/transparentnost-podataka-kao-poslovna-infrastruktura/')]:[card('Analiza','AI infrastruktura i potrošnja energije','Računalna snaga, podatkovni centri i energija kao jedno strateško poslovno pitanje.','/analize/ai-infrastruktura-i-potrosnja-energije/'),card('Analiza','Transparentnost podataka kao poslovna infrastruktura','Dokumentirani podaci i audit tragovi kao temelj povjerenja i kontrole rizika.','/analize/transparentnost-podataka-kao-poslovna-infrastruktura/')];
const commentary=()=>en?[card('Commentary','Responsibility cannot be automated','Technology accelerates decisions, but accountability remains human.','/komentari/odgovornost-se-ne-moze-automatizirati/'),card('Commentary','Money is information before capital','Financial flows as a data and governance system.','/komentari/novac-je-informacija-prije-nego-kapital/')]:[card('Komentar','Odgovornost se ne može automatizirati','Tehnologija ubrzava odluke, ali odgovornost ostaje ljudska.','/komentari/odgovornost-se-ne-moze-automatizirati/'),card('Komentar','Novac je informacija prije nego kapital','Financijski tokovi kao podatkovni i upravljački sustav.','/komentari/novac-je-informacija-prije-nego-kapital/')];
const langAllowed=item=>{const lang=String(item?.language||item?.lang||'').toLowerCase();return en?lang==='en':lang!=='en';};
const dedupeKey=item=>String(item?.sourceUrl||item?.url||item?.share_url||item?.title||'').trim().toLowerCase().replace(/\s+/g,' ');
const hrefFor=item=>item?.__published&&item?.slug?`${en?'/en':''}/newsroom/${encodeURIComponent(item.slug)}/`:(item?.href||item?.share_url||item?.url||(en?'/en/newsroom/':'/newsroom/'));
async function fetchJson(url,timeout=7000){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{const response=await fetch(url,{cache:'no-store',headers:{accept:'application/json'},signal:controller.signal});if(!response.ok)throw new Error(`${url}:${response.status}`);return await response.json();}finally{clearTimeout(timer)}}
async function news(){
  const out=[];
  const [liveResult,fallbackResult]=await Promise.allSettled([
    fetchJson('/api/public-news?limit=12&lang='+(en?'en':'hr')),
    fetchJson('/data/news.json?v='+Date.now())
  ]);
  if(liveResult.status==='fulfilled'){const data=liveResult.value;(data.posts||data.items||data.news||[]).forEach(item=>out.push({...item,__published:true}));}
  if(fallbackResult.status==='fulfilled'){const data=fallbackResult.value;(Array.isArray(data)?data:data.items||[]).filter(langAllowed).forEach(item=>out.push({...item,__fallback:true}));}
  const seen=new Set(),cards=[];
  for(const item of out){if(!item?.title)continue;const key=dedupeKey(item);if(!key||seen.has(key))continue;seen.add(key);const href=hrefFor(item);cards.push(card(item.category||item.sourceName||item.source||'Newsroom',item.title,item.summary||item.description||'',href,{external:externalHref(href)}));if(cards.length>=6)break;}
  return cards;
}
function section(title,href,cards,{emptyText=''}={}){const body=cards.length?cards.join(''):`<p class="gnk-index-empty" role="status">${esc(emptyText)}</p>`;return `<section class="gnk-editorial-section"><div class="gnk-editorial-section-head"><h3>${esc(title)}</h3><a href="${esc(href)}">${en?'Open all':'Otvori sve'} →</a></div><div class="gnk-grid">${body}</div></section>`;}
function findHost(maxAttempts=20,delay=150){return new Promise(resolve=>{let attempts=0;const check=()=>{const host=document.querySelector('#gnk-index-zone .gnk-index-panel');if(host)return resolve(host);attempts+=1;if(attempts>=maxAttempts)return resolve(null);setTimeout(check,delay)};check()})}
async function build(){
  const host=await findHost();if(!host||host.dataset.editorialOrdered==='1')return;
  const old=host.querySelector('#gnk-editorial-grid');if(!old)return;
  host.dataset.editorialOrdered='1';
  const newsCards=await news();
  old.remove();host.querySelector('.gnk-actions')?.remove();
  host.insertAdjacentHTML('beforeend',section(en?'Publications':'Objave','/objave/',publications())+section(en?'Business news':'Poslovne vijesti',en?'/en/newsroom/':'/newsroom/',newsCards,{emptyText:en?'News is temporarily unavailable.':'Vijesti trenutačno nisu dostupne.'})+section(en?'Analyses':'Analize','/analize/',analyses())+section(en?'Commentary':'Komentari','/komentari/',commentary()));
  host.dataset.editorialState=newsCards.length?'ready':'empty';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
