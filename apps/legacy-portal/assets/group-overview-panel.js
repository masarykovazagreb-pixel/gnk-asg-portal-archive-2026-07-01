(() => {
  'use strict';
  const state = { network: null, busy: false };
  const $ = id => document.getElementById(id);
  const en = () => document.documentElement.lang === 'en' || /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const T = () => en() ? {
    eyebrow:'GNK DINAMO Ltd. Group · Static overview',
    title:'Global network: 33 existing companies and +12 planned locations',
    body:'The selected 2D / 3D location controls the live Google Maps and local weather panels below. Counts are generated from the same public dataset displayed in the network module.',
    alt:'Global network infographic: 33 existing group companies and 12 planned expansion locations during 2026',
    existing:'Existing companies', planned:'Planned expansion 2026', total:'After expansion', governance:'Director / authorised representative / group UBO',
    currentList:'01-33 · Existing companies / positions', plannedList:'E01-E12 · Planned expansion 2026',
    dataNote:'Select a point on the globe or the 2D map to display its position and local weather. Official registration status is verified in the relevant public register.',
    network:'2D / 3D network', registries:'Public registers', markets:'Live markets', news:'News', documents:'Documents', download:'Download static image as PDF', preparing:'Preparing PDF…', failed:'PDF unavailable',
    share:'Share this overview', open:'Open list', close:'Close list', mapSlot:'Map of selected location', weatherSlot:'Weather and local time for selected location', enlarge:'Enlarge network image', closeImage:'Close enlarged image'
  } : {
    eyebrow:'GNK DINAMO Ltd. Group · Statični pregled',
    title:'Globalna mreža: 33 postojeća društva i +12 planiranih lokacija',
    body:'Odabrana točka na 2D karti ili 3D globusu upravlja Google Maps prikazom i vremenskim podatcima iste lokacije. Brojke se generiraju iz istog javnog podatkovnog skupa.',
    alt:'Infografika globalne mreže: 33 postojeća društva grupe i 12 planiranih lokacija širenja tijekom 2026.',
    existing:'Postojeća društva', planned:'Planirana ekspanzija 2026.', total:'Nakon ekspanzije', governance:'Direktor / ovlašteni predstavnik / UBO grupe',
    currentList:'01-33 · Postojeća društva / pozicije grupe', plannedList:'E01-E12 · Planirana ekspanzija 2026.',
    dataNote:'Odaberite točku na globusu ili 2D karti za prikaz položaja i lokalnih vremenskih prilika. Službeni registracijski status potvrđuje se u mjerodavnom javnom registru.',
    network:'Mreža tvrtki · 2D / 3D', registries:'Javni registri', markets:'Tržišta uživo', news:'Vijesti', documents:'Dokumenti', download:'Preuzmi statičnu sliku u PDF-u', preparing:'Pripremam PDF…', failed:'PDF nije dostupan',
    share:'Podijeli pregled', open:'Otvori popis', close:'Zatvori popis', mapSlot:'Karta odabrane lokacije', weatherSlot:'Vrijeme i lokalno vrijeme odabrane lokacije', enlarge:'Povećaj prikaz mreže', closeImage:'Zatvori povećani prikaz'
  };
  function activeRows() { return [state.network.center].concat((state.network.nodes || []).filter(item => item.status === 'active')); }
  function plannedRows() { return (state.network.nodes || []).filter(item => item.status === 'planned'); }
  function name(item) { return item.id === 'boulder' ? item.name : (en() ? item.name_en : item.name_hr); }
  function place(item) { return item.id === 'boulder' ? item.place : (en() ? item.place_en : item.place_hr); }
  function row(item, index, planned) {
    const number = planned ? 'E' + String(index + 1).padStart(2,'0') : String(index + 1).padStart(2,'0');
    const cls = item.id === 'boulder' ? ' hq' : planned ? ' planned' : '';
    return `<div class="network-overview-row${cls}"><b>${number}</b><div><strong>${esc(name(item))}</strong><span>${esc(place(item))} · ${esc(item.region || '')}</span></div></div>`;
  }
  function disclosure(title, items, planned) {
    const t = T();
    const cls = planned ? 'network-overview-planned' : 'network-overview-existing';
    return `<details class="network-overview-disclosure${planned ? ' is-planned' : ''}"><summary><span>${esc(title)}</span><b>${items.length}</b><em data-disclosure-state>${t.open}</em><i aria-hidden="true"></i></summary><div class="network-overview-body ${cls}">${items.map((item, i) => row(item, i, planned)).join('')}</div></details>`;
  }
  function shareLinks() {
    const t = T(), shareUrl = location.origin + '/podijeli/grupa/?preview=20260527-unique03', url = encodeURIComponent(shareUrl), title = encodeURIComponent('GNK DINAMO Ltd. - ' + t.title);
    return `<div class="network-overview-share"><strong>${t.share}</strong><a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${url}">LinkedIn</a><a target="_blank" rel="noopener" href="https://wa.me/?text=${title}%20${url}">WhatsApp</a><a href="mailto:?subject=${title}&body=${title}%0A${url}">E-mail</a></div>`;
  }
  function bindDisclosures(panel) {
    const t = T();
    const lists = Array.from(panel.querySelectorAll('.network-overview-disclosure'));
    lists.forEach(item => item.addEventListener('toggle', () => {
      const stateText = item.querySelector('[data-disclosure-state]');
      if (stateText) stateText.textContent = item.open ? t.close : t.open;
      if (!item.open) return;
      lists.filter(other => other !== item && other.open).forEach(other => {
        other.open = false;
        const otherState = other.querySelector('[data-disclosure-state]');
        if (otherState) otherState.textContent = t.open;
      });
    }));
  }
  function closeImage() {
    const modal = $('networkOverviewImageModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('network-image-modal-open');
  }
  function openImage(image) {
    let modal = $('networkOverviewImageModal');
    const t = T();
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'networkOverviewImageModal';
      modal.className = 'network-overview-image-modal';
      modal.setAttribute('aria-hidden', 'true');
      document.body.appendChild(modal);
      modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-close-network-image]')) closeImage(); });
      document.addEventListener('keydown', event => { if (event.key === 'Escape') closeImage(); });
    }
    modal.innerHTML = `<button class="network-overview-image-close" type="button" data-close-network-image aria-label="${esc(t.closeImage)}">×</button><img src="${image.src}" alt="${esc(image.alt)}">`;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('network-image-modal-open');
    modal.querySelector('button').focus();
  }
  function bindImageZoom(panel) {
    const figure = panel.querySelector('.network-overview-image');
    const image = figure && figure.querySelector('img');
    if (!figure || !image) return;
    figure.addEventListener('click', () => openImage(image));
    figure.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openImage(image); } });
  }
  function contextDock() {
    if (window.GNK_LOCATION_CONTEXT && window.GNK_LOCATION_CONTEXT.dock) return window.GNK_LOCATION_CONTEXT.dock();
    return $('networkLocationContext');
  }
  function render() {
    const shell = document.querySelector('#global-network .network-shell');
    const layout = shell && shell.querySelector('.network-layout');
    const dock = contextDock();
    if (!shell || !layout || !dock || !state.network) return false;
    let panel = $('networkOverviewVisual');
    if (!panel) {
      panel = document.createElement('section'); panel.id = 'networkOverviewVisual'; panel.className = 'network-overview-visual';
      dock.prepend(panel);
    } else if (panel.parentElement !== dock || panel !== dock.firstElementChild) {
      dock.prepend(panel);
    }
    const t = T(), existing = activeRows(), planned = plannedRows(), count = state.network.counts || {};
    const regLink = en() ? '/en/registries/' : '/registri/';
    panel.innerHTML = `<header class="network-overview-head"><div><small>${t.eyebrow}</small><h3>${t.title}</h3><p>${t.body}</p></div><aside><span>${t.governance}</span><strong>Nermin Sefić</strong></aside></header><div class="network-overview-kpis"><div><strong>${count.existing_total || existing.length}</strong><span>${t.existing}</span></div><div class="planned"><strong>+${count.planned_2026 || planned.length}</strong><span>${t.planned}</span></div><div><strong>${count.expanded_total || (existing.length + planned.length)}</strong><span>${t.total}</span></div></div><div class="network-overview-live-grid"><div class="network-overview-slot overview-map-slot" id="overviewMapSlot" aria-label="${esc(t.mapSlot)}"></div><figure class="network-overview-image" role="button" tabindex="0" title="${esc(t.enlarge)}" aria-label="${esc(t.enlarge)}"><img src="/assets/gnk-global-static-overview-accurate.svg?v=20260526-image-modal01" loading="lazy" decoding="async" alt="${esc(t.alt)}"><span class="network-overview-zoom-label">⤢ ${t.enlarge}</span></figure><div class="network-overview-slot overview-weather-slot" id="overviewWeatherSlot" aria-label="${esc(t.weatherSlot)}"></div></div><nav class="network-overview-actions"><button class="primary" type="button" id="networkOverviewPdf">↓ ${t.download}</button><a href="#global-network">${t.network}</a><a href="${regLink}">${t.registries}</a><a href="#digital-assets">${t.markets}</a><a href="#news">${t.news}</a><a href="#dokumenti">${t.documents}</a></nav><div class="network-overview-disclosures">${disclosure(t.currentList, existing, false)}${disclosure(t.plannedList, planned, true)}</div><p class="network-overview-note">${t.dataNote}</p>${shareLinks()}`;
    const map = $('googleLocationMap');
    const weather = $('locationWeatherPanel');
    if (map) $('overviewMapSlot').appendChild(map);
    if (weather) $('overviewWeatherSlot').appendChild(weather);
    $('networkOverviewPdf')?.addEventListener('click', () => downloadPdf($('networkOverviewPdf')));
    bindDisclosures(panel);
    bindImageZoom(panel);
    document.dispatchEvent(new CustomEvent('gnk-overview-mounted'));
    return true;
  }
  function bytes(value) { return new TextEncoder().encode(value); }
  function join(parts) { const n = parts.reduce((a,p) => a + p.length, 0), out = new Uint8Array(n); let o = 0; parts.forEach(p => { out.set(p,o); o += p.length; }); return out; }
  function pdfFromJpeg(dataUrl, width, height) {
    const binary = atob(dataUrl.split(',')[1]), image = new Uint8Array(binary.length); for (let i=0;i<binary.length;i++) image[i] = binary.charCodeAt(i);
    const pw='841.89', ph='595.28', stream=`q\n${pw} 0 0 ${ph} 0 0 cm\n/Im0 Do\nQ\n`;
    const objects=[null,bytes('<< /Type /Catalog /Pages 2 0 R >>'),bytes('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),join([bytes(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),image,bytes('\nendstream')]),bytes(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`)];
    const parts=[bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')], offsets=[0]; let length=parts[0].length;
    for(let i=1;i<objects.length;i++){offsets[i]=length; const p=join([bytes(`${i} 0 obj\n`),objects[i],bytes('\nendobj\n')]); parts.push(p); length+=p.length;}
    let table=`xref\n0 ${objects.length}\n0000000000 65535 f \n`; for(let i=1;i<objects.length;i++) table+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    parts.push(bytes(`${table}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF`)); return new Blob([join(parts)], {type:'application/pdf'});
  }
  async function downloadPdf(button) {
    if (state.busy) return; state.busy = true; const t=T(), old=button.textContent; button.textContent=t.preparing; button.disabled=true;
    try {
      const svg = await fetch('/assets/gnk-global-static-overview-accurate.svg?v=' + Date.now(), {cache:'no-store'}).then(response => response.text());
      const uri = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'})), image = new Image();
      await new Promise((resolve,reject) => { image.onload=resolve; image.onerror=reject; image.src=uri; });
      const canvas=document.createElement('canvas'); canvas.width=1600; canvas.height=980; canvas.getContext('2d').drawImage(image,0,0,1600,980); URL.revokeObjectURL(uri);
      const file = pdfFromJpeg(canvas.toDataURL('image/jpeg',.96),1600,980), link=document.createElement('a'); link.href=URL.createObjectURL(file); link.download='GNK_DINAMO_Globalna_Mreza_33_postojeca_12_planirano_2026.pdf'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href),1200);
    } catch (_) { button.textContent=t.failed; setTimeout(() => { button.textContent=old; },1800); }
    finally { button.disabled=false; state.busy=false; if (button.textContent===t.preparing) button.textContent=old; }
  }
  async function init() {
    try { state.network = await fetch('/data/group_network.json?v=' + Date.now(), {cache:'no-store'}).then(response => response.json()); } catch (_) { return; }
    let attempts=0; const timer=setInterval(() => { if (render() || ++attempts > 90) clearInterval(timer); },80);
    window.addEventListener('gnk-language-change', render);
    document.addEventListener('gnk-location-context-ready', render);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();