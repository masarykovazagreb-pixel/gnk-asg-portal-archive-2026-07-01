const VERSION='GNK_ASG_MAIL_PROVIDER_SEND_V1_20260706';

const clean=(value,max=2000)=>String(value||'').replace(/\u0000/g,'').trim().slice(0,max);
const emailList=value=>clean(value,4000).split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean).map(x=>x.replace(/^.*<([^>]+)>.*$/,'$1').replace(/[<>"'()]/g,'').trim().toLowerCase()).filter(Boolean);
const safeHeader=value=>clean(value,300).replace(/[\r\n]+/g,' ');
function htmlToText(html){return clean(String(html||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p>/gi,'\n\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'),120000)}
function boundary(){return 'gnk_asg_'+Math.random().toString(16).slice(2)+Date.now().toString(16)}
function rawEmail({from,fromName,to,cc,bcc,subject,text,html,replyTo}){
  const b=boundary();
  const headers=[
    `From: "${safeHeader(fromName||from)}" <${safeHeader(from)}>`,
    `To: ${emailList(to).map(x=>`<${x}>`).join(', ')}`,
    emailList(cc).length?`Cc: ${emailList(cc).map(x=>`<${x}>`).join(', ')}`:null,
    emailList(bcc).length?`Bcc: ${emailList(bcc).map(x=>`<${x}>`).join(', ')}`:null,
    replyTo?`Reply-To: <${safeHeader(replyTo)}>`:null,
    `Subject: ${safeHeader(subject||'GNK ASG message')}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${b}"`,
    `X-GNK-ASG-Mail-Provider: ${VERSION}`
  ].filter(Boolean);
  const plain=clean(text||htmlToText(html),120000)||'GNK ASG message';
  const bodyHtml=clean(html||plain.replace(/\n/g,'<br>'),120000);
  return `${headers.join('\r\n')}\r\n\r\n--${b}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${plain}\r\n\r\n--${b}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${bodyHtml}\r\n\r\n--${b}--`;
}
function canLiveSend(env,flag='MAIL_STUDIO_LIVE'){
  return String(env?.[flag]||'').toLowerCase()==='true'&&env?.EMAIL&&typeof env.EMAIL.send==='function'&&typeof EmailMessage!=='undefined';
}
async function sendProviderMail(env,item,{flag='MAIL_STUDIO_LIVE'}={}){
  if(!canLiveSend(env,flag))return {ok:false,delivered:false,reason:'live_send_not_enabled_or_binding_missing',version:VERSION};
  const to=emailList(item.to);
  if(!to.length)return {ok:false,delivered:false,reason:'missing_to',version:VERSION};
  const from=clean(item.from||'office@gnk-asg.hr',180);
  const raw=rawEmail({...item,from,to:to.join(', ')});
  const message=new EmailMessage(from,to[0],raw);
  await env.EMAIL.send(message);
  return {ok:true,delivered:true,method:'env.EMAIL.send',version:VERSION,to,from};
}
function contactNotificationItem(contact,to){
  const subject=`GNK ASG Contact Form | ${contact.reference || contact.id || 'new inquiry'}`;
  const text=[
    'New GNK ASG contact form submission.',
    '',
    `Reference: ${contact.reference||contact.id||''}`,
    `Mailbox: ${contact.mailbox||'contact'}`,
    `Name: ${contact.name||''}`,
    `Email: ${contact.email||''}`,
    `Phone: ${contact.phone||''}`,
    `Subject: ${contact.subject||''}`,
    '',
    'Message:',
    contact.message||'',
    '',
    contact.pdf?`PDF: ${contact.pdf.filename||''} (${contact.pdf.size||0} bytes)`:''
  ].filter(x=>x!==null).join('\n');
  return {from:'office@gnk-asg.hr',fromName:'GNK ASG Contact Form',to,subject,text,html:`<pre style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap">${text.replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]))}</pre>`,replyTo:contact.email||''};
}

export {VERSION,sendProviderMail,contactNotificationItem,canLiveSend};
