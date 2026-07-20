(()=>{
'use strict';
if(window.__GNK_UNIFIED_DESIGN_V2__)return;window.__GNK_UNIFIED_DESIGN_V2__=true;
const path=location.pathname.replace(/\/+$/,'')||'/',isIndex=path==='/'||path==='/en';
const LOGO='/assets/logo-gnk-asg-canonical.svg?v=20260713-canonical';
if(!document.querySelector('link[href*="public-design-tokens-v1.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/public-design-tokens-v1.css?v=20260713-v2-unified';document.head.appendChild(link)}
document.documentElement.classList.add('gnk-public-design-v2');document.body?.classList.add('gnk-unified-body');const main=document.querySelector('main');if(main&&!main.classList.contains('gnk-public-main'))main.classList.add('gnk-public-main');
function canonicalLogos(root=document){root.querySelectorAll?.('img').forEach(img=>{const src=String(img.getAttribute('src')||'').toLowerCase();if(/logo-gnk-asg|gnk-asg-email-logo|logo-gnk-dinamo|the-code-logo/.test(src)){img.src=LOGO;img.alt='GNK ASG';img.dataset.gnkCanonicalLogo='1';img.removeAttribute('srcset')}})}
function removeLegacyTicker(root=document){if(isIndex)return;root.querySelectorAll?.('.ticker,#ticker,#gnk-event-bar,#gnk-compact-ticker,[data-gnk-ticker],.marquee,.news-ticker').forEach(el=>{if(!el.closest('#gnk-unified-header'))el.remove()})}
function secureLinks(root=document){root.querySelectorAll?.('a[target="_blank"]').forEach(link=>{const rel=new Set(String(link.rel||'').split(/\s+/).filter(Boolean));rel.add('noopener');rel.add('noreferrer');link.rel=[...rel].join(' ')})}
function lazyImages(root=document){root.querySelectorAll?.('img:not([loading])').forEach((img,index)=>{if(index>1)img.loading='lazy'})}
function rgba(value){const m=String(value||'').match(/rgba?\(([^)]+)\)/i);if(!m)return null;const p=m[1].split(',').map(Number);return{r:p[0]||0,g:p[1]||0,b:p[2]||0,a:p.length>3?Number(p[3]):1}}
function lum(c){const v=[c.r,c.g,c.b].map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]}
function bgFor(el){let node=el;while(node&&node!==document){const c=rgba(getComputedStyle(node).backgroundColor);if(c&&c.a>.08)return c;node=node.parentElement}return{r:255,g:255,b:255,a:1}}
function contrast(a,b){const x=lum(a),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);return(hi+.05)/(lo+.05)}
function repairContrast(root=document){const selector='p,h1,h2,h3,h4,h5,h6,li,label,small,strong,span,a,button,td,th,input,select,textarea';root.querySelectorAll?.(selector).forEach(el=>{if(el.closest('#gnk-unified-header')||el.closest('svg')||el.dataset.gnkContrastChecked==='1')return;el.dataset.gnkContrastChecked='1';const fg=rgba(getComputedStyle(el).color),bg=bgFor(el);if(!fg)return;if(contrast(fg,bg)<3){el.classList.add(lum(bg)<.32?'gnk-contrast-dark':'gnk-contrast-light')}})}
function loadMenu(){if(document.getElementById('gnk-unified-header')||document.querySelector('script[src*="public-compact-menu-v1.js"]'))return;const s=document.createElement('script');s.src='/assets/public-compact-menu-v1.js?v=20260713-unified-v4';s.defer=true;document.body.appendChild(s)}
function apply(root=document){canonicalLogos(root);removeLegacyTicker(root);secureLinks(root);lazyImages(root);repairContrast(root)}
apply();
const observer=new MutationObserver(records=>{records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)apply(node)}))});observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),90000);
document.documentElement.dataset.gnkPublicDesign='v2-unified';document.documentElement.dataset.gnkCanonicalLogo='logo-gnk-asg-canonical.svg';
})();