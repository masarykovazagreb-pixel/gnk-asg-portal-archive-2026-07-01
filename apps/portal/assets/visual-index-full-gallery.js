(() => {
  'use strict';
  if (!/\/visual-index\/?$/.test(location.pathname)) return;
  if (window.__GNK_ASG_CENTRAL_GALLERY__) return;
  window.__GNK_ASG_CENTRAL_GALLERY__ = true;

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

  function setMeta(selector,attributes) {
    let node=document.head.querySelector(selector);
    if (!node) { node=document.createElement('meta'); document.head.appendChild(node); }
    Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));
  }

  function preparePage() {
    document.title='Galerija | GNK ASG d.o.o., GNK DINAMO Ltd. i Nermin Sefić';
    setMeta('meta[name="description"]',{name:'description',content:'Centralna GNK ASG Galerija objedinjuje provjerene fotografije, poslovne vizuale i fotografije uz autorske kolumne Nermina Sefića.'});
    setMeta('meta[name="keywords"]',{name:'keywords',content:'GNK ASG Galerija, GNK ASG d.o.o., GNK DINAMO Ltd., Nermin Sefić, Nermin Sefic, Aktual kolumne, poslovne fotografije, SEO fotografije'});
    setMeta('meta[property="og:title"]',{property:'og:title',content:'GNK ASG Galerija'});
    setMeta('meta[property="og:description"]',{property:'og:description',content:'Jedinstveni izvor fotografija i poslovnih vizuala za cijeli GNK ASG portal.'});
    document.head.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]').forEach(node=>node.remove());

    const small=document.querySelector('.hero small');
    if (small) small.textContent='GNK ASG centralna galerija';
    const heading=document.querySelector('.hero h1');
    if (heading) heading.textContent='Galerija';
    const intro=document.querySelector('.hero p');
    if (intro) intro.textContent='Centralna galerija automatski indeksira provjerene fotografije i vizuale portala, uključujući fotografije uz autorske kolumne Nermina Sefića.';
    const note=document.querySelector('.note');
    if (note) note.innerHTML='<strong>Jedinstveni izvor fotografija:</strong> galerija objedinjuje provjerene poslovne vizuale i fotografije iz objava. Fotografije uz kolumne Nermina Sefića imaju zasebne alt-opise, izvor, kredit i ImageObject metapodatke. <span data-gallery-status>Učitavanje…</span>';
  }

  function appendImageSchema(item) {
    const image=new URL(item.image,location.origin).href;
    const script=document.createElement('script');
    script.type='application/ld+json';
    script.dataset.galleryAktualSchema='1';
    script.textContent=JSON.stringify({
      '@context':'https://schema.org','@type':'ImageObject','@id':`${image}#image`,
      name:item.title,description:item.description,contentUrl:image,thumbnailUrl:image,
      mainEntityOfPage:item.url,isBasedOn:item.sourceUrl,datePublished:item.datePublished,
      creditText:item.imageCredit||'Foto: Shutterstock, prema izvornoj objavi Aktual.rs',
      copyrightNotice:'Fotografija korištena prema licenci uz izvornu objavu.',
      about:[
        {'@type':'Person',name:'Nermin Sefić',alternateName:'Nermin Sefic'},
        {'@type':'Organization',name:'GNK ASG d.o.o.'},
        {'@type':'Organization',name:'GNK DINAMO Ltd.'}
      ],keywords:(item.keywords||[]).join(', ')
    });
    document.body.appendChild(script);
  }

  async function appendAktualItems(grid) {
    try {
      const response=await fetch(`/data/aktual-nermin-sefic.json?gallery=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});
      if(!response.ok)return 0;
      const payload=await response.json();
      const existing=new Set(Array.from(grid.querySelectorAll('img')).map(image=>new URL(image.src,location.origin).pathname));
      const fragment=document.createDocumentFragment();
      let added=0;
      for(const item of payload.items||[]) {
        const imagePath=new URL(item.image,location.origin).pathname;
        if(existing.has(imagePath))continue;
        existing.add(imagePath);
        const card=document.createElement('article');
        card.className='item gnk-aktual-gallery-item';
        card.dataset.visualId=item.id;
        card.innerHTML=`<a href="${esc(item.url)}"><img src="${esc(item.image)}" alt="${esc(item.alt)}" loading="lazy" decoding="async"></a><div class="body"><h2><a href="${esc(item.url)}">${esc(item.title)}</a></h2><p>${esc(item.description)}</p><small class="gnk-gallery-credit">${esc(item.imageCredit||'Foto: Shutterstock, prema izvornoj objavi Aktual.rs')}</small><div class="tags"><span>Nermin Sefić</span><span>GNK ASG</span><span>GNK DINAMO Ltd.</span><span>Aktual kolumne</span></div></div>`;
        card.querySelector('img')?.addEventListener('error',()=>card.remove(),{once:true});
        fragment.appendChild(card);
        appendImageSchema(item);
        added+=1;
      }
      grid.appendChild(fragment);
      if(!document.getElementById('gnk-aktual-gallery-style')){
        const style=document.createElement('style');
        style.id='gnk-aktual-gallery-style';
        style.textContent='.gnk-aktual-gallery-item h2 a{color:inherit;text-decoration:none}.gnk-aktual-gallery-item>a{display:block}.gnk-gallery-credit{display:block;margin-top:9px;color:#64748b;font-size:.76rem;line-height:1.4}';
        document.head.appendChild(style);
      }
      document.documentElement.dataset.gnkAktualGalleryCount=String(added);
      return added;
    }catch(error){console.warn('[GNK ASG Aktual gallery]',error);return 0;}
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
    const added=await appendAktualItems(grid);
    const status=document.querySelector('[data-gallery-status]');
    if(status)status.textContent=`Aktivno · ${grid.querySelectorAll('.item').length} katalogiziranih slika · ${added} Aktual kolumni`;
    const first=window.GNK_ASG_GALLERY.items.find(item=>!item.src.startsWith('data:'));
    if (first) {
      setMeta('meta[property="og:image"]',{property:'og:image',content:first.src});
      setMeta('meta[name="twitter:image"]',{name:'twitter:image',content:first.src});
    }
  }

  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',start,{once:true}) : start();
})();
