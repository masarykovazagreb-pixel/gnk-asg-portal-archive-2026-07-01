import app from './index-mail-studio-bridge-v15.js';

export const VERSION='GNK_ASG_MAIL_STUDIO_BRIDGE_V17_20260630_ENGLISH_HEADERS';
const CORE='/assets/mail-studio-english-v23.js?v=20260630-2';
const HISTORY='/assets/delivery-history-dashboard-v3.js?v=20260630-3';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isMail=path=>path==='/mail-studio'||path.startsWith('/mail-studio/')||path==='/mail-studio-pro'||path.startsWith('/mail-studio-pro/');
const isMailApi=path=>path==='/api/admin-mail-send'||path.startsWith('/api/studio-message/')||path.startsWith('/api/mail-center/');
const FORBIDDEN_SUBJECT=/\b(poštovani|postovani|predmet|prijava|redakcija|mediji|akreditacija|poziv|odgovor|potvrda|upit|poruka|slanje|vijesti|direktor|osobni|urednički|urednicki|srdačan|srdacan)\b/i;
const SENDER_NAMES=new Map([
  ['office@gnk-asg.hr','GNK ASG Office'],
  ['legal@gnk-asg.hr','GNK ASG Legal & Compliance'],
  ['media@gnk-asg.hr','GNK DINAMO Ltd. Group | Media Relations & Accreditation Center'],
  ['it@gnk-asg.hr','GNK ASG IT | Digital Assistant'],
  ['nermin.sefic@gnk-asg.hr','Nermin Sefić | Managing Director'],
  ['info@gnk-asg.hr','GNK ASG Information Desk']
]);

function clean(value){return String(value??'').trim();}
function senderIdentity(from){
  if(from&&typeof from==='object')return{email:clean(from.email).toLowerCase(),name:clean(from.name)};
  const raw=clean(from),match=raw.match(/^(.*?)\s*<([^>]+)>$/);
  return match?{email:clean(match[2]).toLowerCase(),name:clean(match[1])}:{email:raw.toLowerCase(),name:''};
}
function normalizeOutbound(payload={}){
  const identity=senderIdentity(payload.from);
  const subject=clean(payload.subject).replace(/[\r\n]+/g,' ');
  if(!subject){const error=new Error('Email subject is required');error.code='EMAIL_SUBJECT_REQUIRED';throw error;}
  if(FORBIDDEN_SUBJECT.test(subject)){const error=new Error('Email subject must be written in English');error.code='EMAIL_SUBJECT_NOT_ENGLISH';throw error;}
  const email=identity.email||'info@gnk-asg.hr';
  return{
    ...payload,
    from:{email,name:SENDER_NAMES.get(email)||'GNK ASG'},
    subject,
    headers:{...(payload.headers||{}),'X-GNK-ASG-Mail-Language':'ENGLISH_ONLY','X-GNK-ASG-Mail-Studio-Bridge':VERSION}
  };
}
function withEnglishMailHeaders(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{enumerable:true,configurable:true,value:{send(payload){return binding.send.call(binding,normalizeOutbound(payload));}}});
  return wrapped;
}

async function patch(response,path){
  if(!isMail(path))return response;
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('cdn-cache-control','no-store');headers.set('cloudflare-cdn-cache-control','no-store');
  headers.set('x-gnk-asg-mail-studio-language','ENGLISH_ONLY');
  headers.set('x-gnk-asg-mail-studio-bridge-v17',VERSION);
  let html=await response.text();
  for(const name of ['studio-core-v21','mail-studio-controls-v18','mail-studio-click-feedback-v19','mail-studio-hotfix-v20','mail-studio-profile-test-v1','mail-studio-delivery-policy-v1','mail-studio-delivery-history-v2','delivery-history-dashboard-v3','mail-studio-english-v23']){
    html=html.replace(new RegExp(`<script[^>]+src=["'][^"']*${name}\\.js[^"']*["'][^>]*><\\/script>`,'gi'),'');
  }
  const scripts=`<script defer src="${CORE}"></script><script defer src="${HISTORY}"></script>`;
  html=html.includes('</body>')?html.replace('</body>',scripts+'</body>'):html+scripts;
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    const active=isMailApi(path)?withEnglishMailHeaders(env):env;
    return patch(await app.fetch(request,active,ctx),path);
  },
  scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
