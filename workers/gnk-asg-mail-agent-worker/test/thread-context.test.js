import {
  buildThreadContext,
  compactThreadContext,
  isRelatedMessage,
  normaliseSubject
} from '../src/thread-context.js';
import { MAIL_KEYS } from '../src/storage.js';

class MemoryKv {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
  }
  async get(key) {
    return this.values.get(key) || null;
  }
}

const messages = Array.from({ length: 24 }, (_, index) => ({
  id: `mail-${index + 1}`,
  messageId: `<mail-${index + 1}@example.com>`,
  inReplyTo: index ? `<mail-${index}@example.com>` : '',
  references: index ? `<mail-1@example.com> <mail-${index}@example.com>` : '',
  senderEmail: index % 2 ? 'media@example.com' : 'it@gnk-asg.hr',
  from: index % 2 ? 'Media Example <media@example.com>' : 'GNK ASG IT <it@gnk-asg.hr>',
  to: index % 2 ? 'it@gnk-asg.hr' : 'media@example.com',
  subject: index ? 'Re: Projekt GNK ASG' : 'Projekt GNK ASG',
  body: `Poruka broj ${index + 1} ${'x'.repeat(1800)}`,
  receivedAt: new Date(Date.parse('2026-06-20T08:00:00.000Z') + index * 60000).toISOString(),
  status: 'received'
}));

const env = {
  GNK_ASG_KV: new MemoryKv({
    [MAIL_KEYS.inbox]: JSON.stringify(messages.slice(0, 12)),
    [MAIL_KEYS.sent]: JSON.stringify(messages.slice(12)),
    [MAIL_KEYS.outbox]: '[]',
    [MAIL_KEYS.held]: '[]'
  })
};

const current = {
  id: 'current',
  messageId: '<current@example.com>',
  inReplyTo: '<mail-24@example.com>',
  references: '<mail-1@example.com> <mail-24@example.com>',
  senderEmail: 'media@example.com',
  from: 'Media Example <media@example.com>',
  to: 'it@gnk-asg.hr',
  subject: 'RE: Projekt GNK ASG',
  body: `Najnovija poruka ${'y'.repeat(1800)}`,
  receivedAt: '2026-06-20T09:00:00.000Z'
};

if (normaliseSubject('Re: Fwd: Projekt GNK ASG') !== 'projekt gnk asg') {
  throw new Error('Subject normalisation failed.');
}
if (!isRelatedMessage(current, messages[23])) {
  throw new Error('Reference-based thread matching failed.');
}

const thread = await buildThreadContext(env, current);
if (!thread.threadId.startsWith('message:')) throw new Error('Stable thread ID missing.');
if (thread.messageCount !== 20) throw new Error(`Expected 20 retained messages, got ${thread.messageCount}.`);
if (!thread.participants.includes('media@example.com')) throw new Error('External participant missing.');
if (!thread.participants.includes('it@gnk-asg.hr')) throw new Error('GNK ASG participant missing.');
if (thread.messages.at(-1)?.id !== 'current') throw new Error('Newest message must be last.');
if (thread.messages.some((item, index, array) => index && Date.parse(item.timestamp) < Date.parse(array[index - 1].timestamp))) {
  throw new Error('Thread messages are not chronological.');
}

const review = compactThreadContext(thread);
if (review.messageCount !== 20) throw new Error('Original full thread count was not preserved.');
if (review.retainedMessageCount !== 8) throw new Error(`Expected 8 review messages, got ${review.retainedMessageCount}.`);
if (!review.truncated) throw new Error('Review snapshot must disclose truncation.');
if (review.messages.at(-1)?.id !== 'current') throw new Error('Review snapshot must retain the newest message.');
if (review.messages.some(item => item.body.length > 1500)) throw new Error('Review message body limit was not enforced.');

console.log('Thread context test passed: references, participants, chronology, 20-message AI limit and compact 8-message review snapshot.');
