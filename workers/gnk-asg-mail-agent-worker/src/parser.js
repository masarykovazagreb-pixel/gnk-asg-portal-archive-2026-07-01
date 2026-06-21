import { extractReadableMailText } from './mime-text.js';

export function parseIncoming(message, raw) {
  const from = String(message.from || readHeader(raw, 'from') || '');
  const sender = parseAddress(from);
  return {
    id: crypto.randomUUID(),
    caseId: `GNK-MAIL-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}`,
    from,
    senderName: sender.name,
    senderEmail: sender.email,
    to: String(message.to || readHeader(raw, 'to') || ''),
    replyTo: readHeader(raw, 'reply-to') || sender.email,
    subject: decodeHeader(readHeader(raw, 'subject')) || '(bez predmeta)',
    messageId: readHeader(raw, 'message-id'),
    inReplyTo: readHeader(raw, 'in-reply-to'),
    references: readHeader(raw, 'references'),
    receivedAt: new Date().toISOString(),
    body: extractReadableMailText(raw, 30000),
    status: 'received'
  };
}

export function isAutomatedLoop(mail, raw) {
  return /no-?reply|mailer-daemon|postmaster/i.test(mail.from || '') ||
    /auto-submitted:\s*(?!no)/i.test(raw) ||
    /x-auto-response-suppress:/i.test(raw);
}

export function detectLanguage(mail) {
  const text = `${mail.subject} ${mail.body}`.toLowerCase();
  const hits = (text.match(/\b(the|and|please|hello|regarding|thank|request|information)\b/g) || []).length;
  return hits >= 3 ? 'en' : 'hr';
}

function parseAddress(value) {
  const text = String(value || '').trim();
  const angle = text.match(/^\s*([^<]*)\s*<([^>]+)>\s*$/);
  if (angle) return { name: decodeHeader(angle[1].replace(/["']/g, '').trim()), email: angle[2].trim().toLowerCase() };
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  return { name: email ? decodeHeader(text.replace(email, '').replace(/[<>"']/g, '').trim()) : '', email: email.toLowerCase() };
}

function readHeader(raw, name) {
  const unfolded = String(raw || '').replace(/\r?\n[\t ]+/g, ' ');
  const match = unfolded.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
  return match ? match[1].trim() : '';
}

function decodeHeader(value) {
  return String(value || '').replace(/=\?UTF-8\?([BQ])\?([^?]+)\?=/gi, (_, mode, encoded) => {
    try {
      if (mode.toUpperCase() === 'B') {
        const binary = atob(encoded);
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      }
      const source = encoded.replace(/_/g, ' ');
      const bytes = [];
      for (let index = 0; index < source.length; index += 1) {
        const hex = source.slice(index + 1, index + 3);
        if (source[index] === '=' && /^[0-9A-F]{2}$/i.test(hex)) {
          bytes.push(parseInt(hex, 16));
          index += 2;
        } else {
          bytes.push(source.charCodeAt(index));
        }
      }
      return new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(bytes));
    } catch {
      return encoded;
    }
  }).trim();
}
