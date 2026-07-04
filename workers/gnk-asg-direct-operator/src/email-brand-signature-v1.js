export const VERSION='GNK_ASG_EMAIL_BRAND_SIGNATURE_V1_20260704';
export const LOGO_URL='https://gnk-asg.hr/assets/gnk-asg-email-logo-transparent.png?v=20260701-5';
export const WEBSITE='https://gnk-asg.hr';
export const GOLD='#b88a2f';

const clean=value=>String(value??'').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);

function line(value,{strong=false,label=''}={}){
  const text=clean(value);
  if(!text)return'';
  const prefix=label?`<strong>${escapeHtml(label)}</strong> `:'';
  return `<div style="font-size:14px;line-height:1.5;color:${GOLD};margin:0 0 3px">${prefix}${strong?`<strong>${escapeHtml(text)}</strong>`:escapeHtml(text)}</div>`;
}

function linkedLine(value,href,label=''){
  const text=clean(value);
  if(!text)return'';
  const prefix=label?`<strong>${escapeHtml(label)}</strong> `:'';
  return `<div style="font-size:14px;line-height:1.5;color:${GOLD};margin:0 0 3px">${prefix}<a href="${escapeHtml(href)}" style="color:${GOLD};text-decoration:none">${escapeHtml(text)}</a></div>`;
}

export function renderBrandSignatureHtml({marker=VERSION,name,unit,subline,address,registry,email,web=WEBSITE}={}){
  const identity=clean(name)||'GNK ASG';
  return `<table data-gnk-asg-signature="${escapeHtml(marker)}" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:620px;border-collapse:collapse;margin-top:26px;border-top:1px solid ${GOLD};font-family:Arial,Helvetica,sans-serif"><tr><td align="left" style="padding:20px 0 10px"><a href="${escapeHtml(web)}" style="display:inline-block;text-decoration:none"><img src="${LOGO_URL}" width="190" alt="GNK DINAMO Ltd. Group / GNK ASG" style="display:block;width:190px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;background:transparent"></a></td></tr><tr><td align="left" style="padding:0 0 12px;color:${GOLD};font-size:14px;line-height:1.5;word-break:normal;overflow-wrap:normal"><div style="font-size:22px;line-height:1.25;font-weight:800;color:${GOLD};margin:0 0 8px">${escapeHtml(identity)}</div>${line(unit,{strong:true})}${line(subline)}${line(address)}${line(registry)}${linkedLine(email,`mailto:${email}`)}${linkedLine(web,web)}</td></tr></table>`;
}

export function renderBrandSignatureText({name,unit,subline,address,registry,email,web=WEBSITE}={}){
  return [name,unit,subline,address,registry,email,web].map(clean).filter(Boolean).join('\n');
}

export function institutionalSignature(profile,centre){
  const location=centre?.name&&centre?.country?`${centre.name}, ${centre.country}`:'';
  return{
    html:renderBrandSignatureHtml({
      marker:VERSION,
      name:profile?.name,
      unit:profile?.unit,
      subline:location?`Global Service Centre: ${location}`:'',
      email:profile?.email,
      web:WEBSITE
    }),
    text:renderBrandSignatureText({
      name:profile?.name,
      unit:profile?.unit,
      subline:location?`Global Service Centre: ${location}`:'',
      email:profile?.email,
      web:WEBSITE
    })
  };
}

export function corporateSignature(identity,company){
  return{
    html:renderBrandSignatureHtml({
      marker:VERSION,
      name:identity?.name,
      unit:company?.name,
      address:company?.address,
      registry:company?.oib&&company?.mbs?`OIB: ${company.oib} · MBS: ${company.mbs}`:'',
      email:identity?.email,
      web:company?.web||WEBSITE
    }),
    text:renderBrandSignatureText({
      name:identity?.name,
      unit:company?.name,
      address:company?.address,
      registry:company?.oib&&company?.mbs?`OIB: ${company.oib} · MBS: ${company.mbs}`:'',
      email:identity?.email,
      web:company?.web||WEBSITE
    })
  };
}

export function mediaSignature(media){
  return{
    html:renderBrandSignatureHtml({
      marker:VERSION,
      name:media?.group,
      unit:media?.centre,
      subline:media?.organiser,
      email:media?.email,
      web:media?.web||WEBSITE
    }),
    text:renderBrandSignatureText({
      name:media?.group,
      unit:media?.centre,
      subline:media?.organiser,
      email:media?.email,
      web:media?.web||WEBSITE
    })
  };
}
