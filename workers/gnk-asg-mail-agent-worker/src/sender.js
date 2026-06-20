import { EmailMessage } from 'cloudflare:email';
import { signatureFor } from './signature.js';

export async function sendContextualReply(env, outgoing) {
  if (!env.EMAIL || typeof env.EMAIL.send !== 'function') {
    throw new Error('EMAIL binding nije konfiguriran.');
  }

  const from = outgoing.from || env.MAIL_FROM || 'it@gnk-asg.hr';
  const to = outgoing.to;
  const subject = outgoing.subject || 'GNK ASG odgovor';
  const language = outgoing.language || 'hr';
  const profile = outgoing.profile || 'it';
  const signature = signatureFor(profile, language, outgoing.caseId || '');
  const body = `${outgoing.body || ''}\r\n\r\n${signature}`;

  const raw = [
    `From: GNK ASG <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Auto-Submitted: auto-replied',
    'X-Auto-Response-Suppress: All',
    '',
    body
  ].join('\r\n');

  await env.EMAIL.send(new EmailMessage(from, to, new Response(raw).body));
  return { ok:true, from, to, subject };
}
