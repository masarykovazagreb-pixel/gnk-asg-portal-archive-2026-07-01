// Compatibility facade: legacy references now load the admin-first bilingual menu.
(()=>{
  const script=document.createElement('script');
  script.src='/assets/public-floating-menu-v2.js?v=20260711-admin-first';
  script.defer=true;
  document.head.appendChild(script);
})();
