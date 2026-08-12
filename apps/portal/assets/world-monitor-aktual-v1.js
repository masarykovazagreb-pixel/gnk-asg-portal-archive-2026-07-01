(()=>{
'use strict';
const TARGET='https://www.worldmonitor.app/dashboard?zoom=1.00&view=global&timeRange=7d&layers=conflicts%2Cbases%2Chotspots%2Cnuclear%2Csanctions%2Cweather%2Ceconomic%2Cwaterways%2Coutages%2Cmilitary%2Cnatural';
const boot=()=>{
 const path=location.pathname.replace(/\/+$/,'')||'/';
 const isHr=path==='/gnk-aktual',isEn=path==='/en/gnk-aktual';
 if((!isHr&&!isEn)||document.getElementById('akWorldMonitor'))return;
 const english=isEn||document.documentElement.lang?.toLowerCase().startsWith('en');
 const host=document.querySelector('.ak-wrap');
 if(!host)return;
 const dedicatedUrl=english?'/en/gnk-aktual/world-monitor/':'/gnk-aktual/world-monitor/';
 const targetEsc=TARGET.replace(/&/g,'&amp;');
 const section=document.createElement('section');
 section.id='akWorldMonitor';
 section.className='ak-section';
 section.setAttribute('aria-labelledby','akWorldMonitorTitle');
 section.innerHTML=`<div class="ak-section-head"><h2 id="akWorldMonitorTitle">${english?'World Monitor — Global Intelligence Map':'World Monitor — globalna intelligence karta'}</h2><span>${english?'7-day global view':'globalni prikaz · 7 dana'}</span></div><div style="border:2px solid var(--ak-line);background:var(--ak-panel);padding:14px;border-radius:4px"><p style="font-family:Arial,sans-serif;margin:0 0 14px;color:var(--ak-sub);line-height:1.55">${english?'Live situational map covering conflicts, military bases, hotspots, nuclear sites, sanctions, weather, economic events, waterways, outages and natural events.':'Situacijska karta uživo — sukobi, vojne baze, žarišta, nuklearni objekti, sankcije, vrijeme, ekonomski događaji, plovni putevi, prekidi i prirodni događaji.'}</p><a href="${targetEsc}" target="_blank" rel="noopener noreferrer external" style="display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#e0bd69,#c99a3f);color:#0d1b2e;font-weight:800;font-size:1rem;padding:14px 24px;border-radius:8px;text-decoration:none;margin-bottom:16px;font-family:Arial,sans-serif">🌍 ${english?'Open World Monitor in a new window ↗':'Otvori World Monitor u novom prozoru ↗'}</a><div style="font-size:.7rem;color:var(--ak-sub);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;font-family:Arial,sans-serif">${english?'In-page preview':'Pregled unutar stranice'}</div><div style="position:relative;width:100%;height:min(52vw,520px);min-height:320px;background:#111;overflow:hidden;border:1px solid var(--ak-line)"><iframe title="World Monitor" src="${targetEsc}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" style="border:0;width:100%;height:100%;display:block" allow="fullscreen" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe></div><div style="margin-top:12px;font-family:Arial,sans-serif"><a href="${dedicatedUrl}" style="font-weight:700;color:var(--ak-red);text-decoration:none;font-size:.88rem">${english?'Open dedicated World Monitor page →':'Otvori zasebnu World Monitor stranicu →'}</a></div></div>`;
 const anchor=document.querySelector('.ak-status')||document.querySelector('.ak-featured')||host.firstElementChild;
 if(anchor&&anchor.parentNode===host)anchor.insertAdjacentElement('afterend',section);else host.prepend(section);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
