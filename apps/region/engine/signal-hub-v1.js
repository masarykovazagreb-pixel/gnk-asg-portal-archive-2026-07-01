/* AKTUAL SIGNAL global directory — first-party, no network requests or tracking. */
(function(){
 'use strict';
 function normalize(text){return String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
 var root=document.querySelector('[data-sh-directory]');if(!root)return;
 var search=root.querySelector('[data-sh-search]'),select=root.querySelector('[data-sh-continent]');
 var count=root.querySelector('[data-sh-count]'),empty=root.querySelector('[data-sh-empty]');
 var cards=[].slice.call(root.querySelectorAll('[data-sh-card]'));
 if(!search||!select||!count||!empty)return;
 function refresh(){
  var query=normalize(search.value).slice(0,140),region=select.value,visible=0;
  cards.forEach(function(card){
   var sameRegion=!region||card.dataset.continent===region;
   var sameText=!query||normalize(card.dataset.name).indexOf(query)!==-1;
   card.hidden=!(sameRegion&&sameText);
   if(!card.hidden)visible++;
  });
  count.textContent=String(visible);
  empty.hidden=visible!==0;
 }
 search.addEventListener('input',refresh);
 select.addEventListener('change',refresh);
 refresh();
})();