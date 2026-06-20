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
    subject: readHeader(raw, 'subject') || '(bez predmeta)',
    messageId: readHeader(raw, 'message-id'),
    inReplyTo: readHeader(raw, 'in-reply-to'),
    references: readHeader(raw, 'references'),
    receivedAt: new Date().toISOString(),
    body: extractBody(raw).slice(0, 30000),
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
  if (angle) return { name: angle[1].replace(/["']/g, '').trim(), email: angle[2].trim().toLowerCase() };
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  return { name: email ? text.replace(email, '').replace(/[<>"']/g, '').trim() : '', email: email.toLowerCase() };
}

function readHeader(raw, name) {
  const match = raw.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
  return match ? match[1].trim() : '';
}

function extractBody(raw) {
  const parts = raw.split(/\r?\n\r?\n/);
  return parts.slice(1).join('\n\n').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
