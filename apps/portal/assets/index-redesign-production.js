(()=>{
  'use strict';

  const VERSION='GNK_ASG_INDEX_LIVE_DATA_V2_20260705';
  const lang=document.documentElement.lang==='en'?'en':'hr';
  const locale=lang==='en'?'en-GB':'hr-HR';
  const copy={
    hr:{
      loading:'Učitavanje…',
      noNews:'Trenutačno nema dostupnih vijesti.',
      noPublications:'Trenutačno nema dostupnih objava.',
      newsUnavailable:'Vijesti se trenutačno ne mogu učitati.',
      publicationsUnavailable:'Objave se trenutačno ne mogu učitati.',
      marketUnavailable:'Tržišni podaci trenutačno nisu dostupni.',
      marketOpen:'Otvori tržišni pregled',
      openNews:'Otvori Vijesti',
      openPublications:'Otvori Objave',
      groupAll:'Sve',
      networkUnavailable:'Podaci mreže trenutačno nisu dostupni.',
      countdownDefault:'Važna objava za',
      countdownDone:'Objava je dostupna',
      videoPlay:'Pokreni video',
      presentationPlay:'Pokreni prezentaciju',
      mediaUnavailable:'Medijski sadržaj još nije objavljen.',
      days:'dana',hours:'sati',minutes:'minuta',seconds:'sekundi'
    },
    en:{
      loading:'Loading…',
      noNews:'No news entries are currently available.',
      noPublications:'No publications are currently available.',
      newsUnavailable:'News cannot be loaded at this time.',
      publicationsUnavailable:'Publications cannot be loaded at this time.',
      marketUnavailable:'Market data is currently unavailable.',
      marketOpen:'Open market overview',
      openNews:'Open News',
      openPublications:'Open Publications',
      groupAll:'All',
      networkUnavailable:'Network data is currently unavailable.',
      countdownDefault:'Important announcement in',
      countdownDone:'The announcement is available',
      videoPlay:'Play video',
      presentationPlay:'Open presentation',
      mediaUnavailable:'Media content has not been published yet.',
      days:'days',hours:'hours',minutes:'minutes',seconds:'seconds'
    }
  }[lang];

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));

  const text=value=>String(value??'').trim();

  async function getJson(url,{timeout=9000}={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const separator=url.includes('?')?'&':'?';
      const response=await fetch(`${url}${separator}cb=${Date.now()}`,{
        cache:'no-store',
        headers:{accept:'application/json'},
        signal:controller.signal
      });
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      return await response.json();
    }finally{
      clearTimeout(timer);
    }
  }

  async function firstJson(urls){
    let lastError=null;
    for(const url of urls){
      try{return{url,payload:await getJson(url)}}catch(error){lastError=error;}
    }
    throw lastError||new Error('No public data source is available');
  }

  function arrayFrom(payload){
    if(Array.isArray(payload))return payload;
    for(const key of ['items','articles','entries','news','publications','posts']){
      if(Array.isArray(payload?.[key]))return payload[key];
    }
    return[];
  }

  function safeUrl(value,fallback='/'){
    if(!value)return fallback;
    try{
      const url=new URL(String(value),location.origin);
      if(!/^https?:$/.test(url.protocol))return fallback;
      return url.href;
    }catch{return fallback;}
  }

  function safeOwnUrl(value){
    if(!value)return'';
    try{
      const url=new URL(String(value),location.origin);
      const allowed=url.origin===location.origin||['gnk-asg.hr','www.gnk-asg.hr','news.gnk-asg.hr'].includes(url.hostname);
      return allowed&&/^https?:$/.test(url.protocol)?url.href:'';
    }catch{return'';}
  }

  function formatDate(value){
    const date=new Date(value||'');
    return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'Europe/Zagreb'}).format(date);
  }

  function formatNumber(value,suffix=''){
    const number=Number(value);
    if(!Number.isFinite(number))return'—';
    return number.toLocaleString(locale,{maximumFractionDigits:2})+suffix;
  }

  function repairIndexLayout(){
    const main=document.querySelector('main');
    if(!main)return;
    if(document.getElementById('gnk-asg-premium-header')){
      document.querySelectorAll('.brand-head,.top-nav').forEach(element=>{
        element.setAttribute('aria-hidden','true');
        element.style.display='none';
      });
    }
    main.querySelectorAll(':scope > .hero,:scope > .trust-strip,:scope > .section').forEach(element=>{
      element.hidden=false;
      element.style.setProperty('visibility','visible','important');
      element.style.setProperty('opacity','1','important');
      element.style.setProperty('transform','none','important');
    });
    main.querySelectorAll(':scope > div,:scope > section').forEach(element=>{
      const rect=element.getBoundingClientRect();
      const content=text(element.textContent);
      const meaningful=element.querySelector('img,video,canvas,iframe,form,article,a,button');
      if(rect.height>900&&content.length<20&&!meaningful)element.style.display='none';
    });
  }

  const modals=Object.fromEntries([...document.querySelectorAll('.modal')].map(modal=>[modal.id,modal]));
  function openModal(id){
    const modal=modals[id];
    if(!modal)return;
    modal.classList.add('open');
    document.body.style.overflow='hidden';
    modal.querySelector('[data-close]')?.focus();
  }
  function closeModal(modal){
    if(!modal)return;
    modal.classList.remove('open');
    document.body.style.overflow='';
  }
  document.addEventListener('click',event=>{
    const opener=event.target.closest('[data-open]');
    if(opener){event.preventDefault();openModal(opener.dataset.open);}
    const close=event.target.closest('[data-close]');
    if(close)closeModal(close.closest('.modal'));
    if(event.target.classList.contains('modal'))closeModal(event.target);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')document.querySelectorAll('.modal.open').forEach(closeModal);
  });

  function renderNewsFallback(message){
    const list=document.getElementById('latestNews');
    if(!list)return;
    list.innerHTML=`<a class="news-item" href="${lang==='en'?'/news/':'/vijesti/'}"><strong>${esc(message)}</strong><small>${esc(copy.openNews)}</small></a>`;
  }

  async function loadNews(){
    const list=document.getElementById('latestNews');
    try{
      const payload=await getJson('/data/news.json');
      const items=arrayFrom(payload).filter(item=>text(item?.title||item?.titleHr||item?.titleEn));
      if(!items.length){renderNewsFallback(copy.noNews);return{ok:false,count:0};}
      const top=items[0];
      const title=lang==='en'?(top.titleEn||top.title||top.titleHr):(top.titleHr||top.title||top.titleEn);
      const summary=lang==='en'?(top.summaryEn||top.summary||top.description||top.excerpt):(top.summaryHr||top.summary||top.description||top.excerpt);
      const fallbackRoute=lang==='en'?'/news/':'/vijesti/';
      const link=safeUrl(top.url||top.sourceUrl||top.share_url,fallbackRoute);
      const titleEl=document.getElementById('featuredTitle');
      const summaryEl=document.getElementById('featuredSummary');
      const linkEl=document.getElementById('featuredLink');
      if(titleEl)titleEl.textContent=title||'GNK ASG Intelligence';
      if(summaryEl)summaryEl.textContent=summary||'';
      if(linkEl)linkEl.href=link;
      if(list)list.innerHTML=items.slice(0,5).map(item=>{
        const itemTitle=lang==='en'?(item.titleEn||item.title||item.titleHr):(item.titleHr||item.title||item.titleEn);
        const itemUrl=safeUrl(item.url||item.sourceUrl||item.share_url,fallbackRoute);
        const source=item.source||item.region||item.category||'GNK ASG Intelligence Desk';
        return`<a class="news-item" href="${esc(itemUrl)}"><strong>${esc(itemTitle||'News')}</strong><small>${esc(source)}</small></a>`;
      }).join('');
      return{ok:true,count:items.length};
    }catch(error){
      renderNewsFallback(copy.newsUnavailable);
      return{ok:false,error:String(error?.message||error)};
    }
  }

  function normalizeMarketRows(payload){
    if(Array.isArray(payload?.cards)&&payload.cards.length){
      const cards=payload.cards.filter(card=>text(card?.label)).slice(0,4);
      return cards.map(card=>({
        label:text(card.label),
        value:card.value,
        suffix:text(card.suffix),
        note:text(card.note)
      }));
    }
    const assets=payload?.assets||{};
    return[
      {label:'ASG Gold Reference',value:assets.asg_gold_reference?.value_eur,suffix:' EUR'},
      {label:'Bitcoin / EUR',value:assets.bitcoin?.price_eur,suffix:' EUR'},
      {label:'USD / EUR',value:assets.usd_eur?.rate,suffix:''},
      {label:'Brent',value:assets.brent?.price_usd??assets.brent?.price,suffix:' USD'}
    ].filter(row=>row.value!==null&&row.value!==undefined);
  }

  function renderMarketUnavailable(){
    const target=document.getElementById('marketRows');
    if(!target)return;
    target.innerHTML=`<div class="market-row"><span>${esc(copy.marketUnavailable)}</span><b class="market-value">—</b></div><div class="market-row"><span><a href="${lang==='en'?'/en/markets/':'/trzista/'}">${esc(copy.marketOpen)}</a></span><b class="market-value">↗</b></div>`;
    target.dataset.state='unavailable';
  }

  async function loadMarket(){
    const target=document.getElementById('marketRows');
    if(!target)return{ok:false,reason:'target_missing'};
    try{
      const payload=await getJson('/api/market',{timeout:10000});
      const rows=normalizeMarketRows(payload);
      if(!rows.length){renderMarketUnavailable();return{ok:false,count:0};}
      target.innerHTML=rows.map(row=>`<div class="market-row"><span>${esc(row.label)}</span><b class="market-value">${esc(formatNumber(row.value,row.suffix||''))}</b>${row.note?`<small>${esc(row.note)}</small>`:''}</div>`).join('');
      target.dataset.state='ready';
      target.dataset.updatedAt=text(payload.updatedAt||payload.updated_at||new Date().toISOString());
      return{ok:true,count:rows.length};
    }catch(error){
      renderMarketUnavailable();
      return{ok:false,error:String(error?.message||error)};
    }
  }

  function renderPublicationsFallback(message){
    const target=document.getElementById('publicationRows');
    if(!target)return;
    target.innerHTML=`<a class="publication-row" href="${lang==='en'?'/publications/':'/objave/'}"><span>${esc(message)}</span><small>${esc(copy.openPublications)}</small></a>`;
  }

  async function loadPublications(){
    const target=document.getElementById('publicationRows');
    if(!target)return{ok:false,reason:'target_missing'};
    try{
      const {payload,url}=await firstJson(lang==='en'?[
        '/data/publications-auto.json','/data/insights.json','/data/objave-unified.json'
      ]:[
        '/data/objave-unified.json','/data/publications-auto.json','/data/insights.json'
      ]);
      const items=arrayFrom(payload).filter(item=>text(item?.title||item?.titleHr||item?.titleEn));
      if(!items.length){renderPublicationsFallback(copy.noPublications);return{ok:false,count:0,source:url};}
      const fallbackRoute=lang==='en'?'/publications/':'/objave/';
      target.innerHTML=items.slice(0,5).map(item=>{
        const title=lang==='en'?(item.titleEn||item.title||item.titleHr):(item.titleHr||item.title||item.titleEn);
        const href=safeUrl(item.url||item.canonical||item.href,fallbackRoute);
        const date=formatDate(item.publishedAt||item.published_at||item.date);
        return`<a class="publication-row" href="${esc(href)}"><span>${esc(title||copy.openPublications)}</span><small>${esc(date||item.category||'GNK ASG')}</small></a>`;
      }).join('');
      target.dataset.source=url;
      target.dataset.state='ready';
      return{ok:true,count:items.length,source:url};
    }catch(error){
      renderPublicationsFallback(copy.publicationsUnavailable);
      return{ok:false,error:String(error?.message||error)};
    }
  }

  async function loadNetwork(){
    const list=document.getElementById('locationList');
    const tabs=document.getElementById('continentTabs');
    const plannedList=document.getElementById('plannedList');
    if(!list||!tabs)return{ok:false,reason:'target_missing'};
    try{
      const data=await getJson('/data/group_network.json');
      const nodes=Array.isArray(data?.nodes)?data.nodes:[];
      const active=nodes.filter(node=>node.status==='active');
      const planned=nodes.filter(node=>node.status==='planned');
      const regions=[...new Set(active.map(node=>node.region).filter(Boolean))];
      tabs.innerHTML=[`<button class="active" data-region="all">${esc(copy.groupAll)}</button>`,...regions.map(region=>`<button data-region="${esc(region)}">${esc(region)}</button>`)].join('');
      const render=region=>{
        const filtered=active.filter(node=>region==='all'||node.region===region);
        const center=data.center?[data.center]:[];
        list.innerHTML=[...center,...filtered].map(node=>{
          const name=node.id==='boulder'?node.name:(lang==='en'?(node.name_en||node.name_hr):(node.name_hr||node.name_en));
          const place=node.id==='boulder'?node.place:(lang==='en'?(node.place_en||node.place_hr):(node.place_hr||node.place_en));
          return`<div class="location"><b>${esc(name)}</b><span>${esc(place)}${node.region?` · ${esc(node.region)}`:''}</span></div>`;
        }).join('')||`<div class="location"><b>${esc(copy.networkUnavailable)}</b></div>`;
      };
      render('all');
      tabs.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
        tabs.querySelectorAll('button').forEach(item=>item.classList.remove('active'));
        button.classList.add('active');
        render(button.dataset.region);
      }));
      if(plannedList)plannedList.innerHTML=planned.map(node=>{
        const name=lang==='en'?(node.name_en||node.name_hr):(node.name_hr||node.name_en);
        const place=lang==='en'?(node.place_en||node.place_hr):(node.place_hr||node.place_en);
        return`<li>${esc(name)}${place?` · ${esc(place)}`:''}</li>`;
      }).join('');
      return{ok:true,active:active.length,planned:planned.length};
    }catch(error){
      list.innerHTML=`<div class="location"><b>${esc(copy.networkUnavailable)}</b></div>`;
      return{ok:false,error:String(error?.message||error)};
    }
  }

  function installCountdown(config){
    document.getElementById('gnk-index-countdown')?.remove();
    const countdown=config?.countdown||{};
    if(!countdown.enabled||!countdown.target)return;
    const targetDate=new Date(countdown.target);
    if(Number.isNaN(targetDate.getTime()))return;
    const featuredSection=document.querySelector('.feature-grid')?.closest('.section');
    if(!featuredSection)return;
    const bar=document.createElement('section');
    bar.id='gnk-index-countdown';
    bar.className='gnk-index-countdown';
    bar.style.setProperty('--countdown-accent',countdown.color||'#ef6670');
    const label=lang==='en'?(countdown.labelEn||copy.countdownDefault):(countdown.labelHr||copy.countdownDefault);
    bar.innerHTML=`<div class="countdown-label">${esc(label)}</div><div class="countdown-values" aria-live="polite"></div>`;
    featuredSection.before(bar);
    const values=bar.querySelector('.countdown-values');
    const render=()=>{
      const remaining=targetDate.getTime()-Date.now();
      if(remaining<=0){
        const done=lang==='en'?(countdown.doneLabelEn||copy.countdownDone):(countdown.doneLabelHr||copy.countdownDone);
        values.innerHTML=`<strong>${esc(done)}</strong>`;
        bar.classList.add('is-complete');
        return false;
      }
      const seconds=Math.floor(remaining/1000);
      const parts=[
        [Math.floor(seconds/86400),copy.days],
        [Math.floor((seconds%86400)/3600),copy.hours],
        [Math.floor((seconds%3600)/60),copy.minutes],
        [seconds%60,copy.seconds]
      ];
      values.innerHTML=parts.map(([value,unit])=>`<span><b>${String(value).padStart(2,'0')}</b><small>${esc(unit)}</small></span>`).join('');
      return true;
    };
    render();
    const timer=setInterval(()=>{if(!render())clearInterval(timer);},1000);
  }

  function installLazyMedia(config){
    const media=config?.media||{};
    if(!media.enabled)return;
    const source=safeOwnUrl(media.sourceUrl||media.source||'');
    const preview=safeOwnUrl(media.previewUrl||'');
    if(!source&&!preview)return;
    const featured=document.querySelector('.featured');
    if(!featured)return;
    const poster=safeOwnUrl(media.posterUrl||media.poster||'')||'/assets/index-media-poster.svg';
    const type=media.type==='pptx'?'pptx':'video';
    const title=lang==='en'?(media.titleEn||media.title||'GNK ASG media message'):(media.titleHr||media.title||'GNK ASG medijska poruka');
    const summary=lang==='en'?(media.summaryEn||media.summary||''):(media.summaryHr||media.summary||'');
    const buttonLabel=type==='pptx'?copy.presentationPlay:copy.videoPlay;
    featured.classList.add('gnk-media-ready');
    featured.style.backgroundImage=`linear-gradient(90deg,rgba(2,9,19,.22),rgba(2,9,19,.96) 74%),url("${poster.replace(/"/g,'%22')}")`;
    featured.innerHTML=`<button class="play gnk-media-play" type="button" aria-label="${esc(buttonLabel)}">▶</button><div class="featured-content"><p class="eyebrow">${type==='pptx'?'PPTX / PDF':'Video'}</p><h3>${esc(title)}</h3><p>${esc(summary)}</p><button class="btn gnk-media-open" type="button">${esc(buttonLabel)}</button></div><div class="gnk-media-stage" hidden></div>`;
    const launch=()=>{
      const stage=featured.querySelector('.gnk-media-stage');
      if(!stage||stage.dataset.loaded==='1')return;
      stage.dataset.loaded='1';
      stage.hidden=false;
      featured.querySelector('.featured-content')?.setAttribute('hidden','');
      featured.querySelector('.gnk-media-play')?.setAttribute('hidden','');
      if(type==='video'&&source){
        const video=document.createElement('video');
        video.controls=true;video.playsInline=true;video.preload='metadata';video.poster=poster;video.src=source;video.setAttribute('aria-label',title);
        stage.appendChild(video);video.play().catch(()=>{});return;
      }
      const target=preview||source;
      if(target){
        const iframe=document.createElement('iframe');
        iframe.title=title;iframe.loading='eager';iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.src=target;stage.appendChild(iframe);
      }else stage.innerHTML=`<p>${esc(copy.mediaUnavailable)}</p>`;
    };
    featured.querySelectorAll('.gnk-media-play,.gnk-media-open').forEach(button=>button.addEventListener('click',launch,{once:true}));
  }

  async function loadIndexExperience(){
    try{
      const config=await getJson('/data/index-media-config.json');
      installCountdown(config);
      installLazyMedia(config);
      return{ok:true};
    }catch(error){return{ok:false,error:String(error?.message||error)};}
  }

  async function boot(){
    repairIndexLayout();
    const results=await Promise.allSettled([loadNews(),loadMarket(),loadPublications(),loadNetwork(),loadIndexExperience()]);
    window.GNKIndexLiveData={VERSION,results,reload:boot};
    document.documentElement.dataset.gnkIndexLiveData='ready';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('load',repairIndexLayout,{once:true});
  [250,900,2200].forEach(delay=>setTimeout(repairIndexLayout,delay));
})();