import { classifyRisk, MAIL_AUTOMATION_POLICY } from './policy.js';
import { buildMailPrompt, MAIL_SYSTEM_PROMPT } from './prompts.js';
import { mustHoldForApproval } from './thread-safety.js';
import { buildThreadContext } from './thread-context.js';

export async function analyseMail(env, mail) {
  const enrichedMail = mail.threadContext
    ? mail
    : { ...mail, threadContext: await buildThreadContext(env, mail) };
  const threadText = threadRiskText(enrichedMail);
  const baseline = classifyRisk(enrichedMail.subject, threadText);

  if (!env.AI || typeof env.AI.run !== 'function') {
    return heldFallback(baseline, 'AI nije dostupan.', enrichedMail);
  }

  try {
    const result = await env.AI.run(env.MAIL_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: MAIL_SYSTEM_PROMPT },
        { role: 'user', content: buildMailPrompt(enrichedMail, baseline) }
      ],
      temperature: 0.2,
      max_tokens: 1800
    });

    const parsed = parseObject(result?.response || result?.result || '');
    if (!parsed || typeof parsed.reply !== 'string') {
      return heldFallback(baseline, 'AI odgovor nije valjan.', enrichedMail);
    }

    const highRisk = baseline.risk === 'high' || String(parsed.risk || '').toLowerCase() === 'high';
    const provisional = {
      category: highRisk ? baseline.category : clean(parsed.category || baseline.category),
      risk: highRisk ? 'high' : 'low',
      autoSend: false,
      summary: clean(parsed.summary),
      reply: clean(parsed.reply),
      person: clean(parsed.person || enrichedMail.senderName),
      organization: clean(parsed.organization),
      topic: clean(parsed.topic || enrichedMail.subject),
      tone: clean(parsed.tone || 'neutral'),
      language: normaliseLanguage(parsed.language || enrichedMail.language),
      questions: normaliseQuestions(parsed.questions),
      mailbox: normaliseMailbox(parsed.mailbox, enrichedMail.to),
      approvalReason: clean(parsed.approvalReason),
      threadId: clean(enrichedMail.threadContext?.threadId),
      threadMessageCount: Number(enrichedMail.threadContext?.messageCount || 1)
    };

    const approvalRequired = highRisk || mustHoldForApproval(provisional);
    const policyAllowsAutoSend = MAIL_AUTOMATION_POLICY.autoSendLowRiskGeneralReplies === true;
    const requestedAutoSend = parsed.autoSend === true;

    return {
      ...provisional,
      autoSend: requestedAutoSend && policyAllowsAutoSend && !approvalRequired,
      approvalRequired,
      approvalReason: approvalRequired
        ? provisional.approvalReason || `Kategorija ${provisional.category} zahtijeva odobrenje.`
        : '',
      status: approvalRequired ? 'draft_pending_approval' : 'draft_ready'
    };
  } catch {
    return heldFallback(baseline, 'AI analiza nije uspjela.', enrichedMail);
  }
}

function heldFallback(baseline, reason, mail = {}) {
  return {
    ...baseline,
    autoSend: false,
    approvalRequired: true,
    approvalReason: reason,
    status: 'draft_pending_approval',
    summary: `${reason} Poruka je zadržana bez automatskog slanja.`,
    reply: '',
    person: clean(mail.senderName),
    organization: '',
    topic: clean(mail.subject),
    tone: 'unknown',
    language: normaliseLanguage(mail.language),
    questions: [],
    mailbox: normaliseMailbox('', mail.to),
    threadId: clean(mail.threadContext?.threadId),
    threadMessageCount: Number(mail.threadContext?.messageCount || 1)
  };
}

function threadRiskText(mail) {
  const messages = Array.isArray(mail.threadContext?.messages) ? mail.threadContext.messages : [];
  const bodies = messages.map(item => `${item.subject || ''} ${item.body || ''}`);
  bodies.push(mail.body || '');
  return bodies.join('\n').slice(0, 100000);
}

function normaliseQuestions(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0, 20);
  const text = clean(value);
  if (!text) return [];
  return text.split(/\n+|(?<=\?)\s+/).map(clean).filter(Boolean).slice(0, 20);
}

function normaliseMailbox(value, recipient) {
  const allowed = new Set(['info', 'contact', 'media', 'assistant', 'it', 'legal', 'finance', 'office']);
  const requested = clean(value).toLowerCase();
  if (allowed.has(requested)) return requested;
  const local = String(recipient || '').split('@')[0].toLowerCase();
  return allowed.has(local) ? local : 'it';
}

function normaliseLanguage(value) {
  const language = clean(value).toLowerCase();
  if (language.startsWith('en')) return 'en';
  return 'hr';
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseObject(value) {
  const text = String(value || '').trim();
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}
