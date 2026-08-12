(()=>{
'use strict';
const TARGET='https://www.worldmonitor.app/dashboard?lat=20.0000&lon=0.0000&zoom=1.00&view=global&timeRange=7d&layers=bases%2Ccables%2Cpipelines%2Cais%2Csanctions%2Cweather%2Ceconomic%2Coutages%2Cnatural%2Cminerals%2CtradeRoutes';
const boot=()=>{
 const path=location.pathname.replace(/\/+$/,'')||'/';
 const isHr=path==='/gnk-aktual',isEn=path==='/en/gnk-aktual';
 if((!isHr&&!isEn)||document.getElementById('akWorldMonitor'))return;
 const english=isEn||document.documentElement.lang?.toLowerCase().startsWith('en');
 const host=document.querySelector('.ak-wrap');
 if(!host)return;
 const section=document.createElement('section');
 section.id='akWorldMonitor';
 section.className='ak-section';
 section.setAttribute('aria-labelledby','akWorldMonitorTitle');
 section.innerHTML=`<div class="ak-section-head"><h2 id="akWorldMonitorTitle">${english?'World Monitor — Global Intelligence Map':'World Monitor — globalna intelligence karta'}</h2><span>${english?'7-day global view':'globalni prikaz · 7 dana'}</span></div><div style="border:2px solid var(--ak-line);background:var(--ak-panel);padding:14px;border-radius:4px"><p style="font-family:Arial,sans-serif;margin:0 0 12px;color:var(--ak-sub);line-height:1.55">${english?'External live-style situational map covering bases, cables, pipelines, AIS, sanctions, weather, economic events, outages, natural events, minerals and trade routes. Data and map are provided by World Monitor.':'Vanjska situacijska karta s bazama, kabelima, cjevovodima, AIS podacima, sankcijama, vremenom, ekonomskim događajima, prekidima, prirodnim događajima, mineralima i trgovačkim rutama. Podatke i kartu pruža World Monitor.'}</p><div style="position:relative;width:100%;height:min(52vw,520px);min-height:320px;background:#111;overflow:hidden;border:1px solid var(--ak-line)"><iframe title="World Monitor" src="${TARGET.replace(/&/g,'&amp;')}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" style="border:0;width:100%;height:100%;display:block" allow="fullscreen" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe></div><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-top:12px;font-family:Arial,sans-serif"><a href="${english?'/en/gnk-aktual/world-monitor/':'/gnk-aktual/world-monitor/'}" style="font-weight:800;color:var(--ak-red);text-decoration:none">${english?'Open dedicated World Monitor page →':'Otvori zasebnu World Monitor stranicu →'}</a><a href="${TARGET.replace(/&/g,'&amp;')}" target="_blank" rel="noopener noreferrer external" style="font-size:.8rem;color:var(--ak-sub)">${english?'Open original at worldmonitor.app ↗':'Otvori original na worldmonitor.app ↗'}</a></div></div>`;
 const anchor=document.querySelector('.ak-status')||document.querySelector('.ak-featured')||host.firstElementChild;
 if(anchor&&anchor.parentNode===host)anchor.insertAdjacentElement('afterend',section);else host.prepend(section);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();