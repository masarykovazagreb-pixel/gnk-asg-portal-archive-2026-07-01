(()=>{
'use strict';
if(window.__GNK_ASG_REFERENCE_CODE_V1__)return;
window.__GNK_ASG_REFERENCE_CODE_V1__=true;
const VERSION='GNK_ASG_MAIL_STUDIO_REFERENCE_CODE_V1_20260709';
const CENTERS=[['ZAG','Zagreb'],['TOR','Toronto'],['MEX','Mexico City'],['BOG','Bogota'],['SAO','Sao Paulo'],['DXB','Dubai'],['SIN','Singapore'],['TYO','Tokyo'],['CAS','Casablanca'],['BLD','Boulder']];
const RE=/GNK-\d{8}-[A-Z0-9]{3}-[A-F0-9]{8}/;
let bypass=false;
const $=id=>document.getElementById(id);
const clean=value=>String(value??'').trim();
const date=()=>new Date().toISOString().slice(0,10).replace(/-/g,'');
function status(text){const node=$('status');if(node)node.textContent=text;}
function emailList(text){return (clean(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[]).map(x=>x.toLowerCase());}
async function sha(value){const bytes=new TextEncoder().encode(String(value));const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function buildReference(){
  const to=emailList($('to')?.value||'').join(',')||'manual';
  const subject=clean($('subject')?.value);
  const body=clean($('bodyText')?.value);
  const existing=[subject,body].join('\n').match(RE)?.[0];
  if(existing)return existing;
  const identity=to.split(',')[0]||'manual';
  const identityHash=await sha(identity);
  const center=CENTERS[parseInt(identityHash.slice(0,8),16)%CENTERS.length];
  const fingerprint=await sha([identity,subject,body,date()].join('|'));
  return `GNK-${date()}-${center[0]}-${fingerprint.slice(0,8).toUpperCase()}`;
}
function setValue(id,value){const node=$(id);if(!node)return;node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));}
async function enforceReference(){
  const subjectNode=$('subject'),bodyNode=$('bodyText');
  if(!subjectNode||!bodyNode)return null;
  const reference=await buildReference();
  const subject=clean(subjectNode.value);
  const body=clean(bodyNode.value);
  if(!RE.test(subject))setValue('subject',`[${reference}] ${subject}`.slice(0,240));
  if(!RE.test(body))setValue('bodyText',`Broj predmeta: ${reference}\n\n${body}`.trim());
  try{localStorage.setItem(`gnk_asg_reference_${reference}`,JSON.stringify({reference,subject:subjectNode.value,to:$('to')?.value||'',createdAt:new Date().toISOString()}));}catch{}
  status(`Reference code assigned: ${reference}`);
  return reference;
}
function renderBadge(){
  if($('referenceCodeBadge'))return;
  const target=$('validationSummary')||$('send')?.parentElement;
  if(!target)return;
  const badge=document.createElement('div');
  badge.id='referenceCodeBadge';
  badge.className='small ok';
  badge.textContent=`${VERSION}: reference code will be assigned before SEND.`;
  target.parentNode.insertBefore(badge,target.nextSibling);
}
function bind(){
  renderBadge();
  const send=$('send');
  if(!send||send.dataset.referenceGuard==='1')return;
  send.dataset.referenceGuard='1';
  send.addEventListener('click',event=>{
    if(bypass)return;
    event.stopImmediatePropagation();
    event.preventDefault();
    enforceReference().then(()=>{
      bypass=true;
      send.click();
      setTimeout(()=>{bypass=false;},0);
    }).catch(error=>status(`Reference code failed: ${error.message}`));
  },{capture:true});
}
function boot(){document.documentElement.dataset.gnkReferenceCode=VERSION;bind();setInterval(bind,1500);}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
