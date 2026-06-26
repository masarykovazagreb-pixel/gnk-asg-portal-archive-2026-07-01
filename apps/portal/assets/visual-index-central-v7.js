(()=>{
  'use strict';
  if(!/\/visual-index\/?$/.test(location.pathname)||window.__GNK_ASG_VISUAL_INDEX_V7__)return;
  window.__GNK_ASG_VISUAL_INDEX_V7__=true;

  const english=new URLSearchParams(location.search).get('lang')==='en'||document.documentElement.lang==='en';
  const PAGE_SIZE=120;
  const state={items:[],filtered:[],visible:PAGE_SIZE,removed:0};
  const text={
    hr:{title:'GNK ASG centralni vizualni indeks',heading:'Galerija, Objave i slike iz Vijesti',description:'Jedinstveno mjesto za provjerene GNK ASG vizuale, slike uz objave i stvarne slike iz poslovnih vijesti.',note:'Prikazuju se samo stvarne i dostupne slike. Centralni katalog objedinjuje repozitorij, R2 vizuale članaka, Objave, Aktual kolumne i slike iz Vijesti.',search:'Pretraži galeriju, objave i vijesti',more:'Učitaj još',back:'← Povratak na portal',empty:'Nema provjerenih slika za prikaz.',status:(total,shown,news,pub)=>`Aktivno · ${total} slika · ${pub} iz Objave · ${news} iz Vijesti · prikazano ${shown}`},
    en:{title:'GNK ASG central visual index',heading:'Gallery, Publications and News images',description:'A single source for verified GNK ASG visuals, publication images and real images from business news.',note:'Only real and accessible images are displayed. The central catalogue combines repository assets, R2 article visuals, Publications, Aktual columns and News images.',search:'Search gallery, publications and news',more:'Load more',back:'← Back to portal',empty:'No verified images are available.',status:(total,shown,news,pub)=>`Active · ${total} images · ${pub} from Publications · ${news} from News · showing ${shown}`}
  }[english?'en':'hr'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d');
  const unique=values=>[...new Set(values.filter(Boolean))];
  const absolute=value=>{try{const url=new URL(clean(value),location.origin);return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}};
  const fallback=value=>!value||/news-fallback\.svg|placeholder|favicon|logo|crest|badge|emblem/i.test(String(value));
  const imageValue=item=>item?.src||item?.image||item?.imageUrl||item?.thumbnail||item?.og_image||'';
  const pageValue=item=>item?.pageUrl||item?.publicUrl||item?.hrUrl||item?.enUrl||item?.url||item?.sourceUrl||'';
  const isImage=item=>{const src=absolute(imageValue(item));return Boolean(src&&!fallback(src)&&(/\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(src)||src.includes('/r2/generated-articles/')))};
  const blocked=item=>{const value=normalize([item?.title,item?.alt,item?.description,item?.source,imageValue(item)].join(' '));if(!value.includes('dinamo'))return false;const company=/gnk dinamo ltd|dinamo ltd|colorado|boulder|company|corporate|business|poslov/.test(value);return /dinamo zagreb|nk dinamo|football club|nogometni klub|maksimir/.test(value)||(/logo|grb|crest|badge|emblem/.test(value)&&!company)};
  const idFor=(prefix,item,index)=>clean(item?.id)||`${prefix}-${index}-${normalize(imageValue(item)).slice(-32).replace(/[^a-z0-9]+/g,'-')}`;

  async function getJson(url){
    try{const response=await fetch(`${url}${url.includes('?')?'&':'?'}gallery=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});if(!response.ok)return null;return response.json()}catch{return null}
  }
  function list(payload){return Array.isArray(payload)?payload:Array.isArray(payload?.items)?payload.items:[]}
  function mapCatalog(payload){return list(payload).map((item,index)=>({...item,id:idFor('catalog',item,index),src:absolute(imageValue(item)),pageUrl:'/visual-index/',category:item.category||'GNK ASG Gallery',topic:unique([...(item.topic||[]),...(item.keywords||[])]),kind:'catalog'})).filter(isImage)}
  function mapRuntime(payload){return list(payload).map((item,index)=>({...item,id:idFor('runtime',item,index),src:absolute(imageValue(item)),pageUrl:absolute(pageValue(item))||'/visual-index/',category:item.category||'Generated article visual',topic:unique([...(item.topic||[]),'R2','GNK ASG']),kind:'runtime'})).filter(isImage)}
  function mapPublications(payload){return list(payload).map((item,index)=>{const title=english?(item.titleEn||item.titleHr||item.title):(item.titleHr||item.title||item.titleEn);const description=english?(item.summaryEn||item.summaryHr||item.summary):(item.summaryHr||item.summary||item.summaryEn);const slug=clean(item.slug);return{id:idFor('publication',item,index),src:absolute(imageValue(item)),title,alt:item.imageAlt||title,description,category:english?'Publications':'Objave',topic:unique([item.category,item.region,'GNK ASG Intelligence Desk']),source:'GNK ASG Intelligence Desk',sourceUrl:item.sourceUrl,pageUrl:slug?(english?`/publications/${slug}/`:`/objave/${slug}/`):absolute(pageValue(item)),imageCredit:item.imageCredit||'GNK ASG Visual Index',datePublished:item.publishedAt||item.published_at,publication:true,kind:'publication'}}).filter(isImage)}
  function mapNews(payload){return list(payload).slice(0,100).map((item,index)=>({id:idFor('news',item,index),src:absolute(imageValue(item)),title:item.title,alt:item.imageAlt||item.title,description:item.summary||item.description,category:english?'News':'Vijesti',topic:unique([item.category,item.region,item.language]),source:item.source||item.region,sourceUrl:absolute(item.sourceUrl||item.url),pageUrl:absolute(item.url||item.sourceUrl),imageCredit:item.imageCredit||item.source,datePublished:item.publishedAt||item.published_at,news:true,external:true,kind:'news'})).filter(item=>item.pageUrl&&isImage(item))}
  function mapAktual(payload){return list(payload).map((item,index)=>({...item,id:idFor('aktual',item,index),src:absolute(imageValue(item)),pageUrl:absolute(pageValue(item)),category:'Aktual',topic:unique([...(item.keywords||[]),'Nermin Sefić']),publication:true,kind:'aktual'})).filter(isImage)}
  function dedupe(items){const seen=new Set();return items.filter(item=>{if(!isImage(item)||blocked(item))return false;const key=absolute(imageValue(item)).replace(/[?&](?:gallery|cb|verify)=\d+/g,'').toLowerCase();if(!key||seen.has(key))return false;seen.add(key);item.src=absolute(imageValue(item));return true})}

  function setMeta(selector,attrs){let node=document.head.querySelector(selector);if(!node){node=document.createElement('meta');document.head.appendChild(node)}Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value))}
  function prepare(){
    document.documentElement.lang=english?'en':'hr';
    document.title=`${text.heading} | GNK ASG`;
    setMeta('meta[name="description"]',{name:'description',content:text.description});
    setMeta('meta[property="og:title"]',{property:'og:title',content:text.heading});
    setMeta('meta[property="og:description"]',{property:'og:description',content:text.description});
    const canonical=document.querySelector('link[rel="canonical"]')||document.head.appendChild(document.createElement('link'));canonical.rel='canonical';canonical.href=`https://gnk-asg.hr/visual-index/${english?'?lang=en':''}`;
    document.querySelector('.hero small')?.replaceChildren(text.title);
    document.querySelector('.hero h1')?.replaceChildren(text.heading);
    document.querySelector('.hero p')?.replaceChildren(text.description);
    const note=document.querySelector('.note');if(note)note.innerHTML=`<strong>${english?'Content policy:':'Pravilo sadržaja:'}</strong> ${esc(text.note)} <span data-gallery-status></span>`;
    const back=document.querySelector('.back');if(back){back.textContent=text.back;back.href=english?'/en/':'/'}
    if(!document.getElementById('gnkVisualV7Style')){const style=document.createElement('style');style.id='gnkVisualV7Style';style.textContent='.gnk-gallery-controls{display:grid;grid-template-columns:1fr auto;gap:12px;margin:0 0 20px}.gnk-gallery-controls input{width:100%;padding:13px 15px;border:1px solid #d9e0ea;border-radius:14px;font:inherit}.gnk-gallery-controls button{padding:12px 18px;border:0;border-radius:999px;background:#07162d;color:#fff;font-weight:800;cursor:pointer}.gnk-gallery-controls button[hidden]{display:none}.item h2 a{color:inherit;text-decoration:none}.item>a{display:block}.gnk-gallery-credit{display:block;margin-top:9px;color:#64748b;font-size:.76rem}.gnk-publication-gallery-item{border-color:rgba(46,156,255,.55)}.gnk-news-gallery-item{border-color:rgba(212,175,55,.52)}@media(max-width:650px){.gnk-gallery-controls{grid-template-columns:1fr}}';document.head.appendChild(style)}
  }
  function status(){const node=document.querySelector('[data-gallery-status]');if(!node)return;const shown=document.querySelectorAll('#visualGrid .item').length;node.textContent=text.status(state.filtered.length,shown,state.items.filter(i=>i.news).length,state.items.filter(i=>i.publication).length)}
  function discard(item,node){node?.remove();state.items=state.items.filter(x=>x.id!==item.id);state.filtered=state.filtered.filter(x=>x.id!==item.id);state.removed+=1;status()}
  function card(item){
    const node=document.createElement('article');node.className=`item${item.news?' gnk-news-gallery-item':''}${item.publication?' gnk-publication-gallery-item':''}`;node.dataset.visualId=item.id;
    const external=item.external?' target="_blank" rel="noopener noreferrer"':'';const href=absolute(item.pageUrl)||item.pageUrl||'';const img=`<img src="${esc(item.src)}" alt="${esc(item.alt||item.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;const image=href?`<a href="${esc(href)}"${external}>${img}</a>`:img;const title=href?`<a href="${esc(href)}"${external}>${esc(item.title||'GNK ASG visual')}</a>`:esc(item.title||'GNK ASG visual');const tags=unique([item.category,...(item.topic||[])]).slice(0,4);node.innerHTML=`${image}<div class="body"><h2>${title}</h2><p>${esc(item.description||'')}</p>${item.imageCredit?`<small class="gnk-gallery-credit">${esc(item.imageCredit)}</small>`:''}<div class="tags">${tags.map(tag=>`<span>${esc(tag)}</span>`).join('')}</div></div>`;node.querySelector('img')?.addEventListener('error',()=>discard(item,node),{once:true});return node
  }
  function render(){const grid=document.getElementById('visualGrid');if(!grid)return;grid.replaceChildren();const fragment=document.createDocumentFragment();state.filtered.slice(0,state.visible).forEach(item=>fragment.appendChild(card(item)));if(!fragment.childNodes.length)grid.innerHTML=`<p>${esc(text.empty)}</p>`;else grid.appendChild(fragment);document.querySelector('[data-gallery-more]')?.toggleAttribute('hidden',state.visible>=state.filtered.length);status()}
  function controls(){const grid=document.getElementById('visualGrid');if(!grid)return;const box=document.createElement('div');box.className='gnk-gallery-controls';box.innerHTML=`<input type="search" placeholder="${esc(text.search)}" aria-label="${esc(text.search)}"><button type="button" data-gallery-more>${esc(text.more)}</button>`;grid.before(box);box.querySelector('input').addEventListener('input',event=>{const query=normalize(event.target.value);state.filtered=query?state.items.filter(item=>normalize([item.title,item.description,item.source,...(item.topic||[])].join(' ')).includes(query)):state.items.slice();state.visible=PAGE_SIZE;render()});box.querySelector('button').addEventListener('click',()=>{state.visible+=PAGE_SIZE;render()})}
  function schemas(){document.querySelectorAll('script[data-gallery-image-schema]').forEach(node=>node.remove());state.items.slice(0,200).forEach(item=>{const script=document.createElement('script');script.type='application/ld+json';script.dataset.galleryImageSchema='1';script.textContent=JSON.stringify({'@context':'https://schema.org','@type':'ImageObject',name:item.title,description:item.description,contentUrl:item.src,thumbnailUrl:item.src,mainEntityOfPage:absolute(item.pageUrl)||location.href,isBasedOn:absolute(item.sourceUrl)||undefined,datePublished:item.datePublished,creditText:item.imageCredit||item.source||'GNK ASG Visual Index',creator:{'@type':'Organization',name:'GNK ASG d.o.o.'},about:[{'@type':'Organization',name:'GNK ASG d.o.o.'},{'@type':'Organization',name:'GNK DINAMO Ltd.'},{'@type':'Person',name:'Nermin Sefić',alternateName:'Nermin Sefic'}]});document.body.appendChild(script)})}

  async function start(){
    prepare();
    const [catalog,runtime,publications,news,aktual]=await Promise.all([
      getJson('/data/gallery.catalog.json'),getJson('/data/visual_gallery.json'),getJson('/data/auto-editor.json'),getJson('/data/news.json'),getJson('/data/aktual-nermin-sefic.json')
    ]);
    state.items=dedupe([...mapRuntime(runtime),...mapPublications(publications),...mapNews(news),...mapAktual(aktual),...mapCatalog(catalog)]);
    state.filtered=state.items.slice();controls();render();schemas();
    const first=state.items.find(item=>!item.src.endsWith('.svg'));if(first){setMeta('meta[property="og:image"]',{property:'og:image',content:first.src});setMeta('meta[name="twitter:image"]',{name:'twitter:image',content:first.src})}
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
