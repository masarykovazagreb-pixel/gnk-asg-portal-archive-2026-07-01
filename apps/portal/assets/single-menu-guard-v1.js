(()=>{
'use strict';
if(window.__GNK_SINGLE_MENU_GUARD_V1__)return;window.__GNK_SINGLE_MENU_GUARD_V1__=true;
const removeDuplicates=()=>{
  document.querySelectorAll('#gnk-floating-menu,#gnk-event-bar,.gnk-floating-menu,[data-gnk-floating-menu],script[src*="public-floating-menu"],script[src*="admin-menu-v1"]').forEach(node=>node.remove());
  document.querySelectorAll('#gnk-compact-menu').forEach((node,index)=>{if(index>0)node.remove();});
  document.querySelectorAll('#gnk-compact-strip').forEach((node,index)=>{if(index>0)node.remove();});
};
removeDuplicates();
const observer=new MutationObserver(removeDuplicates);observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();