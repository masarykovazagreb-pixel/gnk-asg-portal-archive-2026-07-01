import core from './index-publication-news-hotfix.js';

const VERSION = 'GNK_ASG_PORTAL_REPAIR_V9_20260625';
const DEFAULT_CONFIG = {
  version: 'GNK_ASG_INDEX_MEDIA_V1_20260625',
  updatedAt: null,
  countdown: {
    enabled: false,
    target: '',
    color: '#ef6670',
    labelHr: 'Važna objava za',
    labelEn: 'Important announcement in',
    doneLabelHr: 'Objava je dostupna',
    doneLabelEn: 'The announcement is available'
  },
  media: {
    enabled: false,
    type: 'video',
    titleHr: 'GNK ASG video poruka',
    titleEn: 'GNK ASG video message',
    summaryHr: 'Sadržaj se učitava tek nakon pokretanja.',
    summaryEn: 'The content is loaded only after it is started.',
    posterUrl: '/assets/index-media-poster.svg',
    sourceUrl: '',
    previewUrl: '',
    downloadUrl: '',
    preload: 'none',
    autoplay: false
  }
};

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': 'https://gnk-asg.hr'
  }
});

function requestToken(request) {
  const bearer = request.headers.get('authorization') || '';
  return request.headers.get('x-operator-token') ||
    request.headers.get('x-admin-token') ||
    request.headers.get('x-gnk-asg-token') ||
    bearer.replace(/^Bearer\s+/i, '') || '';
}

function expectedToken(env) {
  return env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || env.ADMIN_TOKEN || env.GNK_ASG_ADMIN_TOKEN || env.SECRET_TOKEN || '';
}

function authorized(request, env) {
  const expected = expectedToken(env);
  const supplied = requestToken(request);
  return Boolean(expected && supplied && expected === supplied);
}

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

async function readConfig(env) {
  if (!env.GNK_ASG_KV) return cloneDefault();
  try {
    const raw = await env.GNK_ASG_KV.get('index:media:config');
    if (!raw) return cloneDefault();
    const stored = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...stored,
      countdown: { ...DEFAULT_CONFIG.countdown, ...(stored.countdown || {}) },
      media: { ...DEFAULT_CONFIG.media, ...(stored.media || {}) }
    };
  } catch {
    return cloneDefault();
  }
}

function safeMediaUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\/(?:r2|assets|downloads)\//i.test(raw)) return raw;
  try {
    const url = new URL(raw, 'https://gnk-asg.hr');
    if (['gnk-asg.hr', 'www.gnk-asg.hr', 'news.gnk-asg.hr'].includes(url.hostname) && /^https?:$/.test(url.protocol)) return url.href;
  } catch {}
  return '';
}

async function saveConfig(request, env) {
  if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.GNK_ASG_KV) return json({ ok: false, error: 'GNK_ASG_KV_missing' }, 500);
  let patch;
  try { patch = await request.json(); }
  catch { return json({ ok: false, error: 'invalid_json' }, 400); }

  const current = await readConfig(env);
  const media = { ...current.media, ...(patch.media || {}) };
  const countdown = { ...current.countdown, ...(patch.countdown || {}) };

  media.type = media.type === 'pptx' ? 'pptx' : 'video';
  media.sourceUrl = safeMediaUrl(media.sourceUrl);
  media.previewUrl = safeMediaUrl(media.previewUrl);
  media.posterUrl = safeMediaUrl(media.posterUrl) || '/assets/index-media-poster.svg';
  media.downloadUrl = safeMediaUrl(media.downloadUrl || media.sourceUrl);
  media.enabled = Boolean(media.enabled && media.sourceUrl);
  media.autoplay = false;
  media.preload = 'none';

  countdown.enabled = Boolean(countdown.enabled && countdown.target && !Number.isNaN(Date.parse(countdown.target)));
  if (!/^#[0-9a-f]{6}$/i.test(String(countdown.color || ''))) countdown.color = '#ef6670';

  const next = { version: DEFAULT_CONFIG.version, updatedAt: new Date().toISOString(), countdown, media };
  await env.GNK_ASG_KV.put('index:media:config', JSON.stringify(next, null, 2));
  return json({ ok: true, config: next });
}

function statusHtml() {
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>Status automatizacije | GNK ASG</title><meta name="description" content="Javni status vijesti, automatskih objava i provjera kvalitete GNK ASG portala."><link rel="canonical" href="https://gnk-asg.hr/status-automatizacije/"><link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/status-automatizacije/"><link rel="alternate" hreflang="en" href="https://gnk-asg.hr/automation-status/"><link rel="stylesheet" href="/assets/public-content-shell-v1.css?v=20260625-v1"></head><body class="gnk-content-page"><main class="gnk-status-main"><p class="eyebrow">GNK ASG Intelligence Desk</p><h1>Status automatizacije</h1><p>Javni tehnički status bez prikaza tokena, tajni ili privatnih operativnih podataka.</p><section id="status" class="gnk-status-grid"><div><span>Status</span><strong>Učitavanje…</strong></div></section></main><footer class="gnk-content-footer"><strong>GNK ASG</strong><a href="/">Početna</a><a href="/objave/">Objave</a><a href="/vijesti/">Vijesti</a><a href="/automation-status/">EN</a></footer><script src="/assets/status-automatizacije-v1.js?v=20260625-v1" defer></script></body></html>`;
}

