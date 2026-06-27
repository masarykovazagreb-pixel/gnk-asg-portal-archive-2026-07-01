(()=>{
  'use strict';
  const stage=document.querySelector('.code-stage');
  const frame=document.querySelector('.code-frame');
  if(!stage||!frame)return;
  const en=document.documentElement.lang==='en';

  document.querySelector('.code-launch-bar')?.remove();
  stage.classList.add('code-stage--inline');

  const tools=stage.querySelector('.code-tools');
  if(tools){
    tools.innerHTML=`<button class="code-tool" id="codeInlineFullscreen">${en?'Full screen':'Cijeli zaslon'}</button>`;
  }

  frame.className='code-inline-host';
  frame.id='codeInlineHost';
  frame.innerHTML='<div class="code-inline-mount" id="codeInlineMount"></div>';

  if(!document.querySelector('link[data-code-inline-v10]')){
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='/assets/index-code-inline-v10.css?v=20260627-v11';
    css.dataset.codeInlineV10='';
    document.head.appendChild(css);
  }

  if(!document.querySelector('script[data-code-inline-v10]')){
    const script=document.createElement('script');
    script.src='/assets/index-code-inline-v10.js?v=20260627-v11';
    script.defer=true;
    script.dataset.codeInlineV10='';
    document.head.appendChild(script);
  }
})();