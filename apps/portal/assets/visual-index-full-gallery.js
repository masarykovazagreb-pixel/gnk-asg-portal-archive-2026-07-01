(() => {
  'use strict';
  if (!/\/visual-index\/?$/.test(location.pathname)) return;
  if (window.__GNK_ASG_CENTRAL_GALLERY__) return;
  window.__GNK_ASG_CENTRAL_GALLERY__ = true;

  const PAGE_SIZE=120;
  const state={items:[],filtered:[],visible:PAGE_SIZE};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const normalizeSearch=value=>String(value??'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/đ/g,'d')
    .replace(/[_-]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  function setMeta(selector,attributes) {
    let node=document.head.querySelector(selector);
    if (!node) { node=document.createElement('meta'); document.head.appendChild(node); }
    Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));
  }

  function itemSignature(item) {
    return normalizeSearch([item?.src,item?.title,item?.alt,item?.description,item?.source,...(item?.topic||[])].filter(Boolean).join(' '));
  }

  function isBlocked(item) {
    const value=itemSignature(item);
    if (!value.includes('dinamo')) return false;
    const company=/\b(gnk dinamo ltd|dinamo ltd|colorado|boulder|corporate|company|business|poslovn)\b/.test(value);
    const club=/\b(dinamo zagreb|gnk dinamo zagreb|nk dinamo)\b/.test(value);
    const emblem=/\b(logo|logotip|grb|crest|badge|emblem|shield|club mark|club logo|klupski znak)\b/.test(value);
    return club||(emblem&&!company);
  }

  function preparePage() {
    document.title='Galerija | GNK ASG d.o.o., GNK DINAMO Ltd. i Nermin Sefić';
    setMeta('meta[name="description"]',{name:'description',content:'Centralna GNK ASG Galerija automatski objedinjuje provjerene fotografije i poslovne vizuale za Početnu, Objave, Publications, Vijesti, News te Objave i analize.'});
    setMeta('meta[name="keywords"]',{name:'keywords',content:'GNK ASG Galerija, GNK ASG d.o.o., GNK DINAMO Ltd., Nermin Sefić, Nermin Sefic, poslovne fotografije, business visuals, Objave, Publications, Vijesti, News'});
    setMeta('meta[property="og:title"]',{property:'og:title',content:'GNK ASG Galerija'});
    setMeta('meta[property="og:description"]',{property:'og:description',content:'Jedinstveni izvor fotografija i poslovnih vizuala za cijeli GNK ASG portal.'});
    document.head.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]').forEach(node=>node.remove());

    document.querySelector('.hero small')?.replaceChildren('GNK ASG centralna galerija');
    document.querySelector('.hero h1')?.replaceChildren('Galerija');
    document.querySelector('.hero p')?.replaceChildren('Centralna galerija automatski indeksira provjerene fotografije i vizuale portala. Početna, Objave, Publications, Vijesti, News te Objave i analize odavde preuzimaju tematski najrelevantniju sliku.');
    const note=document.querySelector('.note');
    if (note) note.innerHTML='<strong>Jedinstveni izvor fotografija:</strong> sustav sadrži najmanje 100 poslovnih vizuala i automatski dodaje slike pronađene na portalu. Prikazuju se samo dopušteni zapisi; klupski grbovi, oznake i logotipi nisu dopušteni. <span data-gallery-status>Učitavanje…</span>';

    if (!document.getElementById('gnkGalleryPageStyle')) {
      const style=document.createElement('style');
      style.id='gnkGalleryPageStyle';
      style.textContent='.gnk-gallery-controls{display:grid;grid-template-columns:1fr auto;gap:12px;margin:0 0 20px}.gnk-gallery-controls input{width:100%;padding:13px 15px;border:1px solid #d9e0ea;border-radius:14px;font:inherit}.gnk-gallery-controls button{padding:12px 18px;border:0;border-radius:999px;background:#07162d;color:#fff;font-weight:800;cursor:pointer}.gnk-gallery-controls button[hidden]{display:none}@media(max-width:650px){.gnk-gallery-controls{grid-template-columns:1fr}}';
      document.head.appendChild(style);
    }
  }

  function card(item) {
    const topics=[item.category,...(item.topic||[])].filter(Boolean).slice(0,4);
    const node=document.createElement('article');
    node.className='item';
    node.dataset.visualId=item.id||'';
    node.innerHTML=`<img src="${esc(item.src)}" alt="${esc(item.alt||item.title)}" loading="lazy" decoding="async"><div class="body"><h2>${esc(item.title)}</h2><p>${esc(item.description||'')}</p><div class="tags">${topics.map(topic=>`<span>${esc(topic)}</span>`).join('')}</div></div>`;
    node.querySelector('img')?.addEventListener('error',()=>node.remove(),{once:true});
    return node;
  }

  function render() {
    const grid=document.getElementById('visualGrid');
    if (!grid) return;
    grid.replaceChildren();
    const fragment=document.createDocumentFragment();
    state.filtered.slice(0,state.visible).forEach(item=>fragment.appendChild(card(item)));
    grid.appendChild(fragment);
    const status=document.querySelector('[data-gallery-status]');
    if (status) status.textContent=`Aktivno · ${state.filtered.length} katalogiziranih slika · prikazano ${Math.min(state.visible,state.filtered.length)}`;
    const more=document.querySelector('[data-gallery-more]');
    if (more) more.hidden=state.visible>=state.filtered.length;
    window.GNK_ASG_BRAND_SAFETY?.check(document);
  }

  function installControls() {
    const grid=document.getElementById('visualGrid');
    if (!grid||document.querySelector('[data-gallery-controls]')) return;
    const controls=document.createElement('div');
    controls.className='gnk-gallery-controls';
    controls.dataset.galleryControls='1';
    controls.innerHTML='<input type="search" data-gallery-search placeholder="Pretraži Galeriju" aria-label="Pretraži Galeriju"><button type="button" data-gallery-more>Učitaj još</button>';
    grid.before(controls);
    controls.querySelector('[data-gallery-search]')?.addEventListener('input',event=>{
      const query=normalizeSearch(event.target.value);
      state.filtered=query?state.items.filter(item=>itemSignature(item).includes(query)):state.items.slice();
      state.visible=PAGE_SIZE;
      render();
    });
    controls.querySelector('[data-gallery-more]')?.addEventListener('click',()=>{
      state.visible+=PAGE_SIZE;
      render();
    });
  }

  async function start() {
    preparePage();
    if (!window.GNK_ASG_GALLERY) {
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='/assets/gallery-engine.js?v=20260626-v3';
        script.onload=resolve;
        script.onerror=reject;
        document.head.appendChild(script);
      }).catch(()=>{});
    }
    const grid=document.getElementById('visualGrid');
    if (!window.GNK_ASG_GALLERY||!grid) {
      if (grid) grid.innerHTML='<div class="gnk-visual-empty">Galerija se trenutačno nije mogla učitati.</div>';
      return;
    }
    const loaded=await window.GNK_ASG_GALLERY.load();
    state.items=(Array.isArray(loaded)?loaded:[]).filter(item=>!isBlocked(item));
    state.filtered=state.items.slice();
    installControls();
    render();
    const first=state.items.find(item=>!String(item.src||'').startsWith('data:'));
    if (first) {
      setMeta('meta[property="og:image"]',{property:'og:image',content:first.src});
      setMeta('meta[name="twitter:image"]',{name:'twitter:image',content:first.src});
    }
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
