(()=>{
  // Disabled tonight: this unconditionally appended extra items
  // (O nama, Projekti, THE CODE, Workeri, Kontakt, and a publicly-
  // visible Admin link) to the standardized #navLinks on every page.
  const addPortalLinks=()=>{};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addPortalLinks,{once:true});
  else addPortalLinks();
})();