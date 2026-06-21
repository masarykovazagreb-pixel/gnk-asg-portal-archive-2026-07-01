function clean(value) {
  return String(value || '').trim();
}

function list(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[;,]/);
  return [...new Set(source.map(item => clean(item).toLowerCase()).filter(Boolean))];
}

function senderName(value) {
  return clean(value || 'GNK ASG').replace(/[\r\n]+/g, ' ').slice(0, 120);
}

function senderAddress(value, env) {
  const address = clean(value || env.OUTBOUND_FROM || env.MAIL_FROM || 'info@gnk-asg.hr').toLowerCase();
  if (!/^[^\s@]+@gnk-asg\.hr$/i.test(address)) throw new Error('Neispravna GNK ASG adresa pošiljatelja.');
  return address;
}

function normalizeAttachments(items) {
  return (Array.isArray(items) ? items : []).map(item => ({
    filename: clean(item?.filename || item?.name || 'attachment.pdf').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 140),
    content: clean(item?.base64 || item?.content || '').replace(/\s+/g, '')
  })).filter(item => item.content);
}

export function outboundProviderStatus(env) {
  if (clean(env.RESEND_API_KEY)) return { configured:true, provider:'resend' };
  if (clean(env.BREVO_API_KEY)) return { configured:true, provider:'brevo' };
  return { configured:false, provider:null };
}

export async function sendExternalMail(env, input) {
  const status = outboundProviderStatus(env);
  if (!status.configured) return null;

  const from = senderAddress(input.from, env);
  const fromName = senderName(input.fromName);
  const to = list(input.to);
  const cc = list(input.cc);
  const bcc = list(input.bcc);
  const subject = clean(input.subject).replace(/[\r\n]+/g, ' ').slice(0, 300);
  const text = clean(input.text || input.body);
  const html = clean(input.html);
  const attachments = normalizeAttachments(input.attachments);

  if (!to.length) throw new Error('Nedostaje valjani To primatelj.');
  if (!subject) throw new Error('Nedostaje predmet poruke.');
  if (!text && !html) throw new Error('Nedostaje sadržaj poruke.');

  if (status.provider === 'resend') {
    const payload = {
      from: `${fromName} <${from}>`,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      reply_to: clean(input.replyTo || from) || undefined,
      attachments: attachments.length ? attachments : undefined,
      headers: {
        'X-GNK-ASG-Source': clean(input.source || 'portal'),
        'X-GNK-ASG-Case': clean(input.caseId || '')
      }
    };
    const response = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{
        authorization:`Bearer ${clean(env.RESEND_API_KEY)}`,
        'content-type':'application/json'
      },
      body:JSON.stringify(payload)
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    if (!response.ok) throw new Error(data?.message || data?.error || `Resend HTTP ${response.status}`);
    return {
      ok:true,
      provider:'resend',
      messageId:data?.id || null,
      recipients:[...to,...cc,...bcc],
      response:data
    };
  }

  const recipientObjects = values => values.map(email => ({ email }));
  const payload = {
    sender:{ name:fromName, email:from },
    to:recipientObjects(to),
    cc:cc.length ? recipientObjects(cc) : undefined,
    bcc:bcc.length ? recipientObjects(bcc) : undefined,
    replyTo:{ email:clean(input.replyTo || from) || from },
    subject,
    textContent:text || undefined,
    htmlContent:html || undefined,
    attachment:attachments.length ? attachments.map(item => ({ name:item.filename, content:item.content })) : undefined,
    headers:{
      'X-GNK-ASG-Source':clean(input.source || 'portal'),
      'X-GNK-ASG-Case':clean(input.caseId || '')
    }
  };
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:'POST',
    headers:{
      'api-key':clean(env.BREVO_API_KEY),
      'content-type':'application/json',
      accept:'application/json'
    },
    body:JSON.stringify(payload)
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  if (!response.ok) throw new Error(data?.message || data?.error || `Brevo HTTP ${response.status}`);
  return {
    ok:true,
    provider:'brevo',
    messageId:data?.messageId || null,
    recipients:[...to,...cc,...bcc],
    response:data
  };
}
