(()=>{
  'use strict';
  const input=document.querySelector('#worldSearch'), rows=[...document.querySelectorAll('[data-world-country]')], sections=[...document.querySelectorAll('[data-world-region]')];
  const count=document.querySelector('#worldMatchCount'),empty=document.querySelector('#worldNoResults');
  const region=document.querySelector('#worldRegion'),language=document.querySelector('#worldLanguage'),filters=document.querySelector('#worldFilters'),reset=document.querySelector('#worldReset');
  if(!input||!rows.length)return;
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').trim();
  if(region&&language&&filters&&reset){
    for(const section of sections){
      const option=document.createElement('option');option.value=section.id;
      option.textContent=section.querySelector('h2').childNodes[0].textContent.trim();region.append(option);
    }
    const languages=[...new Set(rows.map(row=>row.dataset.language).filter(Boolean))].sort();
    let names;try{names=new Intl.DisplayNames(['hr'],{type:'language'});}catch{}
    for(const code of languages){const option=document.createElement('option');option.value=code;option.textContent=names ? `${names.of(code)} (${code})` : code;language.append(option);}
    filters.hidden=false;
    region.addEventListener('change',search);language.addEventListener('change',search);
    reset.addEventListener('click',()=>{input.value='';region.value='';language.value='';search();input.focus();});
  }
  function search(){
    const q=normalize(input.value);let n=0;
    for(const row of rows){const section=row.closest('[data-world-region]');const show=(!q||normalize(row.dataset.search).includes(q))&&(!region?.value||section.id===region.value)&&(!language?.value||row.dataset.language===language.value);row.hidden=!show;if(show)n++;}
    for(const section of sections)section.hidden=![...section.querySelectorAll('[data-world-country]')].some(row=>!row.hidden);
    if(count)count.textContent=n+' / '+rows.length+' rezultata';if(empty)empty.hidden=n!==0;
  }
  input.addEventListener('input',search);
})();
