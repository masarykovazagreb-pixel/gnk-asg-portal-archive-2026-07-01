import base from './index.js';

export const VERSION='GNK_ASG_MAIL_CENTER_STANDARD_ACK_V2_20260703';

const clean=value=>String(value??'').trim();

function decodeBytes(bytes,charset='utf-8'){
  for(const label of [clean(charset).replace(/["']/g,'').toLowerCase(),'utf-8']){
    try{return new TextDecoder(label).decode(bytes);}catch{}
  }
  return new TextDecoder().decode(bytes);
}

function decodeMimeWords(value){
  return String(value??'')
    .replace(/\?=\s+=\?/g,'?==?')
    .replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,(_all,charset,mode,data)=>{
      try{
        let bytes;
        if(mode.toUpperCase()==='B'){
          const binary=atob(String(data).replace(/\s+/g,''));
          bytes=new Uint8Array(binary.length);
          for(let index=0;index<binary.length;index+=1)bytes[index]=binary.charCodeAt(index);
        }else{
          const text=String(data).replace(/_/g,' '),result=[];
          for(let index=0;index<text.length;index+=1){
            if(text[index]==='='&&/^[0-9A-Fa-f]{2}$/.test(text.slice(index+1,index+3))){
              result.push(parseInt(text.slice(index+1,index+3),16));
              index+=2;
            }else result.push(text.charCodeAt(index)&255);
          }
          bytes=new Uint8Array(result);
        }
        return decodeBytes(bytes,charset);
      }catch{return _all;}
    })
    .trim();
}

const DISCLAIMERS=[
  {
    hr:'Ova potvrda ne predstavlja prihvat ponude, ugovornu obvezu, pravno mišljenje niti konačnu odluku.',
    en:'This acknowledgement does not constitute acceptance of an offer, a contractual commitment, legal advice or a final decision.'
  },
  {
    hr:'Ova potvrda nije odobrenje akreditacije, najava objave, prihvat ponude, ugovorna obveza niti konačna odluka.',
    en:'This acknowledgement is not an accreditation approval, publication commitment, acceptance of an offer, contractual commitment or final decision.'
  },
  {
    hr:'Ova potvrda ne predstavlja provjeru identiteta, prihvat zahtjeva ispitanika niti konačnu odluku.',
    en:'This acknowledgement does not constitute identity verification, acceptance of a data-subject request or a final decision.'
  },
  {
    hr:'Ova potvrda ne predstavlja prihvat ponude, priznanje odgovornosti, odricanje od prava, pravno mišljenje niti konačnu odluku.',
    en:'This acknowledgement does not constitute acceptance of an offer, admission of liability, waiver of rights, legal advice or a final decision.'
  }
];

function normalizeBilingual(value){
  const source=String(value??''),marker='--- ENGLISH ---',position=source.indexOf(marker);
  if(position<0)return source;
  let hr=source.slice(0,position),en=source.slice(position);
  for(const item of DISCLAIMERS){
    const combined=`${item.hr} / ${item.en}`;
    hr=hr.split(combined).join(item.hr);
    en=en.split(combined).join(item.en);
  }
  return hr+en;
}

function decodedMessage(message){
  const headers=new Headers(message?.headers||{});
  const subject=decodeMimeWords(headers.get('subject')||'');
  if(subject)headers.set('subject',subject);
  return new Proxy(message,{get(target,property){
    if(property==='headers')return headers;
    const value=Reflect.get(target,property,target);
    return typeof value==='function'?value.bind(target):value;
  }});
}

function standardEnv(env){
  const binding=env?.EMAIL;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'AI_AUTO_REPLY_DISABLED',{enumerable:true,configurable:true,value:'true'});
  if(binding?.send){
    Object.defineProperty(wrapped,'EMAIL',{enumerable:true,configurable:true,value:{
      send(payload){
        const next={...payload};
        for(const key of ['text','plainText','html','bodyHtml']){
          if(key in next)next[key]=normalizeBilingual(next[key]);
        }
        next.headers={...(next.headers||{}),'X-GNK-ASG-Standard-Acknowledgement':VERSION};
        return binding.send.call(binding,next);
      }
    }});
  }
  return wrapped;
}

export default{
  fetch(request,env,ctx){return base.fetch(request,standardEnv(env),ctx);},
  email(message,env,ctx){return base.email(decodedMessage(message),standardEnv(env),ctx);}
};
