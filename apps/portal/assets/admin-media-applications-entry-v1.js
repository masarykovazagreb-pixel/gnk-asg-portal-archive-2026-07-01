(()=>{
'use strict';
if(window.__GNK_ADMIN_MEDIA_APPLICATIONS_ENTRY_V1__)return;
window.__GNK_ADMIN_MEDIA_APPLICATIONS_ENTRY_V1__=true;

const style=`<style id="gnkAdminMediaApplicationsEntryV1">
[data-module="mediaPortal"] .nav-copy strong:after,[data-open="mediaPortal"] strong:after{content:"ZAŠTIĆENO";display:inline-flex;margin-left:8px;padding:3px 6px;border:1px solid rgba(34,197,94,.38);border-radius:999px;color:#86efac;background:rgba(34,197,94,.08);font-size:8px;letter-spacing:.08em;vertical-align:middle}
[data-module="mediaApplications"] .nav-copy strong:after,[data-open="mediaApplications"] strong:after{content:"JAVNO";display:inline-flex;margin-left:8px;padding:3px 6px;border:1px solid rgba(59,130,246,.38);border-radius:999px;color:#93c5fd;background:rgba(59,130,246,.08);font-size:8px;letter-spacing:.08em;vertical-align:middle}
#heroMediaReview{background:linear-gradient(135deg,#b98b2d,#f3d47a)!important;color:#07101f!important;border-color:transparent!important}
</style>`;
if(!document.getElementById('gnkAdminMediaApplicationsEntryV1'))document.head.insertAdjacentHTML('beforeend',style);

function changeModule(button,{label,short}){
 if(!button)return;
 const strong=button.querySelector('.nav-copy strong, strong');
 const small=button.querySelector('.nav-copy small, small');
 if(strong)strong.childNodes[0].nodeValue=label;
 if(small)small.textContent=short;
 button.setAttribute('aria-label',`${label}: ${short}`);
}
function enhance(){
 const protectedButton=document.querySelector('[data-module="mediaPortal"]');
 const publicButton=document.querySelector('[data-module="mediaApplications"]');
 if(!protectedButton||!publicButton)return false;
 changeModule(protectedButton,{label:'Pregled media prijava',short:'Zaštićena centralna baza'});
 changeModule(publicButton,{label:'Javna media prijavnica',short:'Obrazac za redakcije'});
 const protectedCard=document.querySelector('[data-open="mediaPortal"]');
 const publicCard=document.querySelector('[data-open="mediaApplications"]');
 const commandCard=document.querySelector('[data-open="media"]');
 if(protectedCard){
   changeModule(protectedCard,{label:'Pregled media prijava',short:'Zaštićeni pregled redakcija, osoba, dokumenata, statusa i audit povijesti.'});
   const grid=protectedCard.parentElement;
   if(grid){grid.prepend(protectedCard);if(publicCard)protectedCard.insertAdjacentElement('afterend',publicCard);if(commandCard)publicCard?.insertAdjacentElement('afterend',commandCard);}
 }
 if(publicCard)changeModule(publicCard,{label:'Javna media prijavnica',short:'Isti javni link iz poslanih HTML poziva; redakcije same stvaraju i dopunjuju profil.'});
 if(commandCard)changeModule(commandCard,{label:'Media Command Center',short:'Pozivi, kampanje, statusi slanja i operativna kontrola medijskog toka.'});
 const actions=document.querySelector('.dashboard-hero .hero-actions');
 if(actions&&!document.getElementById('heroMediaReview')){
   const button=document.createElement('button');
   button.id='heroMediaReview';button.type='button';button.textContent='Pregledaj prijave';
   button.addEventListener('click',()=>document.querySelector('[data-module="mediaPortal"]')?.click());
   actions.prepend(button);
 }
 return true;
}
function install(){
 if(enhance())return;
 const observer=new MutationObserver(()=>{if(enhance())observer.disconnect();});
 observer.observe(document.documentElement,{childList:true,subtree:true});
 setTimeout(()=>observer.disconnect(),8000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
