import { enforceRequiredSignature } from './email-signature-contract-v1.js';

export const VERSION = 'GNK_ASG_CLOUDFLARE_AI_AUTO_REPLY_V2_20260703';

const PRIMARY_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const FALLBACK_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const MAX_RAW_BYTES = 320_000;

const clean = (value) => String(value ?? '').trim();
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function messageHeader(message, name) {
  try { return clean(message?.headers?.get?.(name)); } catch { return ''; }
}

function payloadHeader(payload, name) {
  const headers = payload?.headers;
  if (headers instanceof Headers) return clean(headers.get(name));
  if (!headers || typeof headers !== 'object') return '';
  const key = Object.keys(headers).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? clean(headers[key]) : '';
}

function address(value) {
  if (value && typeof value === 'object') return address(value.email || value.address || '');
  const text = clean(value);
  const match = text.match(/<([^>]+)>/);
  return clean(match?.[1] || text).toLowerCase();
}

function addressList(value) {
  const values = Array.isArray(value) ? value : [value];
  const result = [];
  for (const item of values) {
    if (item && typeof item === 'object') {
      const email = address(item);
      if (email) result.push(email);
      continue;
    }
    for (const part of String(item || '').split(',')) {
      const email = address(part);
      if (email) result.push(email);
    }
  }
  return [...new Set(result)];
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function payloadText(payload) {
  return clean(payload?.text || payload?.plainText || payload?.body || stripHtml(payload?.html || payload?.bodyHtml || ''));
}

function bytesFromBinary(value) {
  const text = String(value || '');
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index) & 255;
  return bytes;
}

