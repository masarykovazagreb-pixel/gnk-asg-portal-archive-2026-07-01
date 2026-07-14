(()=>{
'use strict';
const LEGACY_VERSION='GNK_CONTRAST_HARDENING_V2_20260714_DYNAMIC_RECHECK';
const VERSION='GNK_CONTRAST_HARDENING_V3_20260714_GRADIENT_AND_PROTECTED_UI';
if(window.__GNK_CONTRAST_HARDENING_V3__)return;
window.__GNK_CONTRAST_HARDENING_V3__=true;
window.__GNK_CONTRAST_HARDENING_V2__=true;
window.__GNK_CONTRAST_HARDENING_V1__=true;

const css=document.createElement('style');
css.id='gnk-contrast-hardening-style';
css.textContent=`
:root{
  --gnk-readable-light:#f8fafc;
  --gnk-readable-muted:#dce6f5;
  --gnk-readable-gold:#ffe08a;
  --gnk-readable-dark:#172033;
  --gnk-readable-muted-dark:#334155;
  --gnk-readable-link:#68420b;
}
input,select,textarea{
  background:#fff!important;
  color:#07162d!important;
  border-color:#8b6722!important;
}
input::placeholder,textarea::placeholder{color:#475569!important;opacity:1!important}
button{font-weight:800}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{
  outline:3px solid #fff!important;
  outline-offset:3px!important;
}
[data-theme="light"] a:focus-visible,.theme-light a:focus-visible{
  outline-color:#07162d!important;
}

/* Known dark surfaces */
.group-section,.market,footer,.assistant-description,.gnk-code-panel,
[data-theme="dark"],.theme-dark,.dark-section,[class*="dark-panel"],
html[data-gnk-email-status-dashboard="v4"] body,
html[data-gnk-email-status-dashboard="v4"] .card,
html[data-gnk-email-status-dashboard="v4"] td,
html[data-gnk-email-status-dashboard="v4"] .gnk-health,
html[data-gnk-email-status-dashboard="v4"] .gnk-status-help{
  color:var(--gnk-readable-light)!important;
}
.group-section .section-head h2,.market .section-head h2,
.group-section h1,.group-section h2,.group-section h3,
.market h1,.market h2,.market h3,footer h1,footer h2,footer h3,
.assistant-description h1,.assistant-description h2,.assistant-description h3,
.gnk-code-panel h1,.gnk-code-panel h2,.gnk-code-panel h3,
html[data-gnk-email-status-dashboard="v4"] h1,
html[data-gnk-email-status-dashboard="v4"] h2,
html[data-gnk-email-status-dashboard="v4"] h3,
html[data-gnk-email-status-dashboard="v4"] th{
  color:var(--gnk-readable-gold)!important;
}
.group-section p,.group-section li,.group-section dt,.group-section dd,
.market p,.market li,footer p,footer li,
.assistant-description p,.assistant-description li,.gnk-code-panel p,
html[data-gnk-email-status-dashboard="v4"] p,
html[data-gnk-email-status-dashboard="v4"] .muted,
html[data-gnk-email-status-dashboard="v4"] .small{
  color:var(--gnk-readable-muted)!important;
}
.group-section a,.market a,footer a,.assistant-description a,.gnk-code-panel a{
  color:var(--gnk-readable-gold)!important;
}

/* Index group cards: prevent white-on-white and translucent inheritance errors */
html .group-section .group-card{
  background:#10233f!important;
  color:var(--gnk-readable-light)!important;
  border-color:rgba(255,224,138,.55)!important;
}
html .group-section .group-card .fact{
  border-bottom-color:rgba(220,230,245,.24)!important;
}
html .group-section .group-card .fact dt{
  color:#dce6f5!important;
}
html .group-section .group-card .fact dd,
html .group-section .group-card .fact dd a{
  color:#f8fafc!important;
}
html .group-section .group-card h3{
  color:#ffe08a!important;
}
html .group-section .group-kpis div{
  background:#263c5c!important;
  border:1px solid rgba(220,230,245,.22)!important;
}
html .group-section .group-kpis small{
  color:#f8fafc!important;
}
html .group-section .group-kpis strong{
  color:#ffe08a!important;
}

/* Unambiguously light surfaces. Generic .card/.panel are intentionally excluded. */
.kpi,.tech-card,.news-card,.doc,.profile-board,.article-body{
  color:var(--gnk-readable-dark)!important;
}
.kpi p,.tech-card p,.news-card p,.doc p,.profile-board p,
.article-body p,.article-body li{
  color:var(--gnk-readable-muted-dark)!important;
}
.kpi h1,.kpi h2,.kpi h3,
.tech-card h1,.tech-card h2,.tech-card h3,.news-card h1,.news-card h2,.news-card h3,
.doc h1,.doc h2,.doc h3,.profile-board h1,.profile-board h2,.profile-board h3,
.article-body h1,.article-body h2,.article-body h3{
  color:#07162d!important;
}
.article-body a,.kpi a,.tech-card a,.news-card a,.doc a,.profile-board a{
  color:var(--gnk-readable-link)!important;
}

.editorial-card{
  background:linear-gradient(145deg,#152d4c,#07111f)!important;
  border-color:#b58c39!important;
}
.editorial-card h2{color:#fff!important}
.editorial-card p{color:#dce6f5!important}
.contact-status,.small,.note,.status,.message .meta{color:inherit!important}
#gnk-unified-header,#gnk-unified-header *{forced-color-adjust:none}

/* Protected email-status page: explicit badge and table contrast */
html[data-gnk-email-status-dashboard="v4"] .badge{
  color:#111827!important;
  text-shadow:none!important;
}
html[data-gnk-email-status-dashboard="v4"] .CONFIRMED{background:#fde68a!important;color:#713f12!important}
html[data-gnk-email-status-dashboard="v4"] .OPENED{background:#bfdbfe!important;color:#1e3a8a!important}
html[data-gnk-email-status-dashboard="v4"] .DELIVERED{background:#bbf7d0!important;color:#14532d!important}
html[data-gnk-email-status-dashboard="v4"] .ACCEPTED{background:#fef3c7!important;color:#78350f!important}
html[data-gnk-email-status-dashboard="v4"] .BOUNCED,
html[data-gnk-email-status-dashboard="v4"] .REJECTED,
html[data-gnk-email-status-dashboard="v4"] .FAILED{background:#fecaca!important;color:#7f1d1d!important}
`;
document.head.appendChild(css);

function parseColor(value){
  const text=String(value||'').trim();
  if(!text||text==='transparent')return null;
  const rgba=text.match(/^rgba?\(([^)]+)\)$/i);
  if(rgba){
    const normalized=rgba[1].replace(/\//g,',').replace(/\s+/g,',').replace(/,+/g,',');
    const parts=normalized.split(',').filter(Boolean).map(v=>Number(v.trim().replace('%','')));
    if(parts.length>=3){
      const percent=/%/.test(rgba[1]);
      return {
        r:percent?parts[0]*2.55:parts[0]||0,
        g:percent?parts[1]*2.55:parts[1]||0,
        b:percent?parts[2]*2.55:parts[2]||0,
        a:parts.length>3?Math.max(0,Math.min(1,parts[3]>1?parts[3]/100:parts[3])):1
      };
    }
  }
  const hex=text.match(/^#([0-9a-f]{3,8})$/i);
  if(hex){
    let h=hex[1];
    if(h.length===3||h.length===4)h=[...h].map(c=>c+c).join('');
    const hasAlpha=h.length===8;
    return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16),a:hasAlpha?parseInt(h.slice(6,8),16)/255:1};
  }
  return null;
}
function blend(fg,bg){
  const a=fg.a+(bg.a||1)*(1-fg.a);
  if(!a)return {r:255,g:255,b:255,a:1};
  return {
    r:(fg.r*fg.a+bg.r*(bg.a||1)*(1-fg.a))/a,
    g:(fg.g*fg.a+bg.g*(bg.a||1)*(1-fg.a))/a,
    b:(fg.b*fg.a+bg.b*(bg.a||1)*(1-fg.a))/a,
    a
  };
}
function average(colors){
  if(!colors.length)return null;
  return {
    r:colors.reduce((s,c)=>s+c.r,0)/colors.length,
    g:colors.reduce((s,c)=>s+c.g,0)/colors.length,
    b:colors.reduce((s,c)=>s+c.b,0)/colors.length,
    a:colors.reduce((s,c)=>s+c.a,0)/colors.length
  };
}
function gradientColor(value){
  const text=String(value||'');
  if(!text||text==='none')return null;
  const tokens=text.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]+\)/gi)||[];
  return average(tokens.map(parseColor).filter(Boolean));
}
function luminance(c){
  const values=[c.r,c.g,c.b].map(v=>{
    const x=Math.max(0,Math.min(255,v))/255;
    return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);
  });
  return .2126*values[0]+.7152*values[1]+.0722*values[2];
}
function ratio(a,b){
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
function effectiveBackground(el){
  const layers=[];
  let node=el;
  while(node&&node!==document){
    const style=getComputedStyle(node);
    const solid=parseColor(style.backgroundColor);
    const gradient=gradientColor(style.backgroundImage);
    if(solid&&solid.a>0)layers.push(solid);
    if(gradient&&gradient.a>0)layers.push(gradient);
    node=node.parentElement;
  }
  let out={r:255,g:255,b:255,a:1};
  for(let i=layers.length-1;i>=0;i--)out=blend(layers[i],out);
  return out;
}
function targetRatio(el){
  const style=getComputedStyle(el);
  const size=parseFloat(style.fontSize)||16;
  const weight=parseInt(style.fontWeight,10)||400;
  return size>=24||(size>=18.66&&weight>=700)?3.2:4.8;
}
function preferredColor(el,bg){
  const dark=luminance(bg)<.42;
  const accent=el.matches('h1,h2,h3,h4,h5,h6,a,label,legend,strong,summary,.eyebrow,.gnk-meta,.tag');
  if(dark)return accent?'#ffe08a':'#f8fafc';
  return accent?'#68420b':'#172033';
}
function repairElement(el){
  if(!(el instanceof Element)||el.closest('#gnk-unified-header')||el.closest('svg,canvas'))return;
  const style=getComputedStyle(el);
  if(style.visibility==='hidden'||style.display==='none'||Number(style.opacity)===0)return;
  const fg=parseColor(style.color),bg=effectiveBackground(el);
  if(!fg)return;
  const current=ratio(fg,bg),target=targetRatio(el);
  if(current+0.05<target){
    const next=preferredColor(el,bg);
    el.style.setProperty('color',next,'important');
    el.dataset.gnkContrastFixed=`${current.toFixed(2)}-${target}`;
  }else if(el.dataset.gnkContrastFixed){
    delete el.dataset.gnkContrastFixed;
  }
  el.dataset.gnkContrastCheckedAt=String(Date.now());
}
const selector='p,li,dd,dt,label,small,strong,span,a,button,h1,h2,h3,h4,h5,h6,td,th,legend,summary,code,input,select,textarea,option';
function repair(root=document){
  if(root instanceof Element&&root.matches(selector))repairElement(root);
  root.querySelectorAll?.(selector).forEach(repairElement);
  document.documentElement.dataset.gnkContrast='hardened-v3';
  document.documentElement.dataset.gnkContrastCompatibility='hardened-v2';
  document.documentElement.dataset.gnkContrastVersion=VERSION;
  document.documentElement.dataset.gnkContrastLegacyVersion=LEGACY_VERSION;
}
let queued=false;
function queueRepair(root=document){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    repair(root);
  });
}
function boot(){
  repair(document);
  [250,750,1500,3000,6000,12000,30000,60000].forEach(delay=>setTimeout(()=>repair(document),delay));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

const observer=new MutationObserver(records=>{
  let root=document;
  for(const record of records){
    if(record.type==='attributes'){root=record.target;break}
    for(const node of record.addedNodes){
      if(node.nodeType===1){root=node;break}
    }
  }
  queueRepair(root);
});
observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','data-theme']});
setTimeout(()=>observer.disconnect(),300000);

if('ResizeObserver'in window){
  const resize=new ResizeObserver(()=>queueRepair(document));
  resize.observe(document.documentElement);
  setTimeout(()=>resize.disconnect(),300000);
}
})();
