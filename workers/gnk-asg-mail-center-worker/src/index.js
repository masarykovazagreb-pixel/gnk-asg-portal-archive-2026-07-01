// ⚠️ ZAŠTIĆEN SUSTAV — dio 5-slojnog mail sustava (vidi u glavnom
// gnk-asg-portal repozitoriju: docs/qa/ACCESS-LIMITATIONS-AND-
// VERIFICATION-LEVELS.md sekcija 9). Ovaj Worker dijeli D1 bazu
// (gnk_asg_operator_logs) s gnk-asg-direct-operator. withBrandedMimeTransport
// poziva popravljeni sendBrandedEmail() iz outbound-mail-transport-v1.js
// za strukturirane pozive -- ne omatati ponovno s
// withEmailStatusTracking, taj stariji proxy je namjerno uklonjen
// 27.7.2026. jer ne prepoznaje sirove EmailMessage pozive.
import { EmailMessage } from 'cloudflare:email';
import {prepareAiAutoReply,VERSION as AI_REPLY_VERSION} from '../../gnk-asg-direct-operator/src/ai-inbound-auto-reply-v2.js';
import {sendBrandedEmail} from '../../gnk-asg-direct-operator/src/outbound-mail-transport-v1.js';
import {recordMailSyncInbound} from '../../gnk-asg-direct-operator/src/mail-sync-center-v1.js';

const VERSION = `GNK_ASG_MAIL_CENTER_AI_V3_20260703_${AI_REPLY_VERSION}`;
const internalRecipient = env => String(env?.CONTACT_INTERNAL_RECIPIENTS || '').trim() || 'rht@gmx.com';
const internalCopy = env => ['beckuphome@gmail.com', internalRecipient(env)];
const mandatoryBcc = env => ['beckuphome@gmail.com', internalRecipient(env)];
const MEDIA_EMAILS = new Set(['media@gnk-asg.hr', 'press@gnk-asg.hr']);
const DEFAULT_FROM = 'assistant@gnk-asg.hr';
const MAX_LOG_ITEMS = 250;

function withBrandedMimeTransport(env) {
  const binding = env?.EMAIL;
  if (!binding?.send) return env;
  const wrapped = Object.create(env || null);
  Object.defineProperty(wrapped, 'EMAIL', {
    enumerable: true,
    configurable: true,
    value: {
      send(payload) {
        if (payload instanceof EmailMessage) return binding.send.call(binding, payload);
        return sendBrandedEmail(env, { ...payload, trackingSource: payload?.trackingSource || 'direct-inbound-auto-reply' });
      }
    }
  });
  return wrapped;
}

