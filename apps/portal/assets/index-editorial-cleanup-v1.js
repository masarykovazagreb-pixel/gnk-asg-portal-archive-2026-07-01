(()=>{
'use strict';
if(window.__GNK_INDEX_EDITORIAL_CLEANUP_V1__)return;window.__GNK_INDEX_EDITORIAL_CLEANUP_V1__=true;
let attempts=0;
const run=()=>{const current=document.getElementById('gnk-index-editorial-v6'),legacy=document.querySelector('#gnk-index-zone .gnk-index-panel');if(current&&legacy){legacy.remove();document.documentElement.dataset.gnkLegacyEditorial='removed';return}if(++attempts<30)setTimeout(run,200)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();