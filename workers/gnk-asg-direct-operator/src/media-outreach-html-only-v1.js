export const VERSION='GNK_ASG_MEDIA_OUTREACH_HTML_ONLY_V1_20260630';

const clean=value=>String(value??'').trim();
const boolEnv=value=>/^(1|true|yes|on)$/i.test(clean(value));

function htmlOnlyText(value){
  return String(value??'')
    .replace(/Detailed requirements and the application template are provided in the attached PDF\./gi,'The complete invitation, requirements and application access are provided in the HTML message above.')
    .replace(/Please see (?:the )?attached PDF(?: document)?\.?/gi,'Please review the complete HTML message above.')
    .replace(/The attached PDF[^.]*\./gi,'The complete information is provided in the HTML message above.')
    .replace(/PDF SHA-256:[^\r\n]*(?:\r?\n)?/gi,'')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}

export function withHtmlOnlyMediaDelivery(env){
  if(!boolEnv(env?.MEDIA_OUTREACH_HTML_ONLY))return env;
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{enumerable:true,configurable:true,value:{
    async send(payload){
      const headers={...(payload?.headers||{})};
      const isMediaOutreach=Boolean(
        headers['X-GNK-Delivery-Version']||
        headers['x-gnk-delivery-version']||
        headers['X-GNK-HTML-SHA256']||
        headers['x-gnk-html-sha256']
      );
      if(!isMediaOutreach)return binding.send.call(binding,payload);
      delete headers['X-GNK-PDF-SHA256'];
      delete headers['x-gnk-pdf-sha256'];
      headers['X-GNK-ASG-Delivery-Mode']='HTML_ONLY';
      headers['X-GNK-ASG-HTML-Only-Version']=VERSION;
      const next={
        ...payload,
        text:htmlOnlyText(payload?.text),
        attachments:[],
        headers
      };
      return binding.send.call(binding,next);
    }
  }});
  return wrapped;
}
