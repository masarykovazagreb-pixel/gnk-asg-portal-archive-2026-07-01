(()=>{
'use strict';
if(window.__GNK_ASG_PUBLIC_COLLAB_V1__)return;
window.__GNK_ASG_PUBLIC_COLLAB_V1__=true;
const VERSION='GNK_ASG_PUBLIC_COLLAB_V1_20260705';
const TARGET='[data-collaboration-matrix]';
const DATA='/data/operational-collaboration.json';
const ACCESS='/data/knowledge-access-policy.json';
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
async function read(url){const response=await fetch(url,{cache:'no-store',headers:{accept:'application/json'}});if(!response.ok)throw new Error(`${url}:${response.status}`);return response.json();}
function roleMap(data){return new Map((data.roles||[]).map(item=>[item.id,item]));}
function channelMap(data){return new Map((data.channels||[]).map(item=>[item.id,item]));}
function selectedRules(data,count=6){
 const rules=[...(data.collaborationRules||[])];
 const offset=Math.floor(Date.now()/30000)%Math.max(1,rules.length);
 return Array.from({length:Math.min(count,rules.length)},(_,index)=>rules[(offset+index)%rules.length]);
}
function statusFor(rule){
 if(rule.channel==='learning-loop')return'LEARNING';
 if(rule.channel==='review-channel')return'REVIEWING';
 if(rule.channel==='decision-room')return'DECISION FLOW';
 return'WORKFLOW ACTIVE';
}
function card(rule,roles,channels){
 const from=roles.get(rule.from)||{label:rule.from,department:''};
 const to=roles.get(rule.to)||{label:rule.to,department:''};
 const channel=channels.get(rule.channel)?.label||rule.channel;
 return `<article class="collab-card"><div class="collab-pair"><div class="collab-role"><b>${esc(from.label)}</b><small>${esc(from.department)}</small></div><span class="collab-line" aria-hidden="true"></span><div class="collab-role"><b>${esc(to.label)}</b><small>${esc(to.department)}</small></div></div><div class="collab-meta"><span class="collab-channel">${esc(channel)}</span><span class="collab-state"><i></i>${esc(statusFor(rule))}</span></div></article>`;
}
function learningItems(policy){
 const domains=policy?.sourceDomains||[];
 const preferred=['markets','projects','registries','news','books','technology'];
 return preferred.map(id=>domains.find(item=>item.id===id)).filter(Boolean).slice(0,5).map(item=>`<article class="learning-item"><header><b>${esc(item.label)}</b><strong>${esc(item.access)}</strong></header><p>${esc((item.examples||[]).join(' · '))}</p></article>`).join('');
}
function render(target,collab,access){
 const roles=roleMap(collab),channels=channelMap(collab);
 const refresh=()=>{
  const cards=selectedRules(collab).map(rule=>card(rule,roles,channels)).join('');
  const live=target.querySelector('[data-live-collab]');if(live)live.innerHTML=cards;
  const clock=target.querySelector('[data-collab-clock]');if(clock)clock.textContent=new Intl.DateTimeFormat('hr-HR',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Europe/Zagreb'}).format(new Date());
 };
 const rules=collab.collaborationRules||[];
 const learning=collab.learning||{};
 target.innerHTML=`<section class="section collab-section" id="live-collaboration"><div class="section-head"><div><p class="eyebrow">Live Communication Matrix</p><h2>Stalna suradnja, učenje i operativni rad</h2></div><p>Javno se prikazuju samo funkcionalne veze workflow profila, kanal i operativni status. Tema, sadržaj poruka, privitci i privatni identifikatori ostaju skriveni.</p></div><div class="collab-note"><b>Važno:</b> ${esc(collab.publicDisclosure||'Workflow-derived signal.')} Prikaz ne tvrdi da su fizičke osobe stvarno online niti otkriva sadržaj razgovora.</div><div class="collab-stats"><article class="collab-stat"><strong>${roles.size}</strong><span>povezanih operativnih uloga</span></article><article class="collab-stat"><strong>${rules.length}</strong><span>definiranih suradničkih veza</span></article><article class="collab-stat"><strong>${channels.size}</strong><span>internih komunikacijskih kanala</span></article><article class="collab-stat"><strong>${esc(access?.defaultAccess||'read-only')}</strong><span>zadana razina vanjskog pristupa</span></article></div><div class="collab-layout"><article class="collab-panel"><div class="collab-clock"><i></i>OPERATIVNI SIGNAL · <span data-collab-clock></span></div><h3>Tko s kim trenutačno surađuje</h3><p>Veze se rotiraju prema poslovnoj logici i prioritetima odjela. Ne prikazuje se tema razgovora.</p><div class="collab-live" data-live-collab></div></article><aside class="collab-panel"><h3>Learning & Research Loop</h3><p>AI mentor pomaže profilima čitati, provjeravati, sažimati i primjenjivati dopuštene izvore. Kritične promjene i objave zahtijevaju ljudsko odobrenje.</p><div class="learning-list">${learningItems(access)}</div><div class="source-chips"><span>službeni registri</span><span>burze i tržišta</span><span>projekti</span><span>vijesti</span><span>otvoreni podaci</span><span>legalno dostupne knjige</span></div></aside></div></section>`;
 refresh();
 const timer=setInterval(refresh,15000);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 target.dataset.collaborationVersion=VERSION;
}
async function mount(){
 const target=document.querySelector(TARGET);if(!target)return;
 try{const [collab,access]=await Promise.all([read(DATA),read(ACCESS)]);render(target,collab,access);}catch(error){target.innerHTML=`<section class="section"><div class="section-head"><div><p class="eyebrow">Live Communication Matrix</p><h2>Panel trenutačno nije dostupan</h2></div><p>${esc(error.message)}</p></div></section>`;}
}
window.GNKPublicCollaboration={VERSION,mount};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount();
})();