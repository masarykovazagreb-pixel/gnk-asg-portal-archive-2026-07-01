(()=>{
'use strict';
if(window.__GNK_MEDIA_APPLICATIONS_REVIEW_V1__)return;
window.__GNK_MEDIA_APPLICATIONS_REVIEW_V1__=true;
const API='/api/media-registration-admin';
const state={query:'',status:'',country:'',page:1,pageSize:50,pages:1,total:0,items:[],current:null,loading:false};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));
const text=value=>String(value??'').trim();
const formatDate=value=>{if(!value)return'—';try{return new Intl.DateTimeFormat('hr-HR',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Zagreb'}).format(new Date(value));}catch{return value;}};
const formatBytes=value=>{const size=Number(value||0);if(!size)return'0 KB';if(size<1024*1024)return`${Math.ceil(size/1024)} KB`;return`${(size/1024/1024).toFixed(2)} MB`;};
const label=value=>String(value||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/^./,c=>c.toUpperCase());
const flagText={INCOMPLETE_PROFILE:'Nepotpun profil',NO_DOCUMENTS:'Nema dokumenata',DUPLICATE_EMAIL:'Duplikat e-maila',DUPLICATE_OUTLET:'Duplikat redakcije',DOMAIN_MISMATCH:'Domena se ne podudara',STALE_APPLICATION:'Zastarjela prijava',DELIVERY_ERROR:'Greška dostave',ACCESS_EXPIRED:'Pristup istekao'};
if(!document.getElementById('mediaReviewFlagsStyle'))document.head.insertAdjacentHTML('beforeend','<style id="mediaReviewFlagsStyle">.media-review-kpis{grid-template-columns:repeat(auto-fit,minmax(125px,1fr))}.media-review-flags{display:flex;flex-wrap:wrap;gap:5px;max-width:230px}.media-review-flag{display:inline-flex;padding:4px 7px;border:1px solid rgba(245,158,11,.38);border-radius:999px;color:#fde68a;background:rgba(245,158,11,.07);font-size:8px;font-weight:900;line-height:1.2;text-transform:uppercase}.media-review-flag.high{border-color:rgba(239,68,68,.42);color:#fecaca;background:rgba(239,68,68,.07)}.media-review-flag.clear{border-color:rgba(34,197,94,.38);color:#86efac;background:rgba(34,197,94,.07)}.media-review-attention{border-color:rgba(245,158,11,.28)!important;background:rgba(245,158,11,.035)!important}.media-review-attention.high{border-color:rgba(239,68,68,.34)!important;background:rgba(239,68,68,.035)!important}</style>');
async function api(path,options={}){
 const isForm=typeof FormData!=='undefined'&&options.body instanceof FormData;
 const response=await fetch(API+path,{credentials:'same-origin',cache:'no-store',...options,headers:{accept:'application/json',...(isForm?{}:{'content-type':'application/json'}),...(options.headers||{})}});
 const data=await response.json().catch(()=>({ok:false,error:`HTTP_${response.status}`}));
 if(!response.ok||!data.ok)throw new Error(data.message||data.error||`HTTP ${response.status}`);
 return data;
}
function markup(){
 const host=document.createElement('section');
 host.className='media-review-center';host.id='mediaApplicationsReview';
 host.innerHTML=`<div class="media-review-head"><div><p class="media-review-eyebrow">Protected administration · same operator token</p><h2>Media Applications Review Center</h2><p>Centralni pregled samostalno registriranih redakcija, prijava, putnih podataka, dokumenata, revizija i odluka. Javna prijava ostaje otvorena; ovaj pregled ostaje zaštićen.</p></div><div class="media-review-actions"><a class="media-review-button" href="/media-application/?lang=en" target="_blank" rel="noopener">Javna prijava ↗</a><button class="media-review-button" id="mediaReviewExport" type="button">CSV</button><button class="media-review-button primary" id="mediaReviewRefresh" type="button">Osvježi</button></div></div><div class="media-review-filters"><div class="media-review-field"><label for="mediaReviewQuery">Pretraga</label><input id="mediaReviewQuery" type="search" placeholder="Redakcija, e-mail, šifra ili ID prijave"></div><div class="media-review-field"><label for="mediaReviewStatus">Status</label><select id="mediaReviewStatus"><option value="">Svi statusi</option><option>DRAFT</option><option>SUBMITTED</option><option>NEEDS_INFORMATION</option><option>APPROVED</option><option>NEEDS_TRAVEL_DOCUMENTS</option><option>TRAVEL_CONFIRMED</option><option>REJECTED</option></select></div><div class="media-review-field"><label for="mediaReviewCountry">Država</label><select id="mediaReviewCountry"><option value="">Sve države</option></select></div><div class="media-review-field"><label for="mediaReviewPageSize">Po stranici</label><select id="mediaReviewPageSize"><option>25</option><option selected>50</option><option>100</option></select></div></div><div class="media-review-kpis" id="mediaReviewKpis"></div><div class="media-review-tablewrap"><table class="media-review-table"><thead><tr><th>Prijava</th><th>Redakcija</th><th>Država</th><th>Kontakt</th><th>Osobe / dokumenti</th><th>Popunjenost</th><th>Status</th><th>Provjera</th><th>Zadnja izmjena</th><th></th></tr></thead><tbody id="mediaReviewBody"><tr><td colspan="10" class="media-review-loading">Učitavanje prijava…</td></tr></tbody></table></div><div class="media-review-pagination"><span id="mediaReviewPageLabel">—</span><div><button class="media-review-button" id="mediaReviewPrevious" type="button">Prethodna</button><button class="media-review-button" id="mediaReviewNext" type="button">Sljedeća</button></div></div><div class="media-review-drawer" id="mediaReviewDrawer" data-open="0" aria-hidden="true"><div class="media-review-backdrop" data-close="1"></div><aside class="media-review-panel" role="dialog" aria-modal="true" aria-labelledby="mediaReviewDrawerTitle"><div class="media-review-panelhead"><div><p class="media-review-eyebrow">Application detail</p><h2 id="mediaReviewDrawerTitle">Prijava</h2><p id="mediaReviewDrawerMeta">—</p></div><button class="media-review-close" type="button" data-close="1" aria-label="Zatvori">×</button></div><div id="mediaReviewDetail" class="media-review-loading">Učitavanje…</div></aside></div>`;
 const legacy=[...document.querySelectorAll('section.panel')].find(section=>section.querySelector('h2')?.textContent.includes('Prijave u centralnoj bazi'));
 if(legacy){legacy.hidden=true;legacy.dataset.legacyMediaRegistrations='true';legacy.insertAdjacentElement('beforebegin',host);}else document.querySelector('main')?.appendChild(host);
 return host;
}
function kpis(summary={},pageAttention=0){
 const defs=[['ATTENTION','Za provjeru',pageAttention],['DRAFT','Nacrti'],['SUBMITTED','Predano'],['NEEDS_INFORMATION','Dopuna'],['APPROVED','Odobreno'],['NEEDS_TRAVEL_DOCUMENTS','Putni dokumenti'],['TRAVEL_CONFIRMED','Put potvrđen']];
 document.getElementById('mediaReviewKpis').innerHTML=defs.map(([key,name,value])=>`<article class="media-review-kpi"><b>${Number(value??summary[key]??0).toLocaleString('hr-HR')}</b><span>${esc(name)}</span></article>`).join('');
}
function status(value){const s=text(value)||'DRAFT';return`<span class="media-review-status ${esc(s)}">${esc(s)}</span>`;}
function flags(item,expanded=false){
 const items=Array.isArray(item?.reviewFlags)?item.reviewFlags:[];
 if(!items.length)return'<div class="media-review-flags"><span class="media-review-flag clear">Bez oznaka</span></div>';
 const visible=expanded?items:items.slice(0,2),more=!expanded&&items.length>2?`<span class="media-review-flag">+${items.length-2}</span>`:'';
 return`<div class="media-review-flags">${visible.map(flag=>`<span class="media-review-flag ${flag.severity==='high'?'high':''}" title="${esc(flag.label||'')}">${esc(flagText[flag.code]||flag.code)}</span>`).join('')}${more}</div>`;
}
function renderList(data){
 state.items=data.items||[];state.page=data.pagination?.page||1;state.pages=data.pagination?.pages||1;state.total=data.pagination?.total||0;
 kpis(data.summary||{},Number(data.pageAttention||0));
 const country=document.getElementById('mediaReviewCountry'),selected=country.value;
 country.innerHTML='<option value="">Sve države</option>'+((data.countries||[]).map(item=>`<option value="${esc(item)}">${esc(item)}</option>`).join(''));
 if([...country.options].some(option=>option.value===selected))country.value=selected;
 const body=document.getElementById('mediaReviewBody');
 body.innerHTML=state.items.length?state.items.map(item=>`<tr class="${item.hasAttention?`media-review-attention ${item.reviewPriority==='high'?'high':''}`:''}"><td><strong>${esc(item.applicationId||'DRAFT')}</strong><br><small>${esc(item.mailCode)}</small></td><td><strong>${esc(item.outlet||'—')}</strong>${item.brandName?`<br><small>${esc(item.brandName)}</small>`:''}</td><td>${esc(item.country||'—')}</td><td>${esc(item.editorName||'—')}<br><small>${esc(item.email||'')}</small></td><td>${Number(item.participants||0)} osoba<br><small>${Number(item.documentCount||0)} dok.</small></td><td><div class="media-review-progress"><div><i style="width:${Math.min(100,Math.max(0,Number(item.completionScore||0)))}%"></i></div><small>${Number(item.completionScore||0)}%</small></div></td><td>${status(item.status)}</td><td>${flags(item)}</td><td>${esc(formatDate(item.updatedAt))}<br><small>v${Number(item.revision||1)}</small></td><td><button class="media-review-button" type="button" data-open-code="${esc(item.mailCode)}">Otvori</button></td></tr>`).join(''):'<tr><td colspan="10" class="media-review-empty">Nema prijava za odabrane filtre.</td></tr>';
 document.getElementById('mediaReviewPageLabel').textContent=`Stranica ${state.page} od ${state.pages} · ukupno ${state.total.toLocaleString('hr-HR')}`;
 document.getElementById('mediaReviewPrevious').disabled=state.page<=1;
 document.getElementById('mediaReviewNext').disabled=state.page>=state.pages;
 body.querySelectorAll('[data-open-code]').forEach(button=>button.addEventListener('click',()=>openDetail(button.dataset.openCode)));
}
async function refresh(){
 if(state.loading)return;state.loading=true;
 const params=new URLSearchParams({page:String(state.page),pageSize:String(state.pageSize)});
 if(state.query)params.set('query',state.query);if(state.status)params.set('status',state.status);if(state.country)params.set('country',state.country);
 try{renderList(await api(`/applications?${params}`));}
 catch(error){document.getElementById('mediaReviewBody').innerHTML=`<tr><td colspan="10" class="media-review-empty">${esc(error.message)}</td></tr>`;}
 finally{state.loading=false;}
}
function dataCells(object={},exclude=[]){
 return Object.entries(object||{}).filter(([key,value])=>!exclude.includes(key)&&value!==''&&value!==null&&value!==undefined&&typeof value!=='object').map(([key,value])=>`<div class="media-review-data"><small>${esc(label(key))}</small><span>${esc(typeof value==='boolean'?(value?'Da':'Ne'):value)}</span></div>`).join('')||'<p class="media-review-empty">Nema podataka.</p>';
}
function objectSection(title,object){return`<section class="media-review-section"><h3>${esc(title)}</h3><div class="media-review-grid">${dataCells(object)}</div></section>`;}
function participants(items=[]){
 return`<section class="media-review-section"><h3>Predstavnici redakcije (${items.length})</h3>${items.length?items.map((item,index)=>`<article class="media-review-participant"><strong>${index+1}. ${esc(item.fullName||'Predstavnik')}</strong><div class="media-review-grid" style="margin-top:9px">${dataCells(item,['fullName'])}</div></article>`).join(''):'<p class="media-review-empty">Nema unesenih predstavnika.</p>'}</section>`;
}
function attention(application){return`<section class="media-review-section"><h3>Oznake za ljudsku provjeru</h3>${flags(application,true)}<div class="media-review-notice">Ove oznake su informativne. Ne odobravaju, ne odbijaju i ne mijenjaju status prijave bez tvoje odluke.</div></section>`;}
function documents(items=[]){return`<section class="media-review-section"><h3>Dokumenti (${items.length})</h3><div class="media-review-docs">${items.length?items.map(item=>`<div class="media-review-doc"><div><strong>${esc(item.filename)}</strong><br><small>${esc(item.category)} · ${esc(formatBytes(item.size_bytes))} · ${esc(formatDate(item.created_at))}</small></div><a href="${esc(item.downloadUrl)}" target="_blank" rel="noopener">Preuzmi</a></div>`).join(''):'<p class="media-review-empty">Nema dokumenata.</p>'}</div></section>`;}
function audit(items=[]){return`<section class="media-review-section"><h3>Audit povijest (${items.length})</h3><div class="media-review-audit">${items.length?items.map(item=>`<div class="media-review-event"><div><strong>${esc(item.eventType)}</strong><pre>${esc(JSON.stringify(item.detail||{},null,2))}</pre></div><time>${esc(formatDate(item.createdAt))}</time></div>`).join(''):'<p class="media-review-empty">Nema audit zapisa.</p>'}</div></section>`;}
function decision(application){return`<section class="media-review-section"><h3>Odluka i status</h3><div class="media-review-decision"><div class="media-review-field"><label>Status</label><select id="mediaReviewDecision"><option value="">Odaberi</option>${['DRAFT','SUBMITTED','NEEDS_INFORMATION','APPROVED','NEEDS_TRAVEL_DOCUMENTS','TRAVEL_CONFIRMED','REJECTED'].map(value=>`<option value="${value}"${value===application.status?' selected':''}>${value}</option>`).join('')}</select></div><div class="media-review-field"><label>Obrazloženje / napomena</label><textarea id="mediaReviewReason" rows="3" placeholder="Interna napomena za audit trag"></textarea></div><button class="media-review-button primary" id="mediaReviewSaveDecision" type="button">Spremi odluku</button></div><div class="media-review-notice">Promjena statusa upisuje se u audit bazu. Ne šalje automatski masovni e-mail i ne mijenja javni link prijave.</div></section>`;}
function renderDetail(data){
 const a=data.application||{},d=a.data||{},newsroom=d.newsroom||{};
 document.getElementById('mediaReviewDrawerTitle').textContent=a.outlet||newsroom.legalName||'Prijava';
 document.getElementById('mediaReviewDrawerMeta').textContent=`${a.applicationId||'DRAFT'} · ${a.mailCode} · ${a.country||'—'} · v${a.revision||1}`;
 const summary={status:a.status,completionScore:a.completionScore,reviewPriority:a.reviewPriority,submittedAt:formatDate(a.submittedAt),approvedAt:formatDate(a.approvedAt),updatedAt:formatDate(a.updatedAt),mailStatus:a.mailStatus,accessStatus:a.accessStatus,accessExpiresAt:formatDate(a.accessExpiresAt),language:a.language,recipientName:a.recipientName,recipientTitle:a.recipientTitle};
 document.getElementById('mediaReviewDetail').innerHTML=`<section class="media-review-section"><h3>Sažetak</h3><div class="media-review-grid">${dataCells(summary)}</div></section>${attention(a)}${objectSection('Redakcija i odgovorni urednik',newsroom)}${participants(d.participants||[])}${objectSection('Putovanje',d.travel||{})}${objectSection('Hotel i boravak',d.hotel||{})}${objectSection('Program i produkcija',d.programme||{})}${objectSection('Izjave i suglasnosti',d.declarations||{})}${d.notes?objectSection('Dodatne napomene',{notes:d.notes}):''}${documents(a.documents||[])}${decision(a)}${audit(a.audit||[])}`;
 document.getElementById('mediaReviewSaveDecision')?.addEventListener('click',()=>saveDecision(a.mailCode));
}
async function openDetail(mailCode){
 const drawer=document.getElementById('mediaReviewDrawer');drawer.dataset.open='1';drawer.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';document.getElementById('mediaReviewDetail').innerHTML='<div class="media-review-loading">Učitavanje detalja…</div>';
 try{const data=await api(`/application?mailCode=${encodeURIComponent(mailCode)}`);state.current=data.application;renderDetail(data);}catch(error){document.getElementById('mediaReviewDetail').innerHTML=`<div class="media-review-empty">${esc(error.message)}</div>`;}
}
function closeDetail(){const drawer=document.getElementById('mediaReviewDrawer');drawer.dataset.open='0';drawer.setAttribute('aria-hidden','true');document.body.style.overflow='';state.current=null;}
async function saveDecision(mailCode){
 const statusValue=document.getElementById('mediaReviewDecision')?.value||'',reason=document.getElementById('mediaReviewReason')?.value||'';
 if(!statusValue){alert('Odaberite status.');return;}
 if(!confirm(`Postaviti ${mailCode} na ${statusValue}?`))return;
 const button=document.getElementById('mediaReviewSaveDecision');button.disabled=true;
 try{await api('/decision',{method:'POST',body:JSON.stringify({mailCode,status:statusValue,reason})});await openDetail(mailCode);await refresh();}
 catch(error){alert(error.message);}finally{button.disabled=false;}
}
function csv(){
 if(!state.items.length)return;
 const headers=['Application ID','Mail Code','Newsroom','Brand','Country','Email','Editor','Participants','Documents','Completion','Status','Review Priority','Review Flags','Updated'];
 const rows=state.items.map(item=>[item.applicationId,item.mailCode,item.outlet,item.brandName,item.country,item.email,item.editorName,item.participants,item.documentCount,item.completionScore,item.status,item.reviewPriority,(item.reviewFlags||[]).map(flag=>flag.code).join('|'),item.updatedAt]);
 const encode=value=>`"${String(value??'').replace(/"/g,'""')}"`;
 const blob=new Blob(['\uFEFF'+[headers,...rows].map(row=>row.map(encode).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`media-applications-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function install(){
 const host=markup();if(!host)return;
 let timer=0;
 document.getElementById('mediaReviewQuery').addEventListener('input',event=>{clearTimeout(timer);timer=setTimeout(()=>{state.query=event.target.value.trim();state.page=1;refresh();},300);});
 document.getElementById('mediaReviewStatus').addEventListener('change',event=>{state.status=event.target.value;state.page=1;refresh();});
 document.getElementById('mediaReviewCountry').addEventListener('change',event=>{state.country=event.target.value;state.page=1;refresh();});
 document.getElementById('mediaReviewPageSize').addEventListener('change',event=>{state.pageSize=Number(event.target.value)||50;state.page=1;refresh();});
 document.getElementById('mediaReviewRefresh').addEventListener('click',refresh);
 document.getElementById('mediaReviewExport').addEventListener('click',csv);
 document.getElementById('mediaReviewPrevious').addEventListener('click',()=>{if(state.page>1){state.page--;refresh();}});
 document.getElementById('mediaReviewNext').addEventListener('click',()=>{if(state.page<state.pages){state.page++;refresh();}});
 host.querySelectorAll('[data-close]').forEach(node=>node.addEventListener('click',closeDetail));
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDetail();});
 refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
