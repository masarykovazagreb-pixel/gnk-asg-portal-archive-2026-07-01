/* WORLD 201: independent promotional dialog, no third-party tracking */
(function(){
  'use strict';
  var modal=document.getElementById('aw201Modal');
  var mini=document.getElementById('aw201Mini');
  if(!modal||!mini)return;
  var closeMini=document.getElementById('aw201MiniClose');
  var expand=document.getElementById('aw201MiniExpand');
  var sessionKey='aw201-v2:shown';
  var dismissKey='aw201-v2:mini-dismissed';
  var opened=false,lastFocus=null,timer=null;
  function read(key){try{return sessionStorage.getItem(key)==='1'}catch(e){return false}}
  function write(key){try{sessionStorage.setItem(key,'1')}catch(e){}}
  function showMini(){if(!read(dismissKey))mini.hidden=false}
  function focusables(){return Array.prototype.slice.call(modal.querySelectorAll('a[href],button:not([disabled])')).filter(function(el){return el.getClientRects().length>0})}
  function close(){
    if(!opened)return;
    opened=false;modal.hidden=true;document.documentElement.classList.remove('aw201-dialog-open');
    showMini();
    if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true});
  }
  function open(){
    if(opened||document.hidden)return;
    if(timer){clearTimeout(timer);timer=null}
    opened=true;lastFocus=document.activeElement;write(sessionKey);mini.hidden=true;modal.hidden=false;
    document.documentElement.classList.add('aw201-dialog-open');
    var first=modal.querySelector('.aw201-close');if(first)first.focus({preventScroll:true});
  }
  modal.querySelectorAll('[data-aw201-dismiss]').forEach(function(el){el.addEventListener('click',close)});
  document.addEventListener('keydown',function(e){
    if(!opened)return;
    if(e.key==='Escape'){e.preventDefault();close();return}
    if(e.key!=='Tab')return;
    var list=focusables();if(!list.length)return;
    if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list[list.length-1].focus()}
    else if(!e.shiftKey&&document.activeElement===list[list.length-1]){e.preventDefault();list[0].focus()}
  });
  if(closeMini)closeMini.addEventListener('click',function(){mini.hidden=true;write(dismissKey)});
  if(expand)expand.addEventListener('click',open);
  if(read(sessionKey)){showMini()}else{timer=setTimeout(open,8500)}
  window.addEventListener('pagehide',function(){if(timer)clearTimeout(timer)});
})();
