(() => {
  'use strict';
  const DATA = { network: null, facts: null, busy: false };
  const $ = id => document.getElementById(id);
  const en = () => document.documentElement.lang === 'en' || /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const text = () => en() ? {
    tag:'PDF · 3D', button:'Download 3D globe as PDF', note:'PDF captures the current globe view, selected location and displayed context.', title:'GNK DINAMO Ltd. · 3D Global Network Globe', generated:'Generated', selected:'Selected location', country:'Country', continent:'Continent', countryPop:'Country population', cityPop:'City population', status:'Status', hq:'Central headquarters', existing:'Existing group company', planned:'Planned expansion 2026', finance:'Financial context', legend:'Legend', hqDot:'Headquarters', activeDot:'Existing location', futureDot:'Planned location', selectedDot:'Selected location', source:'Demographic context source', loading:'Preparing 3D PDF…', error:'PDF export could not be prepared.', switch:'Opening 3D globe for export…'
  } : {
    tag:'PDF · 3D', button:'Preuzmi 3D globus u PDF-u', note:'PDF snima trenutačni prikaz globusa, odabranu lokaciju i prikazani kontekst.', title:'GNK DINAMO Ltd. · 3D globalni globus mreže', generated:'Izrađeno', selected:'Odabrana lokacija', country:'Država', continent:'Kontinent', countryPop:'Stanovnika države', cityPop:'Stanovnika grada', status:'Status', hq:'Središnje sjedište', existing:'Postojeće društvo grupe', planned:'Planirano širenje 2026.', finance:'Financijski kontekst', legend:'Legenda', hqDot:'Središnje sjedište', activeDot:'Postojeća lokacija', futureDot:'Planirana lokacija', selectedDot:'Odabrana lokacija', source:'Izvor demografskog konteksta', loading:'Pripremam 3D PDF…', error:'PDF izvoz nije moguće pripremiti.', switch:'Otvaram 3D globus za izvoz…'
  };
  async function get(path) { try { const r = await fetch(path + '?v=' + Date.now(), { cache:'no-store' }); return r.ok ? r.json() : null; } catch (_) { return null; } }
  const itemById = id => DATA.network && [DATA.network.center].concat(DATA.network.nodes || []).find(item => item.id === id);
  const name = item => item.id === 'boulder' ? item.name : (en() ? item.name_en : item.name_hr);
  const place = item => item.id === 'boulder' ? item.place : (en() ? item.place_en : item.place_hr);
  function status(item) { const T = text(); return item.id === 'boulder' ? T.hq : item.status === 'planned' ? T.planned : T.existing; }
  function wrap(ctx, value, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(value || '').split(/\s+/); let line = '', lines = 0;
    words.forEach(word => { const candidate = line ? line + ' ' + word : word; if (ctx.measureText(candidate).width > maxWidth && line) { if (lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight); line = word; lines += 1; } else line = candidate; });
    if (line && lines < maxLines) { ctx.fillText(line, x, y + lines * lineHeight); lines += 1; }
    return y + lines * lineHeight;
  }
  function dot(ctx, x, y, colour, label) { ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d2dfed'; ctx.font = '600 18px Arial, sans-serif'; ctx.fillText(label, x + 19, y + 6); }
  async function obtainGlobe(button) {
    const globe = window.GNK_GLOBE;
    if (!globe) throw new Error('Globe not ready');
    if (!globe.isActive()) {
      button.textContent = text().switch;
      globe.activate();
      await new Promise(resolve => setTimeout(resolve, 240));
    }
    const canvas = globe.getCanvas(); if (!canvas) throw new Error('Canvas not ready');
    return { canvas, id: globe.getSelected() || 'boulder' };
  }
  async function compose(button) {
    const snapshot = await obtainGlobe(button), item = itemById(snapshot.id), fact = DATA.facts?.locations?.[snapshot.id];
    if (!item || !fact) throw new Error('Selected detail unavailable');
    const T = text(), out = document.createElement('canvas'); out.width = 1754; out.height = 1240; const ctx = out.getContext('2d');
    ctx.fillStyle = '#07162d'; ctx.fillRect(0, 0, out.width, out.height);
    ctx.fillStyle = '#d4af37'; ctx.font = '700 21px Arial, sans-serif'; ctx.fillText('GNK DINAMO Ltd. GROUP · PDF EXPORT · 3D', 60, 64);
    ctx.fillStyle = '#fff'; ctx.font = '700 43px Georgia, serif'; ctx.fillText(T.title, 60, 113);
    ctx.fillStyle = '#99b1ca'; ctx.font = '500 18px Arial, sans-serif'; ctx.fillText(`${T.generated}: ${new Date().toLocaleString(en() ? 'en-GB' : 'hr-HR')}`, 60, 148);
    const leftX = 50, top = 190, viewW = 1110, viewH = 705;
    ctx.fillStyle = '#050f20'; ctx.fillRect(leftX, top, viewW, viewH);
    const ratio = Math.min(viewW / snapshot.canvas.width, viewH / snapshot.canvas.height);
    const w = snapshot.canvas.width * ratio, h = snapshot.canvas.height * ratio;
    ctx.drawImage(snapshot.canvas, leftX + (viewW - w) / 2, top + (viewH - h) / 2, w, h);
    ctx.strokeStyle = '#28445f'; ctx.lineWidth = 2; ctx.strokeRect(leftX, top, viewW, viewH);
    const px = 1205, pw = 485; ctx.fillStyle = '#0b203a'; ctx.fillRect(px, top, pw, 912); ctx.strokeStyle = '#27425c'; ctx.strokeRect(px, top, pw, 912);
    ctx.fillStyle = '#d4af37'; ctx.font = '700 16px Arial, sans-serif'; ctx.fillText(T.selected.toUpperCase(), px + 28, 232);
    ctx.fillStyle = '#fff'; ctx.font = '700 29px Georgia, serif'; let y = 271; y = wrap(ctx, name(item), px + 28, y, pw - 56, 35, 2) + 7;
    ctx.fillStyle = '#a9bfd6'; ctx.font = '500 17px Arial, sans-serif'; ctx.fillText(place(item), px + 28, y); y += 38;
    const rows = [[T.country, en() ? fact.country_en : fact.country_hr], [T.continent, en() ? fact.continent_en : fact.continent_hr], [T.countryPop, fact.country_population], [T.cityPop, fact.city_population], [T.status, status(item)]];
    rows.forEach(([label, value]) => { ctx.fillStyle = '#829bb5'; ctx.font = '700 12px Arial, sans-serif'; ctx.fillText(label.toUpperCase(), px + 28, y); ctx.fillStyle = '#f1f6fb'; ctx.font = '700 18px Arial, sans-serif'; y = wrap(ctx, value, px + 28, y + 24, pw - 56, 23, 2) + 22; });
    ctx.strokeStyle = '#28445f'; ctx.beginPath(); ctx.moveTo(px + 28, y); ctx.lineTo(px + pw - 28, y); ctx.stroke(); y += 32;
    ctx.fillStyle = '#d4af37'; ctx.font = '700 13px Arial, sans-serif'; ctx.fillText(T.finance.toUpperCase(), px + 28, y); y += 27;
    ctx.fillStyle = '#d0dcea'; ctx.font = '500 15px Arial, sans-serif'; y = wrap(ctx, en() ? DATA.facts.financial_context_en : DATA.facts.financial_context_hr, px + 28, y, pw - 56, 21, 7) + 29;
    ctx.fillStyle = '#d4af37'; ctx.font = '700 13px Arial, sans-serif'; ctx.fillText(T.legend.toUpperCase(), px + 28, y); y += 31;
    dot(ctx, px + 35, y, '#d4af37', T.hqDot); y += 37; dot(ctx, px + 35, y, '#76c7ff', T.activeDot); y += 37; dot(ctx, px + 35, y, '#71ed91', T.futureDot); y += 37; dot(ctx, px + 35, y, '#ef3340', T.selectedDot); y += 47;
    ctx.fillStyle = '#829bb5'; ctx.font = '700 12px Arial, sans-serif'; ctx.fillText(T.source.toUpperCase(), px + 28, y); y += 24; ctx.fillStyle = '#b7c9dc'; ctx.font = '500 13px Arial, sans-serif'; ctx.fillText('World Bank · UN DESA WUP 2025', px + 28, y);
    ctx.fillStyle = '#aabdd3'; ctx.font = '500 16px Arial, sans-serif'; wrap(ctx, en() ? DATA.facts.population_basis_en : DATA.facts.population_basis_hr, 60, 956, 1070, 23, 4);
    ctx.strokeStyle = '#28445f'; ctx.beginPath(); ctx.moveTo(60, 1116); ctx.lineTo(1690, 1116); ctx.stroke(); ctx.fillStyle = '#8ca5be'; ctx.font = '500 15px Arial, sans-serif'; ctx.fillText('GNK ASG d.o.o. · Corporate portal · GNK DINAMO Ltd. Global Network', 60, 1152); ctx.fillText(en() ? 'Informational visualisation only.' : 'Isključivo informativni vizualni prikaz.', 60, 1182);
    return out;
  }
  function bytes(value) { return new TextEncoder().encode(value); }
  function join(parts) { const length = parts.reduce((sum, p) => sum + p.length, 0), output = new Uint8Array(length); let offset = 0; parts.forEach(p => { output.set(p, offset); offset += p.length; }); return output; }
  function pdfFromJpeg(jpeg) {
    const raw = atob(jpeg.split(',')[1]), image = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) image[i] = raw.charCodeAt(i);
    const width = '841.89', height = '595.28', stream = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;
    const objects = [null, bytes('<< /Type /Catalog /Pages 2 0 R >>'), bytes('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'), bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`), join([bytes(`<< /Type /XObject /Subtype /Image /Width 1754 /Height 1240 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`), image, bytes('\nendstream')]), bytes(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`)];
    const output = [bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')], offsets = [0]; let length = output[0].length;
    for (let i = 1; i < objects.length; i++) { offsets[i] = length; const object = join([bytes(`${i} 0 obj\n`), objects[i], bytes('\nendobj\n')]); output.push(object); length += object.length; }
    let table = `xref\n0 ${objects.length}\n0000000000 65535 f \n`; for (let i = 1; i < objects.length; i++) table += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    output.push(bytes(`${table}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF`)); return new Blob([join(output)], { type:'application/pdf' });
  }
  async function download(button) {
    if (DATA.busy) return; DATA.busy = true; const T = text(), initial = button.textContent; button.disabled = true; button.textContent = T.loading;
    try { const canvas = await compose(button), blob = pdfFromJpeg(canvas.toDataURL('image/jpeg', .94)), link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'GNK_DINAMO_Global_Network_3D_Globe.pdf'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1500); }
    catch (_) { button.textContent = T.error; setTimeout(() => { button.textContent = initial; }, 2300); }
    finally { DATA.busy = false; button.disabled = false; if (button.textContent === T.loading || button.textContent === T.switch) button.textContent = initial; }
  }
  function mount() {
    const sidebar = document.querySelector('#global-network .network-sidebar'); if (!sidebar) return false;
    let panel = $('globePdfExport'), T = text();
    if (!panel) { panel = document.createElement('div'); panel.id = 'globePdfExport'; panel.className = 'network-pdf-export globe-pdf-export'; sidebar.appendChild(panel); }
    panel.innerHTML = `<strong>${T.tag}</strong><p>${T.note}</p><button type="button" id="globePdfButton">↓ ${T.button}</button>`;
    $('globePdfButton').addEventListener('click', () => download($('globePdfButton'))); return true;
  }
  async function init() {
    [DATA.network, DATA.facts] = await Promise.all([get('data/group_network.json'), get('data/group_location_facts.json')]);
    let tries = 0; const timer = setInterval(() => { if (mount() || ++tries > 160) clearInterval(timer); }, 70);
    window.addEventListener('gnk-language-change', mount);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
