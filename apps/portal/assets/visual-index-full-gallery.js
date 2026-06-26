(() => {
  'use strict';
  if (!/\/visual-index\/?$/.test(location.pathname)) return;
  if (window.__GNK_ASG_CENTRAL_GALLERY__) return;
  window.__GNK_ASG_CENTRAL_GALLERY__ = true;

  function setMeta(selector,attributes) {
    let node=document.head.querySelector(selector);
    if (!node) { node=document.createElement('meta'); document.head.appendChild(node); }
    Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));
  }

  function preparePage() {
    document.title='Galerija | GNK ASG d.o.o., GNK DINAMO Ltd. i Nermin Sefić';
    setMeta('meta[name="description"]',{name:'description',content:'Centralna GNK ASG Galerija automatski objedinjuje provjerene fotografije i poslovne vizuale za Početnu, Objave, Publications, Vijesti, News te Objave i analize.'});
    setMeta('meta[name="keywords"]',{name:'keywords',content:'GNK ASG Galerija, GNK ASG d.o.o., GNK DINAMO Ltd., Nermin Sefić, Nermin Sefic, poslovne fotografije, business visuals, Objave, Publications, Vijesti, News, SEO fotografije'});
    setMeta('meta[property="og:title"]',{property:'og:title',content:'GNK ASG Galerija'});
    setMeta('meta[property="og:description"]',{property:'og:description',content:'Jedinstveni izvor fotografija i poslovnih vizuala za cijeli GNK ASG portal.'});
    document.head.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]').forEach(node=>node.remove());

    const small=document.querySelector('.hero small');
    if (small) small.textContent='GNK ASG centralna galerija';
    const heading=document.querySelector('.hero h1');
    if (heading) heading.textContent='Galerija';
    const intro=document.querySelector('.hero p');
    if (intro) intro.textContent='Centralna galerija automatski indeksira sve provjerene fotografije i vizuale portala. Početna, Objave, Publications, Vijesti, News te Objave i analize odavde preuzimaju tematski najrelevantniju sliku.';
    const note=document.querySelector('.note');
    if (note) note.innerHTML='<strong>Jedinstveni izvor fotografija:</strong> sustav sadrži najmanje 100 provjerenih poslovnih vizuala i automatski dodaje sve slike pronađene na portalu. Nova slika spremljena pod <code>/assets/gallery/</code> ili korištena u objavi automatski ulazi u Galeriju, dobiva SEO opis i postaje dostupna svim objavnim modulima. <span data-gallery-status>Učitavanje…</span>';
  }

  async function start() {
    preparePage();
    if (!window.GNK_ASG_GALLERY) {
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='/assets/gallery-engine.js?v=20260626-v2';
        script.onload=resolve;
        script.onerror=reject;
        document.head.appendChild(script);
      }).catch(()=>{});
    }
    const grid=document.getElementById('visualGrid');
    if (!window.GNK_ASG_GALLERY || !grid) {
      if (grid) grid.innerHTML='<div class="gnk-visual-empty">Galerija se trenutačno nije mogla učitati.</div>';
      return;
    }
    await window.GNK_ASG_GALLERY.render(grid);
    const first=window.GNK_ASG_GALLERY.items.find(item=>!item.src.startsWith('data:'));
    if (first) {
      setMeta('meta[property="og:image"]',{property:'og:image',content:first.src});
      setMeta('meta[name="twitter:image"]',{name:'twitter:image',content:first.src});
    }
  }

  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',start,{once:true}) : start();
})();
