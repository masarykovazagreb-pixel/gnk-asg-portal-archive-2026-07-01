(()=>{
'use strict';
if(window.__GNK_ASG_EMAIL_TOOLS_HUB_V4__)return;
window.__GNK_ASG_EMAIL_TOOLS_HUB_V4__=true;
const script=document.currentScript||document.querySelector('script[data-gnk-email-tools]');
const source=(script?.dataset?.source||'').trim();
const appName=(script?.dataset?.app||'GNK ASG').trim();
const current=location.pathname+location.search;
const enc=value=>encodeURIComponent(String(value||''));
const api=async(url,options={})=>{
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.message||data.error||`HTTP ${response.status}`);
 return data;
};
const el=(tag,attrs={},children=[])=>{
 const node=document.createElement(tag);
 for(const [key,value] of Object.entries(attrs)){
  if(key==='class')node.className=value;
  else if(key==='text')node.textContent=value;
  else if(key.startsWith('on')&&typeof value==='function')node.addEventListener(key.slice(2),value);
  else node.setAttribute(key,String(value));
 }
 for(const child of [].concat(children||[]))if(child)node.append(child);
 return node;
};
const style=el('style',{text:`
[data-gnk-email-tools-root]{font-family:Arial,Helvetica,sans-serif;color:#e5e7eb}
.gnk-et-launcher{position:fixed;right:18px;bottom:18px;z-index:2147483000;display:flex;align-items:center;gap:9px;min-height:48px;padding:12px 17px;border:1px solid #d6b657;border-radius:999px;background:#081426;color:#fff;font-weight:900;letter-spacing:.02em;box-shadow:0 16px 40px rgba(0,0,0,.42);cursor:pointer}
.gnk-et-badge{padding:3px 6px;border-radius:999px;background:#d6b657;color:#081426;font-size:10px}
.gnk-et-panel{position:fixed;right:18px;bottom:78px;z-index:2147482999;width:min(360px,calc(100vw - 28px));max-height:calc(100vh - 110px);overflow:auto;padding:14px;border:1px solid rgba(214,182,87,.72);border-radius:18px;background:#071426;color:#fff;box-shadow:0 28px 80px rgba(0,0,0,.52)}
.gnk-et-title{padding:4px 5px 12px;color:#f5d879;font-size:13px;font-weight:900;letter-spacing:.05em}
.gnk-et-action{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;padding:12px 13px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:#11243d;color:#fff;text-decoration:none;text-align:left;font-weight:800;font-size:13px;cursor:pointer;box-sizing:border-box}
.gnk-et-action:hover{background:#183150}.gnk-et-action small{color:#9fb2ca;font-weight:600}
.gnk-et-overlay{position:fixed;inset:0;z-index:2147483100;display:grid;place-items:center;padding:16px;background:rgba(2,8,23,.78);backdrop-filter:blur(5px)}
.gnk-et-modal{width:min(680px,100%);max-height:92vh;overflow:auto;border:1px solid rgba(214,182,87,.65);border-radius:20px;background:#071426;color:#fff;box-shadow:0 34px 100px rgba(0,0,0,.65)}
.gnk-et-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.10)}
.gnk-et-modal-head h2{margin:0;font-size:19px;color:#f5d879}.gnk-et-close{border:0;background:transparent;color:#fff;font-size:26px;cursor:pointer}
.gnk-et-body{padding:20px}.gnk-et-field{display:block;margin-bottom:15px}.gnk-et-field span{display:block;margin-bottom:7px;color:#c9d6e5;font-weight:800;font-size:13px}
.gnk-et-field input,.gnk-et-field textarea,.gnk-et-field select{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #344a66;border-radius:11px;background:#0d2038;color:#fff;font:500 15px Arial,sans-serif;outline:none}.gnk-et-field textarea{min-height:170px;resize:vertical}
.gnk-et-row{display:flex;gap:10px;flex-wrap:wrap}.gnk-et-primary,.gnk-et-secondary{min-height:44px;padding:11px 16px;border-radius:11px;font-weight:900;cursor:pointer}.gnk-et-primary{border:1px solid #d6b657;background:#d6b657;color:#071426}.gnk-et-secondary{border:1px solid #415673;background:#11243d;color:#fff}
.gnk-et-message{margin:0 0 14px;padding:12px 13px;border-radius:11px;background:#0d2038;color:#dce7f4;line-height:1.5;font-size:13px}.gnk-et-error{background:#3b1018;color:#fecdd3}.gnk-et-success{background:#0d3024;color:#bbf7d0}
.gnk-et-list{display:grid;gap:10px}.gnk-et-item{padding:13px;border:1px solid #2f4560;border-radius:12px;background:#0d2038}.gnk-et-item strong{display:block;margin-bottom:6px}.gnk-et-meta{color:#aebed1;font-size:12px;line-height:1.5}.gnk-et-cancel{margin-top:10px;padding:8px 11px;border:1px solid #7f1d1d;border-radius:9px;background:#3b1018;color:#fecaca;font-weight:800;cursor:pointer}
@media(max-width:640px){.gnk-et-launcher{right:12px;bottom:12px}.gnk-et-panel{right:12px;bottom:70px}.gnk-et-body{padding:16px}}
`});
document.head.append(style);
const root=el('div',{'data-gnk-email-tools-root':'1'});
const launcher=el('button',{class:'gnk-et-launcher',type:'button','aria-expanded':'false'},[
 el('span',{text:'Email alati'}),el('span',{class:'gnk-et-badge',text:'NOVO'})
]);
const panel=el('div',{class:'gnk-et-panel',hidden:'hidden'});
const addLink=(label,description,href)=>panel.append(el('a',{class:'gnk-et-action',href},[el('span',{text:label}),el('small',{text:description})]));
const addButton=(label,description,handler)=>panel.append(el('button',{class:'gnk-et-action',type:'button',onclick:handler},[el('span',{text:label}),el('small',{text:description})]));
panel.append(el('div',{class:'gnk-et-title',text:`GNK ASG · ${appName}`}));
addLink('AI pomoćnik','pisanje i uređivanje',`/auto-editor/?from=${enc(current)}`);
addLink('Status svih poruka','svi email sustavi',`/email-status?source=all&from=${enc(current)}`);
if(source){
 addLink('Status ove aplikacije','isporuka i otvaranja',`/email-status?source=${enc(source)}&from=${enc(current)}`);
 if(source==='mail-studio')addLink('Današnje ručne poruke','Mail Studio evidencija',`/email-status?source=mail-studio&date=today&from=${enc(current)}`);
}
function closePanel(){panel.hidden=true;launcher.setAttribute('aria-expanded','false');}
launcher.addEventListener('click',()=>{panel.hidden=!panel.hidden;launcher.setAttribute('aria-expanded',String(!panel.hidden));});
document.addEventListener('click',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!launcher.contains(event.target))closePanel();});
function modal(title,contentBuilder){
 const overlay=el('div',{class:'gnk-et-overlay'}),box=el('section',{class:'gnk-et-modal','aria-modal':'true',role:'dialog'}),body=el('div',{class:'gnk-et-body'});
 const close=()=>overlay.remove();
 const closeButton=el('button',{class:'gnk-et-close',type:'button','aria-label':'Zatvori',text:'×',onclick:close});
 box.append(el('div',{class:'gnk-et-modal-head'},[el('h2',{text:title}),closeButton]),body);overlay.append(box);root.append(overlay);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 contentBuilder({body,close,message:(text,type='')=>{let node=body.querySelector('.gnk-et-message');if(!node){node=el('div',{class:'gnk-et-message'});body.prepend(node);}node.className=`gnk-et-message ${type?`gnk-et-${type}`:''}`;node.textContent=text;}});
}
function field(label,type='text',value=''){
 const input=type==='textarea'?el('textarea',{}):el('input',{type,value});
 return{wrap:el('label',{class:'gnk-et-field'},[el('span',{text:label}),input]),input};
}
async function run(button,fn){button.disabled=true;const original=button.textContent;button.textContent='Obrada…';try{return await fn();}finally{button.disabled=false;button.textContent=original;}}
if(source){
 addButton('Ping / provjera adrese','format, domena i dostava',()=>modal('Provjera email adrese',({body,message})=>{
  const email=field('Email adresa');const submit=el('button',{class:'gnk-et-primary',type:'button',text:'Pošalji testni ping'});
  submit.onclick=()=>run(submit,async()=>{try{const data=await api('/api/email-ping',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email.input.value,source:source||'mail-studio'})});message('Testna poruka je prihvaćena za slanje. Otvaram detaljni status.','success');setTimeout(()=>location.href=(data.statusUrl||`/email-status?source=${enc(source)}&search=${enc(data.pingId)}`)+`&from=${enc(current)}`,700);}catch(error){message(`Ping nije poslan: ${error.message}`,'error');}});
  body.append(email.wrap,el('div',{class:'gnk-et-row'},[submit]));
 }));
 addButton('Privremena zaštićena poruka','3 ili 10 min nakon otvaranja',()=>modal('Privremena zaštićena poruka',({body,message})=>{
  const recipient=field('Primatelj');const subject=field('Predmet');const content=field('Zaštićeni sadržaj','textarea');
  const select=el('select',{},[el('option',{value:'600',text:'10 minuta nakon otvaranja'}),el('option',{value:'180',text:'3 minute nakon otvaranja'})]);
  const expiry=el('label',{class:'gnk-et-field'},[el('span',{text:'Trajanje pristupa'}),select]);
  const submit=el('button',{class:'gnk-et-primary',type:'button',text:'Pošalji zaštićenu poruku'});
  submit.onclick=()=>run(submit,async()=>{try{const data=await api('/api/temporary-message',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({recipient:recipient.input.value,subject:subject.input.value,content:content.input.value,source:source||'mail-studio',openSeconds:Number(select.value)})});message(`Poruka je poslana. Sadržaj vrijedi ${Number(select.value)/60} min nakon otvaranja ili 24 sata ako nije otvoren.`,'success');setTimeout(()=>location.href=(data.statusUrl||`/email-status?source=${enc(source)}&search=${enc(data.id)}`)+`&from=${enc(current)}`,900);}catch(error){message(`Poruka nije poslana: ${error.message}`,'error');}});
  body.append(recipient.wrap,subject.wrap,content.wrap,expiry,el('div',{class:'gnk-et-row'},[submit]));
 }));
}
if(source==='mail-studio'){
 addButton('Zakaži slanje','do 5 aktivnih poruka',()=>modal('Zakaži trenutnu poruku',({body,message,close})=>{
  const composer=window.GNK_ASG_MAIL_STUDIO_COMPOSER;if(!composer){message('Mail Studio uređivač još nije spreman. Zatvorite prozor i pokušajte ponovno.','error');return;}
  const issues=composer.validation();if(issues.length){message(issues[0],'error');return;}
  const date=new Date(Date.now()+10*60000),pad=n=>String(n).padStart(2,'0');
  const initial=`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const when=field('Datum i vrijeme slanja','datetime-local',initial);const submit=el('button',{class:'gnk-et-primary',type:'button',text:'Zakaži poruku'});
  submit.onclick=()=>run(submit,async()=>{try{const scheduled=new Date(when.input.value);if(!Number.isFinite(scheduled.getTime()))throw new Error('Datum ili vrijeme nisu ispravni.');const data=await api('/api/studio-message/schedule',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...composer.payload(),scheduledFor:scheduled.toISOString(),scheduledTimezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Zagreb'})});composer.status(`Poruka je zakazana. Aktivno ${data.active}/${data.limit}.`);message(`Zakazano za ${new Date(data.scheduledFor).toLocaleString('hr-HR')}. Aktivno ${data.active}/${data.limit}.`,'success');setTimeout(close,1100);}catch(error){message(`Zakazivanje nije uspjelo: ${error.message}`,'error');}});
  body.append(when.wrap,el('div',{class:'gnk-et-row'},[submit]));
 }));
 addButton('Zakazane poruke','pregled i otkazivanje',()=>modal('Zakazane poruke',async({body,message})=>{
  message('Učitavanje…');try{const data=await api(`/api/studio-message/scheduled?cb=${Date.now()}`),items=data.items||[];message(`Aktivno ${data.active}/${data.limit}.`,'success');const list=el('div',{class:'gnk-et-list'});if(!items.length)list.append(el('div',{class:'gnk-et-item',text:'Nema zakazanih poruka.'}));for(const item of items.slice(0,30)){
   const card=el('div',{class:'gnk-et-item'}),active=['SCHEDULED','DEFERRED'].includes(item.status);
   card.append(el('strong',{text:item.subject||'(bez predmeta)'}),el('div',{class:'gnk-et-meta',text:`${(item.to||[]).join(', ')} · ${new Date(item.scheduled_for).toLocaleString('hr-HR')} · ${item.status}`}));
   if(active){const cancel=el('button',{class:'gnk-et-cancel',type:'button',text:'Otkaži'});cancel.onclick=()=>run(cancel,async()=>{try{await api(`/api/studio-message/scheduled/${enc(item.id)}/cancel`,{method:'POST'});card.remove();message('Zakazana poruka je otkazana.','success');}catch(error){message(`Otkazivanje nije uspjelo: ${error.message}`,'error');}});card.append(cancel);}list.append(card);
  }body.append(list);}catch(error){message(`Red zakazanih poruka nije dostupan: ${error.message}`,'error');}
 }));
}
root.append(panel,launcher);document.body.append(root);
})();
