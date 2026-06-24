import app from './index-ui-harmonizer.js';
import { EmailMessage } from 'cloudflare:email';

const SESSION_COOKIE = 'gnk_asg_admin_session';
const encoder = new TextEncoder();
const INTERNAL_TO = 'rht@gmx.com';

const MAILBOXES = {
  info: { address:'info@gnk-asg.hr', label:'Info Desk' },
  contact: { address:'contact@gnk-asg.hr', label:'Contact Desk' },
  it: { address:'it@gnk-asg.hr', label:'IT – Osobni digitalni asistent' },
  legal: { address:'legal@gnk-asg.hr', label:'Legal & Compliance' },
  privacy: { address:'privacy@gnk-asg.hr', label:'Privacy Desk' },
  media: { address:'media@gnk-asg.hr', label:'Media Desk' },
  press: { address:'press@gnk-asg.hr', label:'Press Desk' },
  ubo: { address:'ubo@gnk-asg.hr', label:'UBO Desk' },
  sefic: { address:'sefic@gnk-asg.hr', label:'Office of Nermin Sefić' },
  assistant: { address:'assistant@gnk-asg.hr', label:'IT – Osobni digitalni asistent' }
};

const clean = value => String(value || '').trim();

function operatorSecrets(env) {
  return [
    env.GNK_ASG_OPERATOR_TOKEN,
    env.OPERATOR_TOKEN,
    env.GNK_ASG_ADMIN_TOKEN,
    env.ADMIN_TOKEN,
    env.NEWS_PUBLISH_TOKEN
  ].map(clean).filter(Boolean);
}

function constantTimeEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function suppliedToken(request) {
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  return clean(
    (bearer && bearer[1]) ||
    request.headers.get('x-operator-token') ||
    request.headers.get('x-admin-token') ||
    request.headers.get('x-gnk-asg-token')
  );
}

function cookieValue(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(separator + 1).trim()); }
    catch { return ''; }
  }
  return '';
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name:'HMAC', hash:'SHA-256' }, false, ['sign']
  );
  return base64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

async function sessionAuthorized(request, env) {
  const secrets = operatorSecrets(env);
  if (!secrets.length) return false;
  const value = cookieValue(request, SESSION_COOKIE);
  const separator = value.indexOf('.');
  if (separator < 1) return false;
  const expires = Number(value.slice(0, separator));
  const signature = value.slice(separator + 1);
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(secrets[0], `gnk-asg-admin:${expires}`);
  return constantTimeEqual(signature, expected);
}

async function authorized(request, env) {
  const supplied = suppliedToken(request);
  if (supplied && operatorSecrets(env).some(secret => constantTimeEqual(secret, supplied))) return true;
  return sessionAuthorized(request, env);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
      'access-control-allow-origin':'*',
      'access-control-allow-methods':'GET, POST, OPTIONS',
      'access-control-allow-headers':'content-type, authorization, x-operator-token, x-admin-token, x-gnk-asg-token'
    }
  });
}

function safeMailbox(value) {
  const raw = clean(value).toLowerCase();
  if (MAILBOXES[raw]) return raw;
  for (const [key, box] of Object.entries(MAILBOXES)) {
    if (raw.includes(key) || raw.includes(box.address.toLowerCase())) return key;
  }
  if (raw.includes('director') || raw.includes('nermin')) return 'sefic';
  return 'info';
}

