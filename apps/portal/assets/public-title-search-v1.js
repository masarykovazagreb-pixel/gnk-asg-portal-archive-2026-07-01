(() => {
  'use strict';
  const root=document.querySelector('[data-public-title-search]');
  if(!root)return;
  const form=root.querySelector('form'),input=root.querySelector('input'),scope=root.querySelector('select'),status=root.querySelector('[role="status"]'),results=root.querySelector('ol');
  const en=document.documentElement.lang?.startsWith('en');
  const msg=(hr,eng)=>en?eng:hr;
  const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
  let cache, requestId=0;
  form.addEventListener('submit',async e=>{
    e.preventDefault();const current=++requestId,term=input.value.trim().slice(0,128);results.replaceChildren();
    if(!term){status.textContent=msg('Upišite riječ ili temu.','Enter a word or topic.');input.focus();return}
    if(scope.value==='public'){location.assign('https://www.google.com/search?q='+encodeURIComponent(term));return}
    status.textContent=msg('Tražim u indeksu naslova…','Searching the title index…');
    try{
      if(!cache){const r=await fetch('/data/public-search-v1.json',{credentials:'same-origin'});if(!r.ok)throw Error('index');const d=await r.json();if(d.version!=='PUBLIC_TITLE_SEARCH_V1'||!Array.isArray(d.items))throw Error('format');cache=d.items}
      if(current!==requestId)return;
      const parts=fold(term).split(/\s+/).filter(Boolean),found=cache.filter(x=>parts.every(p=>fold(x.title).includes(p)));const n=Math.min(found.length,30);
      status.textContent=msg(`Pronađeno: ${found.length}. Prikazano: ${n}. Indeks pokriva samo odabrane odobrene naslove, ne cijeli web.`,`Found: ${found.length}. Showing: ${n}. The index covers selected approved titles, not the whole web.`);
      for(const item of found.slice(0,n)){if(typeof item.title!=='string'||typeof item.path!=='string'||!/^\/(?:[a-z0-9][a-z0-9-]*\/)+(?:[a-z0-9][a-z0-9-]*\.html)?$/.test(item.path))continue;const li=document.createElement('li'),a=document.createElement('a'),date=document.createElement('small');a.href=item.path;a.textContent=item.title;date.textContent=' · '+String(item.date||'');li.append(a,date);results.append(li)}
    }catch{if(current!==requestId)return;cache=undefined;status.textContent=msg('Indeks trenutno nije dostupan. Pokušajte ponovno ili odaberite javnu pretragu.','The index is unavailable. Try again or choose public search.')}
  });
})();
