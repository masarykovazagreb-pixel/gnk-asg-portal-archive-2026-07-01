import {
  PROFILES,
  handleIncomingEmail as handleProfiledIncomingEmail,
  VERSION as BASE_VERSION
} from './mail-identity-autoreply-v2.js';

export const VERSION=`GNK_ASG_MAIL_AUTOREPLY_ALL_V1_20260713_${BASE_VERSION}`;

const clean=value=>String(value??'').trim();
const header=(message,name)=>{try{return message.headers?.get?.(name)||''}catch{return''}};
const validAddress=value=>/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gnk-asg\.hr$/i.test(clean(value));
const addresses=message=>{
  const source=[message?.to,message?.rcptTo,header(message,'to'),header(message,'delivered-to')].filter(Boolean).join(',');
  return [...new Set((source.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gnk-asg\.hr/gi)||[]).map(value=>value.toLowerCase()))];
};
const title=value=>value.split(/[._-]+/).filter(Boolean).map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ');
const prefix=value=>`GNK-${value.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').toUpperCase().slice(0,36)||'MAIL'}-IN`;

function ensureCatchAllProfiles(message){
  for(const address of addresses(message)){
    if(!validAddress(address)||PROFILES[address])continue;
    const local=address.split('@')[0];
    PROFILES[address]={
      key:`catch-all-${local.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`,
      prefix:prefix(local),
      address,
      fromName:`GNK ASG | ${title(local)}`,
      role:'Corporate Mailbox',
      language:'bilingual',
      legal:false,
      catchAll:true
    };
  }
}

export async function handleIncomingEmail(message,env,ctx,core){
  ensureCatchAllProfiles(message);
  return handleProfiledIncomingEmail(message,env,ctx,core);
}

export {PROFILES};
