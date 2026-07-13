(()=>{
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
    document.getElementById('gnk-floating-menu')?.remove();
    document.querySelectorAll('script[data-gnk-floating-menu]').forEach(node=>node.remove());
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addPortalLinks,{once:true});
  else addPortalLinks();
})();