// Deset globalnih centara (docs/mail/auto-reply-case-centers-20260709.md).
// Stabilna dodjela po identitetu posiljatelja - ista osoba uvijek isti centar,
// nove osobe se raspodjeljuju po sva 10 preko hasha.
const CENTERS = [
  { code: 'ZAG', city: 'Zagreb, Croatia' },
  { code: 'TOR', city: 'Toronto, Canada' },
  { code: 'MEX', city: 'Mexico City, Mexico' },
  { code: 'BOG', city: 'Bogot\u00e1, Colombia' },
  { code: 'SAO', city: 'S\u00e3o Paulo, Brazil' },
  { code: 'DXB', city: 'Dubai, UAE' },
  { code: 'SIN', city: 'Singapore, Singapore' },
  { code: 'TYO', city: 'Tokyo, Japan' },
  { code: 'CAS', city: 'Casablanca, Morocco' },
  { code: 'BOU', city: 'Boulder / Colorado, USA' }
];
async function centerFor(identity) {
  const data = new TextEncoder().encode(String(identity || '').trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  const index = bytes[0] % CENTERS.length;
  return CENTERS[index];
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': 'https://gnk-asg.hr',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization,x-gnk-asg-token'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: JSON_HEADERS });
}

function clean(value) {
  return String(value ?? '').trim();
}

function splitAddresses(value) {
  const input = Array.isArray(value) ? value : String(value ?? '').split(/[;,]+/);
  return [...new Set(input.map(clean).filter(Boolean))];
}

function stripHtml(value) {
  return String(value ?? '')
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
    .replace(/&#0?39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function header(message, name) {
  try {
    return clean(message?.headers?.get?.(name));
  } catch {
    return '';
  }
}

function emailAddress(value) {
  const match = String(value ?? '').match(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : '';
}

function reference(prefix = 'GNK', centerCode = 'ZAG') {
  const now = new Date();
  const two = number => String(number).padStart(2, '0');
  const date = `${now.getUTCFullYear()}${two(now.getUTCMonth() + 1)}${two(now.getUTCDate())}`;
  const fingerprint = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${prefix}-${date}-${centerCode}-${fingerprint}`;
}

async function readList(env, key) {
  try {
    if (!env.GNK_ASG_KV) return [];
    const raw = await env.GNK_ASG_KV.get(key);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function prependLog(env, key, item) {
  if (!env.GNK_ASG_KV) return;
  const list = await readList(env, key);
  await env.GNK_ASG_KV.put(key, JSON.stringify([item, ...list.filter(entry => entry?.id !== item?.id)].slice(0, MAX_LOG_ITEMS), null, 2));
}

async function claimMessage(env, messageId, fallbackIdentity) {
  if (!env.GNK_ASG_KV) return true;
  const source = clean(messageId || fallbackIdentity);
  if (!source) return true;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const key = `mail:inbound:dedupe:${hash}`;
  if (await env.GNK_ASG_KV.get(key)) return false;
  await env.GNK_ASG_KV.put(key, new Date().toISOString(), { expirationTtl: 7 * 24 * 60 * 60 });
  return true;
}

function detectLanguage(subject, toAddress, message) {
  const explicit = header(message, 'content-language').toLowerCase();
  if (/^(hr|bs|sr)/.test(explicit)) return 'hr';
  if (/^de/.test(explicit)) return 'de';
  if (/^it/.test(explicit)) return 'it';
  if (/^en/.test(explicit)) return 'en';

  const text = ` ${clean(subject).toLowerCase().replace(/[^a-zà-žčćžšđ\s]/g, ' ')} `;
  const score = words => words.reduce((total, word) => total + (text.includes(` ${word} `) ? 1 : 0), 0);
  const hr = score(['poštovani', 'prijava', 'redakcija', 'akreditacija', 'mediji', 'upit', 'poruka', 'dokument', 'molim', 'hvala', 'poziv']);
  const de = score(['anfrage', 'presse', 'nachricht', 'dokument', 'danke', 'akkreditierung', 'einladung']);
  const it = score(['richiesta', 'stampa', 'messaggio', 'documento', 'grazie', 'accredito', 'invito']);
  const en = score(['application', 'media', 'press', 'message', 'document', 'invitation', 'accreditation', 'request', 'test', 'controlled']);

  const best = Math.max(hr, de, it, en);
  if (best > 0) {
    if (hr === best) return 'hr';
    if (de === best) return 'de';
    if (it === best) return 'it';
    return 'en';
  }
  return MEDIA_EMAILS.has(toAddress) ? 'en' : 'hr';
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'yopmail.com', 'throwawaymail.com',
  'trashmail.com', 'getnada.com', 'sharklasers.com', 'maildrop.cc', 'dispostable.com'
]);
const BLOCKED_SENDER_DOMAINS = new Set([
  'hraste-partneri.hr'
]);
const BLOCKED_SENDER_ADDRESSES = new Set([
  'ana@talaria.hr',
  'nikolina.pisek@gmail.com'
]);
function isSecurityRejected(sender, subject) {
  const address = String(sender || '').toLowerCase();
  const domain = address.split('@')[1] || '';
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  if (BLOCKED_SENDER_DOMAINS.has(domain)) return true;
  if (BLOCKED_SENDER_ADDRESSES.has(address)) return true;
  const s = String(subject || '').toLowerCase();
  if (/\b(you (have )?won|claim your prize|lottery winner|inheritance fund|urgent business proposal|crypto(currency)? investment opportunity)\b/.test(s)) return true;
  return false;
}

function isAutomatedInbound(message, sender) {
  const auto = header(message, 'auto-submitted').toLowerCase();
  const precedence = header(message, 'precedence').toLowerCase();
  const suppress = header(message, 'x-auto-response-suppress').toLowerCase();
  const subject = header(message, 'subject').toLowerCase();
  return Boolean(
    (auto && auto !== 'no') ||
    /bulk|list|junk/.test(precedence) ||
    suppress ||
    /mailer-daemon|postmaster|no-?reply|donotreply/.test(sender) ||
    /automatic reply|auto reply|out of office|izvan ureda|undeliverable|delivery status notification/.test(subject)
  );
}

function mediaText(language, receipt, subject) {
  const safeSubject = clean(subject) || '(no subject)';
  const messages = {
    en: `Dear Sir or Madam,\n\nThis confirms that your message has been received by the GNK DINAMO Ltd. Group Media Relations & Accreditation Center under reference ${receipt}.\n\nOriginal subject: ${safeSubject}\n\nYour message has been placed in the human-review queue. This automated acknowledgement does not constitute accreditation approval, acceptance of an offer, a contractual commitment or a final decision. Please quote the reference above in further correspondence.\n\nKind regards,\nGNK DINAMO Ltd. Group\nMedia Relations & Accreditation Center\nMedia organiser and operational coordinator: GNK ASG d.o.o.\nmedia@gnk-asg.hr\nhttps://gnk-asg.hr`,
    hr: `Poštovani,\n\npotvrđujemo da je Vaša poruka zaprimljena u GNK DINAMO Ltd. Group Media Relations & Accreditation Center pod evidencijskim brojem ${receipt}.\n\nIzvorni predmet: ${safeSubject}\n\nPoruka je upućena u red za ljudski pregled. Ova automatska potvrda nije odobrenje akreditacije, prihvat ponude, ugovorna obveza niti konačna odluka. U daljnjoj komunikaciji navedite gornji evidencijski broj.\n\nSrdačan pozdrav,\nGNK DINAMO Ltd. Group\nMedia Relations & Accreditation Center\nMedijski organizator i operativni koordinator: GNK ASG d.o.o.\nmedia@gnk-asg.hr\nhttps://gnk-asg.hr`,
    de: `Sehr geehrte Damen und Herren,\n\nwir bestätigen den Eingang Ihrer Nachricht beim Media Relations & Accreditation Center der GNK DINAMO Ltd. Group unter der Referenz ${receipt}.\n\nUrsprünglicher Betreff: ${safeSubject}\n\nIhre Nachricht wurde zur menschlichen Prüfung weitergeleitet. Diese automatische Bestätigung stellt keine Akkreditierungszusage, Annahme eines Angebots, vertragliche Verpflichtung oder endgültige Entscheidung dar.\n\nMit freundlichen Grüßen\nGNK DINAMO Ltd. Group\nMedia Relations & Accreditation Center\nmedia@gnk-asg.hr\nhttps://gnk-asg.hr`,
    it: `Gentili Signori,\n\nconfermiamo che il vostro messaggio è stato ricevuto dal Media Relations & Accreditation Center di GNK DINAMO Ltd. Group con il numero di riferimento ${receipt}.\n\nOggetto originale: ${safeSubject}\n\nIl messaggio è stato inoltrato per una verifica umana. Questa conferma automatica non costituisce approvazione dell'accredito, accettazione di un'offerta, impegno contrattuale o decisione finale.\n\nCordiali saluti\nGNK DINAMO Ltd. Group\nMedia Relations & Accreditation Center\nmedia@gnk-asg.hr\nhttps://gnk-asg.hr`
  };
  return messages[language] || messages.en;
}

function genericText(language, receipt, subject) {
  const safeSubject = clean(subject) || 'Vaš upit';
  if (language === 'en') return `Dear Sir or Madam,\n\nwe confirm that your message has been received by GNK ASG under reference ${receipt}.\n\nSubject: ${safeSubject}\n\nWe will review the matter internally and respond as soon as reasonably possible.\n\nKind regards,\nIT – Personal Digital Assistant\nGNK ASG d.o.o.\nhttps://gnk-asg.hr`;
  if (language === 'de') return `Sehr geehrte Damen und Herren,\n\nwir bestätigen, dass Ihre Nachricht bei GNK ASG unter dem Zeichen ${receipt} eingegangen ist.\n\nBetreff: ${safeSubject}\n\nWir werden das Anliegen intern prüfen und Ihnen so bald wie angemessen möglich antworten.\n\nMit freundlichen Grüßen\nIT – Persönlicher digitaler Assistent\nGNK ASG d.o.o.\nhttps://gnk-asg.hr`;
  if (language === 'it') return `Gentili Signori,\n\nconfermiamo che il vostro messaggio è stato ricevuto da GNK ASG con il numero di riferimento ${receipt}.\n\nOggetto: ${safeSubject}\n\nEsamineremo la richiesta internamente e risponderemo appena ragionevolmente possibile.\n\nCordiali saluti\nIT – Assistente digitale personale\nGNK ASG d.o.o.\nhttps://gnk-asg.hr`;
  return `Poštovani,\n\npotvrđujemo da je Vaša poruka zaprimljena u sustavu GNK ASG pod evidencijskim brojem ${receipt}.\n\nPredmet: ${safeSubject}\n\nNakon interne obrade odgovor ćemo dostaviti pisanim putem u najkraćem razumnom roku.\n\nSrdačan pozdrav,\nIT – Osobni digitalni asistent\nGNK ASG d.o.o.\nhttps://gnk-asg.hr`;
}

function htmlBody(text, mediaProfile) {
  const lines = text.split('\n').map(line => line ? escapeHtml(line) : '<br>').join('<br>');
  const name = mediaProfile ? 'GNK DINAMO Ltd. Group' : 'IT – Osobni digitalni asistent';
  const role = mediaProfile ? 'Media Relations &amp; Accreditation Center' : 'GNK ASG d.o.o. · Automated Communication Support';
  const email = mediaProfile ? 'media@gnk-asg.hr' : 'assistant@gnk-asg.hr';
  const logo = 'https://gnk-asg.hr/assets/logo-gnk-asg-email.png?v=20260713-canonical';
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.55">${lines}<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;margin-top:20px;max-width:720px;width:100%;border-top:1px solid #d9d9d9"><tr><td width="72" valign="top" style="width:72px;padding:18px 16px 8px 0"><a href="https://gnk-asg.hr" style="text-decoration:none"><img src="${logo}" width="56" height="58" alt="${escapeHtml(name)}" style="display:block;width:56px;max-width:56px;height:58px;max-height:58px;object-fit:contain;border:0;background:transparent"></a></td><td valign="top" style="padding:18px 0 8px;color:#111827;font-size:14px;line-height:1.45"><div style="font-size:16px;font-weight:700;color:#0b223d;margin-bottom:4px">${escapeHtml(name)}</div><div style="font-size:14px;font-weight:700;color:#0b223d;margin-bottom:8px">${role}</div><div><strong>E:</strong> <a href="mailto:${email}" style="color:#0b57d0;text-decoration:none">${email}</a></div><div><strong>W:</strong> <a href="https://gnk-asg.hr" style="color:#0b57d0;text-decoration:none">https://gnk-asg.hr</a></div></td></tr></table></div>`;
}

function decodeAttachmentBytes(value, filename, type) {
  let base64 = clean(value).replace(/^data:[^;,]+;base64,/i, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!base64) throw new Error(`Prazan privitak: ${filename}`);
  while (base64.length % 4) base64 += '=';
  let binary;
  try { binary = atob(base64); } catch { throw new Error(`Neispravan Base64 privitak: ${filename}`); }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  if (String(type).toLowerCase() === 'application/pdf') {
    const validPdf = bytes.length >= 5 && bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70 && bytes[4] === 45;
    if (!validPdf) throw new Error(`PDF nema valjano %PDF- zaglavlje: ${filename}`);
  }
  return bytes;
}

function normalizeAttachments(input) {
  const output = [];
  let total = 0;
  for (const item of Array.isArray(input) ? input : []) {
    const filename = clean(item?.filename || item?.name || 'document.pdf').replace(/[^\w.\- čćšđžČĆŠĐŽ]/g, '_').slice(0, 140);
    const type = clean(item?.type || item?.contentType || item?.mimeType || 'application/pdf');
    const source = item?.content || item?.base64 || item?.data || '';
    if (!source) continue;
    const bytes = decodeAttachmentBytes(source, filename, type);
    if (bytes.byteLength > 3_200_000) throw new Error(`PDF je prevelik: ${filename}`);
    total += bytes.byteLength;
    if (total > 3_400_000) throw new Error('PDF prilozi prelaze sigurni limit od oko 3 MB ukupno');
    output.push({ filename, type, content: bytes.buffer, disposition: 'attachment' });
  }
  return output;
}

async function sendMail(request, env) {
  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: 'invalid_json' }, 400); }
  const to = splitAddresses(data.to);
  const cc = splitAddresses(data.cc);
  const bcc = splitAddresses(data.bcc);
  const fromEmail = clean(data.from || 'office@gnk-asg.hr');
  const fromName = clean(data.fromName || 'GNK ASG Office');
  const subject = clean(data.subject || 'GNK ASG poruka');
  const html = clean(data.html || data.bodyHtml || data.messageHtml || data.contentHtml || data.body || '');
  const text = clean(data.text || data.plainText || stripHtml(html) || data.body || '');
  let attachments;
  try { attachments = normalizeAttachments(data.attachments || []); } catch (error) { return json({ ok: false, error: String(error?.message || error) }, 400); }
  const id = reference('GNK-SEND');
  if (!to.length) return json({ ok: false, error: 'missing_to' }, 400);
  const record = { id, createdAt: new Date().toISOString(), from: { email: fromEmail, name: fromName }, to, cc, bcc, subject, attachmentCount: attachments.length, attachments: attachments.map(item => ({ filename: item.filename, type: item.type })), dryRun: Boolean(data.dryRun) };
  await prependLog(env, 'mail:outbox', { ...record, status: data.dryRun ? 'dry_run' : 'sending' });
  if (data.dryRun) {
    await prependLog(env, 'mail:sent', { ...record, status: 'dry_run_ok' });
    return json({ ok: true, dryRun: true, stored: true, record });
  }
  if (!env.EMAIL?.send) return json({ ok: false, sent: false, stored: true, error: 'EMAIL binding missing', record }, 501);
  try {
    const payload = { to: to.length === 1 ? to[0] : to, from: { email: fromEmail, name: fromName }, subject, html, text, attachments, replyTo: fromEmail };
    if (cc.length) payload.cc = cc.length === 1 ? cc[0] : cc;
    if (bcc.length) payload.bcc = bcc.length === 1 ? bcc[0] : bcc;
    const result = await env.EMAIL.send(payload);
    const sent = { ...record, status: 'sent', messageId: clean(result?.messageId) || null };
    await prependLog(env, 'mail:sent', sent);
    return json({ ok: true, sent: true, stored: true, messageId: sent.messageId, record: sent });
  } catch (error) {
    const failed = { ...record, status: 'send_failed', error: String(error?.message || error) };
    await prependLog(env, 'mail:sent', failed);
    return json({ ok: false, sent: false, stored: true, error: failed.error, record: failed }, 500);
  }
}

