(() => {
  'use strict';
  if (window.__GNK_ASG_MAIL_STUDIO_AUTH_BRIDGE_V16__) return;
  window.__GNK_ASG_MAIL_STUDIO_AUTH_BRIDGE_V16__ = true;

  const VERSION='GNK_ASG_MAIL_STUDIO_AUTH_BRIDGE_V16_20260626_COOKIE_ONLY';
  const LEGACY_KEYS=['gnk_asg_operator_token_session','gnk_asg_mail_studio_token','gnk-operator-token','GNK_ASG_OPERATOR_TOKEN'];
  const protectedPath=path=>path.startsWith('/api/admin-')||path.startsWith('/api/operator-')||path.startsWith('/api/mail-center/')||path.startsWith('/operator/')||['/api/ai-assist','/api/media-upload','/api/admin-asset-list','/api/publish-queue'].includes(path);

  function purge(){
    try{for(const key of LEGACY_KEYS){sessionStorage.removeItem(key);localStorage.removeItem(key);}}catch(_){ }
  }
  function status(message){const node=document.getElementById('status');if(node)node.textContent=message;}

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{
    let url;
    try{url=new URL(typeof input==='string'?input:input.url,location.origin);}catch{return nativeFetch(input,init);}
    if(url.origin!==location.origin||!protectedPath(url.pathname))return nativeFetch(input,init);
    purge();
    const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined)||{});
    for(const name of ['authorization','x-operator-token','x-admin-token','x-gnk-asg-token'])headers.delete(name);
    headers.set('x-gnk-asg-ui-bridge',VERSION);
    const response=await nativeFetch(input,{...init,headers,credentials:'same-origin',cache:init.cache||'no-store'});
    if(response.status===401)status('HttpOnly sesija nije prihvaćena. Vratite se na Admin prijavu.');
    return response;
  };

  function enableControls(){
    for(const id of ['send','save','load','helper','autoReply','clear','aiPersonalReply','aiPersonalImprove','aiPersonalLegal','aiPersonalShort']){
      const button=document.getElementById(id);if(!button)continue;
      button.disabled=false;button.style.pointerEvents='auto';button.style.cursor='pointer';
    }
    document.querySelectorAll('button.tab[data-box]').forEach(button=>{button.disabled=false;button.style.pointerEvents='auto';button.style.cursor='pointer';});
  }
  async function verify(){
    try{
      const response=await window.fetch(`/api/operator-auth-check?cb=${Date.now()}`,{headers:{accept:'application/json','cache-control':'no-cache'}});
      status(response.ok?'Mail Studio spreman · HttpOnly sesija potvrđena.':'Mail Studio je otvoren, ali sigurna sesija nije potvrđena.');
    }catch(error){status(`Provjera sesije nije uspjela: ${error.message}`);}
  }
  function boot(){purge();enableControls();verify();new MutationObserver(enableControls).observe(document.documentElement,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
