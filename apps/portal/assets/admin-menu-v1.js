(()=>{
  const addAdminLink=()=>{
    const nav=document.getElementById('navLinks')||document.querySelector('.nav-links')||document.querySelector('.dhq-links');
    if(!nav||nav.querySelector('[data-gnk-admin-link]'))return;
    const link=document.createElement('a');
    link.href='/admin-center/';
    link.textContent='Admin';
    link.setAttribute('data-gnk-admin-link','1');
    link.setAttribute('rel','nofollow');
    nav.appendChild(link);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addAdminLink,{once:true});
  else addAdminLink();
})();