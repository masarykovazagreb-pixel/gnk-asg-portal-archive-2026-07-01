(()=>{
  'use strict';
  if(window.__GNK_ASG_MAIL_STUDIO_DELIVERY_POLICY_V2__)return;
  window.__GNK_ASG_MAIL_STUDIO_DELIVERY_POLICY_V2__=true;

  const VERSION='GNK_ASG_MAIL_STUDIO_DELIVERY_POLICY_V2_20260628';
  const MANDATORY_BCC='rht@gmx.com';
  const nativeFetch=window.fetch.bind(window);
  const $=id=>document.getElementById(id);
  const status=text=>{const node=$('status');if(node)node.textContent=text;};
  const parse=value=>[...new Set(String(value||'').split(/[;,\s]+/).map(item=>item.trim().toLowerCase()).filter(Boolean))];
  const ensureBcc=value=>{const list=parse(value);if(!list.includes(MANDATORY_BCC))list.push(MANDATORY_BCC);return list.join(', ');};

  function cleanContactDetails(root=document){
    root.querySelectorAll('.signature,[data-gnk-asg-signature]').forEach(node=>{
      let html=String(node.innerHTML||'');
      html=html.replace(/(?:<br\s*\/?>)?\s*(?:Telefon|Kontakt|Phone|Tel\.?|Mobile|Mobitel|WhatsApp)\s*:\s*(?:\+?385\s*\(?0?\)?\s*91\s*610\s*4398|\+?385\s*91\s*535\s*8365|0?91\s*535\s*8365)[^<]*/gi,'').replace(/<a\b[^>]*href=["'][^"']*wa\.me[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,'').replace(/(?:https?:\/\/)?(?:www\.)?wa\.me\/\d+\/?/gi,'');
      if(html!==node.innerHTML)node.innerHTML=html;
    });
  }
  function installBccPolicy(){
    const field=$('bcc');if(!field)return;
    field.value=ensureBcc(field.value);field.setAttribute('data-mandatory-bcc',MANDATORY_BCC);field.placeholder=`Obvezno: ${MANDATORY_BCC}`;
    const label=field.closest('.field')?.querySelector('label');if(label)label.textContent=`BCC — obvezna interna kopija ${MANDATORY_BCC}`;
    if(!field.dataset.gnkMandatoryBound){field.dataset.gnkMandatoryBound='1';field.addEventListener('blur',()=>{field.value=ensureBcc(field.value);});field.addEventListener('change',()=>{field.value=ensureBcc(field.value);});}
  }
  function installReadinessPanel(){
    if($('gnkMailDeliveryReadiness'))return;
    const side=document.querySelector('.side');if(!side)return;
    const panel=document.createElement('div');panel.className='panel';panel.id='gnkMailDeliveryReadiness';
    panel.innerHTML='<h3>Slanje e-mailova</h3><div class="small" id="gnkMailDeliveryReadinessText">Provjera kanala za slanje…</div>';
    side.insertBefore(panel,side.firstChild);
  }
  async function refreshReadiness(){
    installReadinessPanel();const node=$('gnkMailDeliveryReadinessText');
    try{
      const response=await nativeFetch(`/api/mail-center/send-readiness?cb=${Date.now()}`,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
      const data=await response.json().catch(()=>({}));if(!node)return;
      if(response.ok&&data.live&&data.emailBindingConfigured){
        const hour=data.rate?.hour||{},day=data.rate?.day||{};
        node.innerHTML=`<strong style="color:#65e49c">KANAL ZA SLANJE JE AKTIVAN</strong><br>Preflight, suppression, rate limit i zaštita od duplog slanja su uključeni.<br>Sat: ${hour.used??0}/${hour.limit??'—'} · Dan: ${day.used??0}/${day.limit??'—'}<br>Obvezna skrivena kopija: ${MANDATORY_BCC}`;
      }else node.innerHTML=`<strong style="color:#ff8585">SLANJE NIJE SPREMNO</strong><br>${data.error||(!data.live?'Ručni kanal je zaključan.':'EMAIL binding nije dostupan.')}`;
    }catch(error){if(node)node.textContent=`Provjera slanja nije uspjela: ${error.message}`;}
  }
  function confirmationText(data){
    const names=(data.attachments?.names||[]).join(', ')||'bez priloga';
    const rate=data.rate||{};
    return [
      'ZAVRŠNA POTVRDA SLANJA',
      '',
      `Pošiljatelj: ${data.profile?.name||data.profile?.email||'—'}`,
      `TO: ${(data.to||[]).join(', ')}`,
      `CC: ${(data.cc||[]).join(', ')||'—'}`,
      `BCC: ${(data.bcc||[]).join(', ')||'—'}`,
      `Predmet: ${data.subject||'—'}`,
      `Prilozi: ${names}`,
      `Satna kvota: ${rate.hour?.used??0}/${rate.hour?.limit??'—'}`,
      `Dnevna kvota: ${rate.day?.used??0}/${rate.day?.limit??'—'}`,
      '',
      'Pritisnite U redu samo ako su svi primatelji i sadržaj provjereni.'
    ].join('\n');
  }
  async function preflight(payload){
    const response=await nativeFetch('/api/mail-center/preflight',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-gnk-asg-mail-ui-policy':VERSION},body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.canSend){const reason=data.error||(data.suppressions?.length?'Primatelj je na suppression listi.':!data.rate?.ok?'Dosegnuta je kvota slanja.':'Preflight nije prošao.');throw new Error(reason);}
    return data;
  }

  window.fetch=async(input,init={})=>{
    let url;try{url=new URL(typeof input==='string'?input:input.url,location.origin);}catch{return nativeFetch(input,init);}
    if(url.origin!==location.origin||url.pathname!=='/api/admin-mail-send')return nativeFetch(input,init);
    const next={...init,credentials:'same-origin',cache:'no-store'};
    const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined)||{});headers.set('content-type','application/json');headers.set('x-gnk-asg-mail-ui-policy',VERSION);next.headers=headers;
    let payload;
    try{
      payload=typeof next.body==='string'?JSON.parse(next.body):{};
      const field=$('bcc'),bcc=ensureBcc(payload.bcc||(field?field.value:''));if(field)field.value=bcc;
      payload.bcc=bcc;payload.profile=payload.profile||$('profile')?.value||'office';payload.bodyText=payload.bodyText||$('bodyText')?.value||payload.text||'';delete payload.confirm;
    }catch(error){status(`Priprema poruke nije uspjela: ${error.message}`);return new Response(JSON.stringify({ok:false,error:'invalid_mail_payload'}),{status:400,headers:{'content-type':'application/json'}});}
    const sendButton=$('send');if(sendButton){sendButton.disabled=true;sendButton.dataset.previousText=sendButton.textContent;sendButton.textContent='Provjera…';}
    try{
      status('Preflight provjera primatelja, kvota i priloga…');
      const checked=await preflight(payload);
      if(!window.confirm(confirmationText(checked))){status('Slanje je otkazano prije isporuke.');return new Response(JSON.stringify({ok:false,error:'send_cancelled'}),{status:409,headers:{'content-type':'application/json'}});}
      payload.confirm='SEND_MAIL';next.body=JSON.stringify(payload);if(sendButton)sendButton.textContent='Slanje…';status('Slanje potvrđene poruke…');
      const response=await nativeFetch(input,next);refreshReadiness();return response;
    }catch(error){status(`Poruka nije poslana: ${error.message}`);return new Response(JSON.stringify({ok:false,error:'preflight_failed',message:error.message}),{status:409,headers:{'content-type':'application/json'}});}
    finally{if(sendButton){sendButton.disabled=false;sendButton.textContent=sendButton.dataset.previousText||'Pošalji';}}
  };

  function boot(){
    installBccPolicy();installReadinessPanel();cleanContactDetails();refreshReadiness();
    const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)cleanContactDetails(node);installBccPolicy();});
    observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>{installBccPolicy();cleanContactDetails();},300);setTimeout(()=>{installBccPolicy();cleanContactDetails();},1200);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
