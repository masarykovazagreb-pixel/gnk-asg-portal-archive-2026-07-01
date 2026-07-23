// LinkedIn OAuth connect/callback + posting module for GNK ASG direct operator.
//
// Flow:
//   1. Admin visits /api/linkedin/connect -> redirected to LinkedIn's OAuth consent screen.
//   2. LinkedIn redirects back to /api/linkedin/callback?code=...
//      -> exchange code for access_token + refresh_token, store in KV (GNK_ASG_CONFIG_KV).
//   3. Daily draft generation (separate script) writes pending drafts to KV.
//   4. /linkedin-daily/ page shows drafts with Approve/Reject buttons that call
//      /api/linkedin/approve (POST) or /api/linkedin/reject (POST).
//   5. On approve, this module posts to LinkedIn's REST API (Posts API, replacing the
//      older /v2/ugcPosts) using the stored access token, uploading the image first.
//
// Required secrets/vars (set in the Cloudflare Worker dashboard, NOT in this repo):
//   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET  -- from the LinkedIn Developer App
//   LINKEDIN_REDIRECT_URI                       -- https://gnk-asg.hr/api/linkedin/callback
// Token storage keys in GNK_ASG_CONFIG_KV:
//   linkedin:access_token, linkedin:refresh_token, linkedin:expires_at, linkedin:member_urn

export const VERSION = 'GNK_ASG_LINKEDIN_OAUTH_V1';

const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const API_BASE = 'https://api.linkedin.com/rest';
const SCOPES = 'openid profile w_member_social';

function handlesLinkedIn(pathname) {
  return pathname === '/api/linkedin/connect' ||
         pathname === '/api/linkedin/callback' ||
         pathname === '/api/linkedin/status' ||
         pathname === '/api/linkedin/drafts' ||
         pathname === '/api/linkedin/approve' ||
         pathname === '/api/linkedin/reject';
}

async function handleConnect(request, env) {
  if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_REDIRECT_URI) {
    return new Response('LinkedIn app not configured yet (missing LINKEDIN_CLIENT_ID / LINKEDIN_REDIRECT_URI).', { status: 500 });
  }
  const state = crypto.randomUUID();
  await env.GNK_ASG_CONFIG_KV.put('linkedin:oauth_state', state, { expirationTtl: 600 });
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.LINKEDIN_CLIENT_ID,
    redirect_uri: env.LINKEDIN_REDIRECT_URI,
    state,
    scope: SCOPES,
  });
  return Response.redirect(`${AUTH_URL}?${params.toString()}`, 302);
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  if (error) return new Response(`LinkedIn authorization error: ${error}`, { status: 400 });
  if (!code) return new Response('Missing authorization code.', { status: 400 });

  const savedState = await env.GNK_ASG_CONFIG_KV.get('linkedin:oauth_state');
  if (!state || state !== savedState) return new Response('Invalid or expired state — try connecting again from /api/linkedin/connect', { status: 400 });

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.LINKEDIN_REDIRECT_URI,
    client_id: env.LINKEDIN_CLIENT_ID,
    client_secret: env.LINKEDIN_CLIENT_SECRET,
  });
  const tokenResp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!tokenResp.ok) {
    const text = await tokenResp.text();
    return new Response(`Token exchange failed: ${text}`, { status: 502 });
  }
  const tokenData = await tokenResp.json();
  const expiresAt = Date.now() + (tokenData.expires_in || 0) * 1000;

  // Fetch the member's URN (needed as the post author) via OpenID userinfo.
  const meResp = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  let memberUrn = null;
  if (meResp.ok) {
    const me = await meResp.json();
    if (me.sub) memberUrn = `urn:li:person:${me.sub}`;
  }

  await env.GNK_ASG_CONFIG_KV.put('linkedin:access_token', tokenData.access_token);
  if (tokenData.refresh_token) await env.GNK_ASG_CONFIG_KV.put('linkedin:refresh_token', tokenData.refresh_token);
  await env.GNK_ASG_CONFIG_KV.put('linkedin:expires_at', String(expiresAt));
  if (memberUrn) await env.GNK_ASG_CONFIG_KV.put('linkedin:member_urn', memberUrn);

  return new Response(
    `<!doctype html><html lang="hr"><body style="font-family:Arial,sans-serif;background:#0a0c10;color:#f8fafc;padding:60px;text-align:center">` +
    `<h1 style="color:#d4af37">LinkedIn povezan ✓</h1>` +
    `<p>Račun je uspješno povezan${memberUrn ? ' (' + memberUrn + ')' : ''}. Možeš zatvoriti ovu stranicu.</p>` +
    `<p><a href="/linkedin-daily/" style="color:#d4af37">Otvori dnevni feed →</a></p>` +
    `</body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

async function handleStatus(request, env) {
  const accessToken = await env.GNK_ASG_CONFIG_KV.get('linkedin:access_token');
  const expiresAt = await env.GNK_ASG_CONFIG_KV.get('linkedin:expires_at');
  const memberUrn = await env.GNK_ASG_CONFIG_KV.get('linkedin:member_urn');
  const connected = Boolean(accessToken) && Number(expiresAt || 0) > Date.now();
  return new Response(JSON.stringify({ connected, memberUrn: memberUrn || null, expiresAt: expiresAt ? Number(expiresAt) : null }), {
    headers: { 'content-type': 'application/json' },
  });
}

// Uploads an image to LinkedIn and returns the asset URN, per the LinkedIn
// Images API (register upload -> PUT binary -> use returned asset URN in the post).
async function uploadImage(accessToken, memberUrn, imageBytes) {
  const registerResp = await fetch(`${API_BASE}/images?action=initializeUpload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({ initializeUploadRequest: { owner: memberUrn } }),
  });
  if (!registerResp.ok) throw new Error('Image upload init failed: ' + (await registerResp.text()));
  const registerData = await registerResp.json();
  const uploadUrl = registerData.value.uploadUrl;
  const asset = registerData.value.image;

  const putResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: imageBytes,
  });
  if (!putResp.ok) throw new Error('Image binary upload failed: ' + (await putResp.text()));
  return asset;
}