function emailList(value) {
  return [...new Set(String(value || '')
    .split(/[;,\s]+/)
    .map(item => item.trim())
    .filter(item => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
  )];
}

function utf8Base64(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function encodeHeader(value) {
  return `=?UTF-8?B?${utf8Base64(String(value || '').replace(/[\r\n]/g, ' '))}?=`;
}

function foldBase64(value) {
  return String(value || '').replace(/(.{76})/g, '$1\r\n');
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeAttachments(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map(item => ({
    filename: clean(item?.filename || item?.name || 'attachment.pdf').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 140),
    contentType: clean(item?.contentType || item?.mimeType || item?.type || 'application/pdf'),
    base64: clean(item?.base64 || item?.content)
  })).filter(item => item.base64 && item.base64.length <= 7000000);
}

function rawMessage({ from, fromName, to, cc, subject, text, html, attachments }) {
  const mixed = `mix_${crypto.randomUUID().replace(/-/g, '')}`;
  const alt = `alt_${crypto.randomUUID().replace(/-/g, '')}`;
  let raw = '';
  raw += `From: ${encodeHeader(fromName || from)} <${from}>\r\n`;
  raw += `To: ${to.join(', ')}\r\n`;
  if (cc.length) raw += `Cc: ${cc.join(', ')}\r\n`;
  raw += `Reply-To: ${from}\r\n`;
  raw += `Subject: ${encodeHeader(subject)}\r\n`;
  raw += 'MIME-Version: 1.0\r\n';

  if (attachments.length) {
    raw += `Content-Type: multipart/mixed; boundary="${mixed}"\r\n\r\n`;
    raw += `--${mixed}\r\nContent-Type: multipart/alternative; boundary="${alt}"\r\n\r\n`;
  } else {
    raw += `Content-Type: multipart/alternative; boundary="${alt}"\r\n\r\n`;
  }

  raw += `--${alt}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${text}\r\n\r\n`;
  raw += `--${alt}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${html || `<pre>${text}</pre>`}\r\n\r\n`;
  raw += `--${alt}--\r\n`;

  for (const attachment of attachments) {
    raw += `--${mixed}\r\n`;
    raw += `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\r\n`;
    raw += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
    raw += 'Content-Transfer-Encoding: base64\r\n\r\n';
    raw += `${foldBase64(attachment.base64)}\r\n`;
  }
  if (attachments.length) raw += `--${mixed}--\r\n`;
  return raw;
}

async function sendEnvelope(env, message) {
  const result = { attempted:false, sent:false, recipients:[], errors:[], messageIds:[] };
  if (!env.EMAIL || typeof env.EMAIL.send !== 'function') {
    result.errors.push('EMAIL binding nije dostupan.');
    return result;
  }

  const recipients = [...new Set([...message.to, ...message.cc, ...message.bcc])];
  if (!recipients.length) {
    result.errors.push('Nema valjanih primatelja.');
    return result;
  }

  result.attempted = true;
  const raw = rawMessage(message);
  for (const recipient of recipients) {
    try {
      const response = await env.EMAIL.send(new EmailMessage(message.from, recipient, raw));
      result.recipients.push(recipient);
      if (response?.messageId) result.messageIds.push(response.messageId);
    } catch (error) {
      result.errors.push(`${recipient}: ${clean(error?.message || error)}`);
    }
  }
  result.sent = result.recipients.length > 0 && result.errors.length === 0;
  return result;
}

async function handleOperatorMail(request, env) {
  if (!(await authorized(request, env))) {
    return json({ ok:false, error:'unauthorized', message:'Operator sesija nije potvrđena.' }, 401);
  }
  if (request.method !== 'POST') return json({ ok:false, error:'method_not_allowed' }, 405);

  let data = {};
  try { data = await request.json(); }
  catch { return json({ ok:false, error:'invalid_json' }, 400); }

  const mailboxKey = safeMailbox(data.mailbox || data.profile || data.signatureProfile || data.from);
  const mailbox = MAILBOXES[mailboxKey];
  const to = emailList(data.to);
  const cc = emailList(data.cc);
  const bcc = emailList(data.bcc);
  const subject = clean(data.subject);
  const html = clean(data.html || data.bodyHtml || data.htmlBody || data.messageHtml || data.contentHtml || data.body);
  const text = clean(data.text || data.plainText) || stripHtml(html);
  const attachments = normalizeAttachments(data.attachments);

  if (!to.length || !subject || !text) {
    return json({ ok:false, error:'missing_fields', message:'Nedostaju primatelj, predmet ili tekst poruke.' }, 400);
  }

  const result = await sendEnvelope(env, {
    from:mailbox.address,
    fromName:clean(data.fromName) || `GNK ASG ${mailbox.label}`,
    to, cc, bcc, subject, text, html, attachments
  });

  const log = {
    type:'operator-mail', sentAt:new Date().toISOString(), mailboxKey,
    from:mailbox.address, to, cc, bcc, subject,
    attachmentCount:attachments.length, result
  };
  try {
    if (env.GNK_ASG_KV) {
      await env.GNK_ASG_KV.put(`operator:mail-log:${Date.now()}:${crypto.randomUUID()}`, JSON.stringify(log));
      await env.GNK_ASG_KV.put('operator:mail-last', JSON.stringify(log));
    }
  } catch {}

  return json({
    ok:result.sent,
    worker:'gnk-asg-direct-operator',
    endpoint:new URL(request.url).pathname,
    mailboxKey,
    from:mailbox.address,
    to, cc, bcc, subject,
    attachmentCount:attachments.length,
    result
  }, result.sent ? 200 : 502);
}

async function handleContact(request, env, ctx) {
  if (request.method === 'OPTIONS' || request.method === 'GET') return app.fetch(request, env, ctx);
  if (request.method !== 'POST') return app.fetch(request, env, ctx);

  const copy = request.clone();
  const baseResponse = await app.fetch(request, env, ctx);
  const type = baseResponse.headers.get('content-type') || '';
  if (!baseResponse.ok || !type.includes('application/json')) return baseResponse;

  let base = {};
  try { base = await baseResponse.clone().json(); }
  catch { return baseResponse; }
  if (!base?.ok || !base?.caseId) return baseResponse;

  let form;
  try { form = await copy.formData(); }
  catch { return baseResponse; }

  const mailboxKey = safeMailbox(form.get('mailbox') || form.get('departmentKey') || form.get('department') || 'info');
  const mailbox = MAILBOXES[mailboxKey];
  const name = clean(form.get('name'));
  const email = clean(form.get('email'));
  const phone = clean(form.get('phone'));
  const subject = clean(form.get('subject') || 'Upit putem GNK ASG portala');
  const messageText = clean(form.get('message'));

  const internalText = `GNK ASG - novi upit putem kontakt forme\n\nEvidencijski broj: ${base.caseId}\nOdjel: ${mailbox.label} (${mailbox.address})\nVrijeme: ${base.receivedAt || new Date().toISOString()}\n\nPodnositelj: ${name}\nE-mail: ${email}\nTelefon: ${phone || '-'}\nPredmet: ${subject}\nPDF: ${base.attachmentStatus || 'nije priložen'}\n\nPoruka:\n${messageText}`;
  const replyText = `Poštovani/Poštovana ${name},\n\nzaprimili smo Vaš upit: "${subject}".\n\nEvidencijski broj: ${base.caseId}\nOdjel: ${mailbox.label}\nVrijeme zaprimanja: ${base.receivedAt || new Date().toISOString()}\nPDF prilog: ${base.attachmentStatus || 'nije priložen'}\n\nSačuvajte evidencijski broj radi buduće komunikacije.\n\nSrdačan pozdrav,\n${mailbox.label}\nGNK ASG d.o.o.\nhttps://gnk-asg.hr\n\nOvo je automatska potvrda zaprimanja.`;

  const internalMail = await sendEnvelope(env, {
    from:mailbox.address,
    fromName:`GNK ASG ${mailbox.label}`,
    to:[INTERNAL_TO], cc:[], bcc:[],
    subject:`[${base.caseId}] ${subject}`,
    text:internalText,
    html:`<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${internalText.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>`,
    attachments:[]
  });

  const autoReply = await sendEnvelope(env, {
    from:mailbox.address,
    fromName:`GNK ASG ${mailbox.label}`,
    to:emailList(email), cc:[], bcc:[],
    subject:`[${base.caseId}] Potvrda zaprimanja upita`,
    text:replyText,
    html:`<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${replyText.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>`,
    attachments:[]
  });

  const updated = {
    ...base,
    selectedMailbox:mailbox.address,
    selectedMailboxLabel:mailbox.label,
    internalForward:INTERNAL_TO,
    internalMail,
    autoReply,
    mailAttempted:true,
    mailSent:Boolean(internalMail.sent && autoReply.sent)
  };

  try {
    if (env.GNK_ASG_KV) {
      const key = `contact:${base.caseId}`;
      const existingRaw = await env.GNK_ASG_KV.get(key);
      let existing = {};
      try { existing = existingRaw ? JSON.parse(existingRaw) : {}; } catch {}
      const merged = { ...existing, internalMail, autoReply, mailAttempted:true, mailSent:updated.mailSent };
      await env.GNK_ASG_KV.put(key, JSON.stringify(merged, null, 2));
      await env.GNK_ASG_KV.put('contact:last', JSON.stringify(merged, null, 2));
    }
  } catch {}

  return json(updated);
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (path === '/api/admin-mail-send' || path === '/api/operator-send-mail') {
      if (request.method === 'OPTIONS') return new Response(null, { status:204, headers:json({}).headers });
      return handleOperatorMail(request, env);
    }
    if (path === '/api/contact-submit') return handleContact(request, env, ctx);
    return app.fetch(request, env, ctx);
  },
  async scheduled(event, env, ctx) {
    if (typeof app.scheduled === 'function') return app.scheduled(event, env, ctx);
  },
  async email(message, env, ctx) {
    if (typeof app.email === 'function') return app.email(message, env, ctx);
  }
};