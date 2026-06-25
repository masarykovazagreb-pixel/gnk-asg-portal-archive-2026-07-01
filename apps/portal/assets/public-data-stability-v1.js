(() => {
  'use strict';
  if (window.__GNK_ASG_DATA_STABILITY_V1__) return;
  window.__GNK_ASG_DATA_STABILITY_V1__ = true;

  const TARGETS = [
    '/data/news.json',
    '/data/auto-editor.json',
    '/data/market.json',
    '/data/digital-assets.json',
    '/data/market-indices.json',
    '/data/exchanges.json',
    '/data/stablecoins.json',
    '/data/daily-market-brief.json',
    '/data/status.json',
    '/data/content-quality-status.json'
  ];
  const originalFetch = window.fetch.bind(window);
  const mojibake = /(?:Ã.|Â.|â€|â€™|â€“|â€”|Å.|Ä.|�|ΓÇ|┼|╛|╕)/;
  const status = {};
  window.GNK_ASG_DATA_STATUS = status;

  const keyFor = path => `gnk-asg:snapshot:${path}`;
  const isTarget = url => TARGETS.includes(url.pathname);
  const now = () => new Date().toISOString();

  function repairText(value) {
    let text = String(value ?? '').normalize('NFC');
    if (!mojibake.test(text)) return text;
    try {
      const chars = [...text];
      if (chars.every(char => char.charCodeAt(0) <= 255)) {
        const bytes = Uint8Array.from(chars.map(char => char.charCodeAt(0)));
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        if (decoded && !mojibake.test(decoded)) text = decoded;
      }
    } catch {}
    const replacements = [
      ['â€™','’'],['â€˜','‘'],['â€œ','“'],['â€','”'],['â€“','–'],['â€”','—'],
      ['Â ',' '],['Â',''],['Ä','č'],['Ä‡','ć'],['Å¡','š'],['Å¾','ž'],['Ä‘','đ']
    ];
    for (const [bad, good] of replacements) text = text.split(bad).join(good);
    return text.normalize('NFC');
  }

  function repair(value) {
    if (typeof value === 'string') return repairText(value);
    if (Array.isArray(value)) return value.map(repair);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repair(item)]));
    }
    return value;
  }

  function normalize(payload, path, fallbackStatus = 'SNAPSHOT') {
    const repaired = repair(payload && typeof payload === 'object' ? payload : {});
    const items = Array.isArray(repaired) ? repaired : (Array.isArray(repaired.items) ? repaired.items : []);
    const output = Array.isArray(repaired) ? {
      ok: true,
      status: items.length ? fallbackStatus : 'FALLBACK',
      updatedAt: now(),
      items
    } : {
      ...repaired,
      ok: repaired.ok !== false,
      status: String(repaired.status || (items.length ? fallbackStatus : 'FALLBACK')).toUpperCase(),
      updatedAt: repaired.updatedAt || repaired.generatedAt || now(),
      items
    };
    if (!['LIVE','SNAPSHOT','DELAYED','FALLBACK','ERROR','OK'].includes(output.status)) output.status = fallbackStatus;
    output.clientStability = { version: 'GNK_ASG_DATA_STABILITY_V1', path, checkedAt: now() };
    return output;
  }

  function readSnapshot(path) {
    try {
      const raw = localStorage.getItem(keyFor(path));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveSnapshot(path, payload) {
    try { localStorage.setItem(keyFor(path), JSON.stringify(payload)); } catch {}
  }

  function response(payload, upstream, source) {
    const headers = new Headers(upstream?.headers || {});
    headers.set('content-type', 'application/json; charset=utf-8');
    headers.set('cache-control', 'no-store');
    headers.set('x-gnk-asg-client-stability', source);
    headers.delete('content-length');
    return new Response(JSON.stringify(payload), { status: 200, headers });
  }

  window.fetch = async (input, init = {}) => {
    const request = input instanceof Request ? input : null;
    const method = String(init.method || request?.method || 'GET').toUpperCase();
    let url;
    try { url = new URL(request?.url || String(input), location.href); } catch { return originalFetch(input, init); }
    if (!['GET','HEAD'].includes(method) || url.origin !== location.origin || !isTarget(url)) {
      return originalFetch(input, init);
    }

    const path = url.pathname;
    try {
      const upstream = await originalFetch(input, init);
      const raw = await upstream.clone().text();
      let parsed = null;
      try { if (raw.trim()) parsed = JSON.parse(raw); } catch {}
      if (parsed && typeof parsed === 'object') {
        const payload = normalize(parsed, path, upstream.ok ? 'LIVE' : 'DELAYED');
        saveSnapshot(path, payload);
        status[path] = { ok: true, status: payload.status, updatedAt: payload.updatedAt };
        return response(payload, upstream, 'upstream');
      }
      const snapshot = readSnapshot(path);
      if (snapshot) {
        const payload = normalize(snapshot, path, 'FALLBACK');
        payload.ok = false;
        payload.status = 'FALLBACK';
        payload.error = 'invalid_upstream_json';
        status[path] = { ok: false, status: 'FALLBACK', updatedAt: payload.updatedAt };
        return response(payload, upstream, 'snapshot');
      }
      const payload = normalize({ ok: false, status: 'FALLBACK', updatedAt: now(), items: [], error: 'invalid_upstream_json' }, path, 'FALLBACK');
      status[path] = { ok: false, status: 'FALLBACK', updatedAt: payload.updatedAt };
      return response(payload, upstream, 'empty-fallback');
    } catch (error) {
      const snapshot = readSnapshot(path);
      const payload = normalize(snapshot || { ok: false, status: 'FALLBACK', updatedAt: now(), items: [] }, path, 'FALLBACK');
      payload.ok = false;
      payload.status = 'FALLBACK';
      payload.error = String(error?.message || error || 'network_error');
      status[path] = { ok: false, status: 'FALLBACK', updatedAt: payload.updatedAt };
      return response(payload, null, snapshot ? 'snapshot-error' : 'network-fallback');
    }
  };
})();
