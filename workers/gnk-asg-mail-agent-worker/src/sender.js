import { signatureFor } from './signature.js';

const LOGO_URL = 'https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png';
const MAX_TOTAL_ATTACHMENT_BYTES = 4_500_000;

export async function sendContextualReply(env, outgoing) {
  return sendMessage(env, {
    from: outgoing.from || env.MAIL_FROM || 'it@gnk-asg.hr',
    fromName: 'GNK ASG',
    to: outgoing.to,
    subject: outgoing.subject || 'GNK ASG odgovor',
    body: outgoing.body || '',
    language: outgoing.language || 'hr',
    profile: outgoing.profile || 'it',
    caseId: outgoing.caseId || '',
    autoReply: true,
    attachments: []
  });
}

export async function sendManualMail(env, input) {
  return sendMessage(env, {
    from: input.from || env.MAIL_FROM || 'it@gnk-asg.hr',
    fromName: input.fromName || 'GNK ASG',
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: input.subject,
    body: input.body,
    language: input.language || 'hr',
    profile: input.signatureProfile || input.profile || 'office',
    caseId: input.caseId || '',
    autoReply: false,
    attachments: Array.isArray(input.attachments) ? input.attachments : []
  });
}

async function sendMessage(env, input) {
  if (!env.EMAIL || typeof env.EMAIL.send !== 'function') {
    throw new Error('Cloudflare EMAIL binding nije konfiguriran.');
  }

  const from = validSender(input.from);
  const to = parseRecipients(input.to);
  const cc = parseRecipients(input.cc);
  const bcc = parseRecipients(input.bcc);
  const subject = cleanHeader(input.subject || 'GNK ASG poruka');
  const body = String(input.body || '').trim();

  if (!to.length) throw new Error('Nedostaje valjani To primatelj.');
  if (!subject) throw new Error('Nedostaje predmet poruke.');
  if (!body) throw new Error('Nedostaje tekst poruke.');

  const attachments = normalizeAttachments(input.attachments);
  const signatureText = signatureFor(input.profile, input.language, input.caseId, {
    automated: input.autoReply === true
  });
  const textBody = `${body}\r\n\r\n${signatureText}`;
  const htmlBody = buildHtmlBody(body, signatureText, input.fromName || 'GNK ASG');

  const result = await env.EMAIL.send({
    from: { email: from, name: input.fromName || 'GNK ASG' },
    to,
    cc: cc.length ? cc : undefined,
    bcc: bcc.length ? bcc : undefined,
    replyTo: from,
    subject,
    text: textBody,
    html: htmlBody,
    attachments: attachments.length ? attachments.map(item => ({
      content: item.base64,
      filename: item.filename,
      type: item.mimeType,
      disposition: 'attachment'
    })) : undefined,
    headers: input.caseId ? { 'X-GNK-ASG-Case': cleanHeader(input.caseId) } : undefined
  });

  return {
    ok: true,
    provider: 'cloudflare-email-service',
    from,
    to,
    cc,
    bccCount: bcc.length,
    subject,
    attachmentCount: attachments.length,
    recipientCount: [...new Set([...to, ...cc, ...bcc])].length,
    messageId: result?.messageId || null,
    deliveries: [...new Set([...to, ...cc, ...bcc])].map(recipient => ({
      recipient,
      sent: true,
      messageId: result?.messageId || null,
      provider: 'cloudflare-email-service'
    })),
    failedCount: 0
  };
}

function buildHtmlBody(body, signatureText, fromName) {
  const bodyHtml = escapeHtml(body).replace(/\r?\n/g, '<br>');
  const signatureHtml = escapeHtml(signatureText).replace(/\r?\n/g, '<br>');
  return `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;color:#111827;font-family:Arial,Helvetica,sans-serif;line-height:1.55"><div style="max-width:720px;padding:24px"><div style="font-size:15px">${bodyHtml}</div><div style="margin-top:28px;padding-top:18px;border-top:1px solid #d4af37"><img src="${LOGO_URL}" alt="GNK ASG" width="145" style="display:block;width:145px;height:auto;margin-bottom:12px"><div style="font-size:13px;color:#374151">${signatureHtml}</div><div style="margin-top:8px;font-size:11px;color:#6b7280">${escapeHtml(fromName)} · GNK ASG</div></div></div></body></html>`;
}

function normalizeAttachments(items) {
  let total = 0;
  const result = [];
  for (const item of Array.isArray(items) ? items : []) {
    const filename = cleanFilename(item?.filename || item?.name || 'attachment.pdf');
    const mimeType = String(item?.mimeType || item?.contentType || 'application/pdf').toLowerCase();
    const base64 = String(item?.base64 || '').replace(/\s+/g, '');
    const size = Number(item?.size || Math.floor(base64.length * 0.75));
    if (!base64) continue;
    if (mimeType !== 'application/pdf' && !filename.toLowerCase().endsWith('.pdf')) continue;
    total += size;
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) throw new Error('Ukupna veličina PDF privitaka prelazi dopušteni Cloudflare limit.');
    result.push({ filename, mimeType: 'application/pdf', base64, size });
  }
  return result;
}

function parseRecipients(value) {
  const source = Array.isArray(value) ? value.join(',') : String(value || '');
  return [...new Set(source.split(/[;,\s]+/).map(item => item.trim().toLowerCase()).filter(validEmail))];
}

function validEmail(value) {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);
}

function validSender(value) {
  const sender = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@gnk-asg\.hr$/i.test(sender)) throw new Error('Neispravna GNK ASG adresa pošiljatelja.');
  return sender;
}

function cleanHeader(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 300);
}

function cleanFilename(value) {
  return String(value || 'attachment.pdf').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 140);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);
}
