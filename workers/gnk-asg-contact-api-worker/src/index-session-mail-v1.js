import core from './index.js';
import { EmailMessage } from 'cloudflare:email';

const SESSION_COOKIE = 'gnk_asg_admin_session';
const encoder = new TextEncoder();
const MAILBOXES = {
  info: 'info@gnk-asg.hr',
  contact: 'contact@gnk-asg.hr',
  it: 'it@gnk-asg.hr',
  legal: 'legal@gnk-asg.hr',
  privacy: 'privacy@gnk-asg.hr',
  media: 'media@gnk-asg.hr',
  press: 'press@gnk-asg.hr',
  ubo: 'ubo@gnk-asg.hr',
  sefic: 'sefic@gnk-asg.hr',
  assistant: 'assistant@gnk-asg.hr'
};

const text = value => String(value || '').trim();

function secrets(env) {
  return [env.GNK_ASG_OPERATOR_TOKEN, env.OPERATOR_TOKEN, env.GNK_ASG_ADMIN_TOKEN, env.ADMIN_TOKEN]
    .map(text).filter(Boolean);
}

function suppliedToken(request) {
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  return text((bearer && bearer[1]) || request.headers.get('x-operator-token') || request.headers.get('x-admin-token'));
}

function equal(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  return mismatch === 0;
}

function cookieValue(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return ''; }
    }
  }
  return '';
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  return base64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

async function authorized(request, env) {
  const allowed = secrets(env);
  const supplied = suppliedToken(request);
  if (supplied && allowed.some(secret => equal(secret, supplied))) return true;
  if (!allowed.length) return false;

  const value = cookieValue(request, SESSION_COOKIE);
  const separator = value.indexOf('.');
  if (separator < 1) return false;
  const expires = Number(value.slice(0, separator));
  const signature = value.slice(separator + 1);
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(allowed[0], `gnk-asg-admin:${expires}`);
  return equal(signature, expected);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
      'access-control-allow-origin':'*',
      'access-control-allow-methods':'GET, POST, OPTIONS',
      'access-control-allow-headers':'content-type, authorization, x-operator-token, x-admin-token'
    }
  });
}

function encodeHeader(value) {
  const bytes = new TextEncoder().encode(String(value || '').replace(/[\r\n]/g, ' '));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

async function send(request, env) {
  if (!(await authorized(request, env))) {
    return json({ ok:false, error:'unauthorized', message:'Operator sesija nije potvrđena.' }, 401);
  }

  let data = {};
  try { data = await request.json(); }
  catch { return json({ ok:false, error:'invalid_json' }, 400); }

  const mailboxKey = text(data.mailbox || data.profile || 'info').toLowerCase();
  const from = MAILBOXES[mailboxKey] || MAILBOXES.info;
  const to = text(data.to);
  const subject = text(data.subject);
  const body = text(data.text || data.plainText || data.body);

  if (!to || !subject || !body) return json({ ok:false, error:'missing_fields' }, 400);
  if (!env.EMAIL || typeof env.EMAIL.send !== 'function') return json({ ok:false, error:'email_binding_missing' }, 503);

  const raw = [
    `From: ${encodeHeader('GNK ASG')} <${from}>`,
    `To: ${to}`,
    `Reply-To: ${from}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body
  ].join('\r\n');

  const record = { sentAt:new Date().toISOString(), mailboxKey, from, to, subject, sent:false, error:null };

  try {
    const result = await env.EMAIL.send(new EmailMessage(from, to, raw));
    record.sent = true;
    record.messageId = result?.messageId || null;
  } catch (error) {
    record.error = text(error?.message || error);
  }

  try {
    if (env.GNK_ASG_KV) await env.GNK_ASG_KV.put(`operator:mail-log:${Date.now()}:${crypto.randomUUID()}`, JSON.stringify(record));
  } catch {}

  if (!record.sent) {
    const restricted = /not allowed/i.test(record.error || '');
    return json({
      ok:false,
      error: restricted ? 'outbound_destination_not_allowed' : 'mail_send_failed',
      message: restricted ? 'Autentifikacija je uspješna, ali vanjski izlazni mail servis nije konfiguriran za ovog primatelja.' : record.error,
      result:record
    }, 502);
  }

  return json({ ok:true, worker:'gnk-asg-contact-api', endpoint:'/api/admin-mail-send', result:record });
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (request.method === 'OPTIONS' && (path === '/api/admin-mail-send' || path === '/api/operator-send-mail')) return new Response(null, { status:204, headers:json({}).headers });
    if (path === '/api/admin-mail-send' || path === '/api/operator-send-mail') {
      if (request.method !== 'POST') return json({ ok:false, error:'method_not_allowed' }, 405);
      return send(request, env);
    }
    return core.fetch(request, env, ctx);
  }
};