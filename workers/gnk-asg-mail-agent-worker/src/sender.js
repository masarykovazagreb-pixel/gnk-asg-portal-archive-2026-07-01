import { EmailMessage } from 'cloudflare:email';
import { signatureFor, signatureDataFor } from './signature.js';

const LOGO_URL = 'https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png';
const MAX_TOTAL_ATTACHMENT_BYTES = 8_000_000;

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
    throw new Error('EMAIL binding nije konfiguriran.');
  }

  const from = validSender(input.from);
  const to = parseRecipients(input.to);
  const cc = parseRecipients(input.cc);
  const bcc = parseRecipients(input.bcc);
  const envelopeRecipients = [...new Set([...to, ...cc, ...bcc])];
  const subject = cleanHeader(input.subject || 'GNK ASG poruka');
  const body = String(input.body || '').trim();

  if (!to.length) throw new Error('Nedostaje valjani To primatelj.');
  if (!subject) throw new Error('Nedostaje predmet poruke.');
  if (!body) throw new Error('Nedostaje tekst poruke.');

  const attachments = normalizeAttachments(input.attachments);
  const signatureOptions = {
    automated: input.autoReply === true,
    from
  };
  const signatureText = signatureFor(input.profile, input.language, input.caseId, signatureOptions);
  const signatureData = signatureDataFor(input.profile, input.language, input.caseId, signatureOptions);
  const textBody = `${body}\r\n\r\n${signatureText}`;
  const htmlBody = buildHtmlBody(body, signatureData);
  const raw = buildMimeMessage({
    from,
    fromName: input.fromName || 'GNK ASG',
    to,
    cc,
    subject,
    textBody,
    htmlBody,
    attachments,
    autoReply: input.autoReply === true
  });

  const deliveries = [];
  for (const recipient of envelopeRecipients) {
    try {
      const response = await env.EMAIL.send(new EmailMessage(from, recipient, raw));
      deliveries.push({ recipient, sent: true, messageId: response?.messageId || null });
    } catch (error) {
      deliveries.push({ recipient, sent: false, error: String(error?.message || error) });
    }
  }

  const failed = deliveries.filter(item => !item.sent);
  return {
    ok: failed.length === 0,
    from,
    to,
    cc,
    bccCount: bcc.length,
    subject,
    attachmentCount: attachments.length,
    recipientCount: envelopeRecipients.length,
    deliveries,
    failedCount: failed.length
  };
}

function buildMimeMessage({ from, fromName, to, cc, subject, textBody, htmlBody, attachments, autoReply }) {
  const mixedBoundary = `gnk_mixed_${crypto.randomUUID().replace(/-/g, '')}`;
  const altBoundary = `gnk_alt_${crypto.randomUUID().replace(/-/g, '')}`;
  const lines = [
    `From: ${encodeHeader(fromName)} <${from}>`,
    `To: ${to.join(', ')}`
  ];

  if (cc.length) lines.push(`Cc: ${cc.join(', ')}`);
  lines.push(
    `Reply-To: ${from}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0'
  );
  if (autoReply) {
    lines.push('Auto-Submitted: auto-replied', 'X-Auto-Response-Suppress: All');
  }
  lines.push(
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    '',
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    textBody,
    '',
    `--${altBoundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    htmlBody,
    '',
    `--${altBoundary}--`
  );

  for (const attachment of attachments) {
    lines.push(
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      foldBase64(attachment.base64),
      ''
    );
  }

  lines.push(`--${mixedBoundary}--`, '');
  return lines.join('\r\n');
}

function buildHtmlBody(body, signature) {
  const bodyHtml = escapeHtml(body).replace(/\r?\n/g, '<br>');
  const caseHtml = signature.caseId
    ? `<tr><td style="padding:8px 0 0;color:#6b7280;font-size:12px"><strong>Evidencijski broj:</strong> ${escapeHtml(signature.caseId)}</td></tr>`
    : '';
  const disclosureHtml = signature.disclosure
    ? `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:11px;line-height:1.45">${escapeHtml(signature.disclosure)}</div>`
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f7fb;color:#111827;font-family:Arial,Helvetica,sans-serif;line-height:1.55">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f7fb">
<tr>
<td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:720px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px">
<tr>
<td style="padding:30px 30px 18px;font-size:15px;color:#111827">${bodyHtml}</td>
</tr>
<tr>
<td style="padding:0 30px 30px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:2px solid #d4af37;padding-top:18px">
<tr>
<td width="175" valign="top" style="width:175px;padding:18px 22px 0 0">
<img src="${LOGO_URL}" alt="GNK ASG" width="155" style="display:block;width:155px;max-width:155px;height:auto;border:0;outline:none;text-decoration:none">
</td>
<td valign="top" style="padding:18px 0 0">
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="color:#6b7280;font-size:13px;padding-bottom:8px">${escapeHtml(signature.closing)}</td></tr>
<tr><td style="color:#111827;font-size:16px;font-weight:700">${escapeHtml(signature.profile.name)}</td></tr>
<tr><td style="color:#9a7418;font-size:13px;font-weight:700;padding-bottom:10px">${escapeHtml(signature.profile.title)}</td></tr>
<tr><td style="color:#111827;font-size:13px;font-weight:700">${escapeHtml(signature.company.name)}</td></tr>
<tr><td style="color:#4b5563;font-size:12px">${escapeHtml(signature.company.address)}</td></tr>
<tr><td style="color:#4b5563;font-size:12px">OIB: ${escapeHtml(signature.company.oib)} · MBS: ${escapeHtml(signature.company.mbs)}</td></tr>
<tr><td style="padding-top:6px;font-size:12px"><a href="mailto:${escapeHtml(signature.senderEmail)}" style="color:#9a7418;text-decoration:none">${escapeHtml(signature.senderEmail)}</a></td></tr>
<tr><td style="font-size:12px"><a href="${escapeHtml(signature.company.web)}" style="color:#9a7418;text-decoration:none">${escapeHtml(signature.company.web)}</a> · <a href="tel:+385915358365" style="color:#9a7418;text-decoration:none">${escapeHtml(signature.company.phone)}</a></td></tr>
${caseHtml}
</table>
</td>
</tr>
</table>
${disclosureHtml}
<div style="margin-top:8px;color:#6b7280;font-size:11px;line-height:1.45">${escapeHtml(signature.disclaimer)}</div>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
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
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) throw new Error('Ukupna veličina PDF privitaka prelazi 8 MB.');
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

function encodeHeader(value) {
  const bytes = new TextEncoder().encode(cleanHeader(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function foldBase64(value) {
  return String(value || '').replace(/(.{76})/g, '$1\r\n');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);
}
