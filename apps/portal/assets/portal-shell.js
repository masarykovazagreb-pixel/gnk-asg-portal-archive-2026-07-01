(function(){
  'use strict';
  if(window.GNK_ASG_PORTAL_SHELL_READY) return;
  window.GNK_ASG_PORTAL_SHELL_READY = true;

  function normalizedPath(value){
    var path = String(value || '/').split('#')[0].split('?')[0];
    if(!path.startsWith('/')) path = '/' + path;
    return path.length > 1 && !path.endsWith('/') ? path + '/' : path;
  }

  function isEnglishContext(){
    return document.documentElement.lang === 'en' || /^\/en(?:\/|$)/.test(window.location.pathname) || /^\/publications(?:\/|$)/.test(window.location.pathname);
  }

  function normalizeEnglishPublicationLinks(){
    if(!isEnglishContext()) return;
    document.querySelectorAll('.asg-topnav a[href]').forEach(function(link){
      if((link.textContent || '').trim() === 'Publications') link.setAttribute('href','/publications/');
    });
    document.querySelectorAll('.asg-mobile-nav select option').forEach(function(option){
      if((option.textContent || '').trim() === 'Publications') option.value = '/publications/';
    });
  }

  function markActiveNavigation(){
    var current = normalizedPath(window.location.pathname);
    document.querySelectorAll('.asg-topnav a[href]').forEach(function(link){
      var href = link.getAttribute('href');
      if(!href || href.startsWith('http') || href.startsWith('#')) return;
      var target = normalizedPath(href);
      var active = target === current || (target !== '/' && current.startsWith(target));
      if(active) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
  }

  function bindMobileNavigation(){
    document.querySelectorAll('.asg-mobile-nav select').forEach(function(select){
      if(select.dataset.asgBound === '1') return;
      select.dataset.asgBound = '1';
      select.addEventListener('change',function(){
        if(this.value) window.location.assign(this.value);
      });
    });
  }

  function syncMobileSelection(){
    var current = normalizedPath(window.location.pathname);
    document.querySelectorAll('.asg-mobile-nav select').forEach(function(select){
      var matching = Array.from(select.options).find(function(option){
        return option.value && normalizedPath(option.value) === current;
      });
      if(matching) select.value = matching.value;
    });
  }

  function keepSingleAiFloat(){
    var controls = Array.from(document.querySelectorAll('.asg-ai-float'));
    controls.slice(1).forEach(function(control){ control.remove(); });
  }

  function init(){
    normalizeEnglishPublicationLinks();
    markActiveNavigation();
    bindMobileNavigation();
    syncMobileSelection();
    keepSingleAiFloat();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
  window.addEventListener('pageshow',init);
})();
