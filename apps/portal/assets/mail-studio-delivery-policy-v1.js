(() => {
  'use strict';
  if(window.__GNK_ASG_MAIL_STUDIO_DELIVERY_POLICY_V1__)return;
  window.__GNK_ASG_MAIL_STUDIO_DELIVERY_POLICY_V1__=true;

  const VERSION='GNK_ASG_MAIL_STUDIO_DELIVERY_POLICY_V1_20260627';
  const MANDATORY_BCC='rht@gmx.com';
  const nativeFetch=window.fetch.bind(window);
  const $=id=>document.getElementById(id);
  const status=text=>{const node=$('status');if(node)node.textContent=text;};
  const parse=value=>[...new Set(String(value||'').split(/[;,\s]+/).map(item=>item.trim().toLowerCase()).filter(Boolean))];
  const ensureBcc=value=>{
    const list=parse(value);
    if(!list.includes(MANDATORY_BCC))list.push(MANDATORY_BCC);
    return list.join(', ');
  };

  function cleanContactDetails(root=document){
    root.querySelectorAll('.signature,[data-gnk-asg-signature]').forEach(node=>{
      let html=String(node.innerHTML||'');
      html=html
        .replace(/(?:<br\s*\/?>)?\s*(?:Telefon|Kontakt|Phone|Tel\.?|Mobile|Mobitel|WhatsApp)\s*:\s*(?:\+?385\s*\(?0?\)?\s*91\s*610\s*4398|\+?385\s*91\s*535\s*8365|0?91\s*535\s*8365)[^<]*/gi,'')
        .replace(/<a\b[^>]*href=["'][^"']*wa\.me[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,'')
        .replace(/(?:https?:\/\/)?(?:www\.)?wa\.me\/\d+\/?/gi,'');
      if(html!==node.innerHTML)node.innerHTML=html;
    });
  }

  function installBccPolicy(){
    const field=$('bcc');
    if(!field)return;
    field.value=ensureBcc(field.value);
    field.setAttribute('data-mandatory-bcc',MANDATORY_BCC);
    field.placeholder=`Obvezno: ${MANDATORY_BCC}`;
    const label=field.closest('.field')?.querySelector('label');
    if(label)label.textContent=`BCC — obvezna interna kopija ${MANDATORY_BCC}`;
    if(!field.dataset.gnkMandatoryBound){
      field.dataset.gnkMandatoryBound='1';
      field.addEventListener('blur',()=>{field.value=ensureBcc(field.value);});
      field.addEventListener('change',()=>{field.value=ensureBcc(field.value);});
    }
  }

  function installReadinessPanel(){
    if($('gnkMailDeliveryReadiness'))return;
    const side=document.querySelector('.side');if(!side)return;
    const panel=document.createElement('div');
    panel.className='panel';
    panel.id='gnkMailDeliveryReadiness';
    panel.innerHTML='<h3>Slanje e-mailova</h3><div class="small" id="gnkMailDeliveryReadinessText">Provjera kanala za slanje…</div>';
    side.insertBefore(panel,side.firstChild);
  }

  async function refreshReadiness(){
    installReadinessPanel();
    const node=$('gnkMailDeliveryReadinessText');
    try{
      const response=await nativeFetch(`/api/mail-center/send-readiness?cb=${Date.now()}`,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
      const data=await response.json().catch(()=>({}));
      if(!node)return;
      if(response.ok&&data.live&&data.emailBindingConfigured){
        node.innerHTML=`<strong style="color:#65e49c">KANAL ZA SLANJE JE AKTIVAN</strong><br>Obvezna skrivena kopija: ${MANDATORY_BCC}<br>Profili: ${(data.profiles||[]).length} · Potpisi bez telefona i WhatsAppa.`;
      }else{
        node.innerHTML=`<strong style="color:#ff8585">SLANJE NIJE SPREMNO</strong><br>${data.error||(!data.live?'Ručni kanal je zaključan.':'EMAIL binding nije dostupan.')}`;
      }
    }catch(error){
      if(node)node.textContent=`Provjera slanja nije uspjela: ${error.message}`;
    }
  }

  window.fetch=async(input,init={})=>{
    let url;
    try{url=new URL(typeof input==='string'?input:input.url,location.origin);}catch{return nativeFetch(input,init);}
    if(url.origin!==location.origin||url.pathname!=='/api/admin-mail-send')return nativeFetch(input,init);

    const next={...init,credentials:'same-origin',cache:'no-store'};
    const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined)||{});
    headers.set('x-gnk-asg-mail-ui-policy',VERSION);
    next.headers=headers;
    try{
      const payload=typeof next.body==='string'?JSON.parse(next.body):{};
      const field=$('bcc');
      const bcc=ensureBcc(payload.bcc||(field?field.value:''));
      if(field)field.value=bcc;
      payload.bcc=bcc;
      payload.confirm='SEND_MAIL';
      payload.profile=payload.profile||$('profile')?.value||'office';
      payload.bodyText=payload.bodyText||$('bodyText')?.value||payload.text||'';
      next.body=JSON.stringify(payload);
    }catch(error){
      status(`Priprema poruke nije uspjela: ${error.message}`);
      return new Response(JSON.stringify({ok:false,error:'invalid_mail_payload'}),{status:400,headers:{'content-type':'application/json'}});
    }

    const sendButton=$('send');
    if(sendButton){sendButton.disabled=true;sendButton.dataset.previousText=sendButton.textContent;sendButton.textContent='Slanje…';}
    const response=await nativeFetch(input,next);
    if(sendButton){sendButton.disabled=false;sendButton.textContent=sendButton.dataset.previousText||'Pošalji';}
    return response;
  };

  function boot(){
    installBccPolicy();
    installReadinessPanel();
    cleanContactDetails();
    refreshReadiness();
    const observer=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)cleanContactDetails(node);
      installBccPolicy();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>{installBccPolicy();cleanContactDetails();},300);
    setTimeout(()=>{installBccPolicy();cleanContactDetails();},1200);
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
