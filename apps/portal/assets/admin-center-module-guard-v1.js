(()=>{
  'use strict';
  const RELEASE='GNK_ASG_ADMIN_CENTER_MODULE_GUARD_V1_20260628';
  if(window.__GNK_ASG_ADMIN_CENTER_MODULE_GUARD_V1__===RELEASE)return;
  window.__GNK_ASG_ADMIN_CENTER_MODULE_GUARD_V1__=RELEASE;

  const ERROR_PATTERNS=[
    /404\s+not\s+found/i,
    /not\s+found/i,
    /application\s+error/i,
    /internal\s+server\s+error/i,
    /worker\s+threw/i,
    /missing\s+module/i
  ];
  const READY_SELECTORS=['.studio','.mail-studio','[data-mail-studio]','#status','#preview','form','main','section'];

  function $(id){return document.getElementById(id)}
  function setText(id,value){const node=$(id);if(node)node.textContent=value}
  function setWorkspaceError(message){
    const loading=$('workspaceLoading'),error=$('workspaceError'),frame=$('moduleFrame');
    if(loading)loading.hidden=true;
    if(error)error.hidden=false;
    if(frame)frame.hidden=true;
    setText('workspaceErrorText',message);
  }
  function clearWorkspaceError(){
    const error=$('workspaceError');
    if(error)error.hidden=true;
  }
  function inspectFrame(){
    const frame=$('moduleFrame');
    if(!frame)return;
    let doc;
    try{doc=frame.contentDocument||frame.contentWindow?.document}catch(error){return}
    if(!doc)return;
    const href=String(frame.dataset.route||frame.getAttribute('src')||'');
    const text=`${doc.title||''}\n${doc.body?.innerText||''}`.trim();
    const hasReadySelector=READY_SELECTORS.some(selector=>doc.querySelector(selector));
    if(ERROR_PATTERNS.some(pattern=>pattern.test(text))&&!hasReadySelector){
      setWorkspaceError(`Modul ${href||''} vratio je grešku umjesto radnog sučelja. Pokušajte osvježiti modul ili provjerite backend rutu.`);
      return;
    }
    if(href.includes('/mail-studio/')&&!doc.querySelector('#send')&&!doc.querySelector('#status')){
      setWorkspaceError('Mail Studio se učitao, ali nedostaju ključni elementi za slanje i status. Provjerite /mail-studio/ bundle prije produkcijskog slanja.');
      return;
    }
    clearWorkspaceError();
    frame.hidden=false;
    window.dispatchEvent(new CustomEvent('gnk-asg-admin-module-guard-ok',{detail:{route:href,release:RELEASE}}));
  }
  function bind(){
    const frame=$('moduleFrame');
    if(!frame||frame.dataset.moduleGuardBound)return;
    frame.dataset.moduleGuardBound='1';
    frame.addEventListener('load',()=>setTimeout(inspectFrame,80),true);
    document.addEventListener('click',event=>{
      if(event.target?.closest?.('#heroMail,[data-module="mail"],[data-open="mail"],[data-command="mail"]')){
        setTimeout(()=>{const current=new URL(location.href).searchParams.get('module');if(current!=='mail'&&$('moduleFrame'))location.search='?module=mail';},250);
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
