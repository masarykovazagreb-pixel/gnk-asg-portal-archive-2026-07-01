(()=>{
'use strict';
if(window.__GNK_ASG_PUBLIC_MENU_V18__)return;
window.__GNK_ASG_PUBLIC_MENU_V18__=true;
const path=location.pathname.toLowerCase().replace(/\/+$/,'')||'/';
const privatePrefixes=['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/media-command-center','/media-application','/media-registration-admin','/campaign-mailer','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api','/editorial-operations','/mission-control','/registry-center','/deployment','/mobile-admin','/seo','/design-review','/enterprise','/entities','/strategy-performance','/language-review'];
if(privatePrefixes.some(prefix=>path===prefix||path.startsWith(prefix+'/')))return;
let locale='hr';if(path==='/en'||path.startsWith('/en/'))locale='en';
const en=locale==='en';
const home=en?'/en/':'/';
const labels=en?{portal:'Corporate portal',open:'Menu',close:'Close',company:'Company',code:'THE CODE',finance:'Financials',media:'Media',network:'33 + 12',workers:'Workers',contact:'Contact',language:'HR'}:{portal:'Korporativni portal',open:'Menu',close:'Zatvori',company:'Kompanija',code:'THE CODE',finance:'Financije',media:'Media',network:'33 + 12',workers:'Workeri',contact:'Kontakt',language:'EN'};
const items=[
 [labels.company,home],
 [labels.code,`/the-code/?lang=${locale}`],
 [labels.finance,`${home}${en?'#financials':'#financije'}`],
 [labels.network,'/network-map'],
 [labels.workers,'/digital-workforce/directory/'],
 [labels.media,'/media-application/?lang=en'],
 [labels.contact,en?'/en/contact/':'/contact/']
];
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function active(href){try{const url=new URL(href,location.origin);return location.pathname===url.pathname||(url.pathname!=='/'&&location.pathname.startsWith(url.pathname));}catch{return false;}}
function install(){
 if(!document.body)return;
 document.documentElement.classList.add('gnk-public-redesign-root');
 document.documentElement.lang=en?'en':'hr';
 ['gnk-public-header-v18','gnk18-floating-ai','gnk18-language-style'].forEach(id=>document.getElementById(id)?.remove());
 const style=document.createElement('style');
 style.id='gnk18-language-style';
 style.textContent='#gnk-public-header-v18{position:sticky;top:0;z-index:2147482000;border-bottom:1px solid rgba(215,173,82,.22);background:rgba(4,8,15,.92);backdrop-filter:blur(20px)}.gnk18-header-inner{width:min(1380px,calc(100% - 40px));margin:auto;display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:70px}.gnk18-brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:#fff}.gnk18-brand-mark{width:38px;height:38px;border:1px solid rgba(215,173,82,.75);border-radius:50%;background:radial-gradient(circle at 35% 25%,rgba(241,213,142,.25),rgba(10,16,27,.98) 64%)}.gnk18-brand-copy strong{display:block;font-size:14px}.gnk18-brand-copy small{display:block;color:#f1d58e;font-size:8px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.gnk18-desktop-nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}.gnk18-desktop-nav a,.gnk18-mobile-toggle{border:1px solid transparent;border-radius:999px;background:transparent;color:#edf2f8;text-decoration:none;font:900 11px/1 Inter,Arial,sans-serif;letter-spacing:.035em;padding:11px 12px}.gnk18-desktop-nav a:hover,.gnk18-desktop-nav a[aria-current="page"]{border-color:rgba(215,173,82,.42);background:rgba(215,173,82,.10);color:#f1d58e}.gnk18-mobile-toggle{display:none;border-color:rgba(215,173,82,.52);cursor:pointer}.gnk18-mobile-drawer{display:none}.gnk18-floating-ai{position:fixed;right:18px;bottom:18px;z-index:2147481500;border:1px solid rgba(215,173,82,.62);border-radius:999px;background:rgba(7,13,23,.96);color:#fff;text-decoration:none;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;padding:13px 15px;box-shadow:0 18px 48px rgba(0,0,0,.35)}@media(max-width:820px){.gnk18-header-inner{width:calc(100% - 24px);min-height:62px}.gnk18-desktop-nav{display:none}.gnk18-mobile-toggle{display:inline-flex}.gnk18-mobile-drawer{display:grid;position:fixed;inset:62px 0 auto;max-height:calc(100vh - 62px);overflow:auto;padding:14px 12px 22px;background:rgba(4,8,15,.985);opacity:0;visibility:hidden;transform:translateY(-12px);pointer-events:none;transition:.18s ease}#gnk-public-header-v18[data-drawer="open"] .gnk18-mobile-drawer{opacity:1;visibility:visible;transform:none;pointer-events:auto}.gnk18-mobile-drawer a{display:flex;justify-content:space-between;color:#fff;text-decoration:none;padding:13px 10px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:850}.gnk18-floating-ai{right:10px;bottom:10px}}';
 document.head.appendChild(style);
 const header=document.createElement('header');
 header.id='gnk-public-header-v18';
 header.dataset.drawer='closed';
 const nav=items.map(([label,href])=>`<a href="${esc(href)}"${active(href)?' aria-current="page"':''}>${esc(label)}</a>`).join('')+`<a href="${en?'/':'/en/'}">${labels.language}</a>`;
 header.innerHTML=`<div class="gnk18-header-inner"><a class="gnk18-brand" href="${home}"><span class="gnk18-brand-mark"></span><span class="gnk18-brand-copy"><strong>GNK ASG d.o.o.</strong><small>${labels.portal}</small></span></a><nav class="gnk18-desktop-nav" aria-label="Main navigation">${nav}</nav><button class="gnk18-mobile-toggle" type="button" aria-expanded="false">☰</button></div><div class="gnk18-mobile-drawer">${nav}</div>`;
 document.body.prepend(header);
 const toggle=header.querySelector('.gnk18-mobile-toggle');
 toggle?.addEventListener('click',()=>{const open=header.dataset.drawer==='open';header.dataset.drawer=open?'closed':'open';toggle.setAttribute('aria-expanded',String(!open));document.body.style.overflow=open?'':'hidden';});
 header.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{header.dataset.drawer='closed';document.body.style.overflow='';}));
 const floating=document.createElement('a');floating.id='gnk18-floating-ai';floating.className='gnk18-floating-ai';floating.href=en?'/en/assistant/':'/assistant/';floating.textContent='AI';document.body.appendChild(floating);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
