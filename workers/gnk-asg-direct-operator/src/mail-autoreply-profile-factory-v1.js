export const VERSION='GNK_ASG_MAIL_AUTOREPLY_PROFILE_FACTORY_V1_20260713';

const clean=value=>String(value??'').trim();
const header=(message,name)=>{try{return message?.headers?.get?.(name)||''}catch{return''}};
export const validGnkAddress=value=>/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gnk-asg\.hr$/i.test(clean(value));
export function extractGnkAddresses(message){
  const source=[message?.to,message?.rcptTo,header(message,'to'),header(message,'delivered-to')].filter(Boolean).join(',');
  return [...new Set((source.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gnk-asg\.hr/gi)||[]).map(value=>value.toLowerCase()))];
}
const title=value=>value.split(/[._-]+/).filter(Boolean).map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ');
const prefix=value=>`GNK-${value.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').toUpperCase().slice(0,36)||'MAIL'}-IN`;
export function createCatchAllProfile(address){
  const normalized=clean(address).toLowerCase();
  if(!validGnkAddress(normalized))return null;
  const local=normalized.split('@')[0];
  return {
    key:`catch-all-${local.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`,
    prefix:prefix(local),
    address:normalized,
    fromName:`GNK ASG | ${title(local)}`,
    role:'Corporate Mailbox',
    language:'bilingual',
    legal:false,
    catchAll:true
  };
}
