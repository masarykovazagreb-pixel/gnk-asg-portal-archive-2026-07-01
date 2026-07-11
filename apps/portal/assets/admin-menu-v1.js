(()=>{
  const ensureFloatingMenu=()=>{
    if(document.querySelector('script[data-gnk-floating-menu]')||document.getElementById('gnk-floating-menu'))return;
    const script=document.createElement('script');
    script.src='/assets/public-floating-menu-v1.js?v=20260711';
    script.defer=true;
    script.setAttribute('data-gnk-floating-menu','1');
    document.head.appendChild(script);
  };
  const addPortalLinks=()=>{
    const nav=document.getElementById('navLinks')||document.querySelector('.nav-links')||document.querySelector('.dhq-links');
    const items=[
      {key:'about',href:'/about/',label:'O nama'},
      {key:'projects',href:'/projects/',label:'Projekti'},
      {key:'the-code',href:'/the-code/',label:'THE CODE'},
      {key:'workers',href:'/workers/',label:'Workeri'},
      {key:'contact',href:'/contact/',label:'Kontakt'}
    ];
    if(nav){
      let admin=nav.querySelector('[data-gnk-admin-link]');
      for(const item of items){
        if(nav.querySelector(`[data-gnk-${item.key}-link]`))continue;
        const link=document.createElement('a');
        link.href=item.href;
        link.textContent=item.label;
        link.setAttribute(`data-gnk-${item.key}-link`,'1');
        if(admin)nav.insertBefore(link,admin);else nav.appendChild(link);
      }
      if(!admin){
        admin=document.createElement('a');
        admin.href='/admin-center/';
        admin.textContent='Admin';
        admin.setAttribute('data-gnk-admin-link','1');
        admin.setAttribute('rel','nofollow');
        nav.appendChild(admin);
      }
    }
    ensureFloatingMenu();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addPortalLinks,{once:true});
  else addPortalLinks();
})();