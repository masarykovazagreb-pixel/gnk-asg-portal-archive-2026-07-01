(()=>{
  if(document.getElementById('gnk-floating-menu'))return;
  const items=[
    ['Početna','/'],['O nama','/about/'],['Projekti','/projects/'],['Workeri','/workers/'],['THE CODE','/the-code/'],['Kontakt','/contact/'],['Admin','/admin-center/']
  ];
  const style=document.createElement('style');
  style.textContent=`#gnk-floating-menu{position:fixed;right:18px;bottom:18px;z-index:99999;font-family:Arial,sans-serif}#gnk-floating-menu button{width:58px;height:58px;border-radius:50%;border:1px solid #d8b66a;background:#111;color:#d8b66a;font-weight:900;box-shadow:0 12px 38px rgba(0,0,0,.45);cursor:pointer}#gnk-floating-menu nav{display:none;position:absolute;right:0;bottom:68px;width:min(280px,calc(100vw - 32px));padding:10px;background:#0b0b0b;border:1px solid #3b3120;border-radius:18px;box-shadow:0 16px 50px rgba(0,0,0,.5)}#gnk-floating-menu.open nav{display:grid;gap:6px}#gnk-floating-menu a{display:block;padding:12px 14px;border-radius:11px;color:#f5f2ea;text-decoration:none;background:#12100c;border:1px solid transparent}#gnk-floating-menu a:hover,#gnk-floating-menu a:focus{border-color:#d8b66a;color:#d8b66a}#gnk-floating-menu a[aria-current="page"]{border-color:#d8b66a;color:#d8b66a}@media(max-width:700px){#gnk-floating-menu{right:12px;bottom:12px}#gnk-floating-menu button{width:54px;height:54px}}`;
  document.head.appendChild(style);
  const wrap=document.createElement('div');wrap.id='gnk-floating-menu';
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Otvori izbornik');button.textContent='MENI';
  const nav=document.createElement('nav');nav.setAttribute('aria-label','Brzi izbornik');
  const current=(location.pathname.replace(/\/+$/,'')||'/');
  for(const [label,href] of items){const a=document.createElement('a');a.href=href;a.textContent=label;const target=(href.replace(/\/+$/,'')||'/');if(current===target)a.setAttribute('aria-current','page');if(label==='Admin')a.rel='nofollow';nav.appendChild(a)}
  button.addEventListener('click',()=>{const open=wrap.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.textContent=open?'ZATVORI':'MENI'});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){wrap.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='MENI'}});
  document.addEventListener('click',e=>{if(!wrap.contains(e.target)){wrap.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='MENI'}});
  wrap.append(button,nav);document.body.appendChild(wrap);
})();