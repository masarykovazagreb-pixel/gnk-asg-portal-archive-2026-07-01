(() => {
  'use strict';
  if (window.__GNK_ASG_MEDIA_COMMAND_NAV_V20__) return;
  window.__GNK_ASG_MEDIA_COMMAND_NAV_V20__ = true;
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const routes=['/admin-center','/media-command-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/auto-editor','/news-admin','/pdf-publisher','/social-share','/wa-center','/review'];
  if(!routes.some(route=>path===route||path.startsWith(`${route}/`)))return;
  const items=[
    ['Admin','/admin-center/','⚙','Glavni sigurni ulaz'],
    ['Komandni centar','/media-command-center/','◎','Globalni mediji, slanje i prijave'],
    ['Operator','/operator-dashboard/','▣','Status, inbox i postavke'],
    ['Mail Studio','/mail-studio/','✉','Poruke, potpisi i pretinci'],
    ['Auto Editor','/auto-editor/','✎','Objave i automatizacija'],
    ['News Admin','/news-admin/','◫','Upravljanje vijestima'],
    ['PDF Publisher','/pdf-publisher/','▤','PDF dokumenti i objava'],
    ['Social Share','/social-share/','↗','Dijeljenje sadržaja'],
    ['WhatsApp','/wa-center/','◉','WhatsApp centar'],
    ['Mobilni Admin','/operator-mobile/','▯','Mobilni operatorski sloj'],
    ['Portal','/','⌂','Povratak na javni portal']
  ];
  const routePath=href=>{try{return new URL(href,location.origin).pathname.replace(/\/+$/,'')||'/';}catch{return href;}};
  const active=href=>{const target=routePath(href);return target==='/'?path==='/':path===target||path.startsWith(`${target}/`);};
  const linkMarkup=([label,href,icon,description])=>`<a href="${href}" class="${active(href)?'active':''}" title="${description}"><i aria-hidden="true">${icon}</i>${label}</a>`;
  const createShell=()=>{
    const shell=document.createElement('header');shell.id='gnk-backend-shell';shell.className='gnk-admin-shell-lite';
    shell.innerHTML=`<div class="gnk-shell-wrap"><div class="gnk-shell-top"><a class="gnk-shell-brand" href="/admin-center/" aria-label="GNK ASG Admin Center"><span class="gnk-admin-lite-logo" aria-hidden="true"><i></i><i></i><i></i></span><span><strong>GNK ASG Admin</strong><span>Secure Operations Layer</span></span></a><nav class="gnk-shell-nav" aria-label="GNK ASG administratorska navigacija">${items.map(linkMarkup).join('')}</nav></div></div>`;
    document.body.prepend(shell);return shell;
  };
  const ensureNav=()=>{
    const shell=document.getElementById('gnk-backend-shell')||createShell();
    const nav=shell.querySelector('.gnk-shell-nav');if(!nav)return shell;
    const existing=nav.querySelector('a[href^="/media-command-center"]');
    if(!existing){
      const admin=nav.querySelector('a[href^="/admin-center"]'),holder=document.createElement('div');holder.innerHTML=linkMarkup(items[1]);
      const link=holder.firstElementChild;if(admin)admin.insertAdjacentElement('afterend',link);else nav.prepend(link);
    }
    nav.querySelectorAll('a').forEach(link=>link.classList.toggle('active',active(link.getAttribute('href')||'')));
    document.body.classList.add('gnk-backend-ui','gnk-admin-unified-v7',`gnk-admin-route-${path.replace(/^\//,'').replace(/\//g,'-')||'admin'}`);
    return shell;
  };
  const ensureLauncher=()=>{
    const grid=document.querySelector('#gnk-admin-module-launcher-v7 .gnk-admin-launcher-grid');if(!grid||grid.querySelector('a[href^="/media-command-center"]'))return;
    const holder=document.createElement('div');holder.innerHTML='<a href="/media-command-center/"><i aria-hidden="true">◎</i><span><strong>Komandni centar</strong><small>Globalni mediji, kampanja, prijave i dokumenti</small></span></a>';grid.prepend(holder.firstElementChild);
  };
  let applying=false;
  const apply=()=>{if(applying)return;applying=true;try{ensureNav();ensureLauncher();}finally{applying=false;}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  [100,350,900,1800].forEach(delay=>setTimeout(apply,delay));
  let queued=false;new MutationObserver(()=>{if(applying||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});}).observe(document.documentElement,{childList:true,subtree:true});
})();
