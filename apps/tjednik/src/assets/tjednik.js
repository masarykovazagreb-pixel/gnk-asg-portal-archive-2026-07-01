/* AKTUAL MEDIA BUSINESS TJEDNIK interactive editorial enhancements; no tracking */
(function(){
 'use strict';
 var clock=document.querySelector('[data-tjednik-clock]');
 function tick(){
  if(!clock)return;
  try{clock.textContent='Zagreb · '+new Intl.DateTimeFormat('hr-HR',{timeZone:'Europe/Zagreb',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());}
  catch(e){clock.textContent='Zagreb · --:--'}
 }
 function freshness(){
  document.querySelectorAll('[data-tjednik-fresh]').forEach(function(node){
   var date=Date.parse(node.getAttribute('data-tjednik-fresh')||'');
   var delta=Date.now()-date,state='unknown';
   if(Number.isFinite(date)&&delta>=0)state=delta<=86400000?'fresh':delta<=259200000?'aging':'stale';
   node.dataset.state=state;
   node.textContent=state==='fresh'?'Osvrt unutar 24 h':state==='aging'?'Osvrt stariji od 24 h':state==='stale'?'Osvrt stariji od 72 h':'Datum osvrta nije poznat';
   node.title='Starost najnovijeg stvarno objavljenog osvrta, ne stanje automatskih agenata';
  });
 }
 var article=document.querySelector('main .article'),bar=document.getElementById('tjednik-read-progress');
 function progress(){
  if(!article||!bar)return;
  var box=article.getBoundingClientRect(),total=Math.max(1,article.offsetHeight-innerHeight*.5);
  bar.style.width=Math.min(100,Math.max(0,(-box.top+innerHeight*.3)/total*100))+'%';
 }
 document.querySelectorAll('[data-tjednik-copy]').forEach(function(btn){
  btn.addEventListener('click',function(){
   var url=btn.getAttribute('data-tjednik-copy')||location.href;
   if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(function(){btn.textContent='Poveznica kopirana'}).catch(function(){btn.textContent='Kopirajte iz adresne trake'});
   }
  });
 });
 tick();freshness();progress();
 setInterval(tick,60000);setInterval(freshness,300000);
 addEventListener('scroll',progress,{passive:true});addEventListener('resize',progress);
})();