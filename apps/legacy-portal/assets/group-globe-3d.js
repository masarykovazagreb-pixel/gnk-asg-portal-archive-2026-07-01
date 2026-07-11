(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const AUTO_ROTATION_SPEED = .00056;
  const state = {
    network:null, geo:null, mode:'3d', filter:'all',
    yaw:-18 * DEG, pitch:18 * DEG, zoom:1, auto:true,
    drag:false, moved:false, lastX:0, lastY:0,
    selected:'boulder', raf:0, lastFrame:0
  };
  const isEn = () => /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const copy = {
    hr: {globe:'3D globus', map:'2D mreža', rotate:'Auto rotacija', reset:'Reset', centre:'Fokus centar', live:'Živa globalna mreža', guide:'Povuci za rotaciju · kotačić za povećanje · klikni lokaciju', active:'Postojeće društvo', planned:'Planirano 2026.', hq:'Središnje sjedište', selected:'Odabrano', region:'Regija', coast:'Kopno i oceani', natural:'Detaljna svjetska obala', embedded:'Lokalni sigurnosni sloj', na:'SJEVERNA AMERIKA', sa:'JUŽNA AMERIKA', eu:'EUROPA', af:'AFRIKA', as:'AZIJA', oc:'OCEANIJA'},
    en: {globe:'3D Globe', map:'2D Network', rotate:'Auto rotate', reset:'Reset', centre:'Focus centre', live:'Live global network', guide:'Drag to rotate · scroll to zoom · click a location', active:'Existing company', planned:'Planned 2026', hq:'Central headquarters', selected:'Selected', region:'Region', coast:'Land and oceans', natural:'Detailed world coastline', embedded:'Local fallback layer', na:'NORTH AMERICA', sa:'SOUTH AMERICA', eu:'EUROPE', af:'AFRICA', as:'ASIA', oc:'OCEANIA'}
  };
  const t = () => copy[isEn() ? 'en' : 'hr'];
  const geography = () => window.GNK_GEOGRAPHY || {state:{polygons:[],source:'embedded'}, labels:{}, microLand:{}};
  const byId = id => state.network?.nodes.find(node => node.id === id) || (id === state.network?.center.id ? state.network.center : null);
  const pointData = id => {
    const node = byId(id);
    const geo = id === 'boulder' ? state.geo?.center : state.geo?.nodes[id];
    return node && geo ? {...node, ...geo} : null;
  };
  const name = node => node.id === 'boulder' ? node.name : (isEn() ? node.name_en : node.name_hr);
  const place = node => node.id === 'boulder' ? node.place : (isEn() ? node.place_en : node.place_hr);
  function visible(node) {
    if (!node) return false;
    if (state.filter === 'active') return node.status === 'active' || node.id === 'boulder';
    if (state.filter === 'planned') return node.status === 'planned';
    if (state.filter === 'outside') return node.region !== 'Europa';
    return true;
  }
  function sphere(lat, lng) {
    const a = lat * DEG, b = lng * DEG;
    return {x:Math.cos(a) * Math.cos(b), y:Math.sin(a), z:Math.cos(a) * Math.sin(b)};
  }
  function rotate(p) {
    const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw), cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    const x = p.x * cy - p.z * sy;
    const z = p.x * sy + p.z * cy;
    return {x, y:p.y * cp - z * sp, z:p.y * sp + z * cp};
  }
  function globeRadius(canvas) { return Math.min(canvas.clientWidth, canvas.clientHeight) * .37 * state.zoom; }
  function project(p, canvas) {
    const r = globeRadius(canvas);
    return {x:canvas.clientWidth / 2 + p.x * r, y:canvas.clientHeight / 2 - p.y * r, z:p.z, scale:.52 + ((p.z + 1) / 2) * .55};
  }
  function resize(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
  function clipSphere(ctx, canvas) {
    ctx.beginPath();
    ctx.arc(canvas.clientWidth / 2, canvas.clientHeight / 2, globeRadius(canvas), 0, TAU);
    ctx.clip();
  }
  function greatArc(a, b, steps = 38) {
    const pa = sphere(a.lat, a.lng), pb = sphere(b.lat, b.lng);
    const dot = Math.max(-1, Math.min(1, pa.x * pb.x + pa.y * pb.y + pa.z * pb.z));
    const angle = Math.acos(dot);
    if (angle < .0001) return [pa, pb];
    const sin = Math.sin(angle);
    return Array.from({length:steps + 1}, (_, i) => {
      const u = i / steps, lift = Math.sin(Math.PI * u) * .085;
      const k1 = Math.sin((1 - u) * angle) / sin, k2 = Math.sin(u * angle) / sin;
      const p = {x:pa.x * k1 + pb.x * k2, y:pa.y * k1 + pb.y * k2, z:pa.z * k1 + pb.z * k2};
      const length = Math.hypot(p.x, p.y, p.z), r = 1 + lift;
      return {x:p.x / length * r, y:p.y / length * r, z:p.z / length * r};
    });
  }
  function drawOcean(ctx, canvas) {
    const cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2, r = globeRadius(canvas);
    const grad = ctx.createRadialGradient(cx - r * .37, cy - r * .43, r * .03, cx, cy, r * 1.17);
    grad.addColorStop(0, '#3989b4'); grad.addColorStop(.21, '#175e87'); grad.addColorStop(.53, '#083754'); grad.addColorStop(.82, '#041c32'); grad.addColorStop(1, '#020914');
    ctx.save();
    ctx.shadowBlur = 46; ctx.shadowColor = 'rgba(57,158,225,.48)';
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(142,218,255,.5)'; ctx.lineWidth = 1.25; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU); ctx.strokeStyle = 'rgba(88,177,232,.14)'; ctx.lineWidth = 11; ctx.stroke();
    clipSphere(ctx, canvas); ctx.globalAlpha = .13; ctx.fillStyle = '#e4f7ff'; ctx.beginPath(); ctx.ellipse(cx - r * .27, cy - r * .45, r * .3, r * .115, -.58, 0, TAU); ctx.fill(); ctx.restore();
  }
  function drawGrid(ctx, canvas) {
    ctx.save(); clipSphere(ctx, canvas); ctx.lineWidth = .48; ctx.strokeStyle = 'rgba(129,198,233,.13)';
    [-60,-30,0,30,60].forEach(lat => {
      ctx.beginPath(); let started = false;
      for (let lng = -180; lng <= 180; lng += 3) {
        const p = project(rotate(sphere(lat, lng)), canvas);
        if (p.z < 0) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
    for (let lng = -150; lng <= 180; lng += 30) {
      ctx.beginPath(); let started = false;
      for (let lat = -90; lat <= 90; lat += 3) {
        const p = project(rotate(sphere(lat, lng)), canvas);
        if (p.z < 0) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  function traceRing(ctx, canvas, ring) {
    let started = false, prior = null, count = 0;
    ring.forEach(([lng, lat]) => {
      const p = project(rotate(sphere(lat, lng)), canvas);
      const discontinuity = prior && Math.hypot(p.x - prior.x, p.y - prior.y) > globeRadius(canvas) * .45;
      if (p.z < -.018 || discontinuity) { started = false; prior = p; return; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
      count += 1; prior = p;
    });
    return count;
  }
  function drawLand(ctx, canvas) {
    const polygons = geography().state.polygons || [];
    ctx.save(); clipSphere(ctx, canvas); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    polygons.forEach(poly => {
      ctx.beginPath(); let visiblePoints = 0;
      poly.forEach(ring => { visiblePoints += traceRing(ctx, canvas, ring); ctx.closePath(); });
      if (visiblePoints < 3) return;
      ctx.fillStyle = 'rgba(52,112,77,.90)'; ctx.strokeStyle = 'rgba(151,218,165,.40)'; ctx.lineWidth = .58;
      ctx.fill('evenodd'); ctx.stroke();
    });
    ctx.restore(); drawMicroLand(ctx, canvas); drawContinentLabels(ctx, canvas);
  }
  function drawMicroLand(ctx, canvas) {
    ctx.save();
    Object.entries(geography().microLand || {}).forEach(([, dot]) => {
      const p = project(rotate(sphere(dot.lat, dot.lng)), canvas);
      if (p.z < .02) return;
      ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(110,187,129,.8)'; ctx.fillStyle = 'rgba(68,128,82,.98)'; ctx.strokeStyle = 'rgba(181,231,184,.85)'; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.arc(p.x, p.y, dot.size * p.scale, 0, TAU); ctx.fill(); ctx.stroke();
    });
    ctx.restore();
  }
  function drawContinentLabels(ctx, canvas) {
    ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 10px system-ui, sans-serif';
    Object.entries(geography().labels || {}).forEach(([key, coords]) => {
      const p = project(rotate(sphere(coords[0], coords[1])), canvas);
      if (p.z < .23) return;
      ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(2,9,20,.9)'; ctx.fillStyle = 'rgba(232,240,212,.62)'; ctx.fillText(t()[key], p.x, p.y);
    });
    ctx.restore();
  }
  function drawArc(ctx, canvas, a, b, planned, timestamp) {
    const points = greatArc(a, b).map(p => project(rotate(p), canvas));
    if (points.filter(p => p.z > -.12).length < 2) return;
    ctx.save(); clipSphere(ctx, canvas); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = planned ? 'rgba(113,237,145,.43)' : 'rgba(121,205,255,.38)'; ctx.lineWidth = planned ? 1.3 : 1.05;
    ctx.beginPath(); let started = false;
    points.forEach(p => { if (p.z < -.12) { started = false; return; } if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y); }); ctx.stroke();
    const u = ((timestamp * (planned ? .00014 : .00020)) + (a.lng + b.lng) / 600) % 1;
    const glow = points[Math.min(points.length - 1, Math.floor(u * (points.length - 1)))];
    if (glow && glow.z > -.08) { ctx.shadowBlur = 14; ctx.shadowColor = planned ? '#71ed91' : '#76c7ff'; ctx.fillStyle = planned ? '#abffbb' : '#e1f5ff'; ctx.beginPath(); ctx.arc(glow.x, glow.y, planned ? 2.25 : 2.45, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawPoint(ctx, pos, node, timestamp) {
    const central = node.id === 'boulder', planned = node.status === 'planned', selected = state.selected === node.id;
    const radius = (central ? 8 : planned ? 4.4 : 4.8) * pos.scale;
    ctx.save();
    if (selected) {
      const wave = radius + 7 + Math.sin(timestamp / 145) * 4;
      ctx.strokeStyle = 'rgba(239,51,64,.90)'; ctx.lineWidth = 2.2; ctx.shadowBlur = 20; ctx.shadowColor = '#ef3340'; ctx.beginPath(); ctx.arc(pos.x, pos.y, wave, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ef3340'; ctx.beginPath(); ctx.arc(pos.x, pos.y, central ? radius : radius + 1.2, 0, TAU); ctx.fill();
    } else {
      ctx.shadowBlur = central ? 22 : 13; ctx.shadowColor = central ? '#d4af37' : planned ? '#71ed91' : '#76c7ff'; ctx.fillStyle = central ? '#d4af37' : planned ? '#71ed91' : '#76c7ff'; ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, TAU); ctx.fill();
    }
    ctx.restore(); return Math.max(radius + 10, 14);
  }
  function draw(timestamp) {
    const canvas = document.getElementById('groupGlobeCanvas');
    if (!canvas || state.mode !== '3d' || !state.network || !state.geo) return;
    resize(canvas); const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    if (state.auto && !state.drag && !matchMedia('(prefers-reduced-motion: reduce)').matches) state.yaw += AUTO_ROTATION_SPEED * Math.min(35, timestamp - (state.lastFrame || timestamp));
    state.lastFrame = timestamp; drawOcean(ctx, canvas); drawGrid(ctx, canvas); drawLand(ctx, canvas);
    const centre = pointData('boulder');
    state.network.nodes.filter(visible).forEach(node => drawArc(ctx, canvas, centre, pointData(node.id), node.status === 'planned', timestamp));
    state.network.peer_links.forEach(pair => { const a = pointData(pair[0]), b = pointData(pair[1]); if (a && b && visible(a) && visible(b)) drawArc(ctx, canvas, a, b, a.status === 'planned' || b.status === 'planned', timestamp + 800); });
    const points = [centre, ...state.network.nodes.map(node => pointData(node.id)).filter(Boolean)].filter(visible).map(node => ({node, pos:project(rotate(sphere(node.lat, node.lng)), canvas)})).filter(item => item.pos.z > -.05).sort((a, b) => a.pos.z - b.pos.z);
    canvas._points = points.map(item => ({node:item.node, x:item.pos.x, y:item.pos.y, r:drawPoint(ctx, item.pos, item.node, timestamp)}));
    state.raf = requestAnimationFrame(draw);
  }
  function updateDetail(node) {
    const box = document.getElementById('networkDetail'); if (!box || !node) return;
    const status = node.id === 'boulder' ? t().hq : node.status === 'planned' ? t().planned : t().active;
    box.innerHTML = `<small>${t().globe}</small><h4>${name(node)}</h4><p>${place(node)}</p><p><strong>${t().region}:</strong> ${node.region || '—'}</p><span class="state ${node.id === 'boulder' ? 'hq' : node.status}">${status}</span>`;
    document.dispatchEvent(new CustomEvent('gnk-location-selected', {detail:{id:node.id}}));
  }
  function updateCoastLabel() {
    const badge = document.getElementById('globeCoastSource');
    if (badge) badge.textContent = `${t().coast}: ${geography().state.source === 'natural-earth' ? t().natural : t().embedded}`;
  }
  function build() {
    const layout = document.querySelector('#global-network .network-layout'), twoD = layout && layout.querySelector('.network-canvas');
    if (!layout || !twoD || document.getElementById('groupGlobeCanvas')) return false;
    const toolbar = document.createElement('div'); toolbar.className = 'globe-toolbar';
    toolbar.innerHTML = `<div class="globe-mode"><button type="button" class="globe-btn active" data-globe-mode="3d">${t().globe}</button><button type="button" class="globe-btn" data-globe-mode="2d">${t().map}</button></div><div class="globe-tools"><button type="button" class="globe-btn active" data-globe-auto>${t().rotate}: ON</button><button type="button" class="globe-btn" data-globe-focus>${t().centre}</button><button type="button" class="globe-btn" data-globe-reset>${t().reset}</button></div>`;
    layout.parentNode.insertBefore(toolbar, layout);
    const panel = document.createElement('div'); panel.className = 'globe-panel';
    panel.innerHTML = `<canvas id="groupGlobeCanvas" class="globe-canvas" aria-label="${t().globe}"></canvas><div class="globe-badge">${t().live}</div><div class="globe-coast-source" id="globeCoastSource"></div><div class="globe-legend"><span><i class="h"></i>${t().hq}</span><span><i class="a"></i>${t().active}</span><span><i class="p"></i>${t().planned}</span><span><i class="r"></i>${t().selected}</span></div><div class="globe-guide"><span><strong>3D</strong> · ${t().guide}</span><span>45 LOCATIONS</span></div><div class="globe-tooltip" id="globeTooltip"></div>`;
    layout.insertBefore(panel, twoD); layout.classList.add('is-3d'); bind(toolbar, panel); updateCoastLabel(); updateDetail(pointData('boulder')); state.raf = requestAnimationFrame(draw); return true;
  }
  function bind(toolbar, panel) {
    const canvas = panel.querySelector('canvas');
    toolbar.addEventListener('click', event => {
      const mode = event.target.dataset.globeMode; if (mode) { layoutMode(mode, toolbar); return; }
      if (event.target.dataset.globeAuto !== undefined) { state.auto = !state.auto; event.target.classList.toggle('active', state.auto); event.target.textContent = `${t().rotate}: ${state.auto ? 'ON' : 'OFF'}`; }
      if (event.target.dataset.globeReset !== undefined) { state.yaw = -18 * DEG; state.pitch = 18 * DEG; state.zoom = 1; }
      if (event.target.dataset.globeFocus !== undefined) { state.selected = 'boulder'; updateDetail(pointData('boulder')); state.yaw = -18 * DEG; state.pitch = 18 * DEG; state.zoom = 1.18; }
    });
    canvas.addEventListener('pointerdown', event => { state.drag = true; state.moved = false; state.lastX = event.clientX; state.lastY = event.clientY; canvas.setPointerCapture(event.pointerId); state.auto = false; const button = toolbar.querySelector('[data-globe-auto]'); if (button) { button.classList.remove('active'); button.textContent = `${t().rotate}: OFF`; } });
    canvas.addEventListener('pointermove', event => { if (state.drag) { const dx = event.clientX - state.lastX, dy = event.clientY - state.lastY; if (Math.abs(dx) + Math.abs(dy) > 2) state.moved = true; state.yaw += dx * .007; state.pitch = Math.max(-1.2, Math.min(1.2, state.pitch + dy * .006)); state.lastX = event.clientX; state.lastY = event.clientY; } hover(canvas, event); });
    canvas.addEventListener('pointerup', event => { if (!state.moved) select(canvas, event); state.drag = false; });
    canvas.addEventListener('pointerleave', () => { document.getElementById('globeTooltip')?.classList.remove('visible'); state.drag = false; });
    canvas.addEventListener('wheel', event => { event.preventDefault(); state.zoom = Math.max(.68, Math.min(1.55, state.zoom + (event.deltaY < 0 ? .06 : -.06))); }, {passive:false});
  }
  function layoutMode(mode, toolbar) {
    const layout = document.querySelector('#global-network .network-layout'); if (!layout) return;
    state.mode = mode; layout.classList.toggle('is-3d', mode === '3d'); toolbar.querySelectorAll('[data-globe-mode]').forEach(button => button.classList.toggle('active', button.dataset.globeMode === mode)); cancelAnimationFrame(state.raf); if (mode === '3d') state.raf = requestAnimationFrame(draw);
  }
  function at(canvas, event) { const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top; return (canvas._points || []).find(point => Math.hypot(point.x - x, point.y - y) <= point.r); }
  function hover(canvas, event) { const selected = at(canvas, event), tip = document.getElementById('globeTooltip'); if (!tip) return; if (!selected) { tip.classList.remove('visible'); return; } tip.innerHTML = `${name(selected.node)}<small>${place(selected.node)}</small>`; tip.style.left = `${selected.x}px`; tip.style.top = `${selected.y}px`; tip.classList.add('visible'); }
  function select(canvas, event) { const selected = at(canvas, event); if (selected) { state.selected = selected.node.id; updateDetail(selected.node); } }
  window.GNK_GLOBE = {
    getCanvas() { return document.getElementById('groupGlobeCanvas'); },
    getSelected() { return state.selected; },
    isActive() { return state.mode === '3d'; },
    activate() { const button = document.querySelector('[data-globe-mode="3d"]'); if (button && state.mode !== '3d') button.click(); },
    selectLocation(id) { const item = pointData(id); if (!item) return false; state.selected = id; updateDetail(item); return true; }
  };
  async function init() {
    try {
      const [networkResponse, geoResponse] = await Promise.all([fetch('data/group_network.json?v=' + Date.now(), {cache:'no-store'}), fetch('data/group_network_geo.json?v=' + Date.now(), {cache:'no-store'})]);
      if (!networkResponse.ok || !geoResponse.ok) return;
      state.network = await networkResponse.json(); state.geo = await geoResponse.json(); geography().load?.().then(updateCoastLabel);
      const timer = setInterval(() => { if (build()) clearInterval(timer); }, 60); setTimeout(() => clearInterval(timer), 6000);
      document.addEventListener('click', event => { if (event.target.matches('#global-network [data-filter]')) state.filter = event.target.dataset.filter || 'all'; });
      document.addEventListener('gnk-location-selected', event => { if (event.detail?.id && byId(event.detail.id)) state.selected = event.detail.id; });
      document.addEventListener('gnk-geography-ready', updateCoastLabel);
      window.addEventListener('gnk-language-change', () => { updateCoastLabel(); const item = pointData(state.selected); if (item) updateDetail(item); });
    } catch (error) { console.warn('3D globe unavailable; existing 2D network remains active.', error); }
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
