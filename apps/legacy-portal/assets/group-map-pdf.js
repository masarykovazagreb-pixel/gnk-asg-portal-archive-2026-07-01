(() => {
  'use strict';
  const S = { network: null, facts: null, busy: false };
  const $ = id => document.getElementById(id);
  const en = () => document.documentElement.lang === 'en' || /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const text = () => en() ? {
    title:'GNK DINAMO Ltd. · 2D Global Group Network', button:'Download 2D map as PDF', note:'PDF includes the currently selected location and the displayed legend.', location:'Selected location', country:'Country', continent:'Continent', countryPop:'Country population', cityPop:'City population', status:'Status', existing:'Existing group company', planned:'Planned expansion 2026', hq:'Central headquarters', finance:'Financial context displayed on portal', legend:'Legend', active:'Existing location', future:'Planned location', selected:'Selected location', source:'Demographic context source', loading:'Preparing PDF…', error:'PDF export could not be prepared.'
  } : {
    title:'GNK DINAMO Ltd. · 2D globalna mreža grupe', button:'Preuzmi 2D kartu u PDF-u', note:'PDF uključuje trenutačno odabranu lokaciju i prikazanu legendu.', location:'Odabrana lokacija', country:'Država', continent:'Kontinent', countryPop:'Stanovnika države', cityPop:'Stanovnika grada', status:'Status', existing:'Postojeće društvo grupe', planned:'Planirano širenje 2026.', hq:'Središnje sjedište', finance:'Financijski kontekst prikazan na portalu', legend:'Legenda', active:'Postojeća lokacija', future:'Planirana lokacija', selected:'Odabrana lokacija', source:'Izvor demografskog konteksta', loading:'Pripremam PDF…', error:'PDF izvoz nije moguće pripremiti.'
  };
  async function get(path) { try { const response = await fetch(path + '?v=' + Date.now(), {cache:'no-store'}); return response.ok ? response.json() : null; } catch (_) { return null; } }
  const itemById = id => S.network && ([S.network.center].concat(S.network.nodes || [])).find(item => item.id === id);
  const name = item => item.id === 'boulder' ? item.name : (en() ? item.name_en : item.name_hr);
  const place = item => item.id === 'boulder' ? item.place : (en() ? item.place_en : item.place_hr);
  function selectedId() { return window.GNK_GEO_MAP?.getSelected?.() || 'boulder'; }
  function status(item) { const T=text(); return item.id === 'boulder' ? T.hq : item.status === 'planned' ? T.planned : T.existing; }
  function wrap(ctx, value, x, y, max, lineHeight, limit) {
    const words = String(value || '').split(/\s+/); let line = '', lines = 0;
    words.forEach(word => { const test = line ? line + ' ' + word : word; if (ctx.measureText(test).width > max && line) { if (lines < limit) ctx.fillText(line, x, y + lines * lineHeight); line = word; lines += 1; } else { line = test; } });
    if (line && lines < limit) { ctx.fillText(line, x, y + lines * lineHeight); lines += 1; }
    return y + lines * lineHeight;
  }
  function inlineSvg(svg) {
    const clone = svg.cloneNode(true); clone.removeAttribute('style'); clone.setAttribute('width','1040'); clone.setAttribute('height','545');
    const interactiveLayer = clone.querySelector('#networkGeoLayer');
    if (interactiveLayer) interactiveLayer.removeAttribute('transform');
    const style = document.createElementNS('http://www.w3.org/2000/svg','style');
    style.textContent = '.geo-ocean{fill:#06182e}.geo-grid line{stroke:rgba(91,151,195,.18);stroke-width:1;stroke-dasharray:2 7}.geo-land path{fill:#164e43;stroke:#65ab82;stroke-width:.8}.geo-micro-land circle{fill:#27784f;stroke:#b0dfb8;stroke-width:1.2}.geo-continent-labels text{fill:#d4af37;font-size:11px;font-weight:800;letter-spacing:2px;paint-order:stroke;stroke:#06182e;stroke-width:4px}.geo-route{fill:none;stroke-linecap:round}.geo-route.direct{stroke:#2c8ef5;stroke-width:1.2;opacity:.65}.geo-route.peer{stroke:#8cb9e8;stroke-width:.8;opacity:.5;stroke-dasharray:3 4}.geo-route.planned{stroke:#65d27d;stroke-width:1.1;opacity:.8;stroke-dasharray:4 3}.geo-node .geo-node-hit{fill:transparent;stroke:transparent;stroke-width:0}.geo-node .geo-node-pin{stroke-width:1.7}.geo-node.active .geo-node-pin{fill:#2f8ef4;stroke:#a6dbff}.geo-node.planned .geo-node-pin{fill:#45b960;stroke:#b3f1bb}.geo-node.hq .geo-node-pin{fill:#d4af37;stroke:#f8dd80}.geo-node.selected .geo-node-pin{fill:#ef3340;stroke:#fff;stroke-width:2.6}.geo-node text{fill:#edf5ff;font-size:9px;font-weight:800;paint-order:stroke;stroke:#061326;stroke-width:3px}.geo-node text.sub{fill:#9db4ce;font-size:7.8px}';
    clone.insertBefore(style, clone.firstChild); return clone;
  }
  function svgImage(svg) {
    return new Promise((resolve, reject) => {
      const xml = new XMLSerializer().serializeToString(inlineSvg(svg));
      const url = URL.createObjectURL(new Blob([xml], {type:'image/svg+xml;charset=utf-8'}));
      const image = new Image(); image.onload = () => { URL.revokeObjectURL(url); resolve(image); }; image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG image failed')); }; image.src = url;
    });
  }
  function legendDot(ctx, x, y, color, label) { ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#d2dfed'; ctx.font='600 18px Arial, sans-serif'; ctx.fillText(label,x+18,y+6); }
  async function composeCanvas() {
    const svg = $('networkGeoSvg'); if (!svg) throw new Error('2D map not ready');
    const id = selectedId(), item = itemById(id), fact = S.facts?.locations?.[id]; if (!item || !fact) throw new Error('Location facts unavailable');
    const T=text(), canvas=document.createElement('canvas'); canvas.width=1754; canvas.height=1240; const ctx=canvas.getContext('2d');
    ctx.fillStyle='#07162d'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#d4af37'; ctx.font='700 21px Arial, sans-serif'; ctx.fillText('GNK DINAMO Ltd. GROUP · PDF EXPORT',60,64);
    ctx.fillStyle='#fff'; ctx.font='700 43px Georgia, serif'; ctx.fillText(T.title,60,113);
    ctx.fillStyle='#99b1ca'; ctx.font='500 18px Arial, sans-serif'; ctx.fillText((en()?'Generated: ':'Izrađeno: ')+new Date().toLocaleString(en()?'en-GB':'hr-HR'),60,148);
    const image=await svgImage(svg); ctx.drawImage(image,50,190,1110,582);
    ctx.strokeStyle='#28445f'; ctx.lineWidth=2; ctx.strokeRect(50,190,1110,582);
    const px=1205, pw=485; ctx.fillStyle='#0b203a'; ctx.fillRect(px,190,pw,912); ctx.strokeStyle='#27425c'; ctx.strokeRect(px,190,pw,912);
    ctx.fillStyle='#d4af37'; ctx.font='700 16px Arial, sans-serif'; ctx.fillText(T.location.toUpperCase(),px+28,232);
    ctx.fillStyle='#fff'; ctx.font='700 29px Georgia, serif'; let y=271; y=wrap(ctx,name(item),px+28,y,pw-56,35,2)+7;
    ctx.fillStyle='#a9bfd6'; ctx.font='500 17px Arial, sans-serif'; ctx.fillText(place(item),px+28,y); y+=37;
    const rows=[[T.country,en()?fact.country_en:fact.country_hr],[T.continent,en()?fact.continent_en:fact.continent_hr],[T.countryPop,fact.country_population],[T.cityPop,fact.city_population],[T.status,status(item)]];
    rows.forEach(([label,value])=>{ctx.fillStyle='#829bb5';ctx.font='700 12px Arial, sans-serif';ctx.fillText(label.toUpperCase(),px+28,y);ctx.fillStyle='#f1f6fb';ctx.font='700 18px Arial, sans-serif';y=wrap(ctx,value,px+28,y+24,pw-56,23,2)+22;});
    ctx.strokeStyle='#28445f'; ctx.beginPath(); ctx.moveTo(px+28,y); ctx.lineTo(px+pw-28,y); ctx.stroke(); y+=32;
    ctx.fillStyle='#d4af37';ctx.font='700 13px Arial, sans-serif';ctx.fillText(T.finance.toUpperCase(),px+28,y);y+=27;
    ctx.fillStyle='#d0dcea';ctx.font='500 15px Arial, sans-serif';y=wrap(ctx,en()?S.facts.financial_context_en:S.facts.financial_context_hr,px+28,y,pw-56,21,7)+29;
    ctx.fillStyle='#d4af37';ctx.font='700 13px Arial, sans-serif';ctx.fillText(T.legend.toUpperCase(),px+28,y);y+=31;
    legendDot(ctx,px+35,y,'#2f8ef4',T.active); y+=37; legendDot(ctx,px+35,y,'#45b960',T.future); y+=37; legendDot(ctx,px+35,y,'#ef3340',T.selected); y+=46;
    ctx.fillStyle='#829bb5';ctx.font='700 12px Arial, sans-serif';ctx.fillText(T.source.toUpperCase(),px+28,y);y+=24;ctx.fillStyle='#b7c9dc';ctx.font='500 13px Arial, sans-serif';ctx.fillText('World Bank · UN DESA WUP 2025',px+28,y);
    ctx.fillStyle='#aabdd3';ctx.font='500 16px Arial, sans-serif';wrap(ctx,en()?S.facts.population_basis_en:S.facts.population_basis_hr,60,828,1070,23,4);
    ctx.strokeStyle='#28445f';ctx.beginPath();ctx.moveTo(60,1116);ctx.lineTo(1690,1116);ctx.stroke();ctx.fillStyle='#8ca5be';ctx.font='500 15px Arial, sans-serif';ctx.fillText('GNK ASG d.o.o. · Corporate portal · GNK DINAMO Ltd. Global Network',60,1152);ctx.fillText(en()?'Informational visualisation only.':'Isključivo informativni vizualni prikaz.',60,1182);
    return canvas;
  }
  function bytes(value) { return new TextEncoder().encode(value); }
  function concat(parts) { const size=parts.reduce((sum,p)=>sum+p.length,0), output=new Uint8Array(size); let offset=0; parts.forEach(part=>{output.set(part,offset);offset+=part.length;}); return output; }
  function pdfFromJpeg(jpeg) {
    const raw=atob(jpeg.split(',')[1]), image=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++) image[i]=raw.charCodeAt(i);
    const pageW='841.89', pageH='595.28', content=`q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
    const objects=[null,bytes('<< /Type /Catalog /Pages 2 0 R >>'),bytes('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),concat([bytes(`<< /Type /XObject /Subtype /Image /Width 1754 /Height 1240 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),image,bytes('\nendstream')]),bytes(`<< /Length ${content.length} >>\nstream\n${content}endstream`)];
    const parts=[bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')], offsets=[0]; let length=parts[0].length;
    for(let i=1;i<objects.length;i++){offsets[i]=length;const part=concat([bytes(`${i} 0 obj\n`),objects[i],bytes('\nendobj\n')]);parts.push(part);length+=part.length;}
    const xref=length; let table=`xref\n0 ${objects.length}\n0000000000 65535 f \n`; for(let i=1;i<objects.length;i++)table+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    parts.push(bytes(`${table}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)); return new Blob([concat(parts)],{type:'application/pdf'});
  }
  async function download(button) {
    if (S.busy) return; S.busy=true; const T=text(), original=button.textContent; button.disabled=true; button.textContent=T.loading;
    try { const canvas=await composeCanvas(), blob=pdfFromJpeg(canvas.toDataURL('image/jpeg',.94)), link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download='GNK_DINAMO_Global_Network_2D_Map.pdf'; link.click(); setTimeout(()=>URL.revokeObjectURL(link.href),1200); }
    catch (_) { button.textContent=T.error; setTimeout(()=>{button.textContent=original;},2200); }
    finally { S.busy=false; button.disabled=false; if (button.textContent===T.loading) button.textContent=original; }
  }
  function mount() {
    const sidebar=document.querySelector('#global-network .network-sidebar'); if (!sidebar) return false;
    let panel=$('networkPdfExport'); const T=text(); if(!panel){panel=document.createElement('div');panel.id='networkPdfExport';panel.className='network-pdf-export';sidebar.appendChild(panel);}
    panel.innerHTML=`<strong>PDF · 2D</strong><p>${T.note}</p><button type="button" id="networkPdfButton">↓ ${T.button}</button>`;
    $('networkPdfButton').addEventListener('click',()=>download($('networkPdfButton'))); return true;
  }
  async function init() { [S.network,S.facts]=await Promise.all([get('data/group_network.json'),get('data/group_location_facts.json')]); let tries=0; const timer=setInterval(()=>{if(mount() || ++tries>150)clearInterval(timer);},70); window.addEventListener('gnk-language-change',mount); }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
