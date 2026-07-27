(() => {
  'use strict';
  if (window.__GNK_ASG_EMAIL_STATUS_DASHBOARD_V4__) return;
  window.__GNK_ASG_EMAIL_STATUS_DASHBOARD_V4__ = true;

  const params = new URLSearchParams(location.search);
  const allowedSources = new Set(['all', 'mail-studio', 'campaign-mailer', 'media-center', 'auto-reply']);
  const requestedSource = params.get('source') || 'all';
  const initialSource = allowedSources.has(requestedSource) ? requestedSource : 'all';
  const initialQuery = (params.get('search') || '').slice(0, 150);
  const dateFilter = params.get('date') === 'today' ? 'today' : 'all';
  const candidate = params.get('from') || '';
  const from = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '';
  const sourceLabels = {
    'mail-studio': 'Mail Studio',
    'campaign-mailer': 'Campaign Mailer',
    'media-center': 'Media Center',
    'auto-reply': 'Automatski odgovori',
    all: 'svi sustavi'
  };
  const statusLabels = {
    SUBMITTING: 'Priprema',
    ACCEPTED: 'Poslano',
    DEFERRED: 'Odgođeno',
    DELIVERED: 'Isporučeno',
    OPENED: 'Otvoreno / viđeno',
    CONFIRMED: 'Potvrđen primitak',
    BOUNCED: 'Odbijeno',
    REJECTED: 'Blokirano',
    FAILED: 'Neuspješno',
    UNKNOWN: 'Nepoznato'
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const fmt = value => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('hr-HR', {
      dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Zagreb'
    });
  };
  const api = async (url, init = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { accept: 'application/json', ...(init.headers || {}) },
      ...init
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`);
    return data;
  };
  const badge = status => `<span class="badge ${esc(status || 'UNKNOWN')}">${esc(statusLabels[status] || status || 'Nepoznato')}</span>`;

  const style = document.createElement('style');
  style.id = 'gnk-email-status-dashboard-v4-style';
  style.textContent = `
    html[data-gnk-email-status-dashboard="v4"]{color-scheme:dark!important;background:#02050b!important;color:#f8fafc!important}
    html[data-gnk-email-status-dashboard="v4"] body{min-height:100vh!important;background:radial-gradient(circle at 12% -8%,#2d527f 0,#0a1830 33%,#02050b 78%)!important;color:#f8fafc!important}
    html[data-gnk-email-status-dashboard="v4"] .wrap{max-width:1900px!important;padding:22px!important}
    html[data-gnk-email-status-dashboard="v4"] .top{align-items:flex-start!important;padding:20px 22px!important;border:2px solid #b9923f!important;border-radius:22px!important;background:#08182c!important;box-shadow:0 20px 48px rgba(0,0,0,.34)!important}
    html[data-gnk-email-status-dashboard="v4"] h1{color:#ffe08a!important;font:700 clamp(30px,4vw,48px)/1.08 Georgia,serif!important;letter-spacing:-.02em!important}
    html[data-gnk-email-status-dashboard="v4"] .muted{color:#dce6f5!important}
    html[data-gnk-email-status-dashboard="v4"] .card{background:#08182c!important;border:1px solid #b9923f!important;color:#f8fafc!important;box-shadow:0 16px 40px rgba(0,0,0,.24)!important}
    html[data-gnk-email-status-dashboard="v4"] .card p,
    html[data-gnk-email-status-dashboard="v4"] .card div,
    html[data-gnk-email-status-dashboard="v4"] .card span{color:inherit}
    html[data-gnk-email-status-dashboard="v4"] .stats{gap:10px!important}
    html[data-gnk-email-status-dashboard="v4"] .stat b{color:#fff!important;margin-top:8px!important}
    html[data-gnk-email-status-dashboard="v4"] .controls{gap:9px!important;align-items:center!important}
    html[data-gnk-email-status-dashboard="v4"] .controls input,
    html[data-gnk-email-status-dashboard="v4"] .controls select{min-height:44px!important;background:#fff!important;color:#07101d!important;border:2px solid #b9923f!important}
    html[data-gnk-email-status-dashboard="v4"] button,
    html[data-gnk-email-status-dashboard="v4"] .gnk-status-action{min-height:44px!important;border:2px solid #d8ad4f!important;border-radius:999px!important;background:#f0ca68!important;color:#07101d!important;font-weight:900!important;text-decoration:none!important;padding:10px 15px!important;cursor:pointer!important}
    html[data-gnk-email-status-dashboard="v4"] button.secondary,
    html[data-gnk-email-status-dashboard="v4"] .gnk-status-action.secondary{background:#0f2748!important;color:#fff!important}
    html[data-gnk-email-status-dashboard="v4"] button:focus-visible,
    html[data-gnk-email-status-dashboard="v4"] a:focus-visible,
    html[data-gnk-email-status-dashboard="v4"] input:focus-visible,
    html[data-gnk-email-status-dashboard="v4"] select:focus-visible{outline:3px solid #fff!important;outline-offset:3px!important}
    html[data-gnk-email-status-dashboard="v4"] .table{border:2px solid #405675!important;border-radius:16px!important;background:#061326!important}
    html[data-gnk-email-status-dashboard="v4"] table{min-width:1850px!important}
    html[data-gnk-email-status-dashboard="v4"] th{position:sticky!important;top:0!important;z-index:2!important;background:#10294a!important;color:#ffe08a!important;border-color:#405675!important;font-weight:900!important}
    html[data-gnk-email-status-dashboard="v4"] td{background:#08182c!important;color:#f8fafc!important;border-color:#405675!important;line-height:1.5!important}
    html[data-gnk-email-status-dashboard="v4"] tbody tr:hover td{background:#10223d!important}
    html[data-gnk-email-status-dashboard="v4"] .badge{border:1px solid rgba(0,0,0,.35)!important;color:#111827!important}
    html[data-gnk-email-status-dashboard="v4"] .DELIVERED{background:#bbf7d0!important;color:#14532d!important}
    html[data-gnk-email-status-dashboard="v4"] .OPENED{background:#bfdbfe!important;color:#1e3a8a!important}
    html[data-gnk-email-status-dashboard="v4"] .CONFIRMED{background:#fde68a!important;color:#713f12!important}
    html[data-gnk-email-status-dashboard="v4"] .ACCEPTED{background:#fef3c7!important;color:#78350f!important}
    html[data-gnk-email-status-dashboard="v4"] .DEFERRED{background:#fed7aa!important;color:#7c2d12!important}
    html[data-gnk-email-status-dashboard="v4"] .BOUNCED,
    html[data-gnk-email-status-dashboard="v4"] .REJECTED,
    html[data-gnk-email-status-dashboard="v4"] .FAILED{background:#fecaca!important;color:#7f1d1d!important}
    html[data-gnk-email-status-dashboard="v4"] .SUBMITTING{background:#c7d2fe!important;color:#312e81!important}
    html[data-gnk-email-status-dashboard="v4"] .gnk-status-help,
    html[data-gnk-email-status-dashboard="v4"] .gnk-health{margin:14px 0!important;padding:15px 17px!important;border:1px solid #6b86a9!important;border-radius:14px!important;background:#0a1d36!important;color:#edf4ff!important;font:500 13px/1.62 Inter,Arial,sans-serif!important}
    html[data-gnk-email-status-dashboard="v4"] .gnk-status-help strong,
    html[data-gnk-email-status-dashboard="v4"] .gnk-health strong{color:#ffe08a!important}
    html[data-gnk-email-status-dashboard="v4"] .gnk-status-actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important;margin:12px 0!important}
    html[data-gnk-email-status-dashboard="v4"] .gnk-detail-row td{background:#061225!important;padding:0!important}
    html[data-gnk-email-status-dashboard="v4"] .gnk-timeline{padding:18px!important}
    html[data-gnk-email-status-dashboard="v4"] .gnk-timeline-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))!important;gap:10px!important}
    html[data-gnk-email-status-dashboard="v4"] .gnk-event{padding:12px!important;border:1px solid #405675!important;border-radius:12px!important;background:#0d2340!important;color:#f8fafc!important}
    html[data-gnk-email-status-dashboard="v4"] .gnk-event b{color:#ffe08a!important}
    html[data-gnk-email-status-dashboard="v4"] .gnk-warning{color:#ffd5a3!important}
    html[data-gnk-email-status-dashboard="v4"] .gnk-ok{color:#bbf7d0!important}
    html[data-gnk-email-status-dashboard="v4"] .gnk-error{color:#fecaca!important}
    html[data-gnk-email-status-dashboard="v4"] .small{color:#dce6f5!important}
    @media(max-width:760px){
      html[data-gnk-email-status-dashboard="v4"] .wrap{padding:12px!important}
      html[data-gnk-email-status-dashboard="v4"] .top{padding:15px!important}
      html[data-gnk-email-status-dashboard="v4"] .gnk-status-actions{display:grid!important;grid-template-columns:1fr!important}
      html[data-gnk-email-status-dashboard="v4"] .gnk-status-action{text-align:center!important}
      html[data-gnk-email-status-dashboard="v4"] .stats{grid-template-columns:1fr 1fr!important}
    }
  `;
  document.head.append(style);

  let currentData = null;
  let openDetailId = '';

  function ensureShell() {
    document.documentElement.lang = 'hr';
    document.documentElement.dataset.gnkEmailStatusDashboard = 'v4';
    const title = document.querySelector('h1');
    const top = document.querySelector('.top') || title?.parentElement;
    if (title) {
      const label = initialSource === 'all' ? 'Status svih email poruka' : `Status poruka — ${sourceLabels[initialSource]}`;
      title.textContent = dateFilter === 'today' ? `Današnje poruke — ${sourceLabels[initialSource]}` : label;
      document.title = `${title.textContent} | GNK ASG`;
    }
    const source = document.querySelector('#source');
    const search = document.querySelector('#search');
    if (source) source.value = initialSource;
    if (search && initialQuery) search.value = initialQuery;

    if (top && !document.querySelector('.gnk-status-help')) {
      const help = document.createElement('section');
      help.className = 'gnk-status-help';
      help.innerHTML = `<strong>Što sustav može dokazati:</strong> vrijeme predaje pružatelju, status isporuke poslužitelju primatelja, odbijanje ili grešku, tehnički signal svakog učitavanja tracking slike te aktivnu potvrdu primitka. <strong>Što ne može pouzdano dokazati:</strong> da je osoba pročitala sadržaj ili da je poruku proslijedila. Gmail i Apple mogu prikazati proxy IP umjesto IP adrese primatelja.`;
      top.insertAdjacentElement('afterend', help);

      const actions = document.createElement('nav');
      actions.className = 'gnk-status-actions';
      actions.innerHTML = `<a class="gnk-status-action secondary" href="/admin-center/">Admin Center</a><a class="gnk-status-action secondary" href="/mail-studio/">Mail Studio</a>`;
      const toggle = document.createElement('a');
      toggle.className = 'gnk-status-action secondary';
      const url = new URL(location.href);
      if (dateFilter === 'today') {
        url.searchParams.delete('date');
        toggle.textContent = 'Prikaži sve datume';
      } else {
        url.searchParams.set('date', 'today');
        toggle.textContent = 'Samo današnje poruke';
      }
      toggle.href = url.pathname + url.search;
      actions.append(toggle);
      if (from) {
        const back = document.createElement('a');
        back.className = 'gnk-status-action secondary';
        back.href = from;
        back.textContent = 'Natrag u aplikaciju';
        actions.append(back);
      }
      help.insertAdjacentElement('afterend', actions);
      const health = document.createElement('section');
      health.className = 'gnk-health';
      health.id = 'gnkEmailStatusHealth';
      health.setAttribute('role', 'status');
      health.textContent = 'Provjera statusnog sustava…';
      actions.insertAdjacentElement('afterend', health);
    }

    const head = document.querySelector('table thead');
    if (head) head.innerHTML = `<tr>
      <th>Status</th><th>Primatelj / pošiljatelj</th><th>Predmet / sustav</th>
      <th>Poslano</th><th>Isporučeno</th><th>Potvrđen primitak</th>
      <th>Prvo / zadnje otvaranje</th><th>Otvaranja</th><th>Zadnji uređaj / IP</th>
      <th>Odbijanje / greška</th><th>Provider ID</th><th>Prosljeđivanje</th><th>Detalji</th>
    </tr>`;
  }

  async function loadHealth() {
    const host = document.querySelector('#gnkEmailStatusHealth');
    if (!host) return;
    try {
      const health = await api('/api/email-status/health');
      const parts = [
        `<strong>D1 evidencija:</strong> <span class="${health.d1 ? 'gnk-ok' : 'gnk-error'}">${health.d1 ? 'spremna' : 'nije dostupna'}</span>`,
        `<strong>Cloudflare delivery sinkronizacija:</strong> <span class="${health.analyticsConfigured ? 'gnk-ok' : 'gnk-warning'}">${health.analyticsConfigured ? 'konfigurirana' : 'nema Analytics vjerodajnica'}</span>`,
        `<strong>Praćenje otvaranja:</strong> <span class="${health.openTrackingEnabled ? 'gnk-ok' : 'gnk-warning'}">${health.openTrackingEnabled ? 'uključeno' : 'isključeno'}</span>`,
        `<strong>Potvrda primitka:</strong> <span class="${health.receiptConfirmationEnabled ? 'gnk-ok' : 'gnk-warning'}">${health.receiptConfirmationEnabled ? 'uključena' : 'isključena'}</span>`,
        `<strong>Vremenska zona prikaza:</strong> Europe/Zagreb`
      ];
      host.innerHTML = parts.join(' · ');
    } catch (error) {
      host.innerHTML = `<strong>Statusni API ne radi:</strong> <span class="gnk-error">${esc(error.message)}</span>. Provjeri aktivnu admin sesiju, D1 binding i aktualni Worker deploy.`;
    }
  }

  function renderStats(summary = {}) {
    const host = document.querySelector('#stats');
    if (!host) return;
    const preferred = ['CONFIRMED', 'OPENED', 'DELIVERED', 'ACCEPTED', 'DEFERRED', 'BOUNCED', 'REJECTED', 'FAILED', 'SUBMITTING'];
    const entries = preferred.filter(key => summary[key] !== undefined).map(key => [key, summary[key]]);
    for (const entry of Object.entries(summary)) if (!preferred.includes(entry[0])) entries.push(entry);
    host.innerHTML = entries.map(([status, count]) => `<div class="card stat">${badge(status)}<b>${Number(count || 0)}</b></div>`).join('');
  }

  function forwardingCell(item) {
    if (item.possible_forwarding_signal) {
      return `<span class="gnk-warning">Mogući različiti izvori otvaranja (${Number(item.distinct_open_environments || 0)})</span><div class="small">Nije dokaz prosljeđivanja.</div>`;
    }
    return `<span class="small">Nije utvrdivo standardnim e-mailom.</span>`;
  }

  function rowHtml(item) {
    const confirmed = item.receipt_confirmed_at
      ? `${fmt(item.receipt_confirmed_at)}<div class="small">${Number(item.receipt_confirmation_count || 0)} potvrda</div>`
      : '—';
    const opened = `${fmt(item.first_opened_at)}<div class="small">Zadnje: ${fmt(item.last_opened_at)}</div>`;
    const error = item.error_detail || item.error_cause
      ? `<span class="gnk-error">${esc(item.error_cause || '')}</span><div class="small">${esc(item.error_detail || '')}</div><div class="small">${fmt(item.failed_at)}</div>`
      : '—';
    return `<tr data-record-id="${esc(item.tracking_id)}">
      <td>${badge(item.current_status)}${item.receipt_confirmed_at && item.current_status !== 'CONFIRMED' ? `<div style="margin-top:6px">${badge('CONFIRMED')}</div>` : ''}</td>
      <td><b>${esc(item.recipient || '—')}</b>${item.batch_recipient_count>1?`<div class="small" title="${esc((item.batch_other_recipients||[]).join(', '))}">Dio istog slanja · ${item.batch_recipient_count} primatelja ukupno</div>`:''}<div class="small">Od: ${esc(item.sender || '—')}</div></td>
      <td><b>${esc(item.subject || '—')}</b><div class="small">${esc(sourceLabels[item.source_system] || item.source_system || '—')}</div><div class="small">Izvorni ID: ${esc(item.source_id || '—')}</div></td>
      <td>${fmt(item.accepted_at)}<div class="small">Kreirano: ${fmt(item.created_at)}</div></td>
      <td>${fmt(item.delivered_at)}<div class="small">Provider: ${esc(item.provider_status || '—')}</div></td>
      <td>${confirmed}</td>
      <td>${opened}</td>
      <td><b>${Number(item.open_count || 0)}</b><div class="small">Okruženja: ${Number(item.distinct_open_environments || 0)}</div></td>
      <td>${esc(item.last_open_device || '—')}<div class="small">${esc(item.last_open_ip || '—')}</div><div class="small" title="${esc(item.last_open_user_agent || '')}">${esc((item.last_open_user_agent || '').slice(0, 90) || '—')}</div></td>
      <td>${error}</td>
      <td class="small">${esc(item.provider_message_id || '—')}<div>${esc(item.tracking_id || '')}</div></td>
      <td>${forwardingCell(item)}</td>
      <td><button class="secondary gnek-details" type="button" data-details-id="${esc(item.tracking_id)}" aria-expanded="${openDetailId === item.tracking_id ? 'true' : 'false'}">${openDetailId === item.tracking_id ? 'Sakrij' : 'Vremenska crta'}</button></td>
    </tr>`;
  }

  async function loadRecords() {
    const message = document.querySelector('#message');
    const rows = document.querySelector('#rows');
    if (message) message.textContent = 'Učitavanje detaljne evidencije…';
    try {
      const query = new URLSearchParams({
        limit: '300',
        status: document.querySelector('#status')?.value || 'ALL',
        source: document.querySelector('#source')?.value || 'all',
        search: document.querySelector('#search')?.value || ''
      });
      if (dateFilter === 'today') query.set('date', 'today');
      currentData = await api(`/api/email-status/records?${query}`);
      renderStats(currentData.summary);
      if (rows) rows.innerHTML = (currentData.items || []).map(rowHtml).join('') || '<tr><td colspan="13">Nema zapisa za odabrane filtre.</td></tr>';
      if (message) {
        const sync = currentData.sync?.last_completed_at ? ` · zadnja Cloudflare sinkronizacija: ${fmt(currentData.sync.last_completed_at)}` : '';
        const backfill = currentData.manualAuditBackfill?.ok === false ? ` · backfill upozorenje: ${currentData.manualAuditBackfill.message || currentData.manualAuditBackfill.reason}` : '';
        message.textContent = `Ukupno zapisa: ${Number(currentData.total || 0)}${sync}${backfill}`;
      }
      bindDetails();
    } catch (error) {
      if (rows) rows.innerHTML = `<tr><td colspan="13" class="gnk-error">Evidencija nije učitana: ${esc(error.message)}</td></tr>`;
      if (message) message.textContent = `Greška: ${error.message}`;
    }
  }

  function eventHtml(event) {
    return `<article class="gnk-event">
      <b>${esc(statusLabels[event.event_type] || event.event_type)}</b>
      <div>${fmt(event.event_at)}</div>
      <div class="small">Status: ${esc(event.status || '—')} · Provider: ${esc(event.provider_status || '—')}</div>
      <div class="small">Uređaj: ${esc(event.device || '—')} · IP: ${esc(event.ip || '—')}</div>
      <div class="small" title="${esc(event.user_agent || '')}">${esc((event.user_agent || '').slice(0, 180) || '—')}</div>
      <div class="small">${esc(event.detail || '')}</div>
    </article>`;
  }

  async function toggleDetails(id, button) {
    const existing = document.querySelector(`tr.gnk-detail-row[data-detail-for="${CSS.escape(id)}"]`);
    if (existing) {
      existing.remove();
      openDetailId = '';
      button.textContent = 'Vremenska crta';
      button.setAttribute('aria-expanded', 'false');
      return;
    }
    document.querySelectorAll('.gnk-detail-row').forEach(node => node.remove());
    openDetailId = id;
    button.textContent = 'Učitavanje…';
    button.disabled = true;
    try {
      const data = await api(`/api/email-status/records/${encodeURIComponent(id)}/events`);
      const parent = button.closest('tr');
      const row = document.createElement('tr');
      row.className = 'gnk-detail-row';
      row.dataset.detailFor = id;
      row.innerHTML = `<td colspan="13"><section class="gnk-timeline">
        <h2>Vremenska crta poruke</h2>
        <p><strong>Primatelj:</strong> ${esc(data.record?.recipient || '—')} · <strong>Predmet:</strong> ${esc(data.record?.subject || '—')}</p>
        <p class="${data.forwarding?.possibleSignal ? 'gnk-warning' : 'small'}"><strong>Prosljeđivanje:</strong> ${esc(data.forwarding?.explanation || 'Nije pouzdano utvrdivo.')}</p>
        <div class="gnk-timeline-grid">${(data.events || []).map(eventHtml).join('') || '<p>Nema zabilježenih događaja.</p>'}</div>
      </section></td>`;
      parent.insertAdjacentElement('afterend', row);
      button.textContent = 'Sakrij';
      button.setAttribute('aria-expanded', 'true');
    } catch (error) {
      button.textContent = 'Greška';
      button.title = error.message;
    } finally {
      button.disabled = false;
    }
  }

  function bindDetails() {
    document.querySelectorAll('[data-details-id]').forEach(button => {
      button.onclick = () => toggleDetails(button.dataset.detailsId, button);
    });
  }

  async function syncNow(button) {
    const message = document.querySelector('#message');
    button.disabled = true;
    if (message) message.textContent = 'Sinkronizacija Cloudflare delivery događaja…';
    try {
      const data = await api('/api/email-status/sync', { method: 'POST' });
      if (message) message.textContent = data.skipped === 'analytics_credentials_missing'
        ? 'Cloudflare Analytics vjerodajnice nisu konfigurirane. Lokalni statusi, otvaranja i potvrde i dalje se prikazuju.'
        : `Sinkronizirano: ${Number(data.matched || 0)} poruka, ${Number(data.queried || 0)} događaja.`;
      await loadRecords();
      await loadHealth();
    } catch (error) {
      if (message) message.textContent = `Sinkronizacija nije uspjela: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  function boot() {
    ensureShell();
    const load = document.querySelector('#load');
    const sync = document.querySelector('#sync');
    const search = document.querySelector('#search');
    if (load) load.onclick = loadRecords;
    if (sync) sync.onclick = () => syncNow(sync);
    if (search) search.onkeydown = event => { if (event.key === 'Enter') loadRecords(); };
    loadHealth();
    loadRecords();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
