const ASSET_LIST_KEY = 'mail-agent:assets:v1';
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]);

export async function uploadMediaAsset(request, env) {
  if (!env.GNK_ASG_MEDIA_ASSETS || typeof env.GNK_ASG_MEDIA_ASSETS.put !== 'function') {
    return result(false, 503, 'r2_binding_missing');
  }
  if (!env.GNK_ASG_KV) return result(false, 503, 'kv_binding_missing');

  let payload;
  try {
    payload = await request.json();
  } catch {
    return result(false, 400, 'invalid_json');
  }

  const mime = String(payload.mime || payload.contentType || '').trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(mime)) return result(false, 415, 'unsupported_image_type');

  let bytes;
  try {
    bytes = decodeBase64(payload.base64 || payload.data || '');
  } catch {
    return result(false, 400, 'invalid_base64');
  }

  if (!bytes.length) return result(false, 400, 'missing_image_data');
  if (bytes.length > MAX_IMAGE_BYTES) return result(false, 413, 'image_too_large');

  const now = new Date().toISOString();
  const id = `GNK-ASSET-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}`;
  const filename = safeFilename(payload.filename || extensionFilename(mime));
  const folder = safePathSegment(payload.folder || 'mobile-admin');
  const key = `${folder}/${id}-${filename}`;
  const title = clean(payload.title || filename, 240);
  const alt = clean(payload.alt || title, 240);
  const caption = clean(payload.caption || title, 500);

  await env.GNK_ASG_MEDIA_ASSETS.put(key, bytes, {
    httpMetadata: { contentType: mime },
    customMetadata: { id, title, alt, caption, uploadedAt: now }
  });

  const asset = {
    id,
    createdAt: now,
    key,
    filename,
    folder,
    mime,
    size: bytes.length,
    title,
    alt,
    caption,
    publicPath: `/r2/${key}`,
    publicUrl: `https://news.gnk-asg.hr/r2/${key}`,
    source: 'mail-agent-protected-upload'
  };

  await saveAsset(env, asset);
  return { ok: true, status: 201, asset };
}

export async function listMediaAssets(env, limit = 200) {
  if (!env.GNK_ASG_KV) return { ok: false, status: 503, error: 'kv_binding_missing', items: [] };
  const items = await readAssets(env);
  return {
    ok: true,
    status: 200,
    count: Math.min(items.length, limit),
    items: items.slice(0, limit)
  };
}

export function validateMediaAssetPayload(payload = {}) {
  const mime = String(payload.mime || payload.contentType || '').trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(mime)) return 'unsupported_image_type';
  const base64 = String(payload.base64 || payload.data || '').replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  if (!base64) return 'missing_image_data';
  return '';
}

async function readAssets(env) {
  const raw = await env.GNK_ASG_KV.get(ASSET_LIST_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveAsset(env, asset) {
  const items = await readAssets(env);
  const next = [asset, ...items.filter(item => item?.id !== asset.id)].slice(0, 500);
  await Promise.all([
    env.GNK_ASG_KV.put(ASSET_LIST_KEY, JSON.stringify(next, null, 2)),
    env.GNK_ASG_KV.put(`mail-agent:asset:${asset.id}`, JSON.stringify(asset, null, 2))
  ]);
}

function decodeBase64(value) {
  const cleanValue = String(value || '')
    .replace(/^data:[^;]+;base64,/, '')
    .replace(/\s+/g, '');
  if (!cleanValue) return new Uint8Array();
  const binary = atob(cleanValue);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function safeFilename(value) {
  const cleaned = String(value || 'upload.bin')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140);
  return cleaned || 'upload.bin';
}

function safePathSegment(value) {
  return safeFilename(value).replace(/\./g, '-').toLowerCase() || 'mobile-admin';
}

function extensionFilename(mime) {
  const extension = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif'
  }[mime] || 'bin';
  return `upload.${extension}`;
}

function clean(value, maximum) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function result(ok, status, error) {
  return { ok, status, error };
}
