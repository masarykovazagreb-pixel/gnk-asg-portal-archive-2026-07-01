import { readMailbox } from './storage.js';

const BOXES = ['inbox', 'outbox', 'sent', 'held'];
const MAX_THREAD_MESSAGES = 20;
const MAX_REVIEW_MESSAGES = 8;
const MAX_REVIEW_BODY = 1500;

export async function buildThreadContext(env, currentMail, maximum = MAX_THREAD_MESSAGES) {
  const all = (await Promise.all(BOXES.map(box => readMailbox(env, box))))
    .flat()
    .filter(Boolean);

  const related = all.filter(item => isRelatedMessage(currentMail, item));
  const ordered = deduplicate([...related, currentMail])
    .sort((left, right) => timestamp(left) - timestamp(right))
    .slice(-Math.max(1, maximum));

  return {
    threadId: deriveThreadId(currentMail, ordered),
    subject: normaliseSubject(currentMail?.subject),
    participants: unique(ordered.flatMap(messageParticipants)),
    messageCount: ordered.length,
    messages: ordered.map(toThreadMessage)
  };
}

export function compactThreadContext(
  context,
  maximum = MAX_REVIEW_MESSAGES,
  bodyLimit = MAX_REVIEW_BODY
) {
  const source = Array.isArray(context?.messages) ? context.messages : [];
  const messages = source.slice(-Math.max(1, maximum)).map(message => ({
    id: message?.id || '',
    messageId: message?.messageId || '',
    caseId: message?.caseId || '',
    from: message?.from || '',
    senderEmail: message?.senderEmail || '',
    to: message?.to || '',
    subject: message?.subject || '',
    body: String(message?.body || '').slice(0, Math.max(200, bodyLimit)),
    status: message?.status || '',
    timestamp: message?.timestamp || ''
  }));

  return {
    threadId: context?.threadId || '',
    subject: context?.subject || '',
    participants: unique(Array.isArray(context?.participants) ? context.participants : []),
    messageCount: Number(context?.messageCount || source.length || messages.length),
    retainedMessageCount: messages.length,
    truncated: source.length > messages.length,
    messages
  };
}

export function isRelatedMessage(current, candidate) {
  if (!current || !candidate) return false;
  if (current.id && candidate.id === current.id) return true;
  if (current.caseId && candidate.caseId && current.caseId === candidate.caseId) return true;

  const currentIds = referenceIds(current);
  const candidateIds = referenceIds(candidate);
  if ([...currentIds].some(id => candidateIds.has(id))) return true;

  const currentSubject = normaliseSubject(current.subject);
  const candidateSubject = normaliseSubject(candidate.subject);
  if (!currentSubject || currentSubject !== candidateSubject) return false;

  const currentParticipants = new Set(messageParticipants(current));
  return messageParticipants(candidate).some(value => currentParticipants.has(value));
}

export function normaliseSubject(value) {
  return String(value || '')
    .replace(/^\s*((re|fw|fwd|odg|prosl)\s*:\s*)+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function deriveThreadId(current, messages) {
  const firstReference = [...referenceIds(current)][0];
  if (firstReference) return `message:${firstReference}`;
  const firstMessageId = messages.map(item => cleanId(item.messageId)).find(Boolean);
  if (firstMessageId) return `message:${firstMessageId}`;
  const subject = normaliseSubject(current?.subject) || 'bez-predmeta';
  const participant = messageParticipants(current)[0] || 'unknown';
  return `subject:${simpleHash(`${subject}|${participant}`)}`;
}

function referenceIds(message) {
  const values = [message?.messageId, message?.inReplyTo, message?.references]
    .filter(Boolean)
    .join(' ')
    .match(/<[^>]+>|[^\s,]+/g) || [];
  return new Set(values.map(cleanId).filter(Boolean));
}

function cleanId(value) {
  return String(value || '').trim().replace(/^<|>$/g, '').toLowerCase();
}

function messageParticipants(message) {
  return unique([
    message?.senderEmail,
    extractEmail(message?.from),
    extractEmail(message?.to),
    extractEmail(message?.replyTo)
  ].filter(Boolean).map(value => value.toLowerCase()));
}

function extractEmail(value) {
  return String(value || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

function toThreadMessage(message) {
  return {
    id: message.id || '',
    messageId: message.messageId || '',
    caseId: message.caseId || '',
    from: message.senderName || message.from || '',
    senderEmail: message.senderEmail || extractEmail(message.from),
    to: message.to || '',
    subject: message.subject || '',
    body: String(message.body || message.bodyPreview || message.snippet || '').slice(0, 12000),
    status: message.status || '',
    timestamp: new Date(timestamp(message)).toISOString()
  };
}

function timestamp(message) {
  const value = message?.receivedAt || message?.sentAt || message?.createdAt || message?.updatedAt;
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function deduplicate(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item?.id
      || item?.messageId
      || `${item?.subject}|${item?.receivedAt || item?.createdAt || ''}|${item?.from || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function simpleHash(value) {
  let hash = 2166136261;
  for (const character of String(value || '')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
