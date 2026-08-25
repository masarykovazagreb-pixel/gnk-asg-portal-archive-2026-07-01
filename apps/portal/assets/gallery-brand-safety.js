(() => {
  'use strict';
  if (window.__GNK_ASG_GALLERY_BRAND_SAFETY__) return;
  window.__GNK_ASG_GALLERY_BRAND_SAFETY__ = true;
  const route = location.pathname.replace(/\/+$/, '') || '/';
  function installIndexLogoGuard() {
    document.addEventListener('click', event => {
      const brand = event.target.closest?.('.brand-unit.right,.brand-unit.right *');
      if (!brand) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const top = document.getElementById('top'); if (top) top.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, true);
  }
  if (route === '/' || route === '/en') { installIndexLogoGuard(); window.GNK_ASG_BRAND_SAFETY = {version:'2026-06-26-index-isolated',prohibited:()=>false,check:()=>{}}; return; }
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  function signature(node) { if (!node) return ''; return norm([node.getAttribute?.('src'),node.getAttribute?.('srcset'),node.currentSrc,node.getAttribute?.('alt'),node.getAttribute?.('title'),node.getAttribute?.('aria-label'),node.id,node.className,node.getAttribute?.('style')].filter(Boolean).join(' ')); }
  function prohibited(valueOrNode) { const value=typeof valueOrNode==='string'?norm(valueOrNode):signature(valueOrNode); if(!value.includes('dinamo'))return false; const company=/\b(gnk dinamo ltd|dinamo ltd|colorado|boulder|corporate|company|business|poslovn)\b/.test(value); const footballClub=/\b(dinamo zagreb|gnk dinamo zagreb|nk dinamo|football club|nogometni klub|maksimir|stadion maksimir)\b/.test(value); const emblem=/\b(logo|grb|crest|badge|emblem|shield|club mark|club logo|klupski znak)\b/.test(value); return footballClub||(emblem&&!company); }
  function check(root=document){root.querySelectorAll?.('img,source').forEach(node=>{if(!prohibited(node))return; const wrapper=node.closest?.('.gnk-gallery-auto-image,.image-link,figure,picture'); node.hidden=true; node.removeAttribute('src'); node.removeAttribute('srcset'); if(wrapper)wrapper.hidden=true;}); root.querySelectorAll?.('[style*="background"],[data-image],[data-background]').forEach(node=>{const value=[node.getAttribute('style'),node.getAttribute('data-image'),node.getAttribute('data-background'),node.getAttribute('title'),node.getAttribute('aria-label')].filter(Boolean).join(' '); if(!prohibited(value))return; node.style.removeProperty('background-image'); node.removeAttribute('data-image'); node.removeAttribute('data-background');});}
  window.GNK_ASG_BRAND_SAFETY={version:'2026-06-26-v2',prohibited,check}; const observer=new MutationObserver(records=>{records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)check(node);}));}); const start=()=>{check(document);observer.observe(document.documentElement,{childList:true,subtree:true});}; document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
