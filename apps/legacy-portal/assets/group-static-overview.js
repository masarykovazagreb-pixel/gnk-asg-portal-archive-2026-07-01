(() => {
  'use strict';
  const ROOT = '/gnk-asg/';
  let data = null;
  const $ = id => document.getElementById(id);
  const isEn = () => document.documentElement.lang === 'en' || /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const T = () => isEn() ? {
    eyebrow:'Static group reference', title:'Global network overview - 33 existing companies and +12 planned locations', intro:'The static visual summary complements the interactive 2D and 3D network. Numbered lists below are generated from the same network dataset used in the interactive view.', existing:'Existing companies / positions', planned:'Planned expansion 2026', after:'After planned expansion', governance:'Director / authorised representative / group UBO', existingList:'01-33 - existing companies / existing group positions', plannedList:'E01-E12 - planned international expansion in 2026', registered:'Full local registered names are displayed only where contained in the portal dataset; official status is verified in the relevant public register.', central:'Central headquarters', active:'Existing company', future:'Planned location', network:'2D / 3D company network', registries:'Public registers', markets:'Live markets', news:'News', documents:'Documents', pdf:'Download static overview as PDF', share:'Share overview', linkedin:'LinkedIn', whatsapp:'WhatsApp', email:'E-mail', preparing:'Preparing PDF...', error:'PDF could not be prepared.'
  } : {
    eyebrow:'Statični grupni pregled', title:'Globalna mreža - 33 postojeća društva i +12 planiranih lokacija', intro:'Statični vizualni pregled nadopunjuje interaktivnu 2D i 3D mrežu. Numerirani popisi ispod generiraju se iz istog podatkovnog skupa koji koristi interaktivni prikaz.', existing:'Postojeća društva', planned:'Planirana ekspanzija 2026.', after:'Nakon planirane ekspanzije', governance:'Direktor / ovlašteni predstavnik / UBO grupe', existingList:'01-33 - postojeća društva / postojeće pozicije grupe', plannedList:'E01-E12 - planirana međunarodna ekspanzija 2026.', registered:'Puni lokalni registracijski nazivi prikazuju se samo gdje postoje u podatkovnoj bazi portala; službeni status potvrđuje se u mjerodavnom javnom registru.', central:'Središnje sjedište', active:'Postojeće društvo', future:'Planirana lokacija', network:'Mreža tvrtki - 2D / 3D', registries:'Javni registri', markets:'Tržišta uživo', news:'Vijesti', documents:'Dokumenti', pdf:'Preuzmi statični pregled u PDF-u', share:'Podijeli pregled', linkedin:'LinkedIn', whatsapp:'WhatsApp', email:'E-mail', preparing:'Pripremam PDF...', error:'PDF nije moguće pripremiti.'
  };
  function localized(item, field) { return item.id === 'boulder' ? item[field] : item[field + (isEn() ? '_en' : '_hr')]; }
  function place(item) { return item.id === 'boulder' ? item.place : localized(item, 'place'); }
  function label(item) { return item.id === 'boulder' ? item.name : localized(item, 'name'); }
  function rows() {
    const existing = [data.center].concat((data.nodes || []).filter(node => node.status === 'active'));
    const planned = (data.nodes || []).filter(node => node.status === 'planned');
    return {existing, planned};
  }
  function row(item, index, planned) {
    const num = planned ? 'E' + String(index + 1).padStart(2,'0') : String(index + 1).padStart(2,'0');
    const cls = item.id === 'boulder' ? ' hq' : planned ? ' planned' : '';
    const placeText = place(item);
    return `<div class="network-entity-row${cls}"><span class="network-entity-number">${num}</span><div><strong>${esc(label(item))}</strong><span>${esc(placeText)} · ${esc(item.region || '')}</span></div></div>`;
  }
  function shareLinks() {
    const t = T();
    const url = encodeURIComponent(location.origin + location.pathname + '#global-static-overview');
    const title = encodeURIComponent('GNK DINAMO Ltd. - ' + t.title);
    return `<div class="group-static-share"><strong>${t.share}</strong><a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${url}">${t.linkedin}</a><a target="_blank" rel="noopener" href="https://wa.me/?text=${title}%20${url}">${t.whatsapp}</a><a href="mailto:?subject=${title}&body=${title}%0A${url}">${t.email}</a></div>`;
  }
  function render() {
    const host = $('global-static-overview'); if (!host || !data) return;
    const t = T(), list = rows(), count = data.counts || {};
    host.innerHTML = `<div class="group-static-head"><div><p class="eyebrow">${t.eyebrow}</p><h3>${t.title}</h3><p>${t.intro}</p></div><div class="group-static-governance"><small>${t.governance}</small><strong>Nermin Sefić</strong></div></div><div class="group-static-metrics"><div class="group-static-metric"><small>${t.existing}</small><strong>${count.existing_total || list.existing.length}</strong></div><div class="group-static-metric planned"><small>${t.planned}</small><strong>+${count.planned_2026 || list.planned.length}</strong></div><div class="group-static-metric"><small>${t.after}</small><strong>${count.expanded_total || (list.existing.length + list.planned.length)}</strong></div></div><figure class="group-static-media"><img loading="lazy" decoding="async" src="assets/gnk-global-static-overview-accurate.svg" alt="${esc(t.title)}"></figure><div class="group-static-actions"><button class="primary" type="button" id="staticOverviewPdf">↓ ${t.pdf}</button><a href="#global-network">${t.network}</a><a href="registri/">${t.registries}</a><a href="#digital-assets">${t.markets}</a><a href="#news">${t.news}</a><a href="#dokumenti">${t.documents}</a></div><div class="group-static-lists"><div class="group-static-list"><h4>${t.existingList}</h4><div class="group-existing-grid">${list.existing.map((item, i) => row(item, i, false)).join('')}</div></div><div class="group-static-list"><h4>${t.plannedList}</h4><div class="group-planned-grid">${list.planned.map((item, i) => row(item, i, true)).join('')}</div></div></div><p class="group-static-note">${t.registered}</p>${shareLinks()}`;
    $('staticOverviewPdf')?.addEventListener('click', event => downloadPdf(event.currentTarget));
  }
  function bytes(text) { return new TextEncoder().encode(text); }
  function concat(parts) { const total = parts.reduce((s,p) => s + p.length, 0), out = new Uint8Array(total); let o = 0; parts.forEach(p => { out.set(p,o); o += p.length; }); return out; }
  function pdfFromJpeg(jpeg, width, height) {
    const raw = atob(jpeg.split(',')[1]); const image = new Uint8Array(raw.length); for (let i=0;i<raw.length;i++) image[i] = raw.charCodeAt(i);
    const pw = '841.89', ph = '595.28'; const content = `q\n${pw} 0 0 ${ph} 0 0 cm\n/Im0 Do\nQ\n`;
    const objects = [null, bytes('<< /Type /Catalog /Pages 2 0 R >>'), bytes('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'), bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`), concat([bytes(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`), image, bytes('\nendstream')]), bytes(`<< /Length ${content.length} >>\nstream\n${content}endstream`)];
    const parts = [bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')], offsets=[0]; let size=parts[0].length;
    for (let i=1;i<objects.length;i++) { offsets[i]=size; const p = concat([bytes(`${i} 0 obj\n`),objects[i],bytes('\nendobj\n')]); parts.push(p); size += p.length; }
    let table=`xref\n0 ${objects.length}\n0000000000 65535 f \n`; for (let i=1;i<objects.length;i++) table += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    parts.push(bytes(`${table}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF`)); return new Blob([concat(parts)], {type:'application/pdf'});
  }
  async function downloadPdf(button) {
    const t = T(), original = button.textContent; button.disabled = true; button.textContent = t.preparing;
    try {
      const svg = await fetch('assets/gnk-global-static-overview-accurate.svg?v=' + Date.now(), {cache:'no-store'}).then(res => res.text());
      const image = new Image(); const src = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'}));
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = src; });
      const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 980; canvas.getContext('2d').drawImage(image,0,0,1600,980); URL.revokeObjectURL(src);
      const blob = pdfFromJpeg(canvas.toDataURL('image/jpeg', .96), 1600, 980); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'GNK_DINAMO_Globalna_Mreza_33_postojeca_12_planirano_2026.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    } catch (error) { button.textContent = t.error; setTimeout(() => { button.textContent = original; }, 2200); return; }
    button.disabled = false; button.textContent = original;
  }
  async function init() {
    try { const response = await fetch('data/group_network.json?v=' + Date.now(), {cache:'no-store'}); if (!response.ok) return; data = await response.json(); } catch (_) { return; }
    let tries = 0; const timer = setInterval(() => {
      const section = $('global-network'), shell = section?.querySelector('.network-shell'); if (!shell) { if (++tries > 150) clearInterval(timer); return; }
      if (!$('global-static-overview')) { const panel = document.createElement('section'); panel.id='global-static-overview'; panel.className='group-static-overview'; shell.appendChild(panel); }
      render(); clearInterval(timer);
    }, 70);
    window.addEventListener('gnk-language-change', render);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
