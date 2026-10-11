(() => {
  'use strict';
  const lang=document.documentElement.lang==='en'?'en':'hr';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const copy=lang==='hr'
    ?{all:'Sve regije',india:'Indija',asia:'Azija',items:'stavki',sources:'izvora',latest:'Najnovije',sourceMap:'Izvori regionalnog deska',empty:'Za ovu regionalnu grupu trenutačno nema stavki.',feed:'trenutačni regionalni feed'}
    :{all:'All regions',india:'India',asia:'Asia',items:'items',sources:'sources',latest:'Latest',sourceMap:'Regional desk sources',empty:'No items are currently available for this regional group.',feed:'current regional feed'};
  const age=iso=>{
    const d=new Date(iso); if(Number.isNaN(d.getTime())) return '—';
    const m=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));
    if(m<60)return lang==='hr'?m+' min':m+'m';
    const h=Math.floor(m/60); if(h<24)return lang==='hr'?h+' h':h+'h';
    const days=Math.floor(h/24); return lang==='hr'?days+' d':days+'d';
  };
  const category=item=>{
    const raw=String(item.category||'').toLowerCase();
    if(raw==='indija'||raw==='india') return 'india';
    if(raw==='azija'||raw==='asia') return 'asia';
    return 'regional';
  };
  const normalize=data=>{
    const src=Array.isArray(data)?data:(data.items||[]);
    return src.filter(x=>x&&x.title&&x.url&&x.verified!==false&&String(x.group||'').toLowerCase()==='regije')
      .map(x=>({...x,_cat:category(x),_published:x.published_at||x.publishedAt||''}))
      .sort((a,b)=>new Date(b._published)-new Date(a._published));
  };
  const img=(item,eager=false)=>'<img src="'+esc(item.image||'/assets/editorial/aktual-media-800.webp')+'" alt="'+esc(item.imageAlt||item.title)+'" loading="'+(eager?'eager':'lazy')+'">';
  const link=item=>'<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer nofollow">'+esc(item.title)+'</a>';
  const label=cat=>cat==='india'?copy.india:cat==='asia'?copy.asia:(lang==='hr'?'Regije':'Regions');

  let all=[];
  let active='all';

  function subset(){
    return active==='all'?all:all.filter(x=>x._cat===active);
  }
  function renderTop(items){
    const lead=document.getElementById('rgLeadMain');
    const rail=document.getElementById('rgRail');
    if(!lead||!rail)return;
    if(!items.length){
      lead.innerHTML='<div class="rg-lead-copy"><p>'+esc(copy.empty)+'</p></div>';
      rail.innerHTML='';
      return;
    }
    const first=items[0];
    lead.innerHTML=img(first,true)+'<div class="rg-lead-copy"><span class="rg-tag">'+esc(label(first._cat))+'</span><h2>'+link(first)+'</h2><p>'+esc(txt(first.summary).slice(0,230))+'</p><div class="rg-meta">'+esc(first.source||'')+' · '+esc(age(first._published))+'</div></div>';
    rail.innerHTML=items.slice(1,4).map(x=>'<article>'+img(x)+'<div><span class="rg-tag">'+esc(label(x._cat))+'</span><h3>'+link(x)+'</h3><small>'+esc(x.source||'')+' · '+esc(age(x._published))+'</small></div></article>').join('');
  }
  function card(x){
    const summary=txt(x.summary);
    return '<article class="rg-card"><a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer nofollow">'+img(x)+'</a><div class="rg-card-body"><b>'+esc(label(x._cat))+' · '+esc(x.source||'')+'</b><h3>'+link(x)+'</h3><p>'+esc(summary.slice(0,135))+(summary.length>135?'…':'')+'</p><small>'+esc(age(x._published))+'</small></div></article>';
  }
  function renderGrid(items){
    const grid=document.getElementById('rgGrid');
    const count=document.getElementById('rgCount');
    if(grid) grid.innerHTML=items.length?items.slice(4).map(card).join(''):'<div>'+esc(copy.empty)+'</div>';
    if(count) count.textContent=items.length+' '+copy.items;
  }
  function renderSources(items){
    const host=document.getElementById('rgSources'); if(!host)return;
    const c={};items.forEach(x=>{const s=txt(x.source)||'Unknown';c[s]=(c[s]||0)+1});
    host.innerHTML=Object.entries(c).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([name,n])=>'<div class="rg-source"><span>'+esc(name)+'</span><b>'+n+'</b></div>').join('');
    const stat=document.getElementById('rgSourceCount'); if(stat) stat.textContent=Object.keys(c).length+' '+copy.sources;
  }
  function render(){
    const items=subset();
    renderTop(items);renderGrid(items);renderSources(items);
    const status=document.getElementById('rgStatus');
    if(status){
      const cats={india:all.filter(x=>x._cat==='india').length,asia:all.filter(x=>x._cat==='asia').length};
      status.textContent=all.length+' '+copy.items+' · '+copy.india+' '+cats.india+' · '+copy.asia+' '+cats.asia;
    }
    document.querySelectorAll('[data-rg-filter]').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.rgFilter===active?'true':'false'));
  }
  async function boot(){
    document.querySelectorAll('[data-rg-filter]').forEach(btn=>btn.addEventListener('click',()=>{active=btn.dataset.rgFilter;render()}));
    try{
      const r=await fetch('/data/news.json?v='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      all=normalize(await r.json());
      render();
    }catch(err){
      const status=document.getElementById('rgStatus'); if(status)status.textContent=lang==='hr'?'Regionalni feed trenutačno nije dostupan.':'Regional feed is currently unavailable.';
      console.error('[aktual-regions]',err);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