function patchIndexHtml(html, english) {
  let value = html
    .replace('/assets/index-redesign-production.css?v=20260623-prod01', '/assets/index-redesign-production.css?v=20260625-media-v1')
    .replace('/assets/index-redesign-production.js?v=20260623-prod01', '/assets/index-redesign-production.js?v=20260625-media-v1')
    .replace('<body>', '<body class="gnk-index-page">');
  const marker = '<p class="eyebrow">GNK ASG · GNK DINAMO Ltd.</p>';
  if (!value.includes('<h1>GNK ASG')) value = value.replace(marker, `${marker}<h1>GNK ASG <span>${english ? 'Corporate Portal' : 'Korporativni portal'}</span></h1>`);
  return value;
}

function patchAdminHtml(html) {
  const safeHelper = `<script id="gnk-asg-force-token-sync">function gnkAsgForceToken(){try{return localStorage.getItem("GNK_ASG_OPERATOR_TOKEN")||""}catch(e){return ""}}function gnkAsgWithTokenUrl(url){const t=gnkAsgForceToken();return t?url+(url.includes("?")?"&":"?")+"token="+encodeURIComponent(t):url}</script>`;
  const authBridge = `<script id="gnk-asg-admin-auth-bridge">(function(){if(window.__GNK_ASG_ADMIN_AUTH_BRIDGE__)return;window.__GNK_ASG_ADMIN_AUTH_BRIDGE__=true;const original=window.fetch.bind(window);const protectedPaths=new Set(["/api/media-upload","/api/admin-asset-list","/operator/media-upload","/operator/media-list","/api/index-media-config"]);window.fetch=function(input,init){try{const raw=typeof input==="string"?input:input.url;const url=new URL(raw,location.origin);if(url.origin===location.origin&&protectedPaths.has(url.pathname)){const token=typeof gnkAsgForceToken==="function"?gnkAsgForceToken():"";if(token){const next={...(init||{})};const headers=new Headers(next.headers||(input instanceof Request?input.headers:undefined));if(!headers.has("authorization"))headers.set("authorization","Bearer "+token);next.headers=headers;return original(input,next)}}}catch(e){}return original(input,init)}})();</script>`;
  let value = html.replace(/<script id="gnk-asg-force-token-sync">[\s\S]*?<\/script>/, `${safeHelper}${authBridge}`);
  value = value
    .replace('<h2>Fotografije</h2>', '<h2>Medijske datoteke</h2>')
    .replace('<label>Naziv slike</label>', '<label>Naziv datoteke</label>')
    .replace('type="file" accept="image/*"', 'type="file" accept="image/*,video/mp4,video/webm,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"')
    .replace('Upload slike', 'Upload datoteke')
    .replace('Lista slika', 'Lista medijskih datoteka');
  const script = '<script src="/assets/admin-index-media-v1.js?v=20260625-v1" defer></script>';
  if (!value.includes(script)) value = value.replace('</head>', `${script}</head>`);
  return value;
}

async function patchedHtml(response, patcher) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store');
  return new Response(patcher(await response.text()), { status: response.status, statusText: response.statusText, headers });
}

async function fetchHandler(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS' && path === '/api/index-media-config') return new Response(null, { status: 204 });
  if (request.method === 'GET' && path === '/data/index-media-config.json') return json(await readConfig(env));
  if (path === '/api/index-media-config') {
    if (request.method === 'GET') return authorized(request, env) ? json({ ok: true, config: await readConfig(env) }) : json({ ok: false, error: 'unauthorized' }, 401);
    if (request.method === 'POST') return saveConfig(request, env);
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }
  if ((path === '/status-automatizacije' || path === '/status-automatizacije/') && request.method === 'GET') {
    return new Response(statusHtml(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  }
  if ((path === '/api/media-upload' || path === '/api/admin-asset-list') && !authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  const response = await core.fetch(request, env, ctx);
  if (request.method === 'GET' && path === '/' && response.headers.get('content-type')?.includes('text/html')) return patchedHtml(response, html => patchIndexHtml(html, false));
  if (request.method === 'GET' && path === '/en/' && response.headers.get('content-type')?.includes('text/html')) return patchedHtml(response, html => patchIndexHtml(html, true));
  if (request.method === 'GET' && (path === '/operator-dashboard' || path === '/operator-dashboard/') && response.headers.get('content-type')?.includes('text/html')) return patchedHtml(response, patchAdminHtml);
  return response;
}

export default {
  fetch: fetchHandler,
  async scheduled(event, env, ctx) {
    if (typeof core.scheduled === 'function') return core.scheduled(event, env, ctx);
  },
  async email(message, env, ctx) {
    if (typeof core.email === 'function') return core.email(message, env, ctx);
  }
};

export { VERSION };