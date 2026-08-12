(()=>{
'use strict';
const DASHBOARD_URL='https://www.worldmonitor.app/dashboard?lat=20.0000&lon=0.0000&zoom=1.00&view=global&timeRange=7d&layers=bases%2Ccables%2Cpipelines%2Cais%2Csanctions%2Cweather%2Ceconomic%2Coutages%2Cnatural%2Cminerals%2CtradeRoutes';
const path=(location.pathname.replace(/\/+$/,'')||'/');
const isAktual=path==='/gnk-aktual'||path==='/en/gnk-aktual';
if(!isAktual||document.getElementById('akWorldMonitor')) return;
const en=path.startsWith('/en/');
const labels=en?{
 eyebrow:'GLOBAL INTELLIGENCE · EXTERNAL LIVE DASHBOARD',title:'World Monitor',
 body:'A map-first global intelligence dashboard for monitoring military bases, submarine cables, pipelines, maritime traffic, sanctions, weather, economic signals, outages, natural events, critical minerals and trade routes. The selected view opens the global 7-day configuration requested for AKTUAL MEDIA.',
 local:'World Monitor page',open:'Open live dashboard',note:'External service · opens worldmonitor.app in a new tab',
 layers:['Military bases','Cables','Pipelines','AIS / maritime','Sanctions','Weather','Economic','Outages','Natural events','Critical minerals','Trade routes']
}:{
 eyebrow:'GLOBALNI INTELLIGENCE · VANJSKI LIVE DASHBOARD',title:'World Monitor',
 body:'Interaktivni globalni intelligence dashboard za praćenje vojnih baza, podmorskih kabela, cjevovoda, pomorskog prometa, sankcija, vremena, ekonomskih signala, prekida, prirodnih događaja, kritičnih minerala i trgovačkih ruta. Otvara se globalni prikaz za zadnjih 7 dana koji je zadan za AKTUAL MEDIA.',
 local:'World Monitor stranica',open:'Otvori live dashboard',note:'Vanjska usluga · otvara worldmonitor.app u novoj kartici',
 layers:['Vojne baze','Kabeli','Cjevovodi','AIS / pomorski promet','Sankcije','Vrijeme','Ekonomija','Prekidi','Prirodni događaji','Kritični minerali','Trgovačke rute']
};
const section=document.createElement('section');
section.id='akWorldMonitor';
section.className='ak-world-monitor';
section.setAttribute('aria-labelledby','akWorldMonitorTitle');
const chips=labels.layers.map(x=>`<span>${x}</span>`).join('');
section.innerHTML=`<div class="ak-wm-copy"><p class="ak-wm-eyebrow">${labels.eyebrow}</p><h2 id="akWorldMonitorTitle">${labels.title}</h2><p>${labels.body}</p><div class="ak-wm-layers" aria-label="${en?'Active dashboard layers':'Aktivni slojevi dashboarda'}">${chips}</div><div class="ak-wm-actions"><a class="ak-wm-primary" href="${DASHBOARD_URL}" target="_blank" rel="noopener noreferrer">${labels.open}</a><a class="ak-wm-secondary" href="${en?'/en/world-monitor/':'/world-monitor/'}">${labels.local}</a></div><small>${labels.note}</small></div><div class="ak-wm-map" aria-hidden="true"><div class="ak-wm-globe">◎</div><strong>GLOBAL · 7D</strong><span>20.0000 / 0.0000 · zoom 1.00</span></div>`;
const style=document.createElement('style');
style.id='akWorldMonitorStyle';
style.textContent=`.ak-world-monitor{max-width:1100px;margin:0 auto 30px;display:grid;grid-template-columns:1.35fr .65fr;gap:0;border:3px solid var(--ak-line,#241C0E);background:var(--ak-panel,#E7DAAE);overflow:hidden}.ak-wm-copy{padding:26px}.ak-wm-eyebrow{font-family:Arial,sans-serif!important;font-size:.68rem!important;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:var(--ak-red,#C81E1E)!important;margin:0 0 8px!important}.ak-wm-copy h2{font-family:'Arial Black',Impact,sans-serif;margin:0 0 10px;font-size:clamp(1.4rem,3vw,2rem)}.ak-wm-copy>p:not(.ak-wm-eyebrow){font-family:Arial,sans-serif;line-height:1.6;color:var(--ak-sub,#6B6455);margin:0 0 14px}.ak-wm-layers{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 18px}.ak-wm-layers span{font:700 .68rem Arial,sans-serif;border:1px solid rgba(36,28,14,.38);padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.22)}.ak-wm-actions{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:8px}.ak-wm-actions a{font:800 .76rem Arial,sans-serif;text-decoration:none;padding:10px 14px;border:2px solid var(--ak-line,#241C0E);text-transform:uppercase;letter-spacing:.04em}.ak-wm-primary{background:var(--ak-red,#C81E1E);color:#fff!important}.ak-wm-secondary{color:var(--ak-text,#241C0E)!important}.ak-wm-copy small{font:400 .67rem Arial,sans-serif;color:var(--ak-sub,#6B6455)}.ak-wm-map{min-height:260px;background:radial-gradient(circle at 50% 45%,#23456c 0,#0d2138 40%,#07111d 72%);color:#e8edf3;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px;font-family:Arial,sans-serif}.ak-wm-globe{font-size:7rem;line-height:.8;color:#d4af37;text-shadow:0 0 30px rgba(212,175,55,.35);margin-bottom:18px}.ak-wm-map strong{letter-spacing:.12em}.ak-wm-map span{font-size:.72rem;color:#9db3c9;margin-top:6px}@media(max-width:760px){.ak-world-monitor{grid-template-columns:1fr}.ak-wm-map{min-height:185px}.ak-wm-globe{font-size:5rem}}`;
document.head.appendChild(style);
const anchor=document.getElementById('akWeather')||document.querySelector('.ak-narrative')||document.querySelector('.ak-hero');
if(anchor&&anchor.parentNode) anchor.insertAdjacentElement('afterend',section); else document.querySelector('main')?.prepend(section);
})();