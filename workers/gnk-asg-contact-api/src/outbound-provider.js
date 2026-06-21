function clean(value) {
  return String(value || '').trim();
}

function list(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[;,]/);
  return [...new Set(source.map(item => clean(item).toLowerCase()).filter(Boolean))];
}

function attachments(items) {
  return (Array.isArray(items) ? items : []).map(item => ({
    filename:clean(item?.filename || item?.name || 'attachment.pdf').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,140),
    content:clean(item?.base64 || item?.content || '').replace(/\s+/g,'')
  })).filter(item => item.content);
}

export function providerStatus(env) {
  if (clean(env.RESEND_API_KEY)) return { configured:true, provider:'resend' };
  if (clean(env.BREVO_API_KEY)) return { configured:true, provider:'brevo' };
  return { configured:false, provider:null };
}

export async function sendExternalMail(env,input) {
  const status = providerStatus(env);
  if (!status.configured) throw new Error('outbound_provider_not_configured');

  const from = clean(input.from || env.OUTBOUND_FROM || 'info@gnk-asg.hr').toLowerCase();
  const fromName = clean(input.fromName || 'GNK ASG').replace(/[\r\n]+/g,' ').slice(0,120);
  const to = list(input.to);
  const cc = list(input.cc);
  const bcc = list(input.bcc);
  const subject = clean(input.subject).replace(/[\r\n]+/g,' ').slice(0,300);
  const text = clean(input.text || input.body);
  const html = clean(input.html);
  const files = attachments(input.attachments);

  if (!/^[^\s@]+@gnk-asg\.hr$/i.test(from)) throw new Error('invalid_sender');
  if (!to.length) throw new Error('missing_recipient');
  if (!subject) throw new Error('missing_subject');
  if (!text && !html) throw new Error('missing_body');

  if (status.provider === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{ authorization:`Bearer ${clean(env.RESEND_API_KEY)}`, 'content-type':'application/json' },
      body:JSON.stringify({
        from:`${fromName} <${from}>`,
        to,
        cc:cc.length ? cc : undefined,
        bcc:bcc.length ? bcc : undefined,
        reply_to:clean(input.replyTo || from),
        subject,
        text:text || undefined,
        html:html || undefined,
        attachments:files.length ? files : undefined,
        headers:{ 'X-GNK-ASG-Source':clean(input.source || 'contact'), 'X-GNK-ASG-Case':clean(input.caseId || '') }
      })
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    if (!response.ok) throw new Error(data?.message || data?.error || `Resend HTTP ${response.status}`);
    return { ok:true, provider:'resend', messageId:data?.id || null, response:data };
  }

  const recipients = values => values.map(email => ({ email }));
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:'POST',
    headers:{ 'api-key':clean(env.BREVO_API_KEY), 'content-type':'application/json', accept:'application/json' },
    body:JSON.stringify({
      sender:{ name:fromName, email:from },
      to:recipients(to),
      cc:cc.length ? recipients(cc) : undefined,
      bcc:bcc.length ? recipients(bcc) : undefined,
      replyTo:{ email:clean(input.replyTo || from) },
      subject,
      textContent:text || undefined,
      htmlContent:html || undefined,
      attachment:files.length ? files.map(item => ({ name:item.filename, content:item.content })) : undefined,
      headers:{ 'X-GNK-ASG-Source':clean(input.source || 'contact'), 'X-GNK-ASG-Case':clean(input.caseId || '') }
    })
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  if (!response.ok) throw new Error(data?.message || data?.error || `Brevo HTTP ${response.status}`);
  return { ok:true, provider:'brevo', messageId:data?.messageId || null, response:data };
}
