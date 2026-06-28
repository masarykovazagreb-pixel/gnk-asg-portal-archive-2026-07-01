(()=>{
  'use strict';
  if(window.__GNK_ASG_ADMIN_FRAME_BRIDGE_V1__)return;
  window.__GNK_ASG_ADMIN_FRAME_BRIDGE_V1__=true;
  const frame=document.getElementById('moduleFrame');
  const loading=document.getElementById('workspaceLoading');
  const error=document.getElementById('workspaceError');
  const errorText=document.getElementById('workspaceErrorText');
  if(!frame||!loading||!error)return;
  const expected=()=>new URL(frame.getAttribute('src')||'about:blank',location.origin).searchParams.get('hubmodule')||'';
  const showReady=()=>{
    frame.dataset.moduleReady='1';
    frame.hidden=false;
    loading.hidden=true;
    error.hidden=true;
  };
  const showError=message=>{
    frame.hidden=false;
    loading.hidden=true;
    error.hidden=false;
    if(errorText)errorText.textContent=message;
  };
  addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
    const data=event.data||{};
    if(data.type!=='GNK_ADMIN_MODULE_READY')return;
    if(data.module&&expected()&&data.module!==expected())return;
    showReady();
  });
  frame.addEventListener('load',()=>{
    frame.dataset.moduleReady='0';
    setTimeout(()=>{
      if(frame.dataset.moduleReady==='1')return;
      try{
        const requested=new URL(frame.getAttribute('src')||'',location.origin).pathname.replace(/\/+$/,'')||'/';
        const current=frame.contentWindow.location.pathname.replace(/\/+$/,'')||'/';
        if(current!==requested){showError(`Modul je preusmjeren na ${current}.`);return;}
        if(frame.contentDocument?.documentElement)showReady();
      }catch(_){showReady();}
    },900);
  },true);
})();