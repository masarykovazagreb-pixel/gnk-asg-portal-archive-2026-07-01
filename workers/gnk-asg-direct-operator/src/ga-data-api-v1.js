// Google Analytics 4 Data API integration for GNK ASG.
//
// Uses a Google Cloud service account (server-to-server, no per-user OAuth
// consent flow needed) to query GA4 report data -- daily visits, traffic by
// source/campaign (so UTM-tagged share links like the Tržišne krize
// LinkedIn post can be measured), and top pages.
//
// Setup required in the Cloudflare Worker dashboard (not doable from this
// repo/session):
//   GA_SERVICE_ACCOUNT_JSON  -- the full JSON key file content, as a secret
//   GA_PROPERTY_ID           -- the GA4 property ID (numeric, e.g. "123456789")
//
// One-time setup on the Google side (see /operator-dashboard/info-posjete/
// for the walkthrough):
//   1. Google Cloud Console -> new project (or reuse existing) -> enable
//      "Google Analytics Data API"
//   2. Create a service account, download its JSON key
//   3. In Google Analytics Admin -> Property Access Management, add the
//      service account's email as a Viewer on the G-TCCJJVP4P0 property
//   4. Paste the JSON key content and property ID as the two secrets above

export const VERSION = 'GNK_ASG_GA_DATA_API_V1';

function handlesGA(pathname) {
  return pathname === '/api/ga/status' ||
         pathname === '/api/ga/daily-visits' ||
         pathname === '/api/ga/traffic-sources' ||
         pathname === '/api/ga/top-pages';
}

// Minimal JWT signing for Google service-account auth, using the Web Crypto
// API available in Workers (no external dependency needed).
async function importPrivateKey(pem) {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bytes = Uint8Array.from(atob(body), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8', bytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
}

function base64url(input) {
  let str = typeof input === 'string' ? btoa(input) : btoa(String.fromCharCode(...new Uint8Array(input)));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(env) {
  const cached = await env.GNK_ASG_CONFIG_KV.get('ga:access_token');
  const cachedExpiry = await env.GNK_ASG_CONFIG_KV.get('ga:access_token_expires');
  if (cached && cachedExpiry && Number(cachedExpiry) > Date.now() + 60000) return cached;

  const sa = JSON.parse(env.GA_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(signature)}`;

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }).toString(),
  });
  if (!tokenResp.ok) throw new Error('GA token exchange failed: ' + (await tokenResp.text()));
  const tokenData = await tokenResp.json();

  await env.GNK_ASG_CONFIG_KV.put('ga:access_token', tokenData.access_token);
  await env.GNK_ASG_CONFIG_KV.put('ga:access_token_expires', String(Date.now() + tokenData.expires_in * 1000));
  return tokenData.access_token;
}

async function runReport(env, body) {
  const token = await getAccessToken(env);
  const propertyId = env.GA_PROPERTY_ID;
  const resp = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error('GA report failed: ' + (await resp.text()));
  return resp.json();
}

async function handleStatus(request, env) {
  const configured = Boolean(env.GA_SERVICE_ACCOUNT_JSON && env.GA_PROPERTY_ID);
  if (!configured) {
    return new Response(JSON.stringify({ connected: false, reason: 'GA_SERVICE_ACCOUNT_JSON / GA_PROPERTY_ID not set yet' }), { headers: { 'content-type': 'application/json' } });
  }
  try {
    await getAccessToken(env);
    return new Response(JSON.stringify({ connected: true }), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ connected: false, error: String(err && err.message || err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

async function handleDailyVisits(request, env) {
  try {
    const data = await runReport(env, {
      dateRanges: [{ startDate: '14daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });
    return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err && err.message || err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

async function handleTrafficSources(request, env) {
  try {
    const data = await runReport(env, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionCampaignName' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 25,
    });
    return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err && err.message || err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

async function handleTopPages(request, env) {
  try {
    const data = await runReport(env, {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 20,
    });
    return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err && err.message || err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

export async function handleGA(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/ga/status') return handleStatus(request, env);
  if (url.pathname === '/api/ga/daily-visits') return handleDailyVisits(request, env);
  if (url.pathname === '/api/ga/traffic-sources') return handleTrafficSources(request, env);
  if (url.pathname === '/api/ga/top-pages') return handleTopPages(request, env);
  return new Response('Not found', { status: 404 });
}

export { handlesGA };
