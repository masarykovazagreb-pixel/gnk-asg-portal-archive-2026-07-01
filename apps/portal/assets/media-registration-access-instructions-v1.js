(()=>{
  'use strict';
  const install=()=>{
    const panel=document.getElementById('loginPanel');
    const intro=panel?.querySelector(':scope > div');
    if(!panel||!intro||document.getElementById('media-access-instructions'))return;
    const style=document.createElement('style');
    style.id='media-access-instructions-style';
    style.textContent='#media-access-instructions{margin-top:18px;padding:16px 18px;border:1px solid rgba(198,161,91,.45);border-left:4px solid #c6a15b;border-radius:12px;background:rgba(8,26,51,.72);color:#e8eef7}#media-access-instructions strong{display:block;margin-bottom:8px;color:#f2d68f;font-size:14px;letter-spacing:.04em;text-transform:uppercase}#media-access-instructions ol{margin:0;padding-left:20px}#media-access-instructions li{margin:6px 0;line-height:1.45}#media-access-instructions a{color:#f2d68f}body:not(.lang-en) #media-access-instructions{display:none}';
    document.head.appendChild(style);
    const box=document.createElement('aside');
    box.id='media-access-instructions';
    box.setAttribute('aria-label','Access instructions');
    box.innerHTML='<strong>How to continue</strong><ol><li>The landing page is publicly available.</li><li>Use the invitation reference and personal access code provided in the official email.</li><li>After successful verification, the newsroom application form opens for 12 hours.</li><li>You may save the form and return later using the same access details.</li></ol><p style="margin:10px 0 0">Support: <a href="mailto:media@gnk-asg.hr">media@gnk-asg.hr</a></p>';
    intro.appendChild(box);
    const params=new URLSearchParams(location.search);
    if((params.get('lang')||'').toLowerCase()==='en'){
      document.body.classList.add('lang-en');
      document.documentElement.lang='en';
      document.querySelectorAll('[data-lang]').forEach(button=>button.classList.toggle('active',button.dataset.lang==='en'));
      try{localStorage.setItem('gnk-media-lang','en')}catch{}
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
