(()=>{
'use strict';
const VERSION='GNK_CONTRAST_HARDENING_V2_20260714_DYNAMIC_RECHECK';
if(window.__GNK_CONTRAST_HARDENING_V2__)return;
window.__GNK_CONTRAST_HARDENING_V2__=true;
window.__GNK_CONTRAST_HARDENING_V1__=true;

const css=document.createElement('style');
css.id='gnk-contrast-hardening-style';
css.textContent=`
:root{
  --gnk-readable-light:#f8fafc;
  --gnk-readable-muted:#dbe4ef;
  --gnk-readable-gold:#f4d978;
  --gnk-readable-dark:#172033;
  --gnk-readable-link:#765019;
}
input,select,textarea{
  background:#fff!important;
  color:#07162d!important;
  border-color:#9c7a31!important;
}
input::placeholder,textarea::placeholder{color:#4b5563!important;opacity:1!important}
button{font-weight:800}

/* Known dark surfaces */
.group-section,.market,footer,.assistant-description,.gnk-code-panel,
[data-theme="dark"],.theme-dark,.dark-section,[class*="dark-panel"]{
  color:var(--gnk-readable-light)!important;
}
.group-section .section-head h2,.market .section-head h2,
.group-section h1,.group-section h2,.group-section h3,
.market h1,.market h2,.market h3,footer h1,footer h2,footer h3,
.assistant-description h1,.assistant-description h2,.assistant-description h3,
.gnk-code-panel h1,.gnk-code-panel h2,.gnk-code-panel h3{
  color:var(--gnk-readable-gold)!important;
}
.group-section p,.group-section li,.group-section dt,.group-section dd,
.market p,.market li,footer p,footer li,
.assistant-description p,.assistant-description li,.gnk-code-panel p{
  color:var(--gnk-readable-muted)!important;
}
.group-section a,.market a,footer a,.assistant-description a,.gnk-code-panel a{
  color:var(--gnk-readable-gold)!important;
}

/* Index group cards: prevent white-on-white and translucent inheritance errors */
html .group-section .group-card{
  background:#10233f!important;
  color:var(--gnk-readable-light)!important;
  border-color:rgba(244,217,120,.48)!important;
}
html .group-section .group-card .fact{
  border-bottom-color:rgba(219,228,239,.18)!important;
}
html .group-section .group-card .fact dt{
  color:#dbe4ef!important;
}
html .group-section .group-card .fact dd,
html .group-section .group-card .fact dd a{
  color:#f8fafc!important;
}
html .group-section .group-card h3{
  color:#f4d978!important;
}
html .group-section .group-kpis div{
  background:#2a3d5b!important;
  border:1px solid rgba(219,228,239,.14)!important;
}
html .group-section .group-kpis small{
  color:#f8fafc!important;
}
html .group-section .group-kpis strong{
  color:#f4d978!important;
}

/* Known light surfaces */
.card,.kpi,.tech-card,.news-card,.doc,.profile-board,.article-body,
.gnk-card,.gnk-panel,.gnk-index-panel,.chat{
  color:var(--gnk-readable-dark)!important;
}
.card p,.kpi p,.tech-card p,.news-card p,.doc p,.profile-board p,
.article-body p,.article-body li,.gnk-card p,.gnk-panel p,.gnk-index-panel p,.chat p{
  color:#344054!important;
}
.card h1,.card h2,.card h3,.kpi h1,.kpi h2,.kpi h3,
.tech-card h1,.tech-card h2,.tech-card h3,.news-card h1,.news-card h2,.news-card h3,
.doc h1,.doc h2,.doc h3,.profile-board h1,.profile-board h2,.profile-board h3,
.article-body h1,.article-body h2,.article-body h3,.gnk-card h1,.gnk-card h2,.gnk-card h3,
.gnk-panel h1,.gnk-panel h2,.gnk-panel h3,.gnk-index-panel h1,.gnk-index-panel h2,.gnk-index-panel h3{
  color:#07162d!important;
}
.article-body a,.card a,.kpi a,.tech-card a,.news-card a,.doc a,.profile-board a,
.gnk-card a,.gnk-panel a,.gnk-index-panel a{
  color:var(--gnk-readable-link)!important;
}

.editorial-card{
  background:linear-gradient(145deg,#152d4c,#07111f)!important;
  border-color:#b58c39!important;
}
.editorial-card h2{color:#fff!important}
.editorial-card p{color:#dbe4ef!important}
.contact-status,.small,.note,.status,.message .meta{color:inherit!important}
#gnk-unified-header,#gnk-unified-header *{forced-color-adjust:none}
`;
document.head.appendChild(css);

function parseColor(value){
  const text=String(value||'').trim();
  const rgba=text.match(/^rgba?\(([^)]+)\)$/i);
  if(rgba){
    const parts=rgba[1].split(',').map(v=>Number(v.trim()));
    return {r:parts[0]||0,g:parts[1]||0,b:parts[2]||0,a:parts.length>3?Math.max(0,Math.min(1,parts[3])):1};
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
    const color=parseColor(getComputedStyle(node).backgroundColor);
    if(color&&color.a>0)layers.push(color);
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
  return size>=24||(size>=18.66&&weight>=700)?3:4.5;
}
function preferredColor(el,bg){
  const dark=luminance(bg)<.42;
  const accent=el.matches('h1,h2,h3,h4,h5,h6,a,label,legend,strong,.eyebrow,.gnk-meta,.tag');
  if(dark)return accent?'#f4d978':'#f8fafc';
  return accent?'#765019':'#172033';
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
const selector='p,li,dd,dt,label,small,strong,span,a,button,h1,h2,h3,h4,h5,h6,td,th,legend,input,select,textarea';
function repair(root=document){
  if(root instanceof Element&&root.matches(selector))repairElement(root);
  root.querySelectorAll?.(selector).forEach(repairElement);
  document.documentElement.dataset.gnkContrast='hardened-v2';
  document.documentElement.dataset.gnkContrastVersion=VERSION;
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
observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
setTimeout(()=>observer.disconnect(),180000);

if('ResizeObserver'in window){
  const resize=new ResizeObserver(()=>queueRepair(document));
  resize.observe(document.documentElement);
  setTimeout(()=>resize.disconnect(),180000);
}
})();