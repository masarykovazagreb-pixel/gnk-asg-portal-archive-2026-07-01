(() => {
  'use strict';
  if (!/\/visual-index\/?$/.test(location.pathname)) return;
  if (window.__GNK_ASG_CENTRAL_GALLERY__) return;
  window.__GNK_ASG_CENTRAL_GALLERY__ = true;

  const PAGE_SIZE=120;
  const NEWS_LIMIT=100;
  const FALLBACK_IMAGE='/assets/news-fallback.svg';
  const state={items:[],filtered:[],visible:PAGE_SIZE,aktualCount:0,newsCount:0};
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

  function safeUrl(value,base=location.origin) {
    const raw=String(value||'').trim();
    if (!raw) return '';
    try {
      const url=new URL(raw,base);
      return ['http:','https:'].includes(url.protocol)?url.href:'';
    } catch { return ''; }
  }

  function isFallback(value) {
    const src=String(value||'').trim().toLowerCase();
    return !src||src.includes(FALLBACK_IMAGE)||src.startsWith('data:image/svg+xml');
  }

  function hasUsableImage(item) {
    const raw=String(item?.src||item?.image||item?.imageUrl||'').trim();
    if (!raw) return false;
    if (/^data:image\/(?:png|jpe?g|webp|avif|svg\+xml)/i.test(raw)) return true;
    return Boolean(safeUrl(raw))&&!isFallback(raw);
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
    document.title='Galerija i slike iz Vijesti | GNK ASG';
    setMeta('meta[name="description"]',{name:'description',content:'Centralna GNK ASG Galerija objedinjuje provjerene poslovne vizuale, fotografije uz autorske kolumne Nermina Sefića i stvarne slike iz aktualnih poslovnih Vijesti.'});
    setMeta('meta[name="keywords"]',{name:'keywords',content:'GNK ASG Galerija, GNK ASG d.o.o., GNK DINAMO Ltd., Nermin Sefić, Nermin Sefic, Aktual kolumne, poslovne fotografije, business visuals, Objave, Publications, Vijesti, News, RSS slike'});
    setMeta('meta[property="og:title"]',{property:'og:title',content:'GNK ASG Galerija i slike iz Vijesti'});
    setMeta('meta[property="og:description"]',{property:'og:description',content:'Jedinstveni vizualni indeks poslovnih vizuala, autorskih kolumni i stvarnih slika iz aktualnih Vijesti.'});
    document.head.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]').forEach(node=>node.remove());

    document.querySelector('.hero small')?.replaceChildren('GNK ASG centralni vizualni indeks');
    document.querySelector('.hero h1')?.replaceChildren('Galerija i slike iz Vijesti');
    document.querySelector('.hero p')?.replaceChildren('Na jednom mjestu prikazuju se provjereni vizuali portala, fotografije uz autorske kolumne Nermina Sefića i stvarne slike iz najnovijih poslovnih Vijesti.');
    const note=document.querySelector('.note');
    if (note) note.innerHTML='<strong>Prikazuju se samo stvarne slike:</strong> prazne kartice, RSS zapisi bez slike, lokalni fallbackovi i neispravne slike automatski se uklanjaju. Slike iz Vijesti ostaju na izvornim medijima i vode na originalni članak. <span data-gallery-status>Učitavanje…</span>';

    if (!document.getElementById('gnkGalleryPageStyle')) {
      const style=document.createElement('style');
      style.id='gnkGalleryPageStyle';
      style.textContent='.gnk-gallery-controls{display:grid;grid-template-columns:1fr auto;gap:12px;margin:0 0 20px}.gnk-gallery-controls input{width:100%;padding:13px 15px;border:1px solid #d9e0ea;border-radius:14px;font:inherit}.gnk-gallery-controls button{padding:12px 18px;border:0;border-radius:999px;background:#07162d;color:#fff;font-weight:800;cursor:pointer}.gnk-gallery-controls button[hidden]{display:none}.item h2 a{color:inherit;text-decoration:none}.item>a{display:block}.gnk-gallery-credit{display:block;margin-top:9px;color:#64748b;font-size:.76rem;line-height:1.4}.gnk-news-gallery-item{border-color:rgba(212,175,55,.52)}.gnk-news-gallery-item .tags span:first-child{background:#07162d;color:#fff;border-color:#07162d}@media(max-width:650px){.gnk-gallery-controls{grid-template-columns:1fr}}';
      document.head.appendChild(style);
    }
  }

  function updateStatus() {
    const status=document.querySelector('[data-gallery-status]');
    if (!status) return;
    const visible=document.querySelectorAll('#visualGrid .item').length;
    status.textContent=`Aktivno · ${state.filtered.length} slika · ${state.newsCount} iz Vijesti · ${state.aktualCount} Aktual kolumni · prikazano ${visible}`;
  }

  function discardItem(item,node) {
    const id=String(item?.id||'');
    node?.remove();
    state.items=state.items.filter(entry=>String(entry?.id||'')!==id);
    state.filtered=state.filtered.filter(entry=>String(entry?.id||'')!==id);
    state.newsCount=state.items.filter(entry=>entry.news).length;
    state.aktualCount=state.items.filter(entry=>entry.aktual).length;
    updateStatus();
  }

  function card(item) {
    const topics=[item.category,...(item.topic||[])].filter(Boolean).slice(0,4);
    const node=document.createElement('article');
    node.className=`item${item.aktual?' gnk-aktual-gallery-item':''}${item.news?' gnk-news-gallery-item':''}`;
    node.dataset.visualId=item.id||'';
    const target=item.external?' target="_blank" rel="noopener noreferrer"':'';
    const image=`<img src="${esc(item.src)}" alt="${esc(item.alt||item.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
    const title=esc(item.title);
    const imageMarkup=item.pageUrl?`<a href="${esc(item.pageUrl)}"${target}>${image}</a>`:image;
    const titleMarkup=item.pageUrl?`<a href="${esc(item.pageUrl)}"${target}>${title}</a>`:title;
    const credit=item.imageCredit?`<small class="gnk-gallery-credit">${esc(item.imageCredit)}</small>`:'';
    node.innerHTML=`${imageMarkup}<div class="body"><h2>${titleMarkup}</h2><p>${esc(item.description||'')}</p>${credit}<div class="tags">${topics.map(topic=>`<span>${esc(topic)}</span>`).join('')}</div></div>`;
    node.querySelector('img')?.addEventListener('error',()=>discardItem(item,node),{once:true});
    return node;
  }

  function render() {
    const grid=document.getElementById('visualGrid');
    if (!grid) return;
    grid.replaceChildren();
    const fragment=document.createDocumentFragment();
    state.filtered.slice(0,state.visible).forEach(item=>fragment.appendChild(card(item)));
    grid.appendChild(fragment);
    updateStatus();
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
    controls.innerHTML='<input type="search" data-gallery-search placeholder="Pretraži Galeriju i Vijesti" aria-label="Pretraži Galeriju i Vijesti"><button type="button" data-gallery-more>Učitaj još</button>';
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
    if (!hasUsableImage(item)) return;
    const image=safeUrl(item.src)||item.src;
    const script=document.createElement('script');
    script.type='application/ld+json';
    script.dataset.galleryImageSchema='1';
    script.textContent=JSON.stringify({
      '@context':'https://schema.org','@type':'ImageObject','@id':`${image}#image`,
      name:item.title,description:item.description,contentUrl:image,thumbnailUrl:image,
      mainEntityOfPage:item.pageUrl||location.href,isBasedOn:item.sourceUrl||item.pageUrl,datePublished:item.datePublished,
      creditText:item.imageCredit||item.source||'Izvorni medij',
      copyrightNotice:item.news?'Slika ostaje na izvornom mediju i prikazuje se uz poveznicu na izvorni članak.':'Fotografija prikazana prema navedenom izvoru.',
      about:[
        {'@type':'Organization',name:'GNK ASG d.o.o.'},
        {'@type':'Organization',name:'GNK DINAMO Ltd.'},
        {'@type':'Person',name:'Nermin Sefić',alternateName:'Nermin Sefic'}
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
      })).filter(hasUsableImage);
    }catch(error){console.warn('[GNK ASG Aktual gallery]',error);return[];}
  }

  async function loadNewsItems() {
    try {
      const response=await fetch(`/data/news.json?gallery=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});
      if(!response.ok)return[];
      const payload=await response.json();
      const items=Array.isArray(payload)?payload:(Array.isArray(payload?.items)?payload.items:[]);
      return items.slice(0,NEWS_LIMIT).map((item,index)=>{
        const src=safeUrl(item?.image||item?.imageUrl||item?.image_url||'');
        const pageUrl=safeUrl(item?.url||item?.link||item?.sourceUrl||'');
        const source=String(item?.source||item?.sourceTitle||item?.region||'Izvorni medij').trim();
        const datePublished=item?.publishedAt||item?.published_at||item?.pubDate||'';
        const dateLabel=datePublished?new Intl.DateTimeFormat('hr-HR',{timeZone:'Europe/Zagreb',dateStyle:'medium'}).format(new Date(datePublished)):'';
        return{
          id:`news-visual-${String(item?.id||index)}`,
          src,
          title:String(item?.title||'Poslovna vijest').trim(),
          alt:String(item?.imageAlt||`${item?.title||'Poslovna vijest'} — ${source}`).trim(),
          description:String(item?.summary||item?.description||'').trim(),
          category:'Vijesti',
          topic:[item?.category,item?.region,item?.language,dateLabel].filter(Boolean),
          source,
          sourceUrl:pageUrl,
          pageUrl,
          imageCredit:`Slika: ${String(item?.imageCredit||source).trim()} · Izvor: ${source}`,
          datePublished,
          news:true,
          external:true,
          imageFallback:item?.imageFallback===true
        };
      }).filter(item=>item.pageUrl&&item.title&&!item.imageFallback&&hasUsableImage(item));
    }catch(error){console.warn('[GNK ASG News gallery]',error);return[];}
  }

  function dedupe(items) {
    const seen=new Set();
    return items.filter(item=>{
      if (!hasUsableImage(item)) return false;
      const raw=String(item.src||'').trim();
      const key=raw.startsWith('data:')?String(item.id||raw):safeUrl(raw).replace(/[?&](?:gallery|verify|cb)=\d+/g,'').toLowerCase();
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
    const [loaded,aktual,news]=await Promise.all([
      window.GNK_ASG_GALLERY.load(),
      loadAktualItems(),
      loadNewsItems()
    ]);
    const central=(Array.isArray(loaded)?loaded:[]).filter(hasUsableImage);
    state.items=dedupe([...news,...central,...aktual]).filter(item=>!isBlocked(item));
    state.newsCount=state.items.filter(item=>item.news).length;
    state.aktualCount=state.items.filter(item=>item.aktual).length;
    state.items.slice(0,200).forEach(appendImageSchema);
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
