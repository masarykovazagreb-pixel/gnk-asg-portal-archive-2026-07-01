/* AKTUAL MEDIA World — exactly one unobtrusive promotional modal per browser session. */
(()=>{'use strict';
const modal=document.getElementById('amZgModal');if(!modal)return;
document.getElementById('amPromoModal')?.remove();
const key='am_world_promo_seen_20261108_v2';
let trigger=null;
const dismiss=()=>{modal.hidden=true;trigger?.focus?.();trigger=null};
const open=()=>{if(!modal.hidden)return;trigger=document.activeElement;modal.hidden=false;modal.querySelector('[data-am-zg-close]')?.focus()};
modal.querySelectorAll('[data-am-zg-close]').forEach(el=>el.addEventListener('click',dismiss));
modal.addEventListener('click',e=>{if(e.target.classList.contains('am-zg-shade'))dismiss();});
document.addEventListener('keydown',e=>{
if(modal.hidden)return;
if(e.key==='Escape'){e.preventDefault();dismiss();return}
if(e.key==='Tab'){
const focusables=[...modal.querySelectorAll('button:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);
if(!focusables.length)return;
const first=focusables[0],last=focusables[focusables.length-1];
if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
}
});
document.querySelectorAll('[data-am-zg-open]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();open()}));
let already=false;try{already=sessionStorage.getItem(key)==='1'}catch{}
if(!already){
try{sessionStorage.setItem(key,'1')}catch{}
setTimeout(()=>{if(document.visibilityState==='visible'&&!document.querySelector('dialog[open]'))open()},2500)
}
})();
