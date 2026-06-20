import { analyseMail } from './ai.js';
import { parseIncoming, isAutomatedLoop, detectLanguage } from './parser.js';
import { sendContextualReply, sendManualMail } from './sender.js';
import { addMailboxItem, readMailbox } from './storage.js';
import { MAIL_AUTOMATION_POLICY } from './policy.js';
import { preserveThreadHeaders } from './thread-safety.js';
import { buildMediaCampaignBatch, nextMediaCampaignWindow } from './media-campaign-batch.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (url.pathname === '/api/mail-agent/status') {
      return json(request, {
        ok: true,
        service: 'GNK ASG Mail Agent',
        mode: 'preview',
        productionRouteConfigured: false,
        policy: MAIL_AUTOMATION_POLICY,
        bindings: {
          kv: Boolean(env.GNK_ASG_KV),
          ai: Boolean(env.AI),
          email: Boolean(env.EMAIL)
        },
        updatedAt: new Date().toISOString()
      });
    }

    if (!authorized(request, env)) {
      return json(request, { ok: false, error: 'unauthorized' }, 401);
    }

    const boxMatch = url.pathname.match(/^\/api\/mail-agent\/(inbox|outbox|sent|held)$/);
    if (request.method === 'GET' && boxMatch) {
      const box = boxMatch[1];
      const items = await readMailbox(env, box);
      return json(request, { ok: true, box, count: items.length, items });
    }

    if (request.method === 'POST' && url.pathname === '/api/mail-agent/send') {
      return handleManualSend(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/api/mail-agent/media-campaign/preview') {
      return handleMediaCampaignPreview(request, env);
    }

    return json(request, { ok: false, error: 'not_found', path: url.pathname }, 404);
  },

  async email(message, env, ctx) {
    ctx.waitUntil(processIncoming(message, env));
  }
};

async function handleManualSend(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(request, { ok: false, error: 'invalid_json' }, 400);
  }

  const queued = {
    id: crypto.randomUUID(),
    type: 'manual-mail',
    from: payload.from,
    fromName: payload.fromName,
    to: payload.to,
    cc: payload.cc,
    bccCount: countRecipients(payload.bcc),
    subject: payload.subject,
    bodyPreview: String(payload.body || '').slice(0, 500),
    signatureProfile: payload.signatureProfile || payload.mailbox || 'office',
    attachmentCount: Array.isArray(payload.attachments) ? payload.attachments.length : 0,
    createdAt: new Date().toISOString(),
    status: 'queued'
  };

  await addMailboxItem(env, 'outbox', queued);

  try {
    const result = await sendManualMail(env, payload);
    const sent = {
      ...queued,
      status: result.ok ? 'sent' : 'partial_failure',
      sentAt: new Date().toISOString(),
      result
    };
    await addMailboxItem(env, result.ok ? 'sent' : 'held', sent);
    return json(request, { ok: result.ok, id: queued.id, result }, result.ok ? 200 : 502);
  } catch (error) {
    const failed = {
      ...queued,
      status: 'failed',
      failedAt: new Date().toISOString(),
      reason: String(error?.message || error)
    };
    await addMailboxItem(env, 'held', failed);
    return json(request, { ok: false, id: queued.id, error: failed.reason }, 400);
  }
}

async function handleMediaCampaignPreview(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(request, { ok: false, error: 'invalid_json' }, 400);
  }

  const batch = buildMediaCampaignBatch(payload);
  const preview = nextMediaCampaignWindow(batch);
  await addMailboxItem(env, 'held', {
    type: 'media-campaign-preview',
    batchId: batch.id,
    total: batch.total,
    sent: batch.sent,
    failed: batch.failed,
    remaining: batch.remaining,
    rateLimitPerMinute: batch.rateLimitPerMinute,
    status: batch.status,
    createdAt: batch.createdAt
  });

  return json(request, { ok: true, batch, preview });
}

async function processIncoming(message, env) {
  const raw = await new Response(message.raw).text();
  const mail = parseIncoming(message, raw);

  if (isAutomatedLoop(mail, raw)) {
    await addMailboxItem(env, 'held', {
      ...mail,
      status: 'held',
      reason: 'reply_loop_or_automated_sender'
    });
    return;
  }

  await addMailboxItem(env, 'inbox', mail);
  const decision = await analyseMail(env, mail);

  if (!decision.autoSend || !decision.reply) {
    await addMailboxItem(env, 'held', {
      ...mail,
      status: 'held',
      classification: decision,
      heldAt: new Date().toISOString()
    });
    return;
  }

  const outgoing = {
    id: crypto.randomUUID(),
    sourceId: mail.id,
    caseId: mail.caseId,
    ...preserveThreadHeaders(mail),
    from: senderAddress(mail.to, env),
    to: mail.replyTo || mail.senderEmail || mail.from,
    subject: /^re:/i.test(mail.subject) ? mail.subject : `Re: ${mail.subject}`,
    body: decision.reply,
    language: detectLanguage(mail),
    profile: profileForRecipient(mail.to),
    classification: decision,
    createdAt: new Date().toISOString(),
    status: 'queued'
  };

  await addMailboxItem(env, 'outbox', outgoing);

  try {
    const result = await sendContextualReply(env, outgoing);
    await addMailboxItem(env, 'sent', {
      ...outgoing,
      status: result.ok ? 'sent' : 'partial_failure',
      sentAt: new Date().toISOString(),
      result
    });
  } catch (error) {
    await addMailboxItem(env, 'held', {
      ...outgoing,
      status: 'failed',
      failedAt: new Date().toISOString(),
      reason: String(error?.message || error)
    });
  }
}

function countRecipients(value) {
  if (Array.isArray(value)) return value.length;
  return String(value || '').split(/[;,\s]+/).filter(Boolean).length;
}

function senderAddress(recipient, env) {
  const value = String(recipient || '').trim().toLowerCase();
  if (/^[a-z0-9._%+-]+@gnk-asg\.hr$/.test(value)) return value;
  return String(env.MAIL_FROM || 'it@gnk-asg.hr');
}

function profileForRecipient(recipient) {
  const local = String(recipient || '').split('@')[0].toLowerCase();
  if (['info', 'contact', 'media', 'assistant', 'it'].includes(local)) return local;
  return 'it';
}

function suppliedToken(request) {
  const bearer = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  return String(request.headers.get('x-operator-token') || bearer).trim();
}

function authorized(request, env) {
  const expected = String(env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || '').trim();
  return Boolean(expected && suppliedToken(request) === expected);
}

function allowedOrigin(request) {
  const origin = String(request.headers.get('origin') || '');
  if (!origin) return 'https://gnk-asg.hr';
  if (/^https:\/\/([a-z0-9-]+\.)?gnk-asg\.hr$/i.test(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(origin)) return origin;
  if (/^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin;
  return 'https://gnk-asg.hr';
}

function corsHeaders(request) {
  return {
    'access-control-allow-origin': allowedOrigin(request),
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-operator-token',
    'cache-control': 'no-store',
    vary: 'Origin'
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(request)
    }
  });
}
