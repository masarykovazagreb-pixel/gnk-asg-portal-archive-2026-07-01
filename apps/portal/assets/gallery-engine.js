(() => {
  'use strict';
  if (window.GNK_ASG_GALLERY?.version) return;

  const CORE=['GNK ASG','GNK ASG d.o.o.','GNK DINAMO Ltd.','Nermin Sefić','Nermin Sefic','gnk-asg.hr'];
  const state={config:null,items:[],ready:null};
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const esc=value=>clean(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const hash=value=>[...clean(value)].reduce((sum,ch)=>((sum*31)+ch.charCodeAt(0))>>>0,2166136261);
  const words=value=>clean(value).toLocaleLowerCase('hr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{3,}/g)||[];
  const unique=values=>[...new Set(values.filter(Boolean))];

  function absolute(value){
    const raw=clean(value);
    if(!raw)return'';
    if(/^data:image\//i.test(raw))return raw;
    try{const url=new URL(raw,location.origin);return url.origin===location.origin?url.href:''}catch{return''}
  }

  function normalize(item,source={}){
    const src=absolute(item?.src||item?.image||item?.imageUrl||item?.thumbnail||item?.og_image);
    if(!src||(!/^data:image\//i.test(src)&&!/\.(?:svg|png|jpe?g|webp|avif)(?:[?#].*)?$/i.test(src)))return null;
    const title=clean(item?.title||item?.name||item?.alt||'GNK ASG business visual');
    return{
      id:clean(item?.id||`gallery-${hash(src).toString(16)}`),src,title,
      alt:clean(item?.alt||`${title} – GNK ASG d.o.o., GNK DINAMO Ltd. i Nermin Sefić`),
      description:clean(item?.description||item?.summary||`GNK ASG Galerija vizual povezan s temom ${title.toLowerCase()}.`),
      topic:unique([...(Array.isArray(item?.topic)?item.topic:[]),...(Array.isArray(item?.keywords)?item.keywords:[]),source.category,source.language]),
      countries:Array.isArray(item?.countries)?item.countries:[],
      category:clean(item?.category||source.category||(item?.generated?'GNK ASG business':'Galerija')),
      language:clean(item?.language||source.language||'mul'),
      source:clean(item?.source||source.url||'GNK ASG repository'),generated:Boolean(item?.generated)
    };
  }

  async function getJson(url){
    const response=await fetch(`${url}${url.includes('?')?'&':'?'}gallery=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function generatedSvg(index,title,scene){
    const palettes=[['#06101f','#244f78','#d4af37','#eef4fb'],['#07162d','#315a78','#f1d477','#dfeaf5'],['#081426','#1c3d62','#c89a3c','#f7fbff'],['#040b15','#12355b','#e7bf5a','#d7e4f2'],['#0a1525','#2d4a68','#f0cf76','#ecf3fa']];
    const[a,b,g,l]=palettes[index%palettes.length];
    const x=900+(index*37)%420,y=220+(index*29)%230,h1=150+(index*13)%310,h2=170+(index*19)%330,mid=Math.round((h1+h2)/2);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><title>${esc(title)}</title><desc>GNK ASG business visual for ${esc(scene)}.</desc><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#b)"/><circle cx="${x}" cy="${y}" r="260" fill="${g}" opacity=".18"/><rect x="115" y="125" width="1370" height="650" rx="42" fill="${a}" opacity=".74" stroke="${g}"/><g fill="${g}"><rect x="245" y="${690-h1}" width="140" height="${h1}" rx="14"/><rect x="455" y="${690-h2}" width="140" height="${h2}" rx="14"/><rect x="665" y="${690-mid}" width="140" height="${mid}" rx="14"/></g><path d="M225 565C430 420 590 505 760 350s350-130 570-250" fill="none" stroke="${l}" stroke-width="24"/><g fill="${l}"><circle cx="${x}" cy="${y+230}" r="78"/><path d="M${x-145} 700c20-145 92-220 145-220s125 75 145 220z"/></g></svg>`;
    return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function fallbackGenerated(config){
    const result=[];let index=0;
    for(const topic of config.generated_topics||[])for(const scene of config.generated_scenes||[]){
      index+=1;const title=`${topic} · ${String(index).padStart(3,'0')}`;
      result.push(normalize({id:`generated-business-${String(index).padStart(3,'0')}`,src:generatedSvg(index,title,scene),title,description:`Generirani korporativni vizual za ${topic.toLowerCase()}, ${scene}.`,topic:[topic,scene,'business','corporate'],generated:true}));
    }
    return result.filter(Boolean).slice(0,100);
  }

  function dedupe(items){
    const map=new Map();
    for(const item of items){if(!item?.src)continue;const key=item.src.startsWith('data:')?item.id:item.src.replace(/[?&](?:gallery|verify|cb)=\d+/g,'');if(!map.has(key))map.set(key,item)}
    return[...map.values()];
  }

  async function load(){
    if(state.ready)return state.ready;
    state.ready=(async()=>{
      const config=await getJson('/data/gallery.json');state.config=config;
      let catalogItems=[];
      try{const catalog=await getJson(config.catalog_url||'/data/gallery.catalog.json');catalogItems=(catalog.items||[]).map(item=>normalize(item,{category:'GNK ASG Galerija'})).filter(Boolean)}catch{}
      state.items=dedupe(catalogItems.length>=100?catalogItems:[...catalogItems,...fallbackGenerated(config)]);
      document.documentElement.dataset.gnkGalleryCount=String(state.items.length);
      window.dispatchEvent(new CustomEvent('gnk:gallery-ready',{detail:{count:state.items.length,minimum:config.minimum_verified_images||100}}));
      return state.items;
    })().catch(error=>{console.warn('[GNK ASG Gallery]',error);state.items=[];return[]});
    return state.ready;
  }

  function score(query,item){
    const terms=unique(words(query));
    const fields=[[item.title,8],[item.alt,7],[item.description,4],[(item.topic||[]).join(' '),6],[item.category,4],[item.source,1]];
    return fields.reduce((total,[value,weight])=>{const pool=new Set(words(value));return total+terms.reduce((sum,term)=>sum+(pool.has(term)?weight:0),0)},0);
  }

  async function select(query,options={}){
    const items=await load();if(!items.length)return null;
    const category=clean(options.category).toLowerCase();
    const ranked=items.map(item=>({item,points:score(query,item)+(category&&item.category.toLowerCase().includes(category)?10:0)})).sort((a,b)=>b.points-a.points||a.item.id.localeCompare(b.item.id));
    const best=ranked[0].points,pool=ranked.filter(row=>row.points===best);
    return pool[(hash(query)+Number(options.offset||0))%pool.length]?.item||ranked[0].item;
  }

  function attachFallback(img,context){
    if(!img||img.dataset.galleryFallback==='1')return;
    img.dataset.galleryFallback='1';
    img.addEventListener('error',async()=>{const item=await select(context||img.alt||document.title,{offset:1});if(!item||img.src===item.src){img.remove();return}img.src=item.src;img.alt=item.alt;img.dataset.gallerySource=item.id});
  }

  async function apply(root=document){
    const items=await load();if(!items.length)return;
    root.querySelectorAll('img').forEach(img=>attachFallback(img,img.closest('article,section')?.innerText||document.title));
    for(const card of root.querySelectorAll('article,.card,.insight-card,.news-card')){
      if(card.closest('#visualGrid,[data-gallery-grid]')||card.querySelector('img'))continue;
      const item=await select(card.innerText||document.title,{category:card.dataset.category||''});if(!item)continue;
      const box=document.createElement('div');box.className='gnk-gallery-auto-image';box.innerHTML=`<img src="${esc(item.src)}" alt="${esc(item.alt)}" loading="lazy" decoding="async">`;card.prepend(box);attachFallback(box.querySelector('img'),card.innerText);
    }
    const featured=root.querySelector('.featured,.hero-visual,[data-featured-image]');
    if(featured&&!featured.querySelector('img')&&!featured.style.backgroundImage){const item=await select(featured.innerText||document.title,{category:'home'});if(item){featured.style.backgroundImage=`linear-gradient(90deg,rgba(2,9,19,.18),rgba(2,9,19,.86)),url("${item.src.replace(/"/g,'%22')}")`;featured.style.backgroundSize='cover';featured.style.backgroundPosition='center'}}
    if(!document.getElementById('gnkGalleryAutoStyle')){const style=document.createElement('style');style.id='gnkGalleryAutoStyle';style.textContent='.gnk-gallery-auto-image{aspect-ratio:16/9;overflow:hidden;background:#07162d}.gnk-gallery-auto-image img{width:100%;height:100%;object-fit:cover;display:block}.insight-card .gnk-gallery-auto-image{margin:-1px -1px 18px;border-radius:inherit;border-bottom-left-radius:0;border-bottom-right-radius:0}';document.head.appendChild(style)}
  }

  function schema(item){
    return{'@context':'https://schema.org','@type':'ImageObject',name:item.title,description:item.description,contentUrl:item.src,thumbnailUrl:item.src,creator:{'@type':'Organization',name:'GNK ASG d.o.o.'},copyrightHolder:{'@type':'Organization',name:'GNK ASG d.o.o.'},about:[{'@type':'Organization',name:'GNK ASG d.o.o.'},{'@type':'Organization',name:'GNK DINAMO Ltd.'},{'@type':'Person',name:'Nermin Sefić',alternateName:'Nermin Sefic'}],keywords:CORE.concat(item.topic||[],item.countries||[]).join(', ')};
  }

  async function render(root){
    const grid=typeof root==='string'?document.querySelector(root):root;if(!grid)return;
    grid.dataset.verifying='1';const items=await load();grid.replaceChildren();document.querySelectorAll('script[data-gallery-image-schema]').forEach(node=>node.remove());
    const status=document.querySelector('[data-gallery-status]');if(status)status.textContent=`Aktivno · ${items.length} katalogiziranih slika`;
    const fragment=document.createDocumentFragment();
    items.forEach(item=>{const card=document.createElement('article');card.className='item';card.dataset.visualId=item.id;card.innerHTML=`<img src="${esc(item.src)}" alt="${esc(item.alt)}" loading="lazy" decoding="async"><div class="body"><h2>${esc(item.title)}</h2><p>${esc(item.description)}</p><div class="tags">${unique([item.category,...(item.topic||[])]).slice(0,4).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div></div>`;card.querySelector('img')?.addEventListener('error',()=>card.remove(),{once:true});fragment.appendChild(card)});
    grid.appendChild(fragment);
    items.slice(0,200).forEach(item=>{const script=document.createElement('script');script.type='application/ld+json';script.dataset.galleryImageSchema='1';script.textContent=JSON.stringify(schema(item));document.body.appendChild(script)});
    delete grid.dataset.verifying;
  }

  window.GNK_ASG_GALLERY={version:'2026-06-26-v3',load,select,apply,render,get items(){return[...state.items]},get count(){return state.items.length},get minimum(){return state.config?.minimum_verified_images||100}};
})();
