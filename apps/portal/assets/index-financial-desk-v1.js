(() => {
  'use strict';
  const route = location.pathname.replace(/\/+$/, '') || '/';
  if (route !== '/' && route !== '/en') return;
  if (window.__GNK_INDEX_FINANCIAL_DESK_V1__) return;
  window.__GNK_INDEX_FINANCIAL_DESK_V1__ = true;

  const isEn = route === '/en';
  const t = (hr, en) => isEn ? en : hr;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const loadScript = src => new Promise(resolve => {
    if ([...document.scripts].some(script => script.src && script.src.includes(src))) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = resolve;
    document.head.appendChild(el);
  });
  const loadJson = async (url, fallback) => {
    try {
      const response = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
      return response.ok ? await response.json() : fallback;
    } catch {
      return fallback;
    }
  };

  function addStyle() {
    if (document.getElementById('gnk-index-financial-desk-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk-index-financial-desk-style';
    style.textContent = `
      :root{--gnk-bg:#04070d;--gnk-navy:#07111f;--gnk-panel:#0b1424;--gnk-panel2:#111c30;--gnk-gold:#f3cc62;--gnk-gold2:#ffe8a0;--gnk-text:#f8fafc;--gnk-muted:#a9b5c8;--gnk-line:rgba(243,204,98,.24)}
      body{background:radial-gradient(circle at 18% -10%,rgba(243,204,98,.14),transparent 28%),linear-gradient(180deg,#081426 0,#04070d 58%,#020409 100%)!important;color:var(--gnk-text)!important}.wrap{width:min(1240px,calc(100% - 34px))!important}.top{position:sticky;top:0;z-index:20;background:rgba(4,7,13,.92);border-bottom:1px solid rgba(255,255,255,.10);backdrop-filter:blur(16px);padding:14px 0!important}.brand-logo{width:54px!important;height:54px!important}.brand-title{color:#fff!important;font-size:21px!important}.brand-sub{color:var(--gnk-muted)!important;font-size:11px!important}.nav a,.btn{border-color:rgba(255,255,255,.13)!important;background:rgba(255,255,255,.045)!important;color:#fff!important}.nav .gold,.btn.gold,.gold{background:linear-gradient(135deg,#bb8d2f,#ffe08a)!important;color:#06101f!important;border-color:rgba(243,204,98,.7)!important}.panel{border:1px solid var(--gnk-line)!important;border-radius:28px!important;background:linear-gradient(180deg,rgba(17,28,48,.96),rgba(4,8,15,.97))!important;box-shadow:0 24px 70px rgba(0,0,0,.32)!important}.hero{display:grid!important;grid-template-columns:minmax(0,1.22fr) minmax(280px,.78fr);padding:0!important;overflow:hidden}.hero .k{grid-column:1;padding:30px 30px 0!important;margin:0!important}.hero h1{grid-column:1;padding:0 30px!important;margin:8px 0 0!important;font:800 clamp(42px,6vw,82px)/.9 Georgia,serif!important;letter-spacing:-.055em!important}.hero .lead{grid-column:1;padding:0 30px!important;max-width:800px!important;color:#c5d0e0!important}.hero .actions{grid-column:1;padding:0 30px 30px!important}.hero:after{content:'GNK FINANCIAL DESK\\A INDEX / THE CODE / 9\\A PUBLIC SUMMARY';white-space:pre-line;display:flex;align-items:flex-end;padding:24px;color:var(--gnk-gold2);font:900 13px/1.55 ui-monospace,Menlo,Consolas,monospace;border-left:1px solid rgba(255,255,255,.10);background:radial-gradient(circle at 80% 10%,rgba(243,204,98,.16),transparent 35%),rgba(255,255,255,.025)}.card,.report,.portal-item{background:linear-gradient(180deg,rgba(13,24,42,.94),rgba(5,10,19,.97))!important}.card strong{color:#fff!important;font-size:clamp(25px,3vw,38px)!important}.code-frame iframe{height:620px!important}.gnk-fin-ticker{border-bottom:1px solid rgba(255,255,255,.10);background:#050b14}.gnk-fin-ticker-track{width:min(1240px,calc(100% - 34px));margin:0 auto;display:flex;gap:10px;overflow:auto;padding:8px 0;scrollbar-width:none}.gnk-fin-ticker-track::-webkit-scrollbar{display:none}.gnk-fin-tick{flex:0 0 auto;border:1px solid rgba(255,255,255,.10);border-radius:999px;background:rgba(255,255,255,.035);padding:7px 10px;font:800 11px/1 ui-monospace,Menlo,Consolas,monospace;color:#dbeafe}.gnk-fin-tick b{color:var(--gnk-gold2);margin-right:8px}.gnk-fin-tick span{color:#86efac}.gnk-desk,.gnk-runtime{width:min(1240px,calc(100% - 34px));margin:0 auto 24px}.gnk-desk-card{border:1px solid var(--gnk-line);border-radius:28px;background:linear-gradient(180deg,rgba(15,26,45,.96),rgba(5,9,17,.98));box-shadow:0 24px 70px rgba(0,0,0,.32);overflow:hidden}.gnk-desk-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;flex-wrap:wrap;padding:24px;border-bottom:1px solid rgba(255,255,255,.10)}.gnk-desk-head h2{margin:0;color:#fff;font:760 clamp(30px,4vw,52px)/.96 Georgia,serif;letter-spacing:-.035em}.gnk-desk-head p{max-width:760px;color:var(--gnk-muted);line-height:1.5}.gnk-desk-grid{display:grid;grid-template-columns:1.15fr .85fr}.gnk-desk-stories{padding:20px 24px;border-right:1px solid rgba(255,255,255,.10)}.gnk-desk-side{padding:20px 24px}.gnk-story{display:grid;grid-template-columns:118px 1fr;gap:14px;border-top:1px solid rgba(255,255,255,.09);padding:16px 0;color:#fff;text-decoration:none}.gnk-story:first-child{border-top:0}.gnk-story .time{color:var(--gnk-gold2);font:900 11px/1 ui-monospace,Menlo,Consolas,monospace;text-transform:uppercase}.gnk-story h3{margin:0 0 6px;color:#fff;font-size:18px;line-height:1.2}.gnk-story p{margin:0;color:var(--gnk-muted);font-size:13px;line-height:1.45}.gnk-table{width:100%;border-collapse:collapse}.gnk-table th,.gnk-table td{border-bottom:1px solid rgba(255,255,255,.10);padding:11px 8px;text-align:left;font-size:12px}.gnk-table th{color:var(--gnk-gold);text-transform:uppercase}.gnk-table td:last-child{text-align:right;color:var(--gnk-gold2);font-weight:900}.gnk-mini-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:18px}.gnk-mini{border:1px solid rgba(255,255,255,.11);border-radius:20px;background:rgba(255,255,255,.04);padding:16px}.gnk-mini label{display:inline-flex;border:1px solid rgba(243,204,98,.24);border-radius:999px;color:var(--gnk-gold2);background:rgba(243,204,98,.07);padding:5px 8px;font-size:10px;font-weight:950;text-transform:uppercase}.gnk-mini strong{display:block;margin:10px 0 5px;color:#fff;font:800 clamp(25px,3vw,38px)/.96 Georgia,serif}.gnk-mini small{color:var(--gnk-muted)}
      @media(max-width:980px){.hero{grid-template-columns:1fr}.hero:after{border-left:0;border-top:1px solid rgba(255,255,255,.10)}.gnk-desk-grid{grid-template-columns:1fr}.gnk-desk-stories{border-right:0;border-bottom:1px solid rgba(255,255,255,.10)}.gnk-mini-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.top{position:relative}.nav{justify-content:flex-start!important}}
      @media(max-width:640px){.wrap,.gnk-fin-ticker-track,.gnk-desk,.gnk-runtime{width:calc(100% - 18px)!important}.top{padding:12px 0!important}.brand{width:100%;flex-wrap:nowrap!important}.brand-logo{width:48px!important;height:48px!important}.brand-title{font-size:19px!important}.brand-sub{font-size:10.5px!important}.nav{display:flex!important;flex-wrap:nowrap!important;overflow:auto!important;gap:7px!important}.nav a{white-space:nowrap!important;font-size:11px!important;padding:8px 10px!important}.panel,.gnk-desk-card{border-radius:20px!important;margin-bottom:14px!important}.hero .k{padding:22px 16px 0!important}.hero h1{padding:0 16px!important;font-size:clamp(34px,10vw,48px)!important}.hero .lead{padding:0 16px!important;font-size:14px!important}.hero .actions{padding:0 16px 22px!important;display:grid!important}.hero:after{padding:16px;font-size:11px}.grid,.grid.three,.grid.two,.portal-window{grid-template-columns:1fr!important;padding:12px!important}.code-frame iframe{height:500px!important}.gnk-desk-head{padding:18px 14px}.gnk-desk-stories,.gnk-desk-side{padding:14px}.gnk-story{grid-template-columns:1fr;gap:6px}.gnk-mini-grid{grid-template-columns:1fr;padding:12px}}
    `;
    document.head.appendChild(style);
  }

  function patchCopy() {
    if (!isEn) {
      const replacements = new Map([['Media login','Mediji'],['Admin','Administracija'],['Admin Center','Administracija'],['Register newsroom','Prijava redakcije'],['equity ratio','omjer kapitala'],['Review-only operativni zapisi','Operativni zapisi za pregled'],['international project layer','međunarodni projektni sloj'],['project portfolio','projektni portfelj'],['Consolidated Financial Report FY2025','konsolidirano financijsko izvješće 2025.']]);
      const brandSub = document.querySelector('.brand-sub');
      if (brandSub) brandSub.textContent = 'Korporativni portal · GNK DINAMO Ltd. Group · digitalna poslovna platforma';
      document.querySelectorAll('a,span,small,h1,h2,h3,p,option,strong').forEach(node => {
        let text = node.textContent;
        replacements.forEach((to, from) => { text = text.replaceAll(from, to); });
        if (text !== node.textContent) node.textContent = text;
      });
      const lead = document.querySelector('.hero .lead');
      if (lead) lead.textContent = 'Javni dio ostaje čist: financije, objave, vijesti, kontakt, dokumenti, THE CODE i medijska prijava. Administracija i operativni alati ostaju odvojeni u zaštićenom centru.';
    }
  }

  function installTicker() {
    if (document.getElementById('gnk-fin-ticker')) return;
    const ticks = [['GNK ASG','504.000.000 €'],['AKTIVA','46.400.000 €'],['KAPITAL','46.210.000 €'],['GROUP','4.7046 mlrd. €'],['DOBIT','982.480.000 €'],['THE CODE','9 projekata']];
    const html = `<div id="gnk-fin-ticker" class="gnk-fin-ticker" data-source="static-financial-summary"><div class="gnk-fin-ticker-track">${ticks.map(([k,v]) => `<span class="gnk-fin-tick"><b>${k}</b><span>${v}</span></span>`).join('')}</div></div>`;
    document.querySelector('header.top')?.insertAdjacentHTML('afterend', html);
  }

  function installDesk(feed, conclusions) {
    if (document.getElementById('gnk-editorial-desk')) return;
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const dynamic = [...(feed?.latest || []), ...(conclusions?.items || [])].slice(0, 2).map(item => [String(item.type || item.category || t('OBJAVA','POST')).toUpperCase(), item.title || t('Javna objava','Public post'), item.summary || item.url || '', item.url || '/objave/']);
    const fallback = [[t('SADA','NOW'),t('Financijska naslovnica dobiva tržišnu strukturu u GNK bojama.','The financial homepage gets a market-style structure in GNK colors.'),t('Zadržani su financije, portal, objave, THE CODE, mediji, administracija i javne rute.','Financials, portal, posts, THE CODE, media, admin and public routes are retained.'),'#financije'],[t('FINANCIJE','FINANCE'),t('GNK ASG d.o.o. i GNK DINAMO Ltd. Group prikazani su kroz javne pokazatelje.','GNK ASG d.o.o. and GNK DINAMO Ltd. Group are shown through public indicators.'),t('PDF dokumenti ostaju dostupni kroz postojeće rute.','PDF documents remain available through existing routes.'),'/downloads/'],['THE CODE',t('THE CODE ostaje vidljiv kao zaseban javni program.','THE CODE remains visible as a separate public program.'),t('Prezentacija, medijska prijava i dokumenti ostaju povezani.','Presentation, media application and documents remain linked.'),'#the-code']];
    const stories = dynamic.concat(fallback).slice(0, 4);
    const routes = [[t('Financije','Financials'),'#financije',t('javno','public')],[t('Objave','Posts'),'/objave/',t('javno','public')],[t('Vijesti','News'),'/vijesti/',t('javno','public')],[t('Kontakt','Contact'),'/contact/',t('javno','public')],[t('Mediji','Media'),'/media-application/',t('javno','public')],[t('Administracija','Admin'),'/admin-center/',t('zaštićeno','protected')],[t('Digital Workforce','Digital Workforce'),'/digital-workforce/directory/',t('pregled','review')]];
    const html = `<section id="gnk-editorial-desk" class="gnk-desk" data-source="/data/public-operational-feed.json /data/public-conclusions.json"><div class="gnk-desk-card"><div class="gnk-desk-head"><div><p class="k">${t('FINANCIJSKI DESK','FINANCIAL DESK')}</p><h2>${t('Naše informacije u formi poslovnog portala.','Our information in a business-portal structure.')}</h2></div><p>${t('Tamna financijska struktura prilagođena našim podacima, rutama, javnim objavama i projektu THE CODE.','A dark financial structure adapted to our data, routes, public posts and THE CODE project.')}</p></div><div class="gnk-desk-grid"><div class="gnk-desk-stories">${stories.map(s => `<a class="gnk-story" href="${escapeHtml(s[3])}"><span class="time">${escapeHtml(s[0])}</span><span><h3>${escapeHtml(s[1])}</h3><p>${escapeHtml(s[2])}</p></span></a>`).join('')}</div><aside class="gnk-desk-side"><p class="k">${t('RUTE I STATUS','ROUTES AND STATUS')}</p><table class="gnk-table"><thead><tr><th>${t('Modul','Module')}</th><th>Ruta</th><th>Status</th></tr></thead><tbody>${routes.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></aside></div></div></section>`;
    hero.insertAdjacentHTML('afterend', html);
  }

  function installRuntimeSummary(directory, group, results) {
    if (document.getElementById('gnk-runtime-summary')) return;
    const count = directory?.count || 1537;
    const companies = directory?.companyCount || 45;
    const operatingCompanies = directory?.operatingCompanyCount || 43;
    const functions = directory?.departments?.length || 27;
    const projects = group?.projectBusiness?.length || 9;
    const workers = results?.workers?.length || 8;
    const metrics = [[t('Profili','Profiles'),count,t('operativnih profila','operating profiles')],[t('Lokacije','Locations'),companies,t('sloj društava i lokacija','company/location layer')],[t('Društva','Companies'),operatingCompanies,t('operativna društva','operating companies')],[t('Funkcije','Functions'),functions,t('operativnih funkcija','functions')],[t('Projekti','Projects'),projects,'THE CODE / 9'],[t('Zadaci','Tasks'),workers,t('javna radna ploča','public work board')]];
    const html = `<section id="gnk-runtime-summary" class="gnk-runtime"><div class="gnk-desk-card" data-source="/assets/js/digital-workforce-directory-v1.js /assets/js/digital-workforce-company-layer-v1.js /data/group-entities-project-business.json /data/worker-results-3h.json"><div class="gnk-desk-head"><div><p class="k">${t('JAVNI OPERATIVNI SAŽETAK','PUBLIC OPERATING SUMMARY')}</p><h2>${t('Sve postojeće ostaje, ali je složeno kao pregled.','Everything existing remains, but is arranged as a summary.')}</h2></div><p>${t('Profili, lokacije, projekti i radni zadaci nisu maknuti. Naslovnica ih prikazuje sažeto, a puni prikaz ostaje na postojećim rutama.','Profiles, locations, projects and work tasks are retained. The homepage shows them as a summary, full views remain on existing routes.')}</p></div><div class="gnk-mini-grid">${metrics.map(m => `<article class="gnk-mini"><label>${m[0]}</label><strong>${Number(m[1]).toLocaleString(isEn ? 'en-US' : 'hr-HR')}</strong><small>${m[2]}</small></article>`).join('')}</div><div class="gnk-desk-side"><table class="gnk-table"><tbody><tr><td>${t('Puni direktorij','Full directory')}</td><td>/digital-workforce/directory/</td><td>${t('dostupno','available')}</td></tr><tr><td>GNEW Portal</td><td>/gnew-portal/</td><td>${t('dostupno','available')}</td></tr><tr><td>THE CODE</td><td>/the-code/</td><td>${t('dostupno','available')}</td></tr><tr><td>${t('Projektni sektori','Project sectors')}</td><td>/project-business/</td><td>${t('dostupno','available')}</td></tr><tr><td>${t('Dokumenti','Documents')}</td><td>/downloads/</td><td>${t('dostupno','available')}</td></tr></tbody></table></div></div></section>`;
    document.querySelector('main')?.insertAdjacentHTML('beforeend', html);
  }

  async function boot() {
    addStyle();
    patchCopy();
    installTicker();
    await loadScript('/assets/js/digital-workforce-directory-v1.js');
    await loadScript('/assets/js/digital-workforce-company-layer-v1.js');
    const directory = window.GNKDigitalWorkforceDirectory || null;
    const group = await loadJson('/data/group-entities-project-business.json', { projectBusiness: [] });
    const results = await loadJson('/data/worker-results-3h.json', { workers: [] });
    const feed = await loadJson('/data/public-operational-feed.json', { latest: [] });
    const conclusions = await loadJson('/data/public-conclusions.json', { items: [] });
    installDesk(feed, conclusions);
    installRuntimeSummary(directory, group, results);
    setTimeout(patchCopy, 300);
    setTimeout(patchCopy, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