function decodeBytes(bytes, charset = 'utf-8') {
  const labels = [clean(charset).replace(/["']/g, '').toLowerCase(), 'utf-8'].filter(Boolean);
  for (const label of [...new Set(labels)]) {
    try { return new TextDecoder(label).decode(bytes); } catch {}
  }
  return new TextDecoder().decode(bytes);
}

function base64Bytes(value) {
  try {
    const binary = atob(String(value || '').replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return bytesFromBinary(value);
  }
}

function quotedPrintableBytes(value, underscoreAsSpace = false) {
  const text = String(value || '').replace(/=\r?\n/g, '');
  const bytes = [];
  for (let index = 0; index < text.length; index += 1) {
    if (underscoreAsSpace && text[index] === '_') {
      bytes.push(32);
      continue;
    }
    if (text[index] === '=' && /^[0-9A-Fa-f]{2}$/.test(text.slice(index + 1, index + 3))) {
      bytes.push(Number.parseInt(text.slice(index + 1, index + 3), 16));
      index += 2;
      continue;
    }
    bytes.push(text.charCodeAt(index) & 255);
  }
  return new Uint8Array(bytes);
}

function decodeMimeWords(value) {
  return String(value || '').replace(/\?=\s+=\?/g, '?==?').replace(/=\?([^?]+)\?([bqBQ])\?([^?]*)\?=/g, (_whole, charset, mode, data) => {
    const bytes = mode.toUpperCase() === 'B' ? base64Bytes(data) : quotedPrintableBytes(data, true);
    return decodeBytes(bytes, charset);
  }).trim();
}

function parseHeaders(value) {
  const headers = {};
  const unfolded = String(value || '').replace(/\r\n/g, '\n').replace(/\n[ \t]+/g, ' ');
  for (const line of unfolded.split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const item = line.slice(colon + 1).trim();
    headers[key] = headers[key] ? `${headers[key]}, ${item}` : item;
  }
  return headers;
}

function splitEntity(raw) {
  const value = String(raw || '').replace(/\r\n/g, '\n');
  const separator = value.indexOf('\n\n');
  if (separator < 0) return { headers: {}, body: value };
  return { headers: parseHeaders(value.slice(0, separator)), body: value.slice(separator + 2) };
}

function parameter(value, name) {
  const expression = new RegExp(`${name}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|([^;\\s]+))`, 'i');
  return (String(value || '').match(expression) || []).slice(1).find(Boolean) || '';
}

function decodeTransfer(body, encoding, charset) {
  const normalized = clean(encoding).toLowerCase();
  if (normalized === 'base64') return decodeBytes(base64Bytes(body), charset);
  if (normalized === 'quoted-printable') return decodeBytes(quotedPrintableBytes(body), charset);
  return String(body || '');
}

function parseMimeEntity(raw, depth = 0) {
  const { headers, body } = splitEntity(raw);
  const contentType = clean(headers['content-type'] || 'text/plain');
  const lowerType = contentType.toLowerCase();
  const disposition = clean(headers['content-disposition']).toLowerCase();
  if (disposition.includes('attachment')) return { plain: '', html: '' };

  const boundary = parameter(contentType, 'boundary');
  if (lowerType.startsWith('multipart/') && boundary && depth < 5) {
    const marker = `--${boundary}`;
    const parts = body.split(marker)
      .slice(1)
      .map((item) => item.replace(/^\n/, ''))
      .filter((item) => item && !item.startsWith('--'))
      .map((item) => parseMimeEntity(item, depth + 1));
    return {
      plain: parts.map((item) => item.plain).filter(Boolean).join('\n\n'),
      html: parts.map((item) => item.html).filter(Boolean).join('\n\n')
    };
  }

  const charset = parameter(contentType, 'charset') || 'utf-8';
  const decoded = decodeTransfer(body, headers['content-transfer-encoding'], charset);
  if (lowerType.includes('text/html')) return { plain: '', html: decoded };
  if (lowerType.includes('text/plain') || !headers['content-type']) return { plain: decoded, html: '' };
  return { plain: '', html: '' };
}

function trimQuotedHistory(value) {
  let body = String(value || '');
  const markers = [
    /\nOn .{0,220}wrote:\s*\n/i,
    /\nDana .{0,220}napisao je:\s*\n/i,
    /\n-{2,}\s*Original Message\s*-{2,}/i,
    /\nFrom:\s*[^\n]+\n(?:Sent|Date):/i
  ];
  for (const marker of markers) {
    const match = body.match(marker);
    if (match && match.index > 80) body = body.slice(0, match.index);
  }
  return clean(body).slice(0, 12_000);
}

function incomingBody(raw, subject) {
  const entity = parseMimeEntity(raw);
  const body = clean(entity.plain) || stripHtml(entity.html);
  return trimQuotedHistory(body || decodeMimeWords(subject));
}

async function readRaw(stream) {
  try {
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    while (total < MAX_RAW_BYTES) {
      const part = await reader.read();
      if (part.done) break;
      let chunk = part.value instanceof Uint8Array ? part.value : new Uint8Array(part.value || []);
      if (total + chunk.length > MAX_RAW_BYTES) chunk = chunk.slice(0, MAX_RAW_BYTES - total);
      chunks.push(chunk);
      total += chunk.length;
    }
    const all = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      all.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder().decode(all);
  } catch {
    return '';
  }
}

function splitMessage(message) {
  const raw = message?.raw;
  if (!raw || typeof raw.tee !== 'function') return { message, rawText: Promise.resolve('') };
  try {
    const [downstream, inspection] = raw.tee();
    const wrapped = new Proxy(message, {
      get(target, property) {
        if (property === 'raw') return downstream;
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
    return { message: wrapped, rawText: readRaw(inspection) };
  } catch {
    return { message, rawText: Promise.resolve('') };
  }
}

function isAutomaticReply(payload, message) {
  const originalSender = address(message?.from || messageHeader(message, 'from'));
  const originalRecipient = address(message?.to || messageHeader(message, 'to'));
  const recipients = addressList(payload?.to || payload?.recipient || payload?.recipients);
  const senders = addressList(payload?.from);
  const subject = decodeMimeWords(payload?.subject || '');
  const body = payloadText(payload);

  const explicitlyMarked = payloadHeader(payload, 'Auto-Submitted').toLowerCase() === 'auto-replied'
    || Boolean(payloadHeader(payload, 'X-GNK-ASG-Mail-Studio-Auto-Reply'))
    || Boolean(payloadHeader(payload, 'X-GNK-ASG-Media-Auto-Reply'));
  const repliesToOriginalSender = Boolean(originalSender && recipients.includes(originalSender));
  const trustedRoute = senders.some((item) => item.endsWith('@gnk-asg.hr')) || originalRecipient.endsWith('@gnk-asg.hr');
  const replyShape = /^(re|odg|aw|sv)\s*:/i.test(subject)
    || /GNK-INBOX-[A-Z0-9-]+/i.test(body)
    || /message has been received|poruka je zaprimljena|confirm[^\n]{0,80}received/i.test(body);

  return explicitlyMarked || (repliesToOriginalSender && trustedRoute && replyShape);
}

function displayName(fromValue) {
  const value = decodeMimeWords(clean(fromValue));
  const match = value.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);
  const name = clean(match?.[1]).replace(/^['"]|['"]$/g, '');
  return /^(b h|info|office|media|it|admin|support)$/i.test(name) ? '' : name;
}

function signatureName(body, fromValue) {
  const lines = String(body || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(-20);
  const skip = /(@|https?:|www\.|gnk\b|d\.o\.o|ltd\b|group\b|director|manager|office|support|assistant|cent(?:ar|er)|relations|accreditation|srdačan|srdacan|pozdrav|regards|poštovan|postovan|hvala|thank|email\b|telefon|phone|oib\b|mbs\b|subject\b|predmet\b)/i;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = lines[index].replace(/^[–—-]\s*/, '').replace(/[,.]$/, '').trim();
    if (candidate.length < 4 || candidate.length > 70 || skip.test(candidate)) continue;
    if (/^[\p{L}][\p{L}'’.-]*(?:\s+[\p{L}][\p{L}'’.-]*){1,3}$/u.test(candidate)) return candidate;
  }
  return displayName(fromValue);
}

function detectLanguage(value) {
  const text = ` ${String(value || '').toLowerCase()} `;
  if (/[čćžšđ]/.test(text) || /\b(poštovani|molim|možete|trebam|poruka|prijava|kartice|vidim|hrvatskom|predmet|pozdrav)\b/.test(text)) return 'hr';
  if (/[äöüß]/.test(text) || /\b(guten tag|bitte|können|nachricht|zugang|freundlichen)\b/.test(text)) return 'de';
  if (/\b(poštovani|molim|možete|poruka|prijava|pozdrav)\b/.test(text)) return 'sr';
  return 'en';
}

function unitName(message, payload) {
  const recipient = address(message?.to || messageHeader(message, 'to'));
  const units = {
    'media@gnk-asg.hr': 'Media Relations & Accreditation Center',
    'press@gnk-asg.hr': 'Press Office',
    'legal@gnk-asg.hr': 'Legal & Compliance',
    'it@gnk-asg.hr': 'IT & Digital Support',
    'office@gnk-asg.hr': 'Office',
    'assistant@gnk-asg.hr': 'Executive Assistant',
    'nermin.sefic@gnk-asg.hr': 'Managing Director',
    'sefic@gnk-asg.hr': 'Executive Office',
    'ubo@gnk-asg.hr': 'UBO Office'
  };
  return units[recipient] || clean(payload?.from?.name) || 'GNK ASG';
}

function exactReferences(payload) {
  return [...new Set((`${payload?.subject || ''}\n${payloadText(payload)}`.match(/GNK-[A-Z0-9-]{6,}/g) || []))];
}

function signatureParts(payload) {
  const text = payloadText(payload);
  const match = text.match(/(?:IT\s*[–-]\s*(?:Personal Digital Assistant|Osobni digitalni asistent)|GNK ASG d\.o\.o\.|GNK DINAMO Ltd\. Group)[\s\S]*$/i);
  const html = String(payload?.html || payload?.bodyHtml || '');
  const tables = [...html.matchAll(/<table\b[^>]*data-gnk-asg-(?:media-)?signature=["'][^"']*["'][^>]*>[\s\S]*?<\/table>/gi)];
  return { text: clean(match?.[0]), html: tables.length ? tables[tables.length - 1][0] : '' };
}

function parseModelOutput(value) {
  let text = clean(value).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) text = text.slice(first, last + 1);
  try {
    const parsed = JSON.parse(text);
    const body = clean(parsed.body).slice(0, 7_000);
    return body.length > 40 ? { language: clean(parsed.language), body } : null;
  } catch {
    return null;
  }
}

function deterministicReply({ subject, body, name, language, unit }) {
  const topic = `${subject}\n${body}`;
  const mailStudio = /media cent(?:ar|er)|mail studio|inbox|sent|dolazn|poslan|kartic/i.test(topic);
  const named = name ? ` ${name}` : '';

  if (language === 'hr' || language === 'sr') {
    return {
      language: 'hr',
      body: `Poštovani${named},\n\n${mailStudio
        ? 'Za pregled kartica Inbox i Sent potrebno je otvoriti zaštićeni GNK ASG Mail Studio i prijaviti se ovlaštenom operatorskom sesijom. Sam pristup Cloudflare računu ne omogućuje pregled sadržaja Gmail poruka. Ako kartice nakon prijave nisu vidljive, potrebno je provjeriti operatorsku ovlast i ponovno učitati Mail Studio.'
        : `Vaš je upit obrađen prema predmetu i sadržaju poruke te povezan s nadležnom jedinicom ${unit}. Ako je za precizan odgovor potreban dodatni podatak, zatražit ćemo samo taj podatak.`}\n\nSrdačan pozdrav`
    };
  }

  if (language === 'de') {
    return {
      language: 'de',
      body: `Guten Tag${named},\n\n${mailStudio
        ? 'Für die Ansichten Inbox und Sent muss das geschützte GNK ASG Mail Studio mit einer autorisierten Operator-Sitzung geöffnet werden. Eine Cloudflare-Mitgliedschaft allein gewährt keinen Zugriff auf Gmail-Nachrichteninhalte.'
        : `Ihre Anfrage wurde anhand von Betreff und Nachricht geprüft und der zuständigen Stelle ${unit} zugeordnet.`}\n\nMit freundlichen Grüßen`
    };
  }

  return {
    language: 'en',
    body: `Dear${named},\n\n${mailStudio
      ? 'To view Inbox and Sent, open the protected GNK ASG Mail Studio and sign in with an authorized operator session. Cloudflare account membership alone does not provide access to Gmail message bodies. If the cards remain unavailable after sign-in, the operator permission or session must be checked and Mail Studio reloaded.'
      : `Your inquiry was reviewed using its subject and message content and routed to ${unit}. We will ask only if an essential detail is missing.`}\n\nKind regards`
  };
}

function validPersonalizedReply(reply, language, name) {
  if (!reply?.body) return false;
  if (/Dear Sir or Madam/i.test(reply.body)) return false;
  if (name && !reply.body.includes(name)) return false;
  if ((language === 'hr' || language === 'sr') && !/\b(Poštovani|Poštovana|Pozdrav|Hvala|Vaš|Vaša|molimo|potrebno)\b/i.test(reply.body)) return false;
  if (language === 'de' && !/\b(Guten Tag|Sehr geehrt|Mit freundlichen Grüßen|Ihre)\b/i.test(reply.body)) return false;
  return true;
}

async function askModel(env, model, prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const result = await env.AI.run(model, {
      messages: [
        {
          role: 'system',
          content: 'Write a useful personalized preliminary email reply for GNK ASG. Use only the dominant language of the incoming message, or the explicitly requested reply language. Use the actual subject and body and answer the concrete question; never return only a generic receipt. If a reliable sender name is supplied, greet that person by the exact name and never use Dear Sir or Madam. Do not invent facts. Ask at most two precise questions only if essential information is missing. Preserve exact reference codes. Do not approve accreditation, accept an offer, create a contract, give legal advice, confirm payment, reveal confidential information, promise a deadline or make a final decision. Return JSON only with language and body. Include a greeting and courteous closing, but no institutional signature.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1_000,
      temperature: 0.15,
      top_p: 0.85,
      signal: controller.signal
    });
    return parseModelOutput(result?.response || result?.result?.response || result?.output_text || result?.text || '');
  } finally {
    clearTimeout(timer);
  }
}

async function publicKnowledge(env) {
  const parts = [
    'Official website: https://gnk-asg.hr',
    'Media contact: media@gnk-asg.hr',
    'Media application: https://gnk-asg.hr/media-application/?lang=en',
    'THE CODE: https://gnk-asg.hr/the-code/',
    'GNK ASG Mail Studio is a protected operator interface. Inbox and Sent require an authenticated operator session. Cloudflare account membership by itself does not provide access to Gmail message bodies.',
    'Automatic replies are preliminary and cannot approve accreditation, accept offers, create contracts, give legal advice, confirm payments, disclose confidential information, promise deadlines or make final decisions.'
  ];
  const configured = clean(env?.AI_AUTO_REPLY_KNOWLEDGE);
  if (configured) parts.push(configured);
  if (env?.ASSETS?.fetch) {
    for (const path of ['/contact/', '/media-application/?lang=en', '/the-code/']) {
      try {
        const response = await env.ASSETS.fetch(new Request(new URL(path, 'https://gnk-asg.internal')));
        if (response.ok) parts.push(`${path}\n${stripHtml(await response.text()).slice(0, 3_000)}`);
      } catch {}
    }
  }
  return parts.join('\n\n').slice(0, 14_000);
}

function buildPayload(payload, reply, subject, references, signature, model) {
  let body = clean(reply.body);
  const missingReferences = references.filter((reference) => !body.includes(reference));
  if (missingReferences.length) body += `\n\nReference: ${missingReferences.join(' / ')}`;
  const paragraphs = body.split(/\n{2,}/).filter(Boolean).map((item) => (
    `<p style="margin:0 0 14px;line-height:1.62">${escapeHtml(item).replace(/\n/g, '<br>')}</p>`
  )).join('');
  const bareHtml = `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px">${paragraphs}</div>`;
  const headers = payload?.headers instanceof Headers ? Object.fromEntries(payload.headers.entries()) : { ...(payload?.headers || {}) };
  headers['Auto-Submitted'] = 'auto-replied';
  headers['X-GNK-ASG-AI-Auto-Reply'] = VERSION;
  headers['X-GNK-ASG-AI-Model'] = model;
  headers['X-GNK-ASG-AI-Language'] = reply.language || 'detected';

  const signed = enforceRequiredSignature({
    ...payload,
    subject: `Re: ${subject || 'Your inquiry'}`.slice(0, 220),
    text: body,
    plainText: body,
    html: bareHtml,
    bodyHtml: bareHtml,
    headers
  });
  const wrappedHtml = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#111827"><div style="max-width:720px;margin:0 auto;padding:28px 18px">${signed.html}</div></body></html>`;
  return { ...signed, html: wrappedHtml, bodyHtml: wrappedHtml };
}

async function personalize(payload, message, rawTextPromise, env) {
  if (!isAutomaticReply(payload, message)) return payload;
  if (/^(1|true|yes|on)$/i.test(clean(env?.AI_AUTO_REPLY_DISABLED))) return payload;

  try {
    const subject = decodeMimeWords(messageHeader(message, 'subject') || payload?.subject || '').replace(/[\r\n]+/g, ' ').trim();
    const from = decodeMimeWords(clean(message?.from || messageHeader(message, 'from')));
    const raw = await rawTextPromise.catch(() => '');
    const body = incomingBody(raw, subject);
    const name = signatureName(body, from);
    const language = detectLanguage(`${subject}\n${body}`);
    const unit = unitName(message, payload);
    const references = exactReferences(payload);
    const signature = signatureParts(payload);
    const prompt = [
      `UNIT: ${unit}`,
      `SENDER: ${from || 'not provided'}`,
      name ? `RELIABLE SENDER NAME FROM SIGNATURE: ${name}` : '',
      `REQUIRED REPLY LANGUAGE: ${language}`,
      `SUBJECT: ${subject || '(no subject)'}`,
      `MESSAGE:\n${body || '(body unavailable)'}`,
      references.length ? `EXACT REFERENCES TO PRESERVE:\n${references.join('\n')}` : '',
      `PUBLIC AND OPERATIONAL INFORMATION:\n${await publicKnowledge(env)}`
    ].filter(Boolean).join('\n\n');

    if (env?.AI?.run) {
      const models = [...new Set([
        clean(env?.AI_AUTO_REPLY_MODEL || PRIMARY_MODEL),
        clean(env?.AI_AUTO_REPLY_FALLBACK_MODEL || FALLBACK_MODEL)
      ].filter(Boolean))];
      for (const model of models) {
        try {
          const reply = await askModel(env, model, prompt);
          if (validPersonalizedReply(reply, language, name)) {
            return buildPayload(payload, reply, subject, references, signature, model);
          }
        } catch (error) {
          console.error('ai-inbound-auto-reply-model', model, error);
        }
      }
    }

    const fallback = deterministicReply({ subject, body, name, language, unit });
    return buildPayload(payload, fallback, subject, references, signature, 'deterministic-fallback');
  } catch (error) {
    console.error('ai-inbound-auto-reply', error);
    return payload;
  }
}

export function prepareAiAutoReply(message, env) {
  const split = splitMessage(message);
  const binding = env?.EMAIL;
  if (!binding?.send) return { message: split.message, env };

  const wrapped = Object.create(env || null);
  Object.defineProperty(wrapped, 'EMAIL', {
    enumerable: true,
    configurable: true,
    value: {
      send: async (payload) => {
        let toSend = payload;
        try {
          const personalized = await personalize(payload, split.message, split.rawText, wrapped);
          if (personalized && personalized.to && personalized.from) toSend = personalized;
        } catch (error) {
          console.error('personalize-call-failed', error);
        }
        return binding.send.call(binding, toSend);
      }
    }
  });
  return { message: split.message, env: wrapped };
}

export const __test = {
  decodeMimeWords,
  incomingBody,
  signatureName,
  detectLanguage,
  isAutomaticReply
};
