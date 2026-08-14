(()=>{
'use strict';
// GNK ASG — World Monitor podaci za AKTUAL MEDIA.
// Client-side fail-safe: top-level snapshot stariji od 6 h nikad se ne prikazuje kao LIVE.
function isEnglish(){return (document.documentElement.lang||'').toLowerCase().indexOf('en')===0||/\/en\//.test(location.pathname)||/\/en$/.test(location.pathname);}
const en=isEnglish(),MAX_AGE_MIN=360,UNAVAILABLE_MIN=2880;
const SECTIONS=[
 {cat:'natural',sub:'seismology',label_hr:'Potresi (USGS)',label_en:'Earthquakes (USGS)'},
 {cat:'natural',sub:'events',label_hr:'Aktivni prirodni događaji (NASA)',label_en:'Active natural events (NASA)'},
 {cat:'economy',sub:'economic',label_hr:'Ekonomski pokazatelji (World Bank)',label_en:'Economic indicators (World Bank)'}
];
function esc(s){return String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
function ageMinutes(iso){const t=Date.parse(iso||'');return Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/60000)):Infinity;}
function renderSection(sec,data,snapshotState){
 const label=en?sec.label_en:sec.label_hr;
 if(!data||data.state==='unavailable'||snapshotState==='unavailable')return `<div class="wmd-block"><div class="wmd-block-label">${label}</div><span class="wmd-unavailable">${en?'Temporarily unavailable':'Trenutno nedostupno'}</span></div>`;
 const hasItems=data.items&&data.items.length;
 if(!hasItems)return `<div class="wmd-block"><div class="wmd-block-label">${label}</div><span class="wmd-pending">${en?'No current items':'Trenutno nema stavki'}</span></div>`;
 const items=data.items.slice(0,5).map(it=>{const title=esc(it.title||'');const link=it.url?`<a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer nofollow" class="wmd-item-link">${title}</a>`:`<span>${title}</span>`;return `<div class="wmd-item">${link}</div>`;}).join('');
 const src=data.source_name?`<div class="wmd-source">${en?'Source':'Izvor'}: <a href="${esc(data.source_url||'#')}" target="_blank" rel="noopener noreferrer nofollow">${esc(data.source_name)}</a></div>`:'';
 const stale=snapshotState==='stale'?`<div class="wmd-stale-note">${en?'Snapshot is stale — items are historical until refresh resumes.':'Snapshot je zastario — stavke su povijesne dok se osvježavanje ne nastavi.'}</div>`:'';
 return `<div class="wmd-block"><div class="wmd-block-label">${label}</div>${stale}<div class="wmd-items">${items}</div>${src}</div>`;
}
function render(payload){
 const root=document.getElementById('akWorldMonitorData');if(!root)return;
 const age=ageMinutes(payload&&payload.updated_at),snapshotState=!Number.isFinite(age)||age>UNAVAILABLE_MIN?'unavailable':age>MAX_AGE_MIN?'stale':'fresh';
 const cats=(payload&&payload.categories)||{};
 const html=SECTIONS.map(sec=>renderSection(sec,cats[sec.cat]&&cats[sec.cat][sec.sub],snapshotState)).join('');
 const status=snapshotState==='fresh'?(en?'Fresh snapshot':'Svježi snapshot'):snapshotState==='stale'?(en?'STALE snapshot':'ZASTARJELI snapshot'):(en?'Snapshot unavailable':'Snapshot nedostupan');
 const updated=payload&&payload.updated_at?`<div class="wmd-updated"><strong>${status}</strong> · ${en?'Updated':'Ažurirano'}: ${new Date(payload.updated_at).toLocaleString(en?'en-GB':'hr-HR')} · ${Number.isFinite(age)?Math.floor(age/60)+' h':''}</div>`:'';
 root.innerHTML=`<style>.wmd-block{padding:12px 0;border-bottom:1px solid var(--ak-line)}.wmd-block-label{font-weight:700;color:var(--ak-text);font-size:.85rem;margin-bottom:8px;font-family:Arial,sans-serif}.wmd-items{display:flex;flex-direction:column;gap:6px}.wmd-item{font-size:.82rem;line-height:1.4;font-family:Arial,sans-serif}.wmd-item-link{color:var(--ak-text);text-decoration:none}.wmd-item-link:hover{color:var(--ak-red)}.wmd-unavailable{color:#c98a8a;font-size:.8rem;font-family:Arial,sans-serif}.wmd-pending,.wmd-stale-note{color:var(--ak-sub);font-size:.8rem;font-family:Arial,sans-serif}.wmd-stale-note{margin-bottom:8px}.wmd-source{font-size:.68rem;color:var(--ak-sub);margin-top:8px;font-family:Arial,sans-serif}.wmd-updated{font-size:.68rem;color:var(--ak-sub);margin-top:10px;font-family:Arial,sans-serif}</style>${html}${updated}`;
 const section=document.getElementById('akWorldMonitor');if(section){section.classList.toggle('state-stale',snapshotState==='stale');section.classList.toggle('state-unavailable',snapshotState==='unavailable');const p=section.querySelector('p');if(p&&snapshotState!=='fresh')p.textContent=snapshotState==='stale'?(en?'World Monitor data snapshot is currently delayed; the external map link remains available.':'Osvježavanje World Monitor podataka trenutno kasni; poveznica na vanjsku kartu i dalje je dostupna.'):(en?'World Monitor data snapshot is currently unavailable; the external map link remains available.':'World Monitor podatkovni snapshot trenutno nije dostupan; poveznica na vanjsku kartu i dalje je dostupna.');}
}
fetch('/data/world-monitor.json?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(render).catch(()=>{const root=document.getElementById('akWorldMonitorData');if(root)root.innerHTML=`<span class="wmd-unavailable">${en?'Data temporarily unavailable.':'Podaci trenutno nedostupni.'}</span>`;const section=document.getElementById('akWorldMonitor');if(section){section.classList.add('state-unavailable');const p=section.querySelector('p');if(p)p.textContent=en?'World Monitor data is temporarily unavailable; the external map link remains available.':'World Monitor podaci trenutno nisu dostupni; poveznica na vanjsku kartu i dalje je dostupna.';}});
})();
