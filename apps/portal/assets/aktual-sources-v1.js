(() => {
  'use strict';
  const lang=document.documentElement.lang==='en'?'en':'hr';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const aliases={world:'international',business:'economy',tech:'technology',sports:'sport',science:'znanost',culture:'lifestyle',showbiz:'lifestyle',digital:'digital-assets'};
  const labels={
    hr:{international:'Svijet',economy:'Biznis',technology:'Tehnologija',sport:'Sport',znanost:'Znanost',lifestyle:'Lifestyle','digital-assets':'Digitalna imovina',hrvatska:'Hrvatska',regije:'Regije',other:'Ostalo'},
    en:{international:'World',economy:'Business',technology:'Technology',sport:'Sport',znanost:'Science',lifestyle:'Lifestyle','digital-assets':'Digital assets',hrvatska:'Croatia',regije:'Regions',other:'More'}
  }[lang];
  const group=item=>{
    const raw=String(item.group||item.category||'other').toLowerCase();
    if(aliases[raw]) return aliases[raw];
    if(labels[raw]) return raw;
    if(/sport/.test(raw)) return 'sport';
    if(/tech|ai|software/.test(raw)) return 'technology';
    if(/science|znan/.test(raw)) return 'znanost';
    if(/business|econom|market|finance|bank/.test(raw)) return 'economy';
    if(/croat|hrvat/.test(raw)) return 'hrvatska';
    if(/world|intern/.test(raw)) return 'international';
    if(/life|culture|show|music|food|travel/.test(raw)) return 'lifestyle';
    return 'other';
  };
  const age=iso=>{
    const d=new Date(iso); if(Number.isNaN(d.getTime())) return '—';
    const m=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));
    if(m<60) return lang==='hr'?m+' min':m+'m';
    const h=Math.floor(m/60); if(h<24) return lang==='hr'?h+' h':h+'h';
    const days=Math.floor(h/24); return lang==='hr'?days+' d':days+'d';
  };
  const pct=(a,b)=>b?Math.round(a/b*100):0;

  function normalize(data){
    const src=Array.isArray(data)?data:(data.items||[]);
    return src.filter(x=>x&&x.title&&x.url&&x.verified!==false)
      .map(x=>({...x,_group:group(x),_published:x.published_at||x.publishedAt||''}))
      .sort((a,b)=>new Date(b._published)-new Date(a._published));
  }

  function buildSources(items){
    const map={};
    for(const item of items){
      const name=txt(item.source)|| (lang==='hr'?'Nepoznat izvor':'Unknown source');
      const rec=(map[name] ||= {name,items:[],groups:new Set(),last:null});
      rec.items.push(item); rec.groups.add(item._group);
      if(!rec.last || new Date(item._published)>new Date(rec.last._published)) rec.last=item;
    }
    return Object.values(map).sort((a,b)=>b.items.length-a.items.length||a.name.localeCompare(b.name));
  }

  function renderStats(items,sources){
    const distinctGroups=new Set(items.map(x=>x._group));
    const top=sources[0];
    document.getElementById('asItems').textContent=items.length;
    document.getElementById('asSources').textContent=sources.length;
    document.getElementById('asTopShare').textContent=top?pct(top.items.length,items.length)+'%':'—';
    const note=document.getElementById('asStatus');
    if(note) note.textContent=(lang==='hr'
      ? items.length+' stavki · '+sources.length+' izvora · '+distinctGroups.size+' rubrika'
      : items.length+' items · '+sources.length+' sources · '+distinctGroups.size+' sections');
  }

  function card(rec,total){
    const last=rec.last;
    const groups=[...rec.groups].map(g=>labels[g]||labels.other).sort();
    const summary=last?txt(last.summary).slice(0,150):'';
    return '<article class="as-card" data-source-name="'+esc(rec.name.toLowerCase())+'"><h2>'+esc(rec.name)+'</h2>'+
      '<div class="as-meta"><span>'+rec.items.length+' '+(lang==='hr'?'stavki':'items')+'</span><span>·</span><span>'+pct(rec.items.length,total)+'%</span><span>·</span><span>'+(lang==='hr'?'zadnja pojava ':'last seen ')+esc(last?age(last._published):'—')+'</span></div>'+
      '<div class="as-groups">'+groups.map(g=>'<span class="as-badge">'+esc(g)+'</span>').join('')+'</div>'+
      '<p>'+esc(summary)+(summary.length===150?'…':'')+'</p>'+
      (last?'<a href="'+esc(last.url)+'" target="_blank" rel="noopener noreferrer nofollow">'+(lang==='hr'?'Otvori zadnju povezanu vijest':'Open latest linked story')+' →</a>':'')+
      '</article>';
  }

  function render(items,sources){
    renderStats(items,sources);
    const grid=document.getElementById('asGrid');
    const input=document.getElementById('asSearch');
    if(!grid||!input) return;
    const draw=()=>{
      const q=txt(input.value).toLowerCase();
      const filtered=sources.filter(s=>!q||s.name.toLowerCase().includes(q)||[...s.groups].some(g=>(labels[g]||labels.other).toLowerCase().includes(q)));
      grid.innerHTML=filtered.length?filtered.map(s=>card(s,items.length)).join(''):'<div class="as-empty">'+(lang==='hr'?'Nema izvora za taj upit.':'No sources match that query.')+'</div>';
      const count=document.getElementById('asCount'); if(count) count.textContent=filtered.length+' / '+sources.length;
    };
    input.addEventListener('input',draw); draw();
  }

  async function boot(){
    try{
      const r=await fetch('/data/news.json',{cache:'no-cache'});
      if(!r.ok) throw new Error('HTTP '+r.status);
      const items=normalize(await r.json());
      render(items,buildSources(items));
    }catch(err){
      const grid=document.getElementById('asGrid');
      if(grid) grid.innerHTML='<div class="as-empty">'+(lang==='hr'?'Imenik izvora trenutačno nije dostupan.':'Source directory is currently unavailable.')+'</div>';
      console.error('[aktual-sources]',err);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
