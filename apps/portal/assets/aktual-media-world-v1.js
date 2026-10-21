(() => {
  'use strict';
  const root = document.documentElement;
  const lang = root.lang === 'en' ? 'en' : 'hr';
  const view = document.body?.dataset?.aktualView || 'home';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txt = v => String(v ?? '').replace(/\s+/g,' ').trim();
  const labels = {
    hr:{
      latest:'Najnovije',croatia:'Hrvatska',world:'Svijet',business:'Biznis',tech:'Tehnologija',
      sport:'Sport',science:'Znanost',lifestyle:'Lifestyle',culture:'Kultura',digital:'Digitalna imovina',regions:'Regije',other:'Ostalo',
      justIn:'Upravo stiglo',source:'Izvor',openSource:'Otvori izvor',sections:'Rubrike',
      currentFeed:'Trenutačni feed',sources:'Izvori u trenutačnom feedu',search:'Pretraži feed',
      searchPh:'naslov, tema ili izvor',noResults:'Nema rezultata.',topics:'AKTUAL teme',topicsSub:'Pregled stvarnih rubrika i izvora u trenutačnom news feedu.',
      verified:'provjereni feed',stories:'stavki',updated:'zadnja objava',all:'Sve'
    },
    en:{
      latest:'Latest',croatia:'Croatia',world:'World',business:'Business',tech:'Technology',
      sport:'Sport',science:'Science',lifestyle:'Lifestyle',culture:'Culture',digital:'Digital assets',regions:'Regions',other:'More',
      justIn:'Just in',source:'Source',openSource:'Open source',sections:'Sections',
      currentFeed:'Current feed',sources:'Sources in current feed',search:'Search feed',
      searchPh:'headline, topic or source',noResults:'No results.',topics:'AKTUAL topics',topicsSub:'A live overview of real sections and sources in the current news feed.',
      verified:'verified feed',stories:'stories',updated:'latest item',all:'All'
    }
  }[lang];

  const groupMeta = {
    hrvatska:{label:labels.croatia,slug:'hrvatska'},
    international:{label:labels.world,slug:'svijet'},
    world:{label:labels.world,slug:'svijet'},
    economy:{label:labels.business,slug:'biznis'},
    business:{label:labels.business,slug:'biznis'},
    regije:{label:labels.regions,slug:'regije'},
    technology:{label:labels.tech,slug:'tehnologija'},
    tech:{label:labels.tech,slug:'tehnologija'},
    sport:{label:labels.sport,slug:'sport'},
    sports:{label:labels.sport,slug:'sport'},
    znanost:{label:labels.science,slug:'znanost'},
    science:{label:labels.science,slug:'znanost'},
    lifestyle:{label:labels.lifestyle,slug:'lifestyle'},
    culture:{label:labels.culture,slug:'kultura'},
    showbiz:{label:labels.lifestyle,slug:'lifestyle'},
    'digital-assets':{label:labels.digital,slug:'digitalna-imovina'},
    digital:{label:labels.digital,slug:'digitalna-imovina'}
  };
  const canonicalOrder=['hrvatska','international','economy','technology','sport','znanost','lifestyle','culture','digital-assets','regije'];
  const requiredGroups=['hrvatska','international','economy','technology','sport','culture'];

  const normGroup=item => {
    const raw=String(item.group||item.category||'other').toLowerCase();
    const aliases={world:'international',business:'economy',tech:'technology',sports:'sport',science:'znanost',showbiz:'lifestyle',digital:'digital-assets'};
    if(aliases[raw]) return aliases[raw];
    if(groupMeta[raw]) return raw;
    if(/sport/.test(raw)) return 'sport';
    if(/tech|ai|software/.test(raw)) return 'technology';
    if(/science|znan/.test(raw)) return 'znanost';
    if(/business|econom|market|finance|bank/.test(raw)) return 'economy';
    if(/croat|hrvat/.test(raw)) return 'hrvatska';
    if(/world|intern/.test(raw)) return 'international';
    if(/life|culture|show|music|food|travel/.test(raw)) return 'lifestyle';
    return 'other';
  };
  const metaFor = group => groupMeta[group] || {label:labels.other,slug:'ostalo'};
  const timeAgo = iso => {
    const d=new Date(iso); if(Number.isNaN(d.getTime())) return '';
    const min=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));
    if(min<60) return lang==='hr' ? min+' min' : min+'m';
    const h=Math.floor(min/60); if(h<24) return lang==='hr' ? h+' h' : h+'h';
    const days=Math.floor(h/24); return lang==='hr' ? days+' d' : days+'d';
  };
  const safeItems = data => {
    const src=Array.isArray(data)?data:(data.items||[]);
    return src.filter(x=>x&&x.title&&x.url&&x.image&&x.verified!==false)
      .map(x=>({...x,_group:normGroup(x),_published:x.published_at||x.publishedAt||''}))
      .sort((a,b)=>new Date(b._published)-new Date(a._published));
  };
  const storyLink = item => '<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer nofollow">'+esc(item.title)+'</a>';
  // Slika iz izvora ostaje izvor, ali je čitatelj ne dohvaća s tuđe domene:
  // ide kroz naš posrednik /api/img. Izdavač ne vidi posjetitelja, slika se
  // kešira, a kredit ostaje uz nju. Lokalne ilustracije prolaze izravno.
  const localImage = /^\/assets\/[a-z0-9/_-]+\.(?:svg|webp|png|jpe?g)$/i;
  const remoteImage = /^https:\/\/[^\s"'<>]+$/i;
  // Izvori drže sliku u više veličina; tražimo onu koja odgovara okviru.
  const biggerSource = (url, width) => {
    const want = Math.min(1600, Math.max(240, Number(width) || 880));
    try {
      const u = new URL(url);
      if (u.hostname === 'i.guim.co.uk') {
        const current = Number(u.searchParams.get('width')) || 0;
        u.searchParams.set('width', String(Math.max(want, current)));
        if (!u.searchParams.has('quality')) u.searchParams.set('quality', '85');
        return u.href;
      }
      if (u.hostname === 'ichef.bbci.co.uk') {
        const steps = [240, 320, 480, 640, 800, 976, 1024, 1280, 1536];
        const size = steps.find(n => n >= want) || 1536;
        u.pathname = u.pathname.replace(/\/(240|320|480|640|800|976|1024|1280|1536)\//, '/'+size+'/');
        return u.href;
      }
      if (u.hostname === 'www.tportal.hr' && /\/thumbnail\/\d+x\d+/.test(u.pathname)) {
        u.pathname = u.pathname.replace(/\/thumbnail\/\d+x\d+/, want >= 880 ? '/thumbnail/1200x630' : '/thumbnail/640x336');
        return u.href;
      }
      return url;
    } catch { return url; }
  };
  const selectImage = (item, width = 880) => {
    const original = String(item.image || '').trim();
    if (localImage.test(original) && original.indexOf('..') === -1) {
      return { src: original, alt: item.imageAlt || item.title || '' };
    }
    if (remoteImage.test(original)) {
      return {
        src: '/api/img?u=' + encodeURIComponent(biggerSource(original, width)) + '&w=' + Math.round(width),
        alt: item.imageAlt || item.title || '',
        credit: item.imageCredit || item.source || ''
      };
    }
    // Bez slike: tiha ploha s rubrikom, nikad ista zamjenska ilustracija.
    return { src: '', alt: '', plate: metaFor(item._group).label, source: item.source || '' };
  };
  const plateFor = visual => '<span class="am-plate" aria-hidden="true"><b>' + esc(visual.plate || '') + '</b><i>' + esc(visual.source || '') + '</i></span>';
  const image = (item, eager = false, width = 880) => {
    const visual = selectImage(item, width);
    if (!visual.src) return plateFor(visual);
    return '<img src="' + esc(visual.src) + '" alt="' + esc(visual.alt) + '" width="1200" height="675" loading="' + (eager ? 'eager' : 'lazy') + '" decoding="async" referrerpolicy="no-referrer"'
      + (visual.credit ? ' data-credit="' + esc(visual.credit) + '"' : '') + '>';
  };
  document.addEventListener('error', event => {
    const img = event.target;
    if (!img || img.tagName !== 'IMG') return;
    const host = img.closest('.am-card, .am-rail-card, .am-lead');
    if (!host || host.querySelector('.am-plate')) return;
    const plate = document.createElement('span');
    plate.className = 'am-plate';
    plate.setAttribute('aria-hidden', 'true');
    plate.innerHTML = '<b>' + esc(host.dataset.group || '') + '</b><i>' + esc(host.dataset.source || '') + '</i>';
    img.replaceWith(plate);
  }, true);
  const meta = item => '<div class="am-meta"><span>'+esc(item.source||labels.source)+'</span><span>·</span><span>'+esc(timeAgo(item._published))+'</span></div>';

  function setEdition(items){
    const date=document.getElementById('amEditionDate');
    const status=document.getElementById('amFeedStatus');
    const latest=items[0]?new Date(items[0]._published):null;
    if(date) date.textContent=new Intl.DateTimeFormat(lang==='hr'?'hr-HR':'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
    if(status) status.textContent=items.length
      ? items.length+' '+labels.stories+(latest&&!Number.isNaN(latest.getTime())?' · '+labels.updated+' '+timeAgo(latest.toISOString()):'')
      : (lang==='hr'?'Feed se upravo osvježava…':'Feed is being refreshed…');
  }

  function renderBreaking(items){
    const el=document.getElementById('amBreakingTrack'); if(!el) return;
    el.innerHTML=items.slice(0,6).map(storyLink).join('');
  }

  function renderLead(items){
    if(!items.length) return;
    const lead=document.getElementById('amLead');
    const rail=document.getElementById('amRail');
    const main=items[0];
    if(lead){
      lead.dataset.group=metaFor(main._group).label;
      lead.dataset.source=main.source||'';
      lead.innerHTML=image(main,true,1200)+'<div class="am-lead-copy"><span class="am-label">'+esc(metaFor(main._group).label)+'</span><h2>'+storyLink(main)+'</h2><p>'+esc(txt(main.summary).slice(0,280))+'</p>'+meta(main)+(main.imageCredit?'<p class="am-credit">'+(lang==='hr'?'Foto':'Photo')+': '+esc(main.imageCredit)+'</p>':'')+'</div>';
    }
    if(rail){
      rail.innerHTML=items.slice(1,3).map(item=>'<article class="am-rail-card" data-group="'+esc(metaFor(item._group).label)+'" data-source="'+esc(item.source||'')+'">'+image(item,false,640)+'<div class="am-rail-copy"><span class="am-label blue">'+esc(metaFor(item._group).label)+'</span><h3>'+storyLink(item)+'</h3><p>'+esc(txt(item.summary).slice(0,120))+(txt(item.summary).length>120?'…':'')+'</p></div></article>').join('');
    }
  }

  function renderLatest(items){
    const list=document.getElementById('amLatestList'); if(!list) return;
    list.innerHTML=items.slice(3,13).map((item,i)=>'<li><span class="num">'+String(i+1).padStart(2,'0')+'</span><div>'+storyLink(item)+'</div><span class="src">'+esc(item.source||'')+' · '+esc(timeAgo(item._published))+'</span></li>').join('');
  }

  function grouped(items){
    const g={}; items.forEach(x=>(g[x._group] ||= []).push(x)); return g;
  }

  function renderGroups(items){
    const host=document.getElementById('amGroups'); if(!host) return;
    const by=grouped(items);
    const rest=Object.keys(by).filter(x=>!canonicalOrder.includes(x)).sort();
    const extras=canonicalOrder.filter(x=>!requiredGroups.includes(x)&&by[x]?.length);
    const order=[...requiredGroups,...extras,...rest];
    host.innerHTML=order.map(group=>{
      const m=metaFor(group), all=by[group]||[], stories=all.slice(0,8);
      const body=stories.length?'<div class="am-cardgrid">'+stories.map(item=>'<article class="am-card" data-group="'+esc(m.label)+'" data-source="'+esc(item.source||'')+'"><a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer nofollow">'+image(item,false,480)+'</a><div class="am-card-body"><span class="am-kicker">'+esc(item.source||m.label)+'</span><h3>'+storyLink(item)+'</h3><p>'+esc(txt(item.summary).slice(0,145))+(txt(item.summary).length>145?'…':'')+'</p><div class="am-cardmeta">'+esc(timeAgo(item._published))+'</div></div></article>').join('')+'</div>':'<p class="am-empty-group">'+(lang==='hr'?'Trenutačno nema stavki iz provjerenog feeda u ovoj rubrici.':'No current verified-feed stories in this section.')+'</p>';
      return '<section class="am-group" id="rubrika-'+esc(m.slug)+'"><div class="am-group-title"><h2>'+esc(m.label)+'</h2><span>'+stories.length+' / '+all.length+' '+esc(labels.stories)+'</span></div>'+body+'</section>';
    }).join('');
    renderSectionNav(order,by);
  }

  function renderSectionNav(order,by){
    const nav=document.getElementById('amSectionNav'); if(!nav) return;
    const required=[...requiredGroups.map(g=>'<a href="#rubrika-'+esc(metaFor(g).slug)+'">'+esc(metaFor(g).label)+'</a>')];
    const extras=order.filter(g=>!requiredGroups.includes(g)).map(g=>'<a href="#rubrika-'+esc(metaFor(g).slug)+'">'+esc(metaFor(g).label)+'</a>');
    const central=[
      '<a href="#izdanja-po-zemljama">'+(lang==='hr'?'Izdanja':'Editions')+'</a>',
      '<a href="#deskovi">'+(lang==='hr'?'Deskovi':'Desks')+'</a>',
      '<a href="#mravinjak">'+(lang==='hr'?'Mravinjak':'News river')+'</a>'
    ];
    const fixed=[
      ...(document.getElementById('sve-aktual-media')?central:[]),
      '<a href="#amLead">'+esc(labels.latest)+'</a>',
      ...required,
      ...extras,
      '<a href="'+(lang==='hr'?'/gnk-aktual/tjedni/':'/en/gnk-aktual/weekly/')+'">'+(lang==='hr'?'Tjednik':'Weekly')+'</a>',
      '<a href="'+(lang==='hr'?'/komentari/':'/en/commentary/')+'">'+(lang==='hr'?'Komentari':'Commentary')+'</a>',
      '<a href="'+(lang==='hr'?'/gnk-aktual/kolumne/':'/en/gnk-aktual/columns/')+'">'+(lang==='hr'?'Kolumne':'Columns')+'</a>',
      '<a href="'+(lang==='hr'?'/objave/':'/en/publications/')+'">'+(lang==='hr'?'Sve vijesti':'All news')+'</a>',
      '<a href="'+(lang==='hr'?'/analize/':'/en/analyses/')+'">'+(lang==='hr'?'Sve analize':'All analyses')+'</a>',
      '<a href="'+(lang==='hr'?'/radio/':'/en/radio/')+'">Radio</a>',
      '<a href="'+(lang==='hr'?'/gnk-aktual/radar/':'/en/gnk-aktual/radar/')+'">RADAR</a>',
      '<a href="'+(lang==='hr'?'/gnk-aktual/izvori/':'/en/gnk-aktual/sources/')+'">'+(lang==='hr'?'Izvori':'Sources')+'</a>',
      '<a href="'+(lang==='hr'?'/gnk-aktual/regije/':'/en/gnk-aktual/regions/')+'">'+(lang==='hr'?'Regije':'Regions')+'</a>',
      '<a href="'+(lang==='hr'?'/gnk-aktual/teme/':'/en/gnk-aktual/topics/')+'">'+esc(labels.sections)+'</a>'
    ];
    nav.innerHTML=fixed.join('');
  }

  function renderSources(items){
    const el=document.getElementById('amSources'); if(!el) return;
    const counts={}; items.forEach(x=>{const s=txt(x.source)||labels.source;counts[s]=(counts[s]||0)+1});
    el.innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,14)
      .map(([name,count])=>'<span>'+esc(name)+' <b>'+count+'</b></span>').join('');
  }

  function setupSearch(items){
    const form=document.getElementById('amSearchForm');
    const input=document.getElementById('amSearchInput');
    const out=document.getElementById('amSearchResults');
    if(!form||!input||!out) return;
    const run=()=>{
      const q=txt(input.value).toLowerCase();
      if(q.length<2){out.innerHTML='';return}
      const matches=items.filter(x=>[x.title,x.summary,x.source,metaFor(x._group).label].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,8);
      out.innerHTML=matches.length?matches.map(x=>'<div class="am-search-result">'+storyLink(x)+'<small>'+esc(x.source||'')+' · '+esc(timeAgo(x._published))+'</small></div>').join(''):'<div class="am-search-result">'+esc(labels.noResults)+'</div>';
    };
    form.addEventListener('submit',e=>{e.preventDefault();run()});
    input.addEventListener('input',run);
  }

  async function renderEditorial(){
    const host=document.getElementById('amEditorialLinks'); if(!host) return;
    try{
      const r=await fetch('/data/kolumne.json?v='+Date.now(),{cache:'no-store'});
      if(!r.ok) throw new Error('HTTP '+r.status);
      const data=await r.json();
      const arr=Array.isArray(data)?data:(data.items||[]);
      const items=arr.filter(x=>x&&x.naslov&&x.url).slice(0,5);
      host.innerHTML=items.map(x=>'<a href="'+esc(x.url)+'">'+esc(x.naslov)+'</a>').join('');
    }catch{
      host.innerHTML='<a href="'+(lang==='hr'?'/gnk-aktual/kolumne/':'/en/gnk-aktual/columns/')+'">'+(lang==='hr'?'Otvori arhivu kolumni':'Open columns archive')+'</a>';
    }
  }

  function renderTopics(items){
    const host=document.getElementById('amTopicGrid'); if(!host) return;
    const by=grouped(items);
    const order=[...canonicalOrder,...Object.keys(by).filter(x=>!canonicalOrder.includes(x)).sort()].filter(x=>by[x]?.length);
    host.innerHTML=order.map(group=>{
      const m=metaFor(group), arr=by[group], sources=new Set(arr.map(x=>x.source).filter(Boolean));
      const latest=arr[0];
      return '<article class="am-topic"><span class="count">'+arr.length+'</span><h2>'+esc(m.label)+'</h2><p>'+sources.size+' '+(lang==='hr'?'izvora':'sources')+(latest?' · '+esc(labels.updated)+' '+esc(timeAgo(latest._published)):'')+'</p><a href="'+(lang==='hr'?'/gnk-aktual/':'/en/gnk-aktual/')+'#rubrika-'+esc(m.slug)+'">'+(lang==='hr'?'Otvori rubriku':'Open section')+' →</a></article>';
    }).join('');
    renderSources(items);
  }

  async function boot(){
    try{
      // Jedan ponovni pokušaj: tijekom deploya CDN zna vratiti prazan odgovor,
      // a stranica je tada izgledala kao da nema vijesti.
      let r=null;
      for(let attempt=0;attempt<2;attempt+=1){
        r=await fetch('/data/news.json',{cache:'no-cache'});
        if(r.ok) break;
        await new Promise(done=>setTimeout(done,1500));
      }
      if(!r||!r.ok) throw new Error('HTTP '+(r?r.status:'0'));
      let items=safeItems(await r.json());
      // Prazan odgovor zna doći iz CDN-a tijekom deploya. Jedan svjež upit
      // zaobilazi keš; ako i tada nema stavki, stranica to pošteno kaže.
      if(!items.length){
        await new Promise(done=>setTimeout(done,1200));
        const fresh=await fetch('/data/news.json?v='+Date.now(),{cache:'no-store'});
        if(fresh.ok) items=safeItems(await fresh.json());
      }
      setEdition(items);
      if(view==='topics'){renderTopics(items);return}
      renderBreaking(items);renderLead(items);renderLatest(items);renderGroups(items);renderSources(items);setupSearch(items);renderEditorial();
    }catch(err){
      const status=document.getElementById('amFeedStatus');
      if(status) status.textContent=lang==='hr'?'Feed trenutačno nije dostupan.':'Feed is currently unavailable.';
      console.error('[aktual-world]',err);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
