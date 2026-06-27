(()=>{
  'use strict';
  if(window.__GNK_ASG_MOBILE_NAVIGATION_V20__)return;
  window.__GNK_ASG_MOBILE_NAVIGATION_V20__=true;
  const ITEMS=[
    {key:'editor',icon:'✎',title:'Auto Editor',detail:'Zaštićeni urednički radni prostor i automatizacija objava.',url:'/auto-editor/'},
    {key:'pdf',icon:'▤',title:'PDF centar',detail:'Financijski izvještaji, certifikati i službeni PDF dokumenti.',url:'/downloads/'},
    {key:'legal',icon:'§',title:'Legal',detail:'Uvjeti korištenja, privatnost i pravne informacije.',url:'/legal/'}
  ];
  function make(item){
    const link=document.createElement('a');
    link.className='module-card standard mobile-v20-card';
    link.dataset.mobileV20=item.key;
    link.href=item.url;
    link.setAttribute('aria-label',`${item.title}: ${item.detail}`);
    const icon=document.createElement('span');icon.className='module-icon';icon.textContent=item.icon;
    const title=document.createElement('strong');title.textContent=item.title;
    const detail=document.createElement('small');detail.textContent=item.detail;
    const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='Otvori ›';
    link.append(icon,title,detail,arrow);
    return link;
  }
  function apply(){
    const grid=document.getElementById('moduleGrid');
    const title=document.getElementById('modeTitle');
    if(!grid||!title)return;
    const standard=title.textContent.trim()==='Standard';
    grid.querySelectorAll('.mobile-v20-card').forEach(node=>node.remove());
    if(!standard)return;
    const media=[...grid.children].find(node=>node.textContent.includes('Media Kit'))||null;
    ITEMS.forEach(item=>grid.insertBefore(make(item),media));
    const description=document.getElementById('heroDescription');
    if(description)description.textContent='Standard način pruža brz pristup vijestima, objavama, tržištima, Auto Editoru, PDF centru, Legal dokumentaciji i AI pomoći.';
  }
  const schedule=()=>[0,80,240,700].forEach(delay=>setTimeout(apply,delay));
  document.addEventListener('click',event=>{if(event.target.closest('[data-mode]'))schedule()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.addEventListener('pageshow',schedule);
})();
