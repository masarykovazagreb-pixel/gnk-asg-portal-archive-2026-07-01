(function(){
'use strict';
if(window.GNK_PUBLIC_TOOLS_READY){return;}
window.GNK_PUBLIC_TOOLS_READY=true;
var version='20260714-accessible-ai-fab01';
function normalizeDataFetch(){if(window.fetch&&!window.__gnkPublicRootFetch){var nativeFetch=window.fetch.bind(window);window.__gnkPublicRootFetch=true;window.fetch=function(input,init){if(typeof input==='string'&&input.indexOf('data/')===0){input='/'+input;}return nativeFetch(input,init);};}}
function addCss(path){if(document.querySelector('link[href^="'+path+'"]')){return;}var el=document.createElement('link');el.rel='stylesheet';el.href=path+'?v='+version;document.head.appendChild(el);}
function addScript(path){if(document.querySelector('script[src^="'+path+'"]')){return;}var el=document.createElement('script');el.src=path+'?v='+version;el.defer=true;document.body.appendChild(el);}
function isEnglish(){return document.documentElement.lang==='en'||/\/en(?:\/|$)/.test(window.location.pathname);}
function adjustDeskLink(){var link=document.querySelector('#aiMini .ai-full-link');if(!link){return false;}if(!document.getElementById('assistant')){link.setAttribute('href',isEnglish()?'/en/intelligence-desk/':'/intelligence-desk/');}return true;}
function watchDesk(){var tries=0;var timer=window.setInterval(function(){tries+=1;if(adjustDeskLink()||tries>60){window.clearInterval(timer);}},100);}
function start(){normalizeDataFetch();addCss('/assets/site-share.css');addCss('/assets/floating-intelligence.css');addScript('/assets/site-share.js');addScript('/assets/content-share.js');addScript('/assets/share-routing-fix.js');addScript('/assets/share-permanent-cards.js');addScript('/assets/floating-intelligence.js');watchDesk();}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',start);}else{start();}
}());