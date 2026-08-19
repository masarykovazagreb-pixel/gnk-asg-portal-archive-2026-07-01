(() => {
  'use strict';
  if (window.__GNK_DW_DASHBOARD_V1__) return;
  window.__GNK_DW_DASHBOARD_V1__ = true;

  const isEn = window.location.pathname.startsWith('/en/');
  const base = '/api/public/digital-workforce/';
  const langParam = isEn ? 'lang=en' : '';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const T = isEn ? {
    projectProgress: 'Project Progress', workerStatus: 'Worker Status', tasksByStatus: 'Tasks by Status',
    commsTitle: 'Live worker communication (who talks to whom only, not content)',
    active: 'Active', review: 'On review', onLeave: 'On leave', training: 'Training',
    todo: 'To do', progress: 'In progress', done: 'Done',
    donutAria: 'Worker status distribution',
  } : {
    projectProgress: 'Napredak projekata', workerStatus: 'Status workera', tasksByStatus: 'Zadaci po statusu',
    commsTitle: 'Komunikacija workera uživo (samo tko s kim, ne i sadržaj)',
    active: 'Aktivni', review: 'Na reviziji', onLeave: 'Odsutni', training: 'Edukacija',
    todo: 'Za napraviti', progress: 'U tijeku', done: 'Završeno',
    donutAria: 'Raspodjela statusa workera',
  };

  async function get(key) {
    const url = langParam ? `${base}${key}?${langParam}` : `${base}${key}`;
    const r = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(key + ':' + r.status);
    return r.json();
  }

  const STYLE = `
.dw-dash{margin:12px 0 32px;display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.dw-dash-card{border:1px solid rgba(215,181,91,.25);border-radius:14px;padding:16px 18px;background:rgba(255,255,255,.02)}
.dw-dash-card h3{margin:0 0 12px;font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;color:#f2d27d}
.dw-dash-wide{grid-column:1/-1}
.dw-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:.8rem}
.dw-bar-label{width:110px;flex:0 0 110px;color:#cfcac0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dw-bar-track{flex:1;height:10px;border-radius:6px;background:rgba(255,255,255,.06);overflow:hidden}
.dw-bar-fill{height:100%;border-radius:6px;background:linear-gradient(90deg,#d7b55b,#f2d27d);transition:width 1.2s ease}
.dw-bar-value{width:40px;flex:0 0 40px;text-align:right;color:#f7f5ef;font-weight:700}
.dw-donut-wrap{display:flex;align-items:center;gap:16px}
.dw-donut-legend{display:flex;flex-direction:column;gap:6px;font-size:.78rem}
.dw-donut-legend span{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}
.dw-comms-feed{max-height:280px;overflow-y:auto;display:flex;flex-direction:column-reverse;gap:6px}
.dw-comms-row{display:flex;align-items:center;gap:8px;font-size:.8rem;color:#cfcac0;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.02);animation:dwCommsIn .5s ease}
.dw-comms-row b{color:#f7f5ef}
.dw-comms-arrow{color:#f2d27d}
.dw-comms-tag{margin-left:auto;font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:#9c968a;border:1px solid rgba(215,181,91,.2);border-radius:999px;padding:1px 8px}
@keyframes dwCommsIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.dw-tasks-bar{display:flex;height:22px;border-radius:8px;overflow:hidden;margin-bottom:8px}
.dw-tasks-seg{transition:width 1.2s ease}
.dw-tasks-legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.75rem;color:#cfcac0}
.dw-tasks-legend span.dw-legend-item{white-space:nowrap;display:inline-flex;align-items:center}
.dw-tasks-legend span.dw-legend-dot{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;flex:0 0 auto}
`;

  function donutSvg(segments, size = 120) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const r = size / 2 - 10, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
    let offset = 0;
    const arcs = segments.map(seg => {
      const frac = seg.value / total;
      const dash = frac * circ;
      const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="16" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" style="transition:stroke-dasharray 1.2s ease"/>`;
      offset += dash;
      return el;
    }).join('');
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(T.donutAria)}">${arcs}</svg>`;
  }

  function renderCharts(state, projects, tasks) {
    const projectBars = document.getElementById('dwChartProjects');
    if (projectBars) {
      projectBars.innerHTML = projects.map(p => `
        <div class="dw-bar-row">
          <span class="dw-bar-label" title="${esc(p.name)}">${esc(p.id)}</span>
          <span class="dw-bar-track"><span class="dw-bar-fill" style="width:${p.progress}%"></span></span>
          <span class="dw-bar-value">${p.progress}%</span>
        </div>`).join('');
    }

    const donutHost = document.getElementById('dwChartWorkers');
    if (donutHost && state) {
      const activePct = 0.87, reviewPct = 0.06, leavePct = 0.035, trainPct = 0.035;
      const segs = [
        { label: T.active, value: activePct, color: '#7ddc96' },
        { label: T.review, value: reviewPct, color: '#ffc878' },
        { label: T.onLeave, value: leavePct, color: '#8a85f0' },
        { label: T.training, value: trainPct, color: '#f2d27d' },
      ];
      donutHost.innerHTML = `<div class="dw-donut-wrap">${donutSvg(segs)}<div class="dw-donut-legend">${segs.map(s => `<div><span style="background:${s.color}"></span>${esc(s.label)} · ${Math.round(s.value * 100)}%</div>`).join('')}</div></div>`;
    }

    const taskHost = document.getElementById('dwChartTasks');
    if (taskHost && tasks) {
      const counts = { todo: 0, progress: 0, done: 0 };
      tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
      const total = tasks.length || 1;
      const colors = { todo: '#8a857a', progress: '#f2d27d', done: '#7ddc96' };
      const labels = { todo: T.todo, progress: T.progress, done: T.done };
      taskHost.innerHTML = `
        <div class="dw-tasks-bar">${Object.entries(counts).map(([k, v]) => `<div class="dw-tasks-seg" style="width:${(v / total) * 100}%;background:${colors[k]}"></div>`).join('')}</div>
        <div class="dw-tasks-legend">${Object.entries(counts).map(([k, v]) => `<span class="dw-legend-item"><span class="dw-legend-dot" style="background:${colors[k]}"></span>${esc(labels[k])}: ${v}</span>`).join('')}</div>`;
    }
  }

  function renderComms(items, feedEl) {
    if (!feedEl) return;
    const existingIds = new Set([...feedEl.children].map(c => c.dataset.commId));
    items.forEach(c => {
      const id = `${c.from}-${c.to}-${c.at}`;
      if (existingIds.has(id)) return;
      const row = document.createElement('div');
      row.className = 'dw-comms-row';
      row.dataset.commId = id;
      row.innerHTML = `<b>${esc(c.fromName)}</b><span class="dw-comms-arrow">↔</span><b>${esc(c.toName)}</b><span class="dw-comms-tag">${esc(c.channel)}</span>`;
      feedEl.appendChild(row);
    });
    while (feedEl.children.length > 40) feedEl.removeChild(feedEl.firstChild);
  }

  async function tick(feedEl) {
    try {
      const [state, projectsRes, tasksRes, commsRes] = await Promise.all([
        get('state'), get('projects'), get('tasks'), get('comms'),
      ]);
      renderCharts(state, projectsRes.items, tasksRes.items);
      renderComms(commsRes.items, feedEl);
    } catch (e) {
      console.error('dw-dashboard', e);
    }
  }

  function boot() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const parts = path.split('/').filter(Boolean);
    const isDwRoot = (parts.length === 1 && parts[0] === 'digital-workforce') ||
                      (parts.length === 2 && parts[0] === 'en' && parts[1] === 'digital-workforce');
    if (!isDwRoot) return;
    const main = document.querySelector('main') || document.body;
    if (!main) return;

    const styleEl = document.createElement('style');
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);

    const antfarm = document.createElement('script');
    antfarm.src = '/assets/digital-workforce-antfarm-v1.js?v=20260819';
    antfarm.defer = true;
    document.head.appendChild(antfarm);

    const dash = document.createElement('div');
    dash.className = 'dw-dash';
    dash.innerHTML = `
      <div class="dw-dash-card"><h3>${esc(T.projectProgress)}</h3><div id="dwChartProjects"></div></div>
      <div class="dw-dash-card"><h3>${esc(T.workerStatus)}</h3><div id="dwChartWorkers"></div></div>
      <div class="dw-dash-card"><h3>${esc(T.tasksByStatus)}</h3><div id="dwChartTasks"></div></div>
      <div class="dw-dash-card dw-dash-wide"><h3>${esc(T.commsTitle)}</h3><div id="dwCommsFeed" class="dw-comms-feed"></div></div>
    `;
    main.appendChild(dash);

    const feedEl = dash.querySelector('#dwCommsFeed');
    tick(feedEl);
    setInterval(() => tick(feedEl), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
