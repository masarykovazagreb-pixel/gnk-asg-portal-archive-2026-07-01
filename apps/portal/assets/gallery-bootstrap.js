(() => {
  'use strict';
  if (window.__GNK_ASG_HOME_V10_BACKEND_LAYER_POLISH__) return;
  window.__GNK_ASG_HOME_V10_BACKEND_LAYER_POLISH__ = true;

  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (!(path === '/' || path === '/en')) return;

  const isEn = path === '/en';
  const tr = (hr, en) => isEn ? en : hr;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

  const loadScript = src => new Promise(resolve => {
    if ([...document.scripts].some(script => script.src && script.src.includes(src))) {
      resolve();
      return;
    }
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

  const publicCode = index => String(1000 + (((index * 7919) + 2749) % 9000)).padStart(4, '0');

  function addStyle() {
    if (document.getElementById('gnk9-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk9-style';
    style.textContent = `
      .gnk9{width:min(1180px,calc(100% - 40px));margin:0 auto 28px;color:#f8fafc;font-family:Inter,Arial,sans-serif}
      .gnk9 *{box-sizing:border-box}
      .gnk9 a{color:inherit}
      .gnk9-panel{border:1px solid rgba(243,204,98,.26);border-radius:28px;background:radial-gradient(circle at 50% 0,rgba(243,204,98,.13),rgba(5,8,14,.97) 52%);box-shadow:0 24px 70px rgba(0,0,0,.34);overflow:hidden;margin:0 0 24px}
      .gnk9-head{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.10)}
      .gnk9-k{margin:0 0 8px;color:#f3cc62;font-size:12px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}
      .gnk9 h2{max-width:980px;margin:0;color:#fff;font:700 clamp(34px,3.9vw,52px)/.98 Georgia,serif;letter-spacing:-.035em}
      .gnk9 p{color:#aeb8c8;line-height:1.5}
      .gnk9-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding:18px}
      .gnk9-grid.three{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
      .gnk9-card{min-width:0;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:linear-gradient(180deg,rgba(17,26,42,.94),rgba(5,8,14,.96));padding:16px}
      .gnk9-card h3{margin:9px 0;color:#fff;font-size:17px;line-height:1.12}
      .gnk9-card strong{display:block;color:#ffe8a0;font:700 28px/1 Georgia,serif;margin:7px 0}
      .gnk9-card small,.gnk9-card p{color:#d5dde9}
      .gnk9-card p{font-size:13px}
      .gnk9-tag,.gnk9-code{display:inline-flex;max-width:100%;border:1px solid rgba(243,204,98,.28);border-radius:999px;color:#ffe8a0;background:rgba(243,204,98,.075);padding:6px 9px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .gnk9-actions{display:flex;gap:9px;flex-wrap:wrap;padding:0 18px 18px}
      .gnk9-btn{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:10px 13px;text-decoration:none;background:rgba(255,255,255,.045);color:#fff;font-size:12px;font-weight:950}
      .gnk9-btn.gold{background:linear-gradient(135deg,#b98b2d,#ffe08a);color:#07101f;border-color:#f3cc62}
      .gnk9-note{margin:0 18px 18px;border:1px solid rgba(244,180,79,.40);border-radius:18px;background:rgba(244,180,79,.08);padding:13px;color:#ffe0a3;line-height:1.5}
      .gnk9-chipbox{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:8px;padding:18px;max-height:210px;overflow:auto;border-top:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07)}
      .gnk9-chip{min-width:0;border:1px solid rgba(147,197,253,.25);border-radius:999px;background:rgba(147,197,253,.07);color:#dbeafe;padding:7px 10px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .gnk9-chip.more{border-color:rgba(243,204,98,.35);background:rgba(243,204,98,.08);color:#ffe8a0}
      .gnk9-table-wrap{overflow:auto;margin:18px;border:1px solid rgba(255,255,255,.11);border-radius:18px}
      .gnk9 table{width:100%;min-width:760px;border-collapse:collapse}
      .gnk9 th,.gnk9 td{padding:10px;border-bottom:1px solid rgba(255,255,255,.10);text-align:left;font-size:12px;vertical-align:top}
      .gnk9 th{color:#f3cc62;background:#08101d}
      .gnk9-profile{color:#ffe8a0;font-weight:950}
      .gnk9-split{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px}
      @media(max-width:1000px){.gnk9{width:min(100% - 28px,1180px)}.gnk9-split{grid-template-columns:1fr}.gnk9 h2{font-size:clamp(30px,5vw,46px)}}
      @media(max-width:680px){.gnk9{width:calc(100% - 20px)}.gnk9-grid,.gnk9-grid.three{grid-template-columns:1fr}.gnk9-chipbox{grid-template-columns:1fr;max-height:260px}.gnk9 table{min-width:680px}}
    `;
    document.head.appendChild(style);
  }

  function simpleCard(tag, title, text, href) {
    return `<article class="gnk9-card"><span class="gnk9-tag">${esc(tag)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p>${href ? `<a class="gnk9-btn" href="${esc(href)}">${tr('Otvori', 'Open')}</a>` : ''}</article>`;
  }

  function directoryPanel(data) {
    const profiles = data?.profiles || [];
    const companies = data?.companies || [];
    const rows = profiles.slice(0, 10).map((profile, index) => `
      <tr>
        <td><span class="gnk9-profile">GNK-${publicCode(index)}</span><br><small>${esc(profile.name || 'Generated profile')}</small></td>
        <td>${esc(profile.positionTitle || profile.role || 'Operations profile')}<br><small>${esc(profile.department || '')}</small></td>
        <td>${esc(profile.companyPublicName || profile.entitySlot || 'GNK slot')}<br><small>${esc(`${profile.companyCity || ''} · ${profile.companyCountry || ''}`)}</small></td>
        <td>${esc(profile.availability || profile.status || 'review')}<br><small>${esc(profile.timezone || '')}</small></td>
      </tr>
    `).join('');
    const shownCompanies = companies.slice(0, 18);
    const chips = shownCompanies.map(company => `<span class="gnk9-chip">${esc(company.publicName || company.slot)} · ${esc(company.city || '')} · ${esc(company.country || '')}</span>`).join('');
    const hiddenCount = Math.max(0, companies.length - shownCompanies.length);
    const moreChip = hiddenCount ? `<span class="gnk9-chip more">+${hiddenCount} ${tr('lokacija u direktoriju', 'locations in directory')}</span>` : '';

    return `<section class="gnk9-panel" id="workforce-runtime">
      <div class="gnk9-head">
        <div><p class="gnk9-k">Digital Workforce · runtime</p><h2>${tr('Operativni profili i lokacije prikazani su bez zatrpavanja indexa.', 'Operating profiles and locations are visible without overloading the index.')}</h2></div>
        <p>${esc(data?.disclosure || 'System-generated operational profiles for platform review and routing.')}</p>
      </div>
      <div class="gnk9-grid">
        <article class="gnk9-card"><span class="gnk9-tag">profiles</span><strong>${(data?.count || profiles.length || 1537).toLocaleString('en-US')}</strong><small>${tr('operativnih profila', 'operating profiles')}</small></article>
        <article class="gnk9-card"><span class="gnk9-tag">locations</span><strong>${data?.companyCount || companies.length || 45}</strong><small>company layer</small></article>
        <article class="gnk9-card"><span class="gnk9-tag">slots</span><strong>${data?.operatingCompanyCount || 43}</strong><small>coded operating companies</small></article>
        <article class="gnk9-card"><span class="gnk9-tag">functions</span><strong>${(data?.departments || []).length || 27}</strong><small>${tr('funkcija', 'functions')}</small></article>
      </div>
      <div class="gnk9-chipbox">${chips}${moreChip}</div>
      <div class="gnk9-table-wrap"><table><thead><tr><th>GNK profile</th><th>${tr('Pozicija / funkcija', 'Position / function')}</th><th>Company slot</th><th>${tr('Dostupnost', 'Availability')}</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="gnk9-actions"><a class="gnk9-btn gold" href="/digital-workforce/directory/">${tr('Otvori puni direktorij', 'Open full directory')}</a><a class="gnk9-btn" href="/digital-workforce/protocols/">Protocols</a><a class="gnk9-btn" href="/gnew-portal/">GNEW Portal</a></div>
      <p class="gnk9-note"><b>${tr('Ispravna oznaka:', 'Correct label:')}</b> ${tr('ovo su generirani operativni profili i GNK šifre, ne tvrdnja o stvarnim zaposlenicima.', 'these are generated operating profiles and GNK codes, not a claim about real employees.')}</p>
    </section>`;
  }

  function workerPanel(results) {
    const workers = (results?.workers || []).slice(0, 8);
    return `<section class="gnk9-panel" id="worker-results">
      <div class="gnk9-head"><div><p class="gnk9-k">3h worker board</p><h2>${tr('Worker ploča: zadatak, rezultat i sljedeći korak.', 'Worker board: task, result and next step.')}</h2></div><p>${esc(results?.rule || 'AI does not decide or publish without human approval.')}</p></div>
      <div class="gnk9-grid">${workers.map(worker => `<article class="gnk9-card"><code class="gnk9-code">${esc(worker.id)}</code><h3>${esc(worker.area || 'worker')}</h3><p><b>${tr('Zadatak:', 'Task:')}</b> ${esc(worker.task || '')}</p><p><b>${tr('Rezultat:', 'Result:')}</b> ${esc(worker.result || '')}</p><p><b>${tr('Sljedeće:', 'Next:')}</b> ${esc(worker.next || '')}</p></article>`).join('')}</div>
    </section>`;
  }

  function projectPanel(group) {
    const projects = group?.projectBusiness || [];
    return `<section class="gnk9-panel" id="project-business">
      <div class="gnk9-head"><div><p class="gnk9-k">THE CODE / 9 · project business</p><h2>${tr('Devet sektora s jasnim sljedećim korakom.', 'Nine sectors with a clear next step.')}</h2></div><p>${esc(group?.governance?.publicRule || 'Operational map, not final legal or financial certificate.')}</p></div>
      <div class="gnk9-grid three">${projects.map(project => simpleCard(project.status || 'status', project.name || project.id, `${project.worker || ''} · ${project.next || ''}`, '/project-business/')).join('')}</div>
    </section>`;
  }

  function feedPanel(feed, conclusions) {
    const latest = feed?.latest || [];
    const items = conclusions?.items || [];
    return `<section class="gnk9-panel" id="public-feed">
      <div class="gnk9-head"><div><p class="gnk9-k">Objave · zaključci · feed</p><h2>${tr('Zadnje objave i operativni zaključci.', 'Latest posts and operating conclusions.')}</h2></div><p>${esc(feed?.version || 'public feed')}</p></div>
      <div class="gnk9-split"><div>${latest.map(item => simpleCard(item.type || 'feed', item.title || 'item', item.url || '', item.url)).join('')}</div><div>${items.map(item => simpleCard(item.type || 'conclusion', item.title || 'conclusion', item.summary || '', item.url)).join('')}</div></div>
      <div class="gnk9-actions"><a class="gnk9-btn gold" href="/objave/">${tr('Otvori objave', 'Open posts')}</a><a class="gnk9-btn" href="/public-operations/">Public Operations</a><a class="gnk9-btn" href="/news/">News</a><a class="gnk9-btn" href="/publications/">Publications</a></div>
    </section>`;
  }

  async function boot() {
    addStyle();
    await loadScript('/assets/js/digital-workforce-directory-v1.js');
    await loadScript('/assets/js/digital-workforce-company-layer-v1.js');

    const directory = window.GNKDigitalWorkforceDirectory || null;
    const group = await json('/data/group-entities-project-business.json', { projectBusiness: [] });
    const results = await json('/data/worker-results-3h.json', { workers: [] });
    const feed = await json('/data/public-operational-feed.json', { latest: [] });
    const conclusions = await json('/data/public-conclusions.json', { items: [] });

    const html = `<section class="gnk9" id="gnk-backend-index-layer">
      <section class="gnk9-panel">
        <div class="gnk9-head"><div><p class="gnk9-k">GNEW Portal · backend connected index</p><h2>${tr('Backend sloj: projekti, workeri, profili, lokacije i objave.', 'Backend layer: projects, workers, profiles, locations and posts.')}</h2></div></div>
        <div class="gnk9-grid">
          <article class="gnk9-card"><span class="gnk9-tag">Directory</span><strong>${directory?.count?.toLocaleString('en-US') || '1,537'}</strong><small>${tr('profila iz runtimea', 'profiles from runtime')}</small></article>
          <article class="gnk9-card"><span class="gnk9-tag">Locations</span><strong>${directory?.companyCount || 45}</strong><small>company/location layer</small></article>
          <article class="gnk9-card"><span class="gnk9-tag">Projects</span><strong>${group?.projectBusiness?.length || 9}</strong><small>THE CODE / 9</small></article>
          <article class="gnk9-card"><span class="gnk9-tag">Workers</span><strong>${results?.workers?.length || 8}</strong><small>public worker board</small></article>
        </div>
        <div class="gnk9-actions"><a class="gnk9-btn gold" href="/gnew-portal/">GNEW Portal</a><a class="gnk9-btn" href="/digital-workforce/directory/">Digital Workforce</a><a class="gnk9-btn" href="/admin/">Admin</a><a class="gnk9-btn" href="/media-application/?lang=en">Media Application</a></div>
      </section>
      ${directory ? directoryPanel(directory) : ''}
      ${workerPanel(results)}
      ${projectPanel(group)}
      ${feedPanel(feed, conclusions)}
    </section>`;

    const anchor = document.getElementById('workers') || document.getElementById('projects') || document.querySelector('main');
    if (anchor && anchor.parentNode) anchor.insertAdjacentHTML('afterend', html);
    else document.body.insertAdjacentHTML('beforeend', html);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
