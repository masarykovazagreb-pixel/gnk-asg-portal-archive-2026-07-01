(() => {
  'use strict';
  if (window.__GNK_ASG_HOME_V12_MOBILE_HR_CLEAN__) return;
  window.__GNK_ASG_HOME_V12_MOBILE_HR_CLEAN__ = true;

  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (!(path === '/' || path === '/en')) return;

  const isEn = path === '/en';
  const hr = !isEn;
  const tr = (hrText, enText) => isEn ? enText : hrText;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const publicCode = index => String(1000 + (((index * 7919) + 2749) % 9000)).padStart(4, '0');

  const loadScript = src => new Promise(resolve => {
    if ([...document.scripts].some(script => script.src && script.src.includes(src))) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = resolve;
    document.head.appendChild(el);
  });

  const json = async (url, fallback) => {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
      return response.ok ? await response.json() : fallback;
    } catch {
      return fallback;
    }
  };

  function patchStaticCopy() {
    if (!hr) return;
    const brandSub = document.querySelector('.brand-sub');
    if (brandSub) brandSub.textContent = 'Korporativni portal · GNK DINAMO Ltd. Group · digitalna poslovna platforma';

    const replacements = new Map([
      ['Media login', 'Mediji'],
      ['Admin', 'Administracija'],
      ['Admin Center', 'Administracija'],
      ['Media Application', 'Medijska prijava'],
      ['Register newsroom', 'Prijava redakcije'],
      ['GNK DINAMO Ltd. — Consolidated Financial Report FY2025', 'GNK DINAMO Ltd. — konsolidirano financijsko izvješće 2025.'],
      ['equity ratio', 'omjer kapitala'],
      ['Review-only operativni zapisi', 'Operativni zapisi za pregled'],
      ['GNEW Portal · international project layer', 'GNEW Portal · međunarodni projektni sloj'],
      ['THE CODE / 9 · project portfolio', 'THE CODE / 9 · projektni portfelj']
    ]);

    document.querySelectorAll('a,span,small,h1,h2,h3,p,option,strong').forEach(node => {
      const raw = node.textContent.trim();
      if (replacements.has(raw)) node.textContent = replacements.get(raw);
      else {
        let next = node.textContent;
        replacements.forEach((to, from) => { next = next.replaceAll(from, to); });
        if (next !== node.textContent) node.textContent = next;
      }
    });

    const heroLead = document.querySelector('.hero .lead');
    if (heroLead) heroLead.textContent = 'Administracija i operativni alati vode kroz zaštićeni centar. Javni dio ostaje čist: objave, vijesti, kontakt forma, dokumenti, THE CODE i medijska prijava.';
  }

  function addStaticMobileStyle() {
    if (document.getElementById('gnk-hr-mobile-static-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk-hr-mobile-static-style';
    style.textContent = `
      @media(max-width:650px){
        body{background:linear-gradient(180deg,#081426,#04070d)!important}
        .wrap{width:calc(100% - 18px)!important}
        .top{padding:14px 0 10px!important;gap:12px!important;align-items:flex-start!important;flex-direction:column!important}
        .brand{width:100%!important;gap:10px!important;flex-wrap:nowrap!important;align-items:center!important}
        .brand-logo{width:52px!important;height:52px!important}
        .brand-title{font-size:20px!important;line-height:1.08!important}
        .brand-sub{font-size:11px!important;line-height:1.35!important}
        .nav{display:flex!important;overflow-x:auto!important;flex-wrap:nowrap!important;width:100%!important;padding-bottom:4px!important;scrollbar-width:none!important}
        .nav::-webkit-scrollbar{display:none!important}
        .nav a{white-space:nowrap!important;padding:9px 11px!important;font-size:11px!important}
        .panel{border-radius:22px!important;margin-bottom:16px!important;background:linear-gradient(180deg,rgba(14,24,40,.98),rgba(8,14,26,.99))!important;box-shadow:0 14px 34px rgba(0,0,0,.24)!important}
        .hero{padding:20px 16px!important}
        .head{display:block!important;padding:18px 16px!important}
        .k{font-size:10px!important;letter-spacing:.12em!important}
        h1,h2{font-size:clamp(28px,8.4vw,38px)!important;line-height:1.04!important;letter-spacing:-.025em!important}
        .lead,p{font-size:14px!important}
        .actions{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
        .btn{width:100%!important;justify-content:center!important;text-align:center!important}
        .grid,.grid.three,.grid.two,.portal-window{grid-template-columns:1fr!important;padding:12px!important;gap:10px!important}
        .card,.report,.portal-item{border-radius:17px!important;padding:14px!important;background:rgba(255,255,255,.045)!important}
        .card strong{font-size:25px!important}
        .company-select{font-size:12px!important}
        .code-frame{padding:12px!important}
        .code-frame iframe{height:540px!important;border-radius:16px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function addRuntimeStyle() {
    if (document.getElementById('gnk9-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk9-style';
    style.textContent = `
      .gnk9{width:min(1180px,calc(100% - 40px));margin:0 auto 28px;color:#f8fafc;font-family:Inter,Arial,sans-serif}.gnk9 *{box-sizing:border-box}.gnk9 a{color:inherit}
      .gnk9-panel{border:1px solid rgba(243,204,98,.24);border-radius:28px;background:linear-gradient(180deg,rgba(12,22,39,.96),rgba(5,9,17,.98));box-shadow:0 22px 60px rgba(0,0,0,.30);overflow:hidden;margin:0 0 22px}
      .gnk9-head{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.10)}.gnk9-k{margin:0 0 8px;color:#f3cc62;font-size:12px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.gnk9 h2{max-width:960px;margin:0;color:#fff;font:700 clamp(32px,3.7vw,50px)/1 Georgia,serif;letter-spacing:-.032em}.gnk9 p{color:#b7c2d4;line-height:1.5}.gnk9-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding:18px}.gnk9-grid.three{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
      .gnk9-card{min-width:0;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:linear-gradient(180deg,rgba(20,31,50,.92),rgba(7,13,24,.96));padding:16px}.gnk9-card h3{margin:9px 0;color:#fff;font-size:17px;line-height:1.16}.gnk9-card strong{display:block;color:#ffe8a0;font:700 28px/1 Georgia,serif;margin:7px 0}.gnk9-card small,.gnk9-card p{color:#d5dde9}.gnk9-card p{font-size:13px}.gnk9-tag,.gnk9-code{display:inline-flex;max-width:100%;border:1px solid rgba(243,204,98,.26);border-radius:999px;color:#ffe8a0;background:rgba(243,204,98,.07);padding:6px 9px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .gnk9-actions{display:flex;gap:9px;flex-wrap:wrap;padding:0 18px 18px}.gnk9-btn{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:10px 13px;text-decoration:none;background:rgba(255,255,255,.045);color:#fff;font-size:12px;font-weight:950}.gnk9-btn.gold{background:linear-gradient(135deg,#b98b2d,#ffe08a);color:#07101f;border-color:#f3cc62}.gnk9-note{margin:0 18px 18px;border:1px solid rgba(244,180,79,.34);border-radius:18px;background:rgba(244,180,79,.07);padding:13px;color:#ffe0a3;line-height:1.5}.gnk9-chipbox{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:8px;padding:18px;max-height:198px;overflow:auto;border-top:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07)}.gnk9-chip{min-width:0;border:1px solid rgba(147,197,253,.20);border-radius:999px;background:rgba(147,197,253,.055);color:#dbeafe;padding:7px 10px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gnk9-chip.more{border-color:rgba(243,204,98,.35);background:rgba(243,204,98,.08);color:#ffe8a0}.gnk9-table-wrap{overflow:auto;margin:18px;border:1px solid rgba(255,255,255,.11);border-radius:18px}.gnk9 table{width:100%;min-width:760px;border-collapse:collapse}.gnk9 th,.gnk9 td{padding:10px;border-bottom:1px solid rgba(255,255,255,.10);text-align:left;font-size:12px;vertical-align:top}.gnk9 th{color:#f3cc62;background:#08101d}.gnk9-profile{color:#ffe8a0;font-weight:950}.gnk9-split{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px}
      @media(max-width:680px){.gnk9{width:calc(100% - 18px);margin-bottom:18px}.gnk9-panel{border-radius:22px;margin-bottom:16px;background:linear-gradient(180deg,rgba(14,24,40,.98),rgba(8,14,26,.99));box-shadow:0 14px 34px rgba(0,0,0,.24)}.gnk9-head{display:block;padding:18px 16px}.gnk9-k{font-size:10px;letter-spacing:.12em}.gnk9 h2{font-size:clamp(25px,8vw,34px);line-height:1.04;letter-spacing:-.025em}.gnk9 p{font-size:13px}.gnk9-grid,.gnk9-grid.three{grid-template-columns:1fr;gap:10px;padding:12px}.gnk9-card{border-radius:17px;padding:14px;background:rgba(255,255,255,.045)}.gnk9-card strong{font-size:26px}.gnk9-chipbox{grid-template-columns:1fr;max-height:170px;padding:12px}.gnk9-table-wrap{display:none}.gnk9-actions{display:grid;grid-template-columns:1fr;gap:8px;padding:0 12px 14px}.gnk9-btn{width:100%;padding:11px 12px}.gnk9-note{margin:0 12px 14px;font-size:12px}.gnk9-split{grid-template-columns:1fr;padding:12px;gap:10px}}
    `;
    document.head.appendChild(style);
  }

  function simpleCard(tagHr, tagEn, title, text, href) {
    return `<article class="gnk9-card"><span class="gnk9-tag">${esc(tr(tagHr, tagEn))}</span><h3>${esc(title)}</h3><p>${esc(text)}</p>${href ? `<a class="gnk9-btn" href="${esc(href)}">${tr('Otvori', 'Open')}</a>` : ''}</article>`;
  }

  function directoryPanel(data) {
    const profiles = data?.profiles || [];
    const companies = data?.companies || [];
    const rows = profiles.slice(0, 8).map((profile, index) => `<tr><td><span class="gnk9-profile">GNK-${publicCode(index)}</span><br><small>${esc(profile.name || tr('Generirani profil', 'Generated profile'))}</small></td><td>${esc(profile.positionTitle || profile.role || tr('Operativna funkcija', 'Operations profile'))}<br><small>${esc(profile.department || '')}</small></td><td>${esc(profile.companyPublicName || profile.entitySlot || tr('GNK društvo', 'GNK slot'))}<br><small>${esc(`${profile.companyCity || ''} · ${profile.companyCountry || ''}`)}</small></td><td>${esc(profile.availability || profile.status || tr('pregled', 'review'))}<br><small>${esc(profile.timezone || '')}</small></td></tr>`).join('');
    const shownCompanies = companies.slice(0, 14);
    const chips = shownCompanies.map(company => `<span class="gnk9-chip">${esc(company.publicName || company.slot)} · ${esc(company.city || '')} · ${esc(company.country || '')}</span>`).join('');
    const hiddenCount = Math.max(0, companies.length - shownCompanies.length);
    const moreChip = hiddenCount ? `<span class="gnk9-chip more">+${hiddenCount} ${tr('lokacija u punom direktoriju', 'locations in full directory')}</span>` : '';
    return `<section class="gnk9-panel" id="workforce-runtime"><div class="gnk9-head"><div><p class="gnk9-k">${tr('Operativni profili · javni pregled', 'Operating profiles · public view')}</p><h2>${tr('Profili i lokacije prikazani su čisto, bez zatrpavanja naslovnice.', 'Profiles and locations are shown cleanly without overloading the homepage.')}</h2></div><p>${esc(data?.disclosure || tr('Generirani operativni profili za pregled platforme i usmjeravanje.', 'System-generated operational profiles for platform review and routing.'))}</p></div><div class="gnk9-grid"><article class="gnk9-card"><span class="gnk9-tag">${tr('Profili', 'Profiles')}</span><strong>${(data?.count || profiles.length || 1537).toLocaleString(isEn ? 'en-US' : 'hr-HR')}</strong><small>${tr('operativnih profila', 'operating profiles')}</small></article><article class="gnk9-card"><span class="gnk9-tag">${tr('Lokacije', 'Locations')}</span><strong>${data?.companyCount || companies.length || 45}</strong><small>${tr('sloj društava i lokacija', 'company and location layer')}</small></article><article class="gnk9-card"><span class="gnk9-tag">${tr('Društva', 'Companies')}</span><strong>${data?.operatingCompanyCount || 43}</strong><small>${tr('kodirana operativna društva', 'coded operating companies')}</small></article><article class="gnk9-card"><span class="gnk9-tag">${tr('Funkcije', 'Functions')}</span><strong>${(data?.departments || []).length || 27}</strong><small>${tr('operativnih funkcija', 'functions')}</small></article></div><div class="gnk9-chipbox">${chips}${moreChip}</div><div class="gnk9-table-wrap"><table><thead><tr><th>GNK profil</th><th>${tr('Pozicija / funkcija', 'Position / function')}</th><th>${tr('Društvo', 'Company')}</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><div class="gnk9-actions"><a class="gnk9-btn gold" href="/digital-workforce/directory/">${tr('Otvori puni direktorij', 'Open full directory')}</a><a class="gnk9-btn" href="/digital-workforce/protocols/">${tr('Protokoli', 'Protocols')}</a><a class="gnk9-btn" href="/gnew-portal/">GNEW Portal</a></div><p class="gnk9-note"><b>${tr('Važno:', 'Important:')}</b> ${tr('ovo su generirani operativni profili i GNK šifre, ne tvrdnja o stvarnim zaposlenicima.', 'these are generated operating profiles and GNK codes, not a claim about real employees.')}</p></section>`;
  }

  function taskPanel(results) {
    const items = (results?.workers || []).slice(0, 6);
    return `<section class="gnk9-panel" id="worker-results"><div class="gnk9-head"><div><p class="gnk9-k">${tr('Radna ploča', 'Work board')}</p><h2>${tr('Zadatak, rezultat i sljedeći korak.', 'Task, result and next step.')}</h2></div><p>${esc(results?.rule || tr('Sustav ne objavljuje ništa bez ljudske potvrde.', 'AI does not decide or publish without human approval.'))}</p></div><div class="gnk9-grid">${items.map(item => `<article class="gnk9-card"><code class="gnk9-code">${esc(item.id)}</code><h3>${esc(item.area || tr('radni zadatak', 'task'))}</h3><p><b>${tr('Zadatak:', 'Task:')}</b> ${esc(item.task || '')}</p><p><b>${tr('Rezultat:', 'Result:')}</b> ${esc(item.result || '')}</p><p><b>${tr('Sljedeće:', 'Next:')}</b> ${esc(item.next || '')}</p></article>`).join('')}</div></section>`;
  }

  function projectPanel(group) {
    const projects = group?.projectBusiness || [];
    return `<section class="gnk9-panel" id="project-business"><div class="gnk9-head"><div><p class="gnk9-k">${tr('THE CODE / 9 · projektna karta', 'THE CODE / 9 · project map')}</p><h2>${tr('Devet sektora s jasnim sljedećim korakom.', 'Nine sectors with a clear next step.')}</h2></div><p>${esc(group?.governance?.publicRule || tr('Operativna karta, ne konačna pravna ili financijska potvrda.', 'Operational map, not final legal or financial certificate.'))}</p></div><div class="gnk9-grid three">${projects.map(project => simpleCard(project.status || 'status', project.status || 'status', project.name || project.id, `${project.worker || ''} · ${project.next || ''}`, '/project-business/')).join('')}</div></section>`;
  }

  function feedPanel(feed, conclusions) {
    const latest = feed?.latest || [];
    const items = conclusions?.items || [];
    return `<section class="gnk9-panel" id="public-feed"><div class="gnk9-head"><div><p class="gnk9-k">${tr('Objave · zaključci · javni pregled', 'Posts · conclusions · public view')}</p><h2>${tr('Zadnje objave i operativni zaključci.', 'Latest posts and operating conclusions.')}</h2></div><p>${esc(feed?.version || tr('javni pregled', 'public feed'))}</p></div><div class="gnk9-split"><div>${latest.map(item => simpleCard(item.type || 'objava', item.type || 'feed', item.title || 'item', item.url || '', item.url)).join('')}</div><div>${items.map(item => simpleCard(item.type || 'zaključak', item.type || 'conclusion', item.title || 'conclusion', item.summary || '', item.url)).join('')}</div></div><div class="gnk9-actions"><a class="gnk9-btn gold" href="/objave/">${tr('Otvori objave', 'Open posts')}</a><a class="gnk9-btn" href="/public-operations/">${tr('Javne operacije', 'Public Operations')}</a><a class="gnk9-btn" href="/vijesti/">${tr('Vijesti', 'News')}</a><a class="gnk9-btn" href="/publications/">${tr('Publikacije', 'Publications')}</a></div></section>`;
  }

  async function boot() {
    addStaticMobileStyle();
    patchStaticCopy();
    setTimeout(patchStaticCopy, 300);
    setTimeout(patchStaticCopy, 1100);
    addRuntimeStyle();
    await loadScript('/assets/js/digital-workforce-directory-v1.js');
    await loadScript('/assets/js/digital-workforce-company-layer-v1.js');
    const directory = window.GNKDigitalWorkforceDirectory || null;
    const group = await json('/data/group-entities-project-business.json', { projectBusiness: [] });
    const results = await json('/data/worker-results-3h.json', { workers: [] });
    const feed = await json('/data/public-operational-feed.json', { latest: [] });
    const conclusions = await json('/data/public-conclusions.json', { items: [] });
    const html = `<section class="gnk9" id="gnk-backend-index-layer"><section class="gnk9-panel"><div class="gnk9-head"><div><p class="gnk9-k">${tr('GNEW Portal · povezani javni sloj', 'GNEW Portal · connected public layer')}</p><h2>${tr('Projekti, zadaci, profili, lokacije i objave na jednom mjestu.', 'Projects, tasks, profiles, locations and posts in one place.')}</h2></div></div><div class="gnk9-grid"><article class="gnk9-card"><span class="gnk9-tag">${tr('Profili', 'Directory')}</span><strong>${directory?.count?.toLocaleString(isEn ? 'en-US' : 'hr-HR') || (isEn ? '1,537' : '1.537')}</strong><small>${tr('profila iz javnog pregleda', 'profiles from public view')}</small></article><article class="gnk9-card"><span class="gnk9-tag">${tr('Lokacije', 'Locations')}</span><strong>${directory?.companyCount || 45}</strong><small>${tr('sloj društava i lokacija', 'company/location layer')}</small></article><article class="gnk9-card"><span class="gnk9-tag">${tr('Projekti', 'Projects')}</span><strong>${group?.projectBusiness?.length || 9}</strong><small>THE CODE / 9</small></article><article class="gnk9-card"><span class="gnk9-tag">${tr('Zadaci', 'Tasks')}</span><strong>${results?.workers?.length || 8}</strong><small>${tr('javna radna ploča', 'public work board')}</small></article></div><div class="gnk9-actions"><a class="gnk9-btn gold" href="/gnew-portal/">GNEW Portal</a><a class="gnk9-btn" href="/digital-workforce/directory/">${tr('Operativni profili', 'Digital Workforce')}</a><a class="gnk9-btn" href="/admin/">${tr('Administracija', 'Admin')}</a><a class="gnk9-btn" href="/media-application/?lang=en">${tr('Medijska prijava', 'Media Application')}</a></div></section>${directory ? directoryPanel(directory) : ''}${taskPanel(results)}${projectPanel(group)}${feedPanel(feed, conclusions)}</section>`;
    const anchor = document.getElementById('workers') || document.getElementById('projects') || document.querySelector('main');
    if (anchor && anchor.parentNode) anchor.insertAdjacentHTML('afterend', html);
    else document.body.insertAdjacentHTML('beforeend', html);
    patchStaticCopy();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