async function postToLinkedIn(env, { text, imageUrl }) {
  const accessToken = await env.GNK_ASG_CONFIG_KV.get('linkedin:access_token');
  const memberUrn = await env.GNK_ASG_CONFIG_KV.get('linkedin:member_urn');
  if (!accessToken || !memberUrn) throw new Error('LinkedIn not connected — visit /api/linkedin/connect first.');

  let content;
  if (imageUrl) {
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error('Could not fetch image to upload: ' + imageUrl);
    const imageBytes = await imgResp.arrayBuffer();
    const asset = await uploadImage(accessToken, memberUrn, imageBytes);
    content = { media: { title: 'GNK ASG', id: asset } };
  }

  const postBody = {
    author: memberUrn,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
  if (content) postBody.content = content;

  const postResp = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  });
  if (!postResp.ok) throw new Error('LinkedIn post failed: ' + (await postResp.text()));
  return postResp.headers.get('x-restli-id') || postResp.headers.get('x-linkedin-id') || 'posted';
}

async function handleDrafts(request, env) {
  try {
    const listRaw = await env.GNK_ASG_CONFIG_KV.get('linkedin:recent_drafts');
    const ids = listRaw ? JSON.parse(listRaw) : [];
    const drafts = [];
    for (const id of ids) {
      const raw = await env.GNK_ASG_CONFIG_KV.get(`linkedin:draft:${id}`);
      if (raw) drafts.push(JSON.parse(raw));
    }
    return new Response(JSON.stringify({ drafts }), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ drafts: [], error: String(err && err.message || err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

async function handleApprove(request, env) {
  try {
    const body = await request.json();
    const draftId = body.draftId;
    if (!draftId) return new Response(JSON.stringify({ error: 'draftId required' }), { status: 400 });
    const draftRaw = await env.GNK_ASG_CONFIG_KV.get(`linkedin:draft:${draftId}`);
    if (!draftRaw) return new Response(JSON.stringify({ error: 'draft not found' }), { status: 404 });
    const draft = JSON.parse(draftRaw);
    const postId = await postToLinkedIn(env, { text: draft.postText, imageUrl: draft.imageUrl });
    draft.status = 'posted';
    draft.linkedinPostId = postId;
    draft.postedAt = new Date().toISOString();
    await env.GNK_ASG_CONFIG_KV.put(`linkedin:draft:${draftId}`, JSON.stringify(draft));
    return new Response(JSON.stringify({ ok: true, postId }), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err && err.message || err) }), { status: 500 });
  }
}

async function handleReject(request, env) {
  try {
    const body = await request.json();
    const draftId = body.draftId;
    if (!draftId) return new Response(JSON.stringify({ error: 'draftId required' }), { status: 400 });
    const draftRaw = await env.GNK_ASG_CONFIG_KV.get(`linkedin:draft:${draftId}`);
    if (draftRaw) {
      const draft = JSON.parse(draftRaw);
      draft.status = 'rejected';
      await env.GNK_ASG_CONFIG_KV.put(`linkedin:draft:${draftId}`, JSON.stringify(draft));
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err && err.message || err) }), { status: 500 });
  }
}

export async function handleLinkedIn(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/linkedin/connect') return handleConnect(request, env);
  if (url.pathname === '/api/linkedin/callback') return handleCallback(request, env);
  if (url.pathname === '/api/linkedin/status') return handleStatus(request, env);
  if (url.pathname === '/api/linkedin/drafts') return handleDrafts(request, env);
  if (url.pathname === '/api/linkedin/approve' && request.method === 'POST') return handleApprove(request, env);
  if (url.pathname === '/api/linkedin/reject' && request.method === 'POST') return handleReject(request, env);
  return new Response('Not found', { status: 404 });
}

export { handlesLinkedIn };
