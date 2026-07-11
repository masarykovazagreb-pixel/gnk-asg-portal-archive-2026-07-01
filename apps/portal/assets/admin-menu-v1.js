(()=>{
  const addPortalLinks=()=>{
    const nav=document.getElementById('navLinks')||document.querySelector('.nav-links')||document.querySelector('.dhq-links');
    if(!nav)return;
    let admin=nav.querySelector('[data-gnk-admin-link]');
    if(!nav.querySelector('[data-gnk-workers-link]')){
      const workers=document.createElement('a');
      workers.href='/workers/';
      workers.textContent='Workeri';
      workers.setAttribute('data-gnk-workers-link','1');
      if(admin)nav.insertBefore(workers,admin);else nav.appendChild(workers);
    }
    if(!admin){
      admin=document.createElement('a');
      admin.href='/admin-center/';
      admin.textContent='Admin';
      admin.setAttribute('data-gnk-admin-link','1');
      admin.setAttribute('rel','nofollow');
      nav.appendChild(admin);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addPortalLinks,{once:true});
  else addPortalLinks();
})();
