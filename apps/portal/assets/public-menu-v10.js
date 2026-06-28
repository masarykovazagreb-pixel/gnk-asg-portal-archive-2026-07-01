(()=>{
  'use strict';
  const RELEASE='GNK_ASG_PUBLIC_MENU_V17_CORE_20260628';
  if(document.documentElement.dataset.gnkPublicMenu===RELEASE)return;
  document.documentElement.dataset.gnkPublicMenu=RELEASE;
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const en=document.documentElement.lang==='en'||path==='/en'||path.startsWith('/en/')||path.startsWith('/markets');
  const labels=en?{finance:'Financials',network:'Network',markets:'Markets',contact:'Contact',language:'HR',open:'Open menu',close:'Close menu'}:{finance:'Financije',network:'Mreža',markets:'Tržišta',contact:'Kontakt',language:'EN',open:'Otvori izbornik',close:'Zatvori izbornik'};
  const links=[
    ['THE CODE',en?'/en/#the-code':'/#the-code'],
    [labels.finance,en?'/en/#financials':'/#financije'],
    [labels.network,en?'/en/#network':'/#mreza'],
    [labels.markets,en?'/markets/':'/trzista/'],
    [labels.contact,en?'/en/contact/':'/contact/'],
    ['Admin','/admin-center/'],
    [labels.language,en?'/':'/en/']
  ];
  document.querySelectorAll('.gnk-public-menu-v10,.gnk-public-menu-v15,.gnk-public-float-v10,.gnk-public-float-v15,.public-float--home,.public-float--ai,.floating-home,.floating-ai').forEach(node=>node.remove());
  const header=document.createElement('header');
  header.className='gnk-public-menu-v10 gnk-public-menu-v15';
  header.dataset.release=RELEASE;
  header.dataset.menuItems='7';
  header.innerHTML=`<div class="gnk-public-menu-v10__inner"><a class="gnk-public-menu-v10__brand" href="${en?'/en/':'/'}"><span class="gnk-index-brand-name"><strong>GNK ASG d.o.o.</strong></span><i class="gnk-index-brand-divider"></i><span class="gnk-index-brand-name"><strong>GNK DINAMO Ltd.</strong></span></a><button class="gnk-public-menu-v10__toggle" type="button" aria-expanded="false" aria-label="${labels.open}">☰</button><nav class="gnk-public-menu-v10__nav">${links.map(([label,url],index)=>`<a href="${url}"${index===5?' rel="nofollow"':''}${index===6?' data-lang':''}>${label}</a>`).join('')}</nav></div>`;
  document.body.prepend(header);
  document.body.classList.add('gnk-public-shell-active');
  const toggle=header.querySelector('.gnk-public-menu-v10__toggle');
  const open=value=>{header.classList.toggle('is-open',value);toggle.setAttribute('aria-expanded',String(value));toggle.setAttribute('aria-label',value?labels.close:labels.open);toggle.textContent=value?'×':'☰';};
  toggle.addEventListener('click',()=>open(!header.classList.contains('is-open')));
  header.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>open(false)));
})();
