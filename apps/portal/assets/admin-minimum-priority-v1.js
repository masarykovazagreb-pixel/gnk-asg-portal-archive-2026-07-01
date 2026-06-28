(()=>{
  'use strict';
  if(window.__GNK_ASG_ADMIN_MINIMUM_PRIORITY_V1__)return;
  window.__GNK_ASG_ADMIN_MINIMUM_PRIORITY_V1__=true;

  const ORDER=['overview','mail','media','operator','news','pdf','editor'];
  const COPY={
    mail:{label:'Mail Studio',short:'Pošta, potpisi i privici'},
    media:{label:'Media Center',short:'Mediji, prijave i pristupi'},
    operator:{label:'Operator',short:'Operativni nadzor'}
  };

  function reorder(container,attribute){
    if(!container)return;
    const nodes=[...container.querySelectorAll(`[${attribute}]`)];
    const byId=new Map(nodes.map(node=>[node.getAttribute(attribute),node]));
    ORDER.forEach(id=>{const node=byId.get(id);if(node)container.appendChild(node);});
  }

  function updateCopies(root=document){
    root.querySelectorAll('[data-module],[data-open],[data-command]').forEach(node=>{
      const id=node.dataset.module||node.dataset.open||node.dataset.command;
      const copy=COPY[id];
      if(!copy)return;
      const strong=node.querySelector('strong');
      const small=node.querySelector('small');
      if(strong)strong.textContent=copy.label;
      if(small)small.textContent=copy.short;
    });
  }

  function apply(){
    reorder(document.getElementById('moduleNav'),'data-module');
    reorder(document.getElementById('priorityGrid'),'data-open');
    reorder(document.getElementById('commandList'),'data-command');
    updateCopies();

    const heroTitle=document.getElementById('dashboardTitle');
    if(heroTitle)heroTitle.textContent='Mail Studio i Media Center na prvom mjestu';
    const heroText=document.querySelector('.dashboard-hero .hero-copy>p:not(.eyebrow)');
    if(heroText)heroText.textContent='Administracija prvo otvara siguran rad s poštom i medijima. Operator, vijesti, PDF i ostali alati ostaju dostupni u istom zaštićenom radnom prostoru.';
    const heroMail=document.getElementById('heroMail');
    if(heroMail)heroMail.textContent='Otvori Mail Studio';
    const priorityTitle=document.getElementById('priorityTitle');
    if(priorityTitle)priorityTitle.textContent='Mail Studio, Media Center i Operator';
    const priorityText=document.querySelector('#priorityTitle+p');
    if(priorityText)priorityText.textContent='Tri ključna radna toka poredana su prema dogovorenom prioritetu.';
    document.body.dataset.gnkAdminPriority='mail-media-operator-v1';
  }

  const commandList=document.getElementById('commandList');
  if(commandList)new MutationObserver(()=>{reorder(commandList,'data-command');updateCopies(commandList);}).observe(commandList,{childList:true,subtree:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  setTimeout(apply,80);
  setTimeout(apply,500);
})();