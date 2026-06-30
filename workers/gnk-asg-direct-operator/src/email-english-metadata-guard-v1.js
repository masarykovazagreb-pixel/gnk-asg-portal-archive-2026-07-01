export const VERSION='GNK_ASG_EMAIL_ENGLISH_METADATA_GUARD_V1_20260630';
const clean=v=>String(v??'').trim();
const FORBIDDEN=/\b(poštovani|postovani|predmet|prijava|redakcija|mediji|akreditacija|poziv|odgovor|potvrda|upit|poruka|slanje|vijesti|direktor|osobni|digitalni asistent|pravni|korporativni|urednički|urednicki|kontakt osoba|s poštovanjem|srdačan pozdrav|srdacan pozdrav)\b/i;
const NAMES=new Map([
 ['media@gnk-asg.hr','GNK DINAMO Ltd. Group | Media Relations & Accreditation Center'],
 ['office@gnk-asg.hr','GNK ASG Office'],
 ['legal@gnk-asg.hr','GNK ASG Legal & Compliance'],
 ['it@gnk-asg.hr','GNK ASG IT | Digital Assistant'],
 ['nermin.sefic@gnk-asg.hr','Nermin Sefić | Managing Director'],
 ['info@gnk-asg.hr','GNK ASG Information Desk']
]);
function identity(from){
 if(from&&typeof from==='object')return{email:clean(from.email).toLowerCase(),name:clean(from.name)};
 const raw=clean(from),match=raw.match(/^(.*?)\s*<([^>]+)>$/);
 return match?{email:clean(match[2]).toLowerCase(),name:clean(match[1])}:{email:raw.toLowerCase(),name:''};
}
function normalize(payload={}){
 const id=identity(payload.from),subject=clean(payload.subject).replace(/[\r\n]+/g,' ');
 if(!subject){const error=new Error('Email subject is required');error.code='EMAIL_SUBJECT_REQUIRED';throw error;}
 if(FORBIDDEN.test(subject)){const error=new Error('Email subject must be written in English');error.code='EMAIL_SUBJECT_NOT_ENGLISH';throw error;}
 const approvedName=NAMES.get(id.email)||'GNK ASG';
 return{...payload,from:{email:id.email||'info@gnk-asg.hr',name:approvedName},subject,headers:{...(payload.headers||{}),'X-GNK-ASG-English-Metadata':VERSION}};
}
export function withEnglishEmailMetadata(env){
 const binding=env?.EMAIL;
 if(!binding||typeof binding.send!=='function')return env;
 const wrapped=Object.create(env||null);
 Object.defineProperty(wrapped,'EMAIL',{enumerable:true,configurable:true,value:{send(payload){return binding.send.call(binding,normalize(payload));}}});
 return wrapped;
}
