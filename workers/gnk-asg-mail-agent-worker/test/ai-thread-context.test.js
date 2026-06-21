import { analyseMail } from '../src/ai.js';
import { MAIL_KEYS } from '../src/storage.js';

class MemoryKv {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
  }

  async get(key) {
    return this.values.get(key) || null;
  }
}

const first = {
  id: 'thread-first',
  messageId: '<thread-first@example.com>',
  senderName: 'Ana Primjer',
  senderEmail: 'ana@example.com',
  from: 'Ana Primjer <ana@example.com>',
  to: 'info@gnk-asg.hr',
  subject: 'Informacije o platformi',
  body: 'Prvo pitanje odnosi se na dostupnost javne dokumentacije.',
  receivedAt: '2026-06-20T08:00:00.000Z',
  status: 'received'
};

const second = {
  id: 'thread-second',
  messageId: '<thread-second@gnk-asg.hr>',
  inReplyTo: '<thread-first@example.com>',
  references: '<thread-first@example.com>',
  senderEmail: 'info@gnk-asg.hr',
  from: 'GNK ASG Info <info@gnk-asg.hr>',
  to: 'ana@example.com',
  subject: 'Re: Informacije o platformi',
  body: 'Dokumentacija je javno dostupna, a poveznica je već dostavljena.',
  sentAt: '2026-06-20T08:10:00.000Z',
  status: 'sent'
};

const current = {
  id: 'thread-current',
  messageId: '<thread-current@example.com>',
  inReplyTo: '<thread-second@gnk-asg.hr>',
  references: '<thread-first@example.com> <thread-second@gnk-asg.hr>',
  senderName: 'Ana Primjer',
  senderEmail: 'ana@example.com',
  from: 'Ana Primjer <ana@example.com>',
  to: 'info@gnk-asg.hr',
  replyTo: 'ana@example.com',
  subject: 'Re: Informacije o platformi',
  body: 'Hvala. Novo pitanje je postoji li engleska verzija dokumentacije?',
  receivedAt: '2026-06-20T08:20:00.000Z',
  language: 'hr'
};

let capturedPrompt = '';
const env = {
  GNK_ASG_KV: new MemoryKv({
    [MAIL_KEYS.inbox]: JSON.stringify([first]),
    [MAIL_KEYS.sent]: JSON.stringify([second]),
    [MAIL_KEYS.outbox]: '[]',
    [MAIL_KEYS.held]: '[]'
  }),
  AI: {
    async run(_model, payload) {
      capturedPrompt = payload.messages?.find(item => item.role === 'user')?.content || '';
      return {
        response: JSON.stringify({
          category: 'general',
          risk: 'low',
          autoSend: false,
          summary: 'Ana pita postoji li engleska verzija dokumentacije.',
          reply: 'Poštovana Ana, hvala na poruci. Provjerit ćemo dostupnost engleske verzije dokumentacije.',
          person: 'Ana Primjer',
          organization: '',
          topic: 'Engleska verzija dokumentacije',
          tone: 'neutral',
          language: 'hr',
          questions: ['Postoji li engleska verzija dokumentacije?'],
          mailbox: 'info',
          approvalReason: ''
        })
      };
    }
  }
};

const decision = await analyseMail(env, current);

const requiredFragments = [
  first.body,
  second.body,
  current.body,
  'Broj dostupnih poruka: 3',
  'Kronološki thread:'
];

for (const fragment of requiredFragments) {
  if (!capturedPrompt.includes(fragment)) {
    throw new Error(`AI prompt is missing full-thread fragment: ${fragment}`);
  }
}

const firstPosition = capturedPrompt.indexOf(first.body);
const secondPosition = capturedPrompt.indexOf(second.body);
const currentPosition = capturedPrompt.indexOf(current.body);
if (!(firstPosition < secondPosition && secondPosition < currentPosition)) {
  throw new Error('AI prompt thread is not chronological.');
}

if (decision.threadMessageCount !== 3) {
  throw new Error(`Expected three thread messages, got ${decision.threadMessageCount}.`);
}
if (!String(decision.threadId || '').startsWith('message:')) {
  throw new Error('Stable thread ID was not returned with the AI decision.');
}
if (decision.mailbox !== 'info') {
  throw new Error(`Expected info mailbox, got ${decision.mailbox}.`);
}
if (!decision.reply.includes('Poštovana Ana')) {
  throw new Error('Personalized AI reply was not preserved.');
}

console.log('AI thread context test passed: full chronology, prior answers, newest question and personalized reply.');
