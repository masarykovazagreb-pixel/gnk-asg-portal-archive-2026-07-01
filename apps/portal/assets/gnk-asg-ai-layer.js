(function(){
  'use strict';
  if(window.GNK_ASG_AI_LAYER_READY) return;
  window.GNK_ASG_AI_LAYER_READY = true;

  function normalize(value){
    return String(value || '').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function isVisible(element){
    if(!element) return false;
    var style = window.getComputedStyle(element);
    if(style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0) return false;
    var rect = element.getBoundingClientRect();
    return rect.width > 20 && rect.height > 20;
  }

  function isFloatingAiControl(element){
    if(!element || !isVisible(element)) return false;
    var style = window.getComputedStyle(element);
    var position = String(style.position || '').toLowerCase();
    if(position !== 'fixed' && position !== 'sticky' && position !== 'absolute') return false;
    var text = normalize(element.innerText || element.textContent || '');
    var attrs = normalize((element.id || '') + ' ' + (element.className || '') + ' ' + (element.getAttribute('aria-label') || '') + ' ' + (element.getAttribute('title') || ''));
    return /ai help|ai pomoć|ai pomoc|assistant|chat/.test(text + ' ' + attrs);
  }

  function keepSingleAiControl(){
    try{
      var candidates = Array.from(document.querySelectorAll('a,button,div,span'))
        .filter(isFloatingAiControl)
        .filter(function(element){
          return !element.closest('nav,header,.gnk-asg-final-menu-wrap,.asg-topnav,.asg-mobile-nav');
        });
      if(candidates.length <= 1) return;
      candidates.slice(1).forEach(function(element){
        element.classList.add('gnk-asg-ai-hidden-duplicate');
      });
    }catch(error){}
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',keepSingleAiControl);
  else keepSingleAiControl();
  window.addEventListener('load',keepSingleAiControl);
  setTimeout(keepSingleAiControl,500);
  setTimeout(keepSingleAiControl,1500);
})();
