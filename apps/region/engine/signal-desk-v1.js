/* AKTUAL SIGNAL: local, privacy-preserving archive filtering. No remote requests. */
(function(){
  'use strict';
  function fold(value){
    return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  }
  document.querySelectorAll('[data-signal-desk]').forEach(function(desk){
    var input=desk.querySelector('[data-signal-search]');
    var source=desk.querySelector('[data-signal-source]');
    var windowChoice=desk.querySelector('[data-signal-window]');
    var visible=desk.querySelector('[data-signal-visible]');
    var empty=desk.querySelector('[data-signal-empty]');
    var rows=[].slice.call(desk.querySelectorAll('[data-signal-story]'));
    if(!input||!source||!windowChoice||!visible||!empty)return;
    function refresh(){
      var query=fold(input.value).slice(0,120);
      var chosenSource=source.value,range=windowChoice.value,count=0;
      rows.forEach(function(row){
        var searchable=fold(row.getAttribute('data-search'));
        var topicSource=row.getAttribute('data-source');
        var age=row.getAttribute('data-window');
        var allowedByTime=!range||age==='day'||(range==='days'&&age==='days');
        if(range==='day')allowedByTime=age==='day';
        var display=(!query||searchable.indexOf(query)>=0)&&
          (!chosenSource||topicSource===chosenSource)&&allowedByTime;
        row.hidden=!display;
        if(display)count+=1;
      });
      visible.textContent=String(count);
      empty.hidden=count!==0;
    }
    input.addEventListener('input',refresh);
    source.addEventListener('change',refresh);
    windowChoice.addEventListener('change',refresh);
    refresh();
  });
})();