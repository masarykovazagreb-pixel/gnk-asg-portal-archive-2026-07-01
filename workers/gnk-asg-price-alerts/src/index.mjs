/**
 * AKTUAL MEDIA | Price-drop e-mail alerts (Croatia / EUR).
 * Cloudflare Worker. Public registration is FAIL-CLOSED until a verified
 * provider, a licensed price feed, e-mail adapter and Turnstile are configured.
 * This worker never scrapes a visitor-submitted URL.
 */
const PAGE = 'https://gnk-asg.hr/gnk-aktual/prati-cijenu/';
const PREFIX = '/api/price-alerts/';
const enc = new TextEncoder();
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer' }
});
const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const sha = async (value) => hex(await crypto.subtle.digest('SHA-256', enc.encode(value)));
const hosts = (env) => String(env.PRICE_ALERT_RETAILER_HOSTS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const isHttpsEndpoint = (value) => {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.hash; }
  catch { return false; }
};
const ready = (env) => Boolean(
  env.PRICE_ALERTS_KV && env.PRICE_ALERTS_ENABLED === 'true' &&
  env.PRICE_ALERT_FEED_CONTRACT_VERIFIED === 'true' && env.PRICE_ALERT_REUSE_APPROVED === 'true' &&
  isHttpsEndpoint(env.PRICE_ALERT_FEED_API_URL) && env.PRICE_ALERT_FEED_BEARER_TOKEN &&
  env.PRICE_ALERT_MAIL_CONTRACT_VERIFIED === 'true' &&
  isHttpsEndpoint(env.PRICE_ALERT_MAIL_API_URL) && env.PRICE_ALERT_MAIL_BEARER_TOKEN &&
  env.PRICE_ALERT_MAIL_FROM && env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY &&
  env.PRICE_ALERT_TOKEN_SECRET && hosts(env).length > 0
);
export function parsePriceMinor(input) {
  if (input === '' || input === undefined || input === null) return null;
  const text = String(input).trim().replace(',', '.');
  if (!/^(0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(text)) throw Error('Neispravan ciljani iznos.');
  const parts = text.split('.');
  const cents = Number(parts[0]) * 100 + Number((parts[1] || '').padEnd(2, '0'));
  return cents > 0 ? cents : null;
}
export function validateProductUrl(value, allowHosts) {
  if (typeof value !== 'string' || value.length > 2048) throw Error('Neispravna poveznica.');
  let u; try { u = new URL(value); } catch { throw Error('Neispravna poveznica.'); }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') ||
      !allowHosts.includes(u.hostname.toLowerCase()) || u.pathname === '/') {
    throw Error('Trgovina ili poveznica nisu podržane.');
  }
  u.hash = '';
  return u.href;
}
export function validateQuote(quote, watch, allowedHosts, nowMs = Date.now()) {
  if (!quote || typeof quote !== 'object') return null;
  const productId = quote.productId, model = quote.model, variant = quote.variant || '';
  if (typeof productId !== 'string' || !productId.trim() || productId.length > 128 ||
      typeof model !== 'string' || !model.trim() || model.length > 200 ||
      typeof variant !== 'string' || variant.length > 120 ||
      quote.condition !== 'new' || quote.market !== 'HR' || quote.currency !== 'EUR' ||
      !Number.isSafeInteger(quote.priceMinor) || quote.priceMinor <= 0 ||
      typeof quote.seller !== 'string' || !quote.seller.trim() || quote.seller.length > 120) return null;
  const ts = Date.parse(quote.observedAt);
  if (!Number.isFinite(ts) || ts > nowMs + 5 * 60_000 || ts < nowMs - 36 * 3600_000) return null;
  let offerUrl, matchedUrl;
  try { offerUrl = validateProductUrl(quote.offerUrl, allowedHosts);
    matchedUrl = validateProductUrl(quote.matchedUrl, allowedHosts); } catch { return null; }
  if (matchedUrl !== watch.url) return null;
  if (watch.productId && watch.productId !== productId) return null;
  if (watch.model && watch.model !== model) return null;
  if (watch.last && watch.savedVariant !== variant) return null;
  if (watch.requestedVariant && !variant.toLowerCase().includes(watch.requestedVariant.toLowerCase())) return null;
  if (new URL(offerUrl).hostname !== new URL(watch.url).hostname) return null;
  return { productId, model, variant, condition: 'new', market: 'HR', currency: 'EUR',
    priceMinor: quote.priceMinor, seller: quote.seller.trim(), offerUrl,
    observedAt: new Date(ts).toISOString() };
}
async function signedUnsub(id, env) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.PRICE_ALERT_TOKEN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(id)));
}
function constantEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
function euro(minor) {
  return (minor / 100).toLocaleString('hr-HR', { style: 'currency', currency: 'EUR' });
}
function mailTextConfirm(token) {
  return 'Potvrdite prijavu za praćenje cijene na AKTUAL MEDIA:\n' +
    'https://gnk-asg.hr/api/price-alerts/confirm?token=' + encodeURIComponent(token) +
    '\n\nNiste se prijavili? Zanemarite ovu poruku. Poveznica vrijedi 24 sata.';
}
async function sendMail(env, to, subject, text) {
  // Only enable a separately VERIFIED mail adapter with the documented
  // POST JSON {from,to,subject,text} contract. Never expose its secret.
  const response = await fetch(env.PRICE_ALERT_MAIL_API_URL, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.PRICE_ALERT_MAIL_BEARER_TOKEN },
    body: JSON.stringify({ from: env.PRICE_ALERT_MAIL_FROM, to, subject, text }),
    signal: AbortSignal.timeout(12_000)
  });
  return response.status >= 200 && response.status < 300;
}
async function turnstile(token, request, env) {
  if (!token || typeof token !== 'string') return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return false;
  const data = await response.json();
  return data.success === true && (!data.hostname || data.hostname === 'gnk-asg.hr');
}
async function requestQuote(env, watch) {
  const endpoint = new URL(env.PRICE_ALERT_FEED_API_URL);
  endpoint.searchParams.set('item_url', watch.url);
  // Verified adapter contract: GET ?item_url= -> {productId,model,variant,
  // condition,market,currency,priceMinor,seller,offerUrl,observedAt}.
  const r = await fetch(endpoint.href, { redirect: 'manual',
    headers: { authorization: 'Bearer ' + env.PRICE_ALERT_FEED_BEARER_TOKEN, accept: 'application/json' },
    signal: AbortSignal.timeout(10_000) });
  if (!r.ok || r.status >= 300 || !(r.headers.get('content-type') || '').includes('application/json')) return null;
  const body = await r.text();
  if (body.length > 12_000) return null;
  return validateQuote(JSON.parse(body), watch, hosts(env));
}
async function subscribe(request, env) {
  if (!ready(env)) return json({ ok: false, error: 'Usluga još nije aktivirana.' }, 503);
  if (request.headers.get('origin') !== new URL(PAGE).origin ||
      !(request.headers.get('content-type') || '').startsWith('application/json')) {
    return json({ ok: false, error: 'Zahtjev nije dopušten.' }, 403);
  }
  const raw = await request.text();
  if (raw.length > 4096) return json({ ok: false, error: 'Zahtjev je prevelik.' }, 413);
  let input;
  try { input = JSON.parse(raw); } catch { return json({ ok: false, error: 'Neispravan unos.' }, 400); }
  if (input.website) return json({ ok: true, message: 'Provjerite e-mail za potvrdu.' }, 202); // honeypot
  const email = String(input.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || input.consent !== true)
    return json({ ok: false, error: 'Potrebni su valjana e-mail adresa i privola.' }, 400);
  let url, targetMinor;
  try { url = validateProductUrl(input.url, hosts(env)); targetMinor = parsePriceMinor(input.targetPrice); }
  catch (error) { return json({ ok: false, error: error.message }, 400); }
  const requestedVariant = String(input.variant || '').trim().slice(0, 80);
  if (!await turnstile(input.turnstileToken, request, env))
    return json({ ok: false, error: 'Sigurnosna provjera nije uspjela.' }, 400);
  // Abuse control: do not retain raw IP; simple rate limiting in KV is best-effort.
  const ipHash = await sha(String(request.headers.get('CF-Connecting-IP') || 'unknown') + ':' +
    new Date().toISOString().slice(0, 10) + ':' + env.PRICE_ALERT_TOKEN_SECRET);
  const key = 'rate:' + ipHash;
  const count = Number(await env.PRICE_ALERTS_KV.get(key) || 0);
  if (count >= 5) return json({ ok: false, error: 'Dnevni limit prijava je dosegnut.' }, 429);
  await env.PRICE_ALERTS_KV.put(key, String(count + 1), { expirationTtl: 86400 });
  const token = randomToken();
  const tokenHash = await sha(token);
  await env.PRICE_ALERTS_KV.put('pending:' + tokenHash,
    JSON.stringify({ email, url, requestedVariant, targetMinor, createdAt: new Date().toISOString() }),
    { expirationTtl: 86400 });
  let delivered = false;
  try { delivered = await sendMail(env, email, 'Potvrdite prijavu — AKTUAL MEDIA prati cijenu', mailTextConfirm(token)); }
  catch { /* only report an ordinary failure */ }
  if (!delivered) {
    await env.PRICE_ALERTS_KV.delete('pending:' + tokenHash);
    return json({ ok: false, error: 'Potvrdni e-mail nije moguće poslati.' }, 503);
  }
  return json({ ok: true, message: 'Provjerite e-mail i potvrdite prijavu u roku 24 sata.' }, 202);
}
async function confirm(url, env) {
  if (!ready(env)) return json({ ok: false, error: 'Usluga nije dostupna.' }, 503);
  const token = url.searchParams.get('token') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return Response.redirect(PAGE + '?status=invalid', 303);
  const key = 'pending:' + await sha(token);
  const pending = await env.PRICE_ALERTS_KV.get(key, 'json');
  if (!pending) return Response.redirect(PAGE + '?status=expired', 303);
  const id = randomToken();
  await env.PRICE_ALERTS_KV.put('watch:' + id, JSON.stringify({
    ...pending, id, createdAt: new Date().toISOString(), last: null, productId: null, model: null,
    savedVariant: null, lastNotified: null, status: 'active'
  }));
  await env.PRICE_ALERTS_KV.delete(key);
  return Response.redirect(PAGE + '?status=confirmed', 303);
}
async function unsubscribe(url, env) {
  const id = url.searchParams.get('id') || '';
  const token = url.searchParams.get('token') || '';
  if (!/^[a-f0-9]{64}$/.test(id) || !/^[a-f0-9]{64}$/.test(token) ||
      !constantEqual(token, await signedUnsub(id, env))) {
    return Response.redirect(PAGE + '?status=invalid', 303);
  }
  await env.PRICE_ALERTS_KV.delete('watch:' + id);
  return Response.redirect(PAGE + '?status=unsubscribed', 303);
}
async function daily(env) {
  if (!ready(env)) { console.log('price-alerts disabled: required approved adapters missing'); return; }
  let cursor, checked = 0, baselined = 0, delivered = 0, rejected = 0;
  do {
    const page = await env.PRICE_ALERTS_KV.list({ prefix: 'watch:', limit: 100, ...(cursor ? { cursor } : {}) });
    for (const { name } of page.keys) {
      const watch = await env.PRICE_ALERTS_KV.get(name, 'json');
      if (!watch || watch.status !== 'active') continue;
      try {
        const q = await requestQuote(env, watch);
        if (!q || (watch.last && Date.parse(q.observedAt) <= Date.parse(watch.last.observedAt))) {
          rejected++; continue;
        }
        checked++;
        if (!watch.last) {
          watch.last = q; watch.productId = q.productId; watch.model = q.model;
          watch.savedVariant = q.variant; baselined++;
          await env.PRICE_ALERTS_KV.put(name, JSON.stringify(watch)); continue;
        }
        const old = watch.last;
        if (q.priceMinor < old.priceMinor && (watch.targetMinor === null || q.priceMinor <= watch.targetMinor)) {
          const fingerprint = q.observedAt + ':' + q.priceMinor;
          if (fingerprint !== watch.lastNotified) {
            const unsub = 'https://gnk-asg.hr/api/price-alerts/unsubscribe?id=' + watch.id +
              '&token=' + await signedUnsub(watch.id, env);
            const note = 'Potvrđen pad cijene za ' + q.model + (q.variant ? ' (' + q.variant + ')' : '') +
              '\nStara cijena: ' + euro(old.priceMinor) + '\nNova cijena: ' + euro(q.priceMinor) +
              '\nTrgovac: ' + q.seller + '\nStanje: novo\nTržište: Hrvatska / EUR' +
              '\nProvjereno: ' + q.observedAt + '\nPonuda: ' + q.offerUrl +
              '\n\nOdjava: ' + unsub;
            if (!await sendMail(env, watch.email, 'Cijena je pala — AKTUAL MEDIA', note)) {
              rejected++; continue; // retry on a later observed price, never claim delivery
            }
            watch.lastNotified = fingerprint; delivered++;
          }
        }
        watch.last = q;
        await env.PRICE_ALERTS_KV.put(name, JSON.stringify(watch));
      } catch { rejected++; } // No price claims on errors, no PII in logs.
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && checked + rejected < 200); // bounded batch, review for scale
  console.log(JSON.stringify({ checked, baselined, delivered, rejected }));
}
export default {
  async fetch(request, env) {
    const u = new URL(request.url), path = u.pathname;
    if (!path.startsWith(PREFIX)) return json({ ok: false }, 404);
    if (path === PREFIX + 'status' && request.method === 'GET')
      return json({ enabled: ready(env), market: 'HR', currency: 'EUR',
        turnstileSiteKey: ready(env) ? env.TURNSTILE_SITE_KEY : null,
        supportedRetailers: ready(env) ? hosts(env) : [],
        notice: ready(env) ? 'Aktivirajte praćenje potvrdnim e-mailom.' :
          'Prijave nisu dostupne dok izvor cijena i dostava e-maila ne budu potvrđeni.' });
    if (path === PREFIX + 'subscribe' && request.method === 'POST') return subscribe(request, env);
    if (path === PREFIX + 'confirm' && request.method === 'GET') return confirm(u, env);
    if (path === PREFIX + 'unsubscribe' && request.method === 'GET') {
      if (!env.PRICE_ALERTS_KV || !env.PRICE_ALERT_TOKEN_SECRET)
        return json({ ok: false, error: 'Usluga nije dostupna.' }, 503);
      return unsubscribe(u, env);
    }
    return json({ ok: false }, 404);
  },
  async scheduled(_event, env) { await daily(env); }
};
