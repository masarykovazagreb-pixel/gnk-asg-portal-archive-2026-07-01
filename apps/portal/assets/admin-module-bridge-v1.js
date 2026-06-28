(()=>{
  'use strict';
  if(window.__GNK_ASG_ADMIN_MODULE_BRIDGE_V1__)return;
  window.__GNK_ASG_ADMIN_MODULE_BRIDGE_V1__=true;
  const params=new URL(location.href).searchParams;
  const moduleId=params.get('hubmodule')||location.pathname.replace(/^\/+|\/+$/g,'')||'unknown';
  const ready=()=>{
    document.documentElement.dataset.gnkAdminModuleReady='1';
    if(window.parent===window)return;
    window.parent.postMessage({type:'GNK_ADMIN_MODULE_READY',module:moduleId,path:location.pathname,title:document.title},location.origin);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();