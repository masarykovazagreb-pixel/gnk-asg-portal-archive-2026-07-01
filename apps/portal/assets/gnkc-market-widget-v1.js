(() => {
  'use strict';
  if (window.__GNK_GNKC_WIDGET_V1__) return;
  window.__GNK_GNKC_WIDGET_V1__ = true;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = iso => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('hr-HR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };
  const statusLabel = { healthy: 'Zdravo', watch: 'Praćenje', degraded: 'Degradirano', unavailable: 'Nedostupno' };
  const statusClass = { healthy: 'gnkc-ok', watch: 'gnkc-watch', degraded: 'gnkc-degraded', unavailable: 'gnkc-unavailable' };

  const STYLE = `
.gnkc-widget{border:1px solid rgba(215,181,91,.3);border-radius:14px;padding:18px 20px;margin:24px 0;background:rgba(255,255,255,.02)}
.gnkc-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.gnkc-symbol{font-weight:900;letter-spacing:.05em;color:#f2d27d;font-size:1.1rem}
.gnkc-status{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:999px;font-weight:800}
.gnkc-ok{background:rgba(120,220,150,.15);color:#7ddc96}
.gnkc-watch{background:rgba(255,200,120,.15);color:#ffc878}
.gnkc-degraded{background:rgba(255,160,120,.15);color:#ffa078}
.gnkc-unavailable{background:rgba(200,200,200,.15);color:#c8c8c8}
.gnkc-values{display:flex;gap:24px;flex-wrap:wrap;margin:10px 0}
.gnkc-value-block strong{display:block;font-size:1.3rem;color:#f7f5ef}
.gnkc-value-block span{font-size:.75rem;color:#9c968a;text-transform:uppercase;letter-spacing:.04em}
.gnkc-components{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
.gnkc-component{font-size:.78rem;color:#cfcac0;border:1px solid rgba(215,181,91,.2);border-radius:8px;padding:4px 10px}
.gnkc-component.gnkc-bad{color:#ffa078;border-color:rgba(255,160,120,.3)}
.gnkc-disclaimer{font-size:.72rem;color:#8a857a;margin-top:12px;line-height:1.5;border-top:1px dashed rgba(215,181,91,.2);padding-top:10px}
.gnkc-meta{font-size:.72rem;color:#8a857a;margin-top:6px}
`;

  function render(host, data) {
    const status = data.status || 'unavailable';
    const label = statusLabel[status] || status;
    const cls = statusClass[status] || 'gnkc-unavailable';
    const valueUsd = typeof data.valueUsd === 'number' ? data.valueUsd.toFixed(4) : '—';
    const valueEur = typeof data.valueEur === 'number' ? data.valueEur.toFixed(4) : '—';
    const deviation = typeof data.deviationPct === 'number' ? `${data.deviationPct > 0 ? '+' : ''}${data.deviationPct.toFixed(3)}%` : '—';
    const change24h = typeof data.change24hPct === 'number' ? `${data.change24hPct > 0 ? '+' : ''}${data.change24hPct.toFixed(3)}%` : '—';

    const componentsHtml = (data.components || []).map(c => {
      const p = typeof c.priceUsd === 'number' ? c.priceUsd.toFixed(4) : 'n/d';
      return `<span class="gnkc-component${c.ok ? '' : ' gnkc-bad'}">${esc(c.symbol)}: $${p}</span>`;
    }).join('');

    host.innerHTML = `
      <div class="gnkc-head">
        <span class="gnkc-symbol">GNKC</span>
        <span class="gnkc-status ${cls}">${esc(label)}</span>
      </div>
      <div class="gnkc-values">
        <div class="gnkc-value-block"><strong>$${valueUsd}</strong><span>GNKC / USD</span></div>
        <div class="gnkc-value-block"><strong>€${valueEur}</strong><span>GNKC / EUR</span></div>
        <div class="gnkc-value-block"><strong>${deviation}</strong><span>Odstupanje od pariteta</span></div>
        <div class="gnkc-value-block"><strong>${change24h}</strong><span>24h promjena</span></div>
      </div>
      <div class="gnkc-components">${componentsHtml}</div>
      <p class="gnkc-meta">Zadnje osvježeno: ${fmtDate(data.updatedAt)}${data.note ? ' · ' + esc(data.note) : ''}</p>
      <p class="gnkc-disclaimer">${esc(data.disclaimer || 'GNKC je interni obračunski stable-index, nije blockchain token niti javno utrživa kriptovaluta.')}</p>
    `;
  }

  function boot() {
    const mount = document.getElementById('gnkcWidgetMount');
    if (!mount) return;
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);
    const host = document.createElement('div');
    host.className = 'gnkc-widget';
    mount.appendChild(host);

    function load() {
      fetch('/data/gnkc-index.json?v=' + Date.now(), { cache: 'no-store' })
        .then(r => r.json())
        .then(data => render(host, data))
        .catch(() => {
          host.innerHTML = '<p class="gnkc-meta">GNKC podaci trenutno nisu dostupni.</p>';
        });
    }
    load();
    setInterval(load, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
