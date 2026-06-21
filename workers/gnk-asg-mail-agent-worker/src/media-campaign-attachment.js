const MAX_PDF_BYTES = 8_000_000;
const KEY_PREFIX = 'mail-agent:media-attachment:v1:';

export function normaliseCampaignAttachment(input = {}) {
  const filename = cleanFilename(input.filename || input.name || '');
  const mimeType = String(input.mimeType || input.contentType || '').trim().toLowerCase();
  const base64 = String(input.base64 || '').replace(/\s+/g, '');
  const estimatedBytes = Math.floor(base64.length * 0.75);
  const declaredBytes = Number(input.size || 0);
  const size = declaredBytes > 0 ? declaredBytes : estimatedBytes;

  if (!filename || !filename.toLowerCase().endsWith('.pdf')) {
    throw new Error('missing_pdf_attachment');
  }
  if (mimeType && mimeType !== 'application/pdf') {
    throw new Error('invalid_pdf_mime_type');
  }
  if (!base64) {
    throw new Error('missing_pdf_content');
  }
  if (size <= 0 || size > MAX_PDF_BYTES || estimatedBytes > MAX_PDF_BYTES) {
    throw new Error('pdf_attachment_too_large');
  }

  return {
    filename,
    mimeType: 'application/pdf',
    size,
    base64
  };
}

export async function storeCampaignAttachment(env, campaignId, attachment) {
  if (!env.GNK_ASG_KV) throw new Error('campaign_storage_unavailable');
  const key = attachmentKey(campaignId);
  await env.GNK_ASG_KV.put(key, JSON.stringify(attachment), { expirationTtl: 604800 });
  return {
    key,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    stored: true
  };
}

export async function readCampaignAttachment(env, campaign = {}) {
  if (!env.GNK_ASG_KV || !campaign.attachmentKey) return null;
  const raw = await env.GNK_ASG_KV.get(campaign.attachmentKey);
  if (!raw) return null;
  try {
    return normaliseCampaignAttachment(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function attachmentKey(campaignId) {
  const id = String(campaignId || '').trim();
  if (!/^[a-zA-Z0-9._:-]{1,160}$/.test(id)) throw new Error('invalid_campaign_id');
  return `${KEY_PREFIX}${id}`;
}

function cleanFilename(value) {
  return String(value || '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 140);
}
