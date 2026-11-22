/**
 * MASTER AI private read-only context gateway.
 * No public state, no action dispatch, no datastore writes.
 * Missing independent evidence is deliberately unknown.
 */
export const VERSION = 'MASTER_AI_CONTEXT_V1_20261113';
const PREFIX = '/api/master-ai/v1';
const ROUTES = new Set([PREFIX + '/context', PREFIX + '/tasks', PREFIX + '/audit']);
const json = (request, value, status = 200, extra = {}) =>
  new Response(request.method === 'HEAD' ? null : JSON.stringify(value), {
    status, headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store, max-age=0',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'vary': 'cookie, authorization',
      'x-master-ai-context-version': VERSION,
      ...extra
    }
  });
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value) ? value.toLowerCase() : null;
const iso = value => typeof value === 'string' && !Number.isNaN(Date.parse(value)) && /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? new Date(value).toISOString() : null;

async function authenticated(request, env, ctx, app) {
  if (!app || typeof app.fetch !== 'function') return false;
  try {
    const check = new Request(new URL('/api/operator-auth-check', request.url), {
      method: 'GET', headers: request.headers, redirect: 'manual'
    });
    const result = await app.fetch(check, env, ctx);
    if (!result || !result.ok) return false;
    const data = await result.json().catch(() => null);
    return data?.authenticated === true;
  } catch { return false; }
}
function snapshot(request, env) {
  // Environment variables alone are not verification of a live deployment.
  // These pointers are exposed only when their evidence metadata is present.
  const writer = sha(env?.MASTER_AI_WRITER_SHA);
  const production = sha(env?.MASTER_AI_PRODUCTION_SHA);
  const verifiedAt = iso(env?.MASTER_AI_PRODUCTION_VERIFIED_AT);
  const source = env?.MASTER_AI_PRODUCTION_EVIDENCE_SOURCE === 'independent-live-http'
    ? 'independent-live-http' : null;
  const verifiedProduction = Boolean(production && verifiedAt && source);
  return {
    schema_version: '1.0',
    generated_at: new Date().toISOString(),
    writer_sha: writer,
    production_sha: verifiedProduction ? production : null,
    production_verified_at: verifiedProduction ? verifiedAt : null,
    synchronized: verifiedProduction && writer !== null ? writer === production : null,
    health: {status:'unknown', observed_at:null, source:null, verification_level:'unverified', stale:true},
    tasks: [], incidents: [], decisions: [], worker_status: [], learning_ledger: [], capabilities: [],
    stale: true,
    completeness: 'unavailable',
    evidence: {
      writer: writer ? {source:'deployment-environment', verification_level:'unverified', observed_at:null, stale:true} : null,
      production: verifiedProduction ? {source, verification_level:'declared-not-cross-checked',observed_at:verifiedAt,stale:true} : null
    },
    notice: 'Unavailable data is not an empty confirmed task list or proof of healthy production.'
  };
}
export async function handleMasterAiContext(request, env, ctx, app) {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  if (!pathname.startsWith(PREFIX + '/') && pathname !== PREFIX) return null;
  if (!ROUTES.has(pathname)) return json(request, {ok:false,error:'not_found'}, 404);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json(request,{ok:false,error:'method_not_allowed'},405,{allow:'GET, HEAD'});
  }
  if (!await authenticated(request,env,ctx,app)) {
    return json(request,{ok:false,error:'unauthorized'},401);
  }
  if (pathname === PREFIX + '/context') return json(request,snapshot(request,env));
  if (pathname === PREFIX + '/tasks') {
    return json(request,{schema_version:'1.0',items:[],completeness:'unavailable',stale:true,next_cursor:null});
  }
  return json(request,{schema_version:'1.0',items:[],completeness:'unavailable',stale:true,next_cursor:null});
}
