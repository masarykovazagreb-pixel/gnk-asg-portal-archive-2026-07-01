(()=>{'use strict';
const stage=document.querySelector('.code-stage');
const frame=document.querySelector('.code-frame');
const iframe=document.getElementById('codePreview');
if(!stage||!frame||!iframe)return;

// Keep the stable, isolated THE CODE iframe created by the index markup and
// enhanced by index-wow-v4.js. Do not replace it with a second inline copy.
stage.classList.remove('code-stage--inline');
frame.classList.remove('code-inline-host');
frame.removeAttribute('id');
frame.id='codeFrame';

// Force the corrected 7 October 2026 player revision without changing the
// surrounding public index.
try{
  const url=new URL(iframe.getAttribute('src')||'/the-code/',window.location.href);
  url.searchParams.set('embed','1');
  url.searchParams.set('v','9');
  const next=url.pathname+url.search+url.hash;
  if(iframe.getAttribute('src')!==next)iframe.setAttribute('src',next);
}catch(_){/* The original iframe URL remains usable. */}

// Defensive controls: retain the existing toolbar even if an older cached
// enhancement script did not attach its handlers.
const fullscreen=document.getElementById('codeFullscreen');
if(fullscreen&&!fullscreen.dataset.codeBound){
  fullscreen.dataset.codeBound='1';
  fullscreen.addEventListener('click',()=>{
    const target=document.getElementById('codeFrame')||iframe;
    target.requestFullscreen?.();
  });
}
const reload=document.getElementById('codeReload');
if(reload&&!reload.dataset.codeBound){
  reload.dataset.codeBound='1';
  reload.addEventListener('click',()=>{
    try{
      const url=new URL(iframe.src,window.location.href);
      url.searchParams.set('reload',Date.now().toString());
      iframe.src=url.href;
    }catch(_){iframe.src=iframe.src;}
  });
}
})();
