(() => {
  'use strict';
  if (!/\/visual-index\/?$/.test(location.pathname)) return;
  if (window.__GNK_ASG_CENTRAL_GALLERY__) return;
  window.__GNK_ASG_CENTRAL_GALLERY__ = true;

  const PAGE_SIZE=120;
  const state={items:[],filtered:[],visible:PAGE_SIZE,aktualCount:0};
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
    return normalizeSearch([item?.src,item?.title,item?.alt,item?.description,item?.source,item?.pageUrl,...(item?.topic||[])].filter(Boolean).join(' '));
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
    setMeta('meta[name="description"]',{name:'description',content:'Centralna GNK ASG Galerija objedinjuje provjerene fotografije, poslovne vizuale i fotografije uz autorske kolumne Nermina Sefića.'});
    setMeta('meta[name="keywords"]',{name:'keywords',content:'GNK ASG Galerija, GNK ASG d.o.o., GNK DINAMO Ltd., Nermin Sefić, Nermin Sefic, Aktual kolumne, poslovne fotografije, business visuals, Objave, Publications, Vijesti, News'});
    setMeta('meta[property="og:title"]',{property:'og:title',content:'GNK ASG Galerija'});
    setMeta('meta[property="og:description"]',{property:'og:description',content:'Jedinstveni izvor fotografija, poslovnih vizuala i fotografija uz kolumne Nermina Sefića.'});
    document.head.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]').forEach(node=>node.remove());

    document.querySelector('.hero small')?.replaceChildren('GNK ASG centralna galerija');
    document.querySelector('.hero h1')?.replaceChildren('Galerija');
    document.querySelector('.hero p')?.replaceChildren('Centralna galerija indeksira provjerene fotografije i vizuale portala, uključujući fotografije uz 17 autorskih kolumni Nermina Sefića.');
    const note=document.querySelector('.note');
    if (note) note.innerHTML='<strong>Jedinstveni izvor fotografija:</strong> sustav prikazuje dopuštene poslovne vizuale i licencirane fotografije iz objava. Kolumne Nermina Sefića imaju zasebne alt-opise, izvor, kredit i ImageObject metapodatke. Klupski grbovi, oznake i logotipi nisu dopušteni. <span data-gallery-status>Učitavanje…</span>';

    if (!document.getElementById('gnkGalleryPageStyle')) {
      const style=document.createElement('style');
      style.id='gnkGalleryPageStyle';
      style.textContent='.gnk-gallery-controls{display:grid;grid-template-columns:1fr auto;gap:12px;margin:0 0 20px}.gnk-gallery-controls input{width:100%;padding:13px 15px;border:1px solid #d9e0ea;border-radius:14px;font:inherit}.gnk-gallery-controls button{padding:12px 18px;border:0;border-radius:999px;background:#07162d;color:#fff;font-weight:800;cursor:pointer}.gnk-gallery-controls button[hidden]{display:none}.item h2 a{color:inherit;text-decoration:none}.item>a{display:block}.gnk-gallery-credit{display:block;margin-top:9px;color:#64748b;font-size:.76rem;line-height:1.4}@media(max-width:650px){.gnk-gallery-controls{grid-template-columns:1fr}}';
      document.head.appendChild(style);
    }
  }

  function card(item) {
    const topics=[item.category,...(item.topic||[])].filter(Boolean).slice(0,4);
    const node=document.createElement('article');
    node.className=`item${item.aktual?' gnk-aktual-gallery-item':''}`;
    node.dataset.visualId=item.id||'';
    const image=`<img src="${esc(item.src)}" alt="${esc(item.alt||item.title)}" loading="lazy" decoding="async">`;
    const title=esc(item.title);
    const imageMarkup=item.pageUrl?`<a href="${esc(item.pageUrl)}">${image}</a>`:image;
    const titleMarkup=item.pageUrl?`<a href="${esc(item.pageUrl)}">${title}</a>`:title;
    const credit=item.imageCredit?`<small class="gnk-gallery-credit">${esc(item.imageCredit)}</small>`:'';
    node.innerHTML=`${imageMarkup}<div class="body"><h2>${titleMarkup}</h2><p>${esc(item.description||'')}</p>${credit}<div class="tags">${topics.map(topic=>`<span>${esc(topic)}</span>`).join('')}</div></div>`;
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
    if (status) status.textContent=`Aktivno · ${state.filtered.length} katalogiziranih slika · ${state.aktualCount} Aktual kolumni · prikazano ${Math.min(state.visible,state.filtered.length)}`;
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

  function appendImageSchema(item) {
    const image=new URL(item.src,location.origin).href;
    const script=document.createElement('script');
    script.type='application/ld+json';
    script.dataset.galleryAktualSchema='1';
    script.textContent=JSON.stringify({
      '@context':'https://schema.org','@type':'ImageObject','@id':`${image}#image`,
      name:item.title,description:item.description,contentUrl:image,thumbnailUrl:image,
      mainEntityOfPage:item.pageUrl,isBasedOn:item.sourceUrl,datePublished:item.datePublished,
      creditText:item.imageCredit||'Foto: Shutterstock, prema izvornoj objavi Aktual.rs',
      copyrightNotice:'Fotografija korištena prema licenci uz izvornu objavu.',
      about:[
        {'@type':'Person',name:'Nermin Sefić',alternateName:'Nermin Sefic'},
        {'@type':'Organization',name:'GNK ASG d.o.o.'},
        {'@type':'Organization',name:'GNK DINAMO Ltd.'}
      ],keywords:(item.topic||[]).join(', ')
    });
    document.body.appendChild(script);
  }

  async function loadAktualItems() {
    try {
      const response=await fetch(`/data/aktual-nermin-sefic.json?gallery=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});
      if(!response.ok)return[];
      const payload=await response.json();
      return (payload.items||[]).map(item=>({
        id:item.id,
        src:item.image,
        title:item.title,
        alt:item.alt,
        description:item.description,
        category:'Aktual kolumne',
        topic:item.keywords||[],
        source:item.sourceUrl,
        sourceUrl:item.sourceUrl,
        pageUrl:item.url,
        imageCredit:item.imageCredit,
        datePublished:item.datePublished,
        aktual:true
      }));
    }catch(error){console.warn('[GNK ASG Aktual gallery]',error);return[];}
  }

  function dedupe(items) {
    const seen=new Set();
    return items.filter(item=>{
      const key=new URL(item.src,location.origin).pathname.toLowerCase();
      if(!key||seen.has(key))return false;
      seen.add(key);
      return true;
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
    const [loaded,aktual]=await Promise.all([window.GNK_ASG_GALLERY.load(),loadAktualItems()]);
    aktual.forEach(appendImageSchema);
    state.aktualCount=aktual.length;
    state.items=dedupe([...(Array.isArray(loaded)?loaded:[]),...aktual]).filter(item=>!isBlocked(item));
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
