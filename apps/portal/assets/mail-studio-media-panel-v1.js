(()=>{
  'use strict';
  const RELEASE='GNK_ASG_MAIL_STUDIO_MEDIA_PANEL_V1_20260628';
  if(window.__GNK_ASG_MAIL_STUDIO_MEDIA_PANEL__===RELEASE)return;
  window.__GNK_ASG_MAIL_STUDIO_MEDIA_PANEL__=RELEASE;
  const $=id=>document.getElementById(id);

  function installStyle(){
    if($('gnkMailMediaPanelStyle'))return;
    const style=document.createElement('style');
    style.id='gnkMailMediaPanelStyle';
    style.textContent='.gnk-media-launch-panel{border:1px solid rgba(214,173,79,.28);border-radius:18px;background:linear-gradient(145deg,rgba(185,139,45,.12),rgba(255,255,255,.04));padding:14px;margin-bottom:12px}.gnk-media-launch-panel h3{margin:0 0 7px;color:#f4d37a;font-size:13px;text-transform:uppercase;letter-spacing:.08em}.gnk-media-launch-panel p{margin:0 0 11px;color:#d1d5db;font-size:12px;line-height:1.5}.gnk-media-launch-actions{display:flex;gap:8px;flex-wrap:wrap}.gnk-media-workspace{position:fixed;inset:0;z-index:2147483000;display:grid;grid-template-rows:auto 1fr;background:#07101f}.gnk-media-workspace[hidden]{display:none!important}.gnk-media-workspace__bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;border-bottom:1px solid rgba(214,173,79,.3);background:#0b1729}.gnk-media-workspace__bar strong{color:#f4d37a}.gnk-media-workspace__actions{display:flex;gap:8px;flex-wrap:wrap}.gnk-media-workspace iframe{width:100%;height:100%;border:0;background:#07101f}';
    document.head.appendChild(style);
  }

  function ensurePanel(){
    if($('gnkMailMediaLaunchPanel'))return;
    const side=document.querySelector('.side');
    if(!side)return;
    const panel=document.createElement('section');
    panel.id='gnkMailMediaLaunchPanel';
    panel.className='gnk-media-launch-panel';
    panel.innerHTML='<h3>Slanje medijima</h3><p>Otvori postojeći Media Command Center za bazu medija, odobrenja, pristupne kodove i kontrolirano slanje. Otvaranje modula ne šalje poruku.</p><div class="gnk-media-launch-actions"><button type="button" class="gold" id="openMediaWorkspace">Otvori slanje medijima</button><a href="/media-command-center/" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;padding:9px 12px;border:1px solid rgba(214,173,79,.35);border-radius:999px;color:#fff;text-decoration:none;font-size:11px;font-weight:900;text-transform:uppercase">Otvori zasebno</a></div>';
    side.prepend(panel);
  }

  function ensureWorkspace(){
    if($('gnkMediaWorkspace'))return $('gnkMediaWorkspace');
    const workspace=document.createElement('section');
    workspace.id='gnkMediaWorkspace';
    workspace.className='gnk-media-workspace';
    workspace.hidden=true;
    workspace.setAttribute('aria-label','GNK ASG slanje medijima');
    workspace.innerHTML='<div class="gnk-media-workspace__bar"><div><strong>GNK ASG · Slanje medijima</strong><div class="small">Postojeći sigurni Media Command Center</div></div><div class="gnk-media-workspace__actions"><a href="/media-command-center/" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;padding:8px 11px;border:1px solid rgba(214,173,79,.35);border-radius:999px;color:#fff;text-decoration:none;font-size:10px;font-weight:900;text-transform:uppercase">Zasebni prozor</a><button type="button" id="closeMediaWorkspace">Zatvori</button></div></div><iframe id="gnkMediaWorkspaceFrame" title="GNK ASG Media Command Center" allow="clipboard-read; clipboard-write"></iframe>';
    document.body.appendChild(workspace);
    return workspace;
  }

  function openWorkspace(){
    const workspace=ensureWorkspace();
    const frame=$('gnkMediaWorkspaceFrame');
    if(frame&&!frame.src)frame.src='/media-command-center/?embedded=1&source=mail-studio';
    workspace.hidden=false;
    document.body.style.overflow='hidden';
    $('closeMediaWorkspace')?.focus();
    const status=$('status');if(status)status.textContent='Media Command Center otvoren. Ništa nije poslano.';
  }

  function closeWorkspace(){
    const workspace=$('gnkMediaWorkspace');
    if(workspace)workspace.hidden=true;
    document.body.style.overflow='';
    $('openMediaWorkspace')?.focus();
  }

  function boot(){
    installStyle();
    ensurePanel();
    new MutationObserver(ensurePanel).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',event=>{
      if(event.target.closest?.('#openMediaWorkspace')){event.preventDefault();openWorkspace();return;}
      if(event.target.closest?.('#closeMediaWorkspace')){event.preventDefault();closeWorkspace();}
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('gnkMediaWorkspace')?.hidden)closeWorkspace();});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
