(()=>{
  'use strict';
  if(window.__GNK_ASG_ADMIN_FRAME_BRIDGE_V1__)return;
  window.__GNK_ASG_ADMIN_FRAME_BRIDGE_V1__=true;
  const frame=document.getElementById('moduleFrame');
  const loading=document.getElementById('workspaceLoading');
  const error=document.getElementById('workspaceError');
  if(!frame||!loading||!error)return;
  const expected=()=>new URL(frame.getAttribute('src')||'about:blank',location.origin).searchParams.get('hubmodule')||'';
  addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
    const data=event.data||{};
    if(data.type!=='GNK_ADMIN_MODULE_READY')return;
    if(data.module&&expected()&&data.module!==expected())return;
    frame.dataset.moduleReady='1';
    frame.hidden=false;
    loading.hidden=true;
    error.hidden=true;
  });
})();