(()=>{
  'use strict';
  const RELEASE='GNK_ASG_ADMIN_MAIL_ONLY_V1_20260628';
  if(window.__GNK_ASG_ADMIN_MAIL_ONLY__===RELEASE)return;
  window.__GNK_ASG_ADMIN_MAIL_ONLY__=RELEASE;

  const url=new URL(location.href);
  if(url.searchParams.get('module')!=='mail'){
    url.searchParams.set('module','mail');
    history.replaceState({module:'mail'},'',url);
  }

  const prune=()=>{
    document.querySelectorAll('#moduleNav [data-module]').forEach(button=>{
      if(button.dataset.module!=='mail')button.remove();
    });
    document.querySelectorAll('#moduleNav [data-custom-module],#moduleNav [data-extension-module]').forEach(button=>button.remove());
    document.querySelectorAll('#commandList [data-command]').forEach(button=>{
      if(button.dataset.command!=='mail')button.remove();
    });
    document.querySelectorAll('#commandList [data-extension-command]').forEach(button=>button.remove());
    const command=document.getElementById('commandButton');
    if(command)command.hidden=true;
    const showAll=document.getElementById('showAllModules');
    if(showAll)showAll.hidden=true;
    document.body.dataset.adminMode='mail-only';
  };

  const install=()=>{
    prune();
    new MutationObserver(prune).observe(document.body,{childList:true,subtree:true});
    [50,200,600,1500].forEach(delay=>setTimeout(prune,delay));
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