async function handleInbound(message, env) {
  const fromRaw = message?.from || header(message, 'from');
  const toRaw = message?.to || header(message, 'to') || DEFAULT_FROM;
  const sender = emailAddress(header(message, 'reply-to') || fromRaw);
  const toAddress = emailAddress(toRaw) || DEFAULT_FROM;
  const subject = header(message, 'subject') || '(no subject)';
  const messageId = header(message, 'message-id');
  const center = await centerFor(sender || fromRaw);
  const id = reference(MEDIA_EMAILS.has(toAddress) ? 'GNK-MEDIA-IN' : 'GNK-INBOX', center.code);
  const language = detectLanguage(subject, toAddress, message);
  const mediaProfile = MEDIA_EMAILS.has(toAddress);
  const base = { id, createdAt: new Date().toISOString(), version: VERSION, from: fromRaw, to: toRaw, fromEmail: sender, toEmail: toAddress, subject, messageId, language, profile: mediaProfile ? 'media-relations' : 'general', status: 'received', center: center.code, centerCity: center.city };
  await prependLog(env, 'mail:inbox', base);
  try{
    await recordMailSyncInbound(env,{id,sourceId:id,from:fromRaw,to:toAddress,subject,messageId,status:'RECEIVED',sourceSystem:'mail-center-worker',createdAt:base.createdAt,receivedAt:base.createdAt});
  }catch(syncError){
    console.error('mail-sync-inbound-record',syncError);
  }

  if (typeof message?.forward === 'function') {
    for (const copyAddress of internalCopy(env)) {
      try {
        await message.forward(copyAddress);
        await prependLog(env, 'mail:sent', { ...base, status: 'incoming_forward_sent', copyTo: copyAddress });
      } catch (error) {
        await prependLog(env, 'mail:sent', { ...base, status: 'incoming_forward_failed', copyTo: copyAddress, error: String(error?.message || error) });
      }
    }
  }

  if (!sender || sender.endsWith('@gnk-asg.hr') || isAutomatedInbound(message, sender)) {
    await prependLog(env, 'mail:sent', { ...base, status: 'auto_reply_skipped' });
    return;
  }
  if (isSecurityRejected(sender, subject)) {
    await prependLog(env, 'mail:sent', { ...base, status: 'rejected_security' });
    if (env.EMAIL?.send) {
      try {
        const rejectLanguage = detectLanguage(subject, toAddress, message);
        const rejectText = rejectLanguage === 'en'
          ? 'Your message could not be delivered. The server rejected it for security reasons.'
          : 'Vaša poruka nije mogla biti dostavljena. Server ju je odbio iz sigurnosnih razloga.';
        await env.EMAIL.send({
          to: sender,
          from: { email: DEFAULT_FROM, name: 'GNK ASG Mail Security' },
          subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
          text: rejectText,
          html: `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;color:#111827">${escapeHtml(rejectText)}</p>`,
          headers: { 'Auto-Submitted': 'auto-replied', 'X-GNK-ASG-Mail-Center': VERSION, 'X-GNK-ASG-Security-Rejection': '1' }
        });
      } catch {}
    }
    return;
  }
  if (!(await claimMessage(env, messageId, `${sender}|${toAddress}|${subject}`))) {
    await prependLog(env, 'mail:sent', { ...base, status: 'auto_reply_skipped_duplicate' });
    return;
  }
  if (!env.EMAIL?.send) {
    await prependLog(env, 'mail:sent', { ...base, status: 'auto_reply_not_sent_email_binding_missing' });
    return;
  }

  const fromAddress = toAddress.endsWith('@gnk-asg.hr') ? toAddress : DEFAULT_FROM;
  const fromName = mediaProfile ? 'GNK DINAMO Ltd. Group Media Relations' : 'IT - Osobni digitalni asistent';
  const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
  const text = mediaProfile ? mediaText(language, id, subject) : genericText(language, id, subject);
  const html = htmlBody(text, mediaProfile);
  const outbox = { ...base, status: 'auto_reply_sending', autoReplyTo: sender, autoReplyFrom: fromAddress, autoReplyFromName: fromName, autoReplySubject: replySubject, bcc: mandatoryBcc(env).join(', ') };
  await prependLog(env, 'mail:outbox', outbox);

  try {
    const result = await env.EMAIL.send({
      to: sender,
      bcc: mandatoryBcc(env).join(', '),
      from: { email: fromAddress, name: fromName },
      replyTo: fromAddress,
      subject: replySubject,
      html,
      text,
      headers: {
        'Auto-Submitted': 'auto-replied',
        'X-Auto-Response-Suppress': 'All',
        'X-GNK-ASG-Mail-Center': VERSION,
        'X-GNK-ASG-Receipt': id,
        'X-GNK-ASG-Reference': id,
        'X-GNK-ASG-Profile': mediaProfile ? 'media-relations' : 'general'
      }
    });
    await prependLog(env, 'mail:sent', { ...outbox, status: 'auto_reply_sent', messageId: clean(result?.messageId) || null, sentAt: new Date().toISOString() });
  } catch (error) {
    await prependLog(env, 'mail:sent', { ...outbox, status: 'auto_reply_failed', error: String(error?.message || error) });
  }
}

async function preview(url, env) {
  const toAddress = emailAddress(url.searchParams.get('to')) || 'media@gnk-asg.hr';
  const senderIdentity = clean(url.searchParams.get('from')) || toAddress;
  const subject = clean(url.searchParams.get('subject') || 'Controlled media test');
  const requestedLanguage = clean(url.searchParams.get('lang')).toLowerCase();
  const mediaProfile = MEDIA_EMAILS.has(toAddress);
  const language = ['hr', 'en', 'de', 'it'].includes(requestedLanguage) ? requestedLanguage : (mediaProfile ? 'en' : 'hr');
  const center = await centerFor(senderIdentity);
  const receipt = reference(mediaProfile ? 'GNK-MEDIA-PREVIEW' : 'GNK-PREVIEW', center.code);
  const text = mediaProfile ? mediaText(language, receipt, subject) : genericText(language, receipt, subject);
  const persist = clean(url.searchParams.get('persist')).toLowerCase() === 'true';
  if (persist && env) {
    await prependLog(env, 'mail:inbox', { id: receipt, createdAt: new Date().toISOString(), version: VERSION, toEmail: toAddress, fromEmail: senderIdentity, subject, language, profile: mediaProfile ? 'media-relations' : 'general', status: 'preview_persisted', center: center.code, centerCity: center.city });
  }
  return json({ ok: true, version: VERSION, toAddress, profile: mediaProfile ? 'media-relations' : 'general', language, receipt, center: center.code, centerCity: center.city, subject, text, html: htmlBody(text, mediaProfile), persisted: persist });
}

async function caseLookup(url, env) {
  const caseId = clean(url.searchParams.get('case') || url.searchParams.get('id'));
  if (!caseId) return json({ ok: false, error: 'missing_case' }, 400);
  const [inbox, sent, outbox] = await Promise.all([
    readList(env, 'mail:inbox'),
    readList(env, 'mail:sent'),
    readList(env, 'mail:outbox')
  ]);
  const matches = [
    ...inbox.filter(item => item.id === caseId).map(item => ({ ...item, source: 'inbox' })),
    ...sent.filter(item => item.id === caseId).map(item => ({ ...item, source: 'sent' })),
    ...outbox.filter(item => item.id === caseId).map(item => ({ ...item, source: 'outbox' }))
  ];
  if (!matches.length) return json({ ok: false, error: 'not_found', case: caseId }, 404);
  return json({ ok: true, case: caseId, entries: matches });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/api/admin-mail-send' && request.method === 'POST') return sendMail(request, env);
    if (path === '/api/admin-mail-send') return json({ ok: true, version: VERSION, endpoint: '/api/admin-mail-send', method: 'POST', pdfAttachments: true, emailBinding: Boolean(env.EMAIL) });
    if (path === '/api/mail-center/status') return json({ ok: true, version: VERSION, service: 'GNK ASG Mail Center', emailBinding: Boolean(env.EMAIL), aiBinding: Boolean(env.AI), autoReply: true, mediaProfile: true, mediaDefaultLanguage: 'en', languages: ['hr', 'en', 'de', 'it'], mandatoryBcc: internalCopy(env), inboxKey: 'mail:inbox', sentKey: 'mail:sent', outboxKey: 'mail:outbox', time: new Date().toISOString() });
    if (path === '/api/mail-center/auto-reply-preview') return preview(url, env);
    if (path === '/api/mail-center/case-lookup' && request.method === 'GET') return caseLookup(url, env);
    if (path === '/api/mail-center/centers') return json({ ok: true, centers: CENTERS });
    if (path === '/api/mail-center/inbox') return json({ ok: true, key: 'mail:inbox', items: await readList(env, 'mail:inbox') });
    if (path === '/api/mail-center/sent') return json({ ok: true, key: 'mail:sent', items: await readList(env, 'mail:sent') });
    if (path === '/api/mail-center/outbox') return json({ ok: true, key: 'mail:outbox', items: await readList(env, 'mail:outbox') });
    return json({ ok: false, error: 'not_found', path }, 404);
  },
  async email(message, env, ctx) {
    let runtimeEnv = env;
    try {
      runtimeEnv = withBrandedMimeTransport(env);
    } catch (error) {
      console.error('mail-runtime-wrapper-failed', error);
      runtimeEnv = withBrandedMimeTransport(env);
    }
    let target = { message, env: runtimeEnv };
    try {
      target = prepareAiAutoReply(message, runtimeEnv);
      if (!target?.message || !target?.env) target = { message, env: runtimeEnv };
    } catch (error) {
      console.error('prepareAiAutoReply-wrap-failed', error);
      target = { message, env: runtimeEnv };
    }
    const task = handleInbound(target.message, target.env);
    if (ctx?.waitUntil) {
      ctx.waitUntil(task);
      return;
    }
    return task;
  }
};
