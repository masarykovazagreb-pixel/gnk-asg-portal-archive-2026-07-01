import { uploadPdf } from './upload.js';
import { readPdf } from './storage.js';
import { authorized, cors, json } from './utils.js';

const INDEX_KEY = 'preview:pdf-publications:index:v1';

async function readIndex(env) {
  const raw = await env.GNK_ASG_KV?.get(INDEX_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(request) });
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/pdf-publications/status') {
      return json(request, {
        ok: true,
        service: 'GNK ASG PDF Publisher',
        mode: 'preview',
        productionRouteConfigured: false,
        kv: Boolean(env.GNK_ASG_KV),
        r2: Boolean(env.GNK_ASG_MEDIA_ASSETS)
      });
    }

    if (request.method === 'GET' && url.pathname === '/api/pdf-publications') {
      const items = await readIndex(env);
      return json(request, {
        ok: true,
        source: 'preview',
        items: items.filter(item => item.status === 'published')
      });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/files/')) {
      const id = url.pathname.replace('/files/', '').replace(/\.pdf$/i, '');
      const record = (await readIndex(env)).find(item => item.id === id);
      if (!record) return json(request, { ok: false, error: 'not_found' }, 404);

      const object = await readPdf(env, record.r2Key);
      if (!object) return json(request, { ok: false, error: 'file_not_found' }, 404);

      const headers = new Headers(cors(request));
      object.writeHttpMetadata?.(headers);
      if (object.httpEtag) headers.set('etag', object.httpEtag);
      headers.set('cache-control', 'public,max-age=300');
      headers.set('x-content-type-options', 'nosniff');
      return new Response(object.body, { headers });
    }

    if (!authorized(request, env)) {
      return json(request, { ok: false, error: 'unauthorized' }, 401);
    }

    if (request.method === 'GET' && url.pathname === '/api/pdf-publications/admin') {
      return json(request, { ok: true, items: await readIndex(env) });
    }

    if (request.method === 'POST' && url.pathname === '/api/pdf-publications/upload') {
      try {
        const result = await uploadPdf(request, env);
        return json(request, { ok: true, preview: true, ...result }, 201);
      } catch (error) {
        return json(request, { ok: false, error: String(error?.message || error) }, 400);
      }
    }

    return json(request, { ok: false, error: 'not_found', path: url.pathname }, 404);
  }
};
