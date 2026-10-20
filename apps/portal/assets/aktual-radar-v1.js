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
  const words=lang==='hr'
    ?{items:'stavki',sources:'izvora',sections:'rubrika',latestAge:'starost najnovije',topSource:'vodeći izvor',share:'udio u feedu',lastSeen:'zadnja pojava',current:'trenutačni feed'}
    :{items:'items',sources:'sources',sections:'sections',latestAge:'latest item age',topSource:'top source',share:'share of feed',lastSeen:'last seen',current:'current feed'};
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
    const min=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));
    if(min<60) return lang==='hr'?min+' min':min+'m';
    const h=Math.floor(min/60); if(h<24) return lang==='hr'?h+' h':h+'h';
    const days=Math.floor(h/24); return lang==='hr'?days+' d':days+'d';
  };
  const pct=(a,b)=>b?Math.round((a/b)*100):0;

  function normalize(data){
    const src=Array.isArray(data)?data:(data.items||[]);
    return src.filter(x=>x&&x.title&&x.url&&x.verified!==false)
      .map(x=>({...x,_group:group(x),_published:x.published_at||x.publishedAt||''}))
      .sort((a,b)=>new Date(b._published)-new Date(a._published));
  }

  function metric(id,value,note){
    const el=document.getElementById(id); if(!el) return;
    el.querySelector('strong').textContent=value;
    const small=el.querySelector('small'); if(small) small.textContent=note||'';
  }

  function render(items){
    const groups={}; const sources={};
    items.forEach(x=>{
      (groups[x._group] ||= []).push(x);
      const s=txt(x.source)||'Unknown'; (sources[s] ||= []).push(x);
    });
    const groupEntries=Object.entries(groups).sort((a,b)=>b[1].length-a[1].length);
    const sourceEntries=Object.entries(sources).sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]));
    const latest=items[0];
    metric('arItems',items.length,words.current);
    metric('arSources',sourceEntries.length,words.current);
    metric('arSections',groupEntries.length,words.current);
    metric('arLatest',latest?age(latest._published):'—',latest?txt(latest.source):'');

    const bars=document.getElementById('arBars');
    if(bars){
      const max=Math.max(1,...groupEntries.map(([,arr])=>arr.length));
      bars.innerHTML=groupEntries.map(([g,arr])=>'<div class="ar-bar-row"><label>'+esc(labels[g]||labels.other)+'</label><div class="ar-bar"><span style="width:'+pct(arr.length,max)+'%"></span></div><b>'+arr.length+'</b></div>').join('');
    }

    const sourceTable=document.getElementById('arSourceRows');
    if(sourceTable){
      sourceTable.innerHTML=sourceEntries.slice(0,16).map(([name,arr])=>{
        const last=arr.slice().sort((a,b)=>new Date(b._published)-new Date(a._published))[0];
        return '<tr><td>'+esc(name)+'</td><td>'+arr.length+'</td><td>'+pct(arr.length,items.length)+'%</td><td>'+esc(age(last?last._published:null))+'</td></tr>';
      }).join('');
    }

    const fresh=document.getElementById('arFreshness');
    if(fresh){
      fresh.innerHTML=groupEntries.map(([g,arr])=>{
        const last=arr.slice().sort((a,b)=>new Date(b._published)-new Date(a._published))[0];
        return '<div class="ar-fresh"><strong>'+esc(labels[g]||labels.other)+'</strong><a href="'+esc(last?.url||'#')+'" target="_blank" rel="noopener noreferrer nofollow">'+esc(last?.title||'—')+'</a><span>'+esc(age(last?last._published:null))+'</span></div>';
      }).join('');
    }

    const concentration=document.getElementById('arConcentration');
    if(concentration){
      const top=sourceEntries.slice(0,5);
      concentration.innerHTML=top.map(([name,arr])=>'<div class="ar-concentration-row"><span>'+esc(name)+'</span><b>'+arr.length+' · '+pct(arr.length,items.length)+'%</b></div>').join('');
    }

    const status=document.getElementById('arStatus');
    if(status) status.textContent=items.length+' '+words.items+' · '+sourceEntries.length+' '+words.sources+' · '+groupEntries.length+' '+words.sections;
    const topSource=document.getElementById('arTopSource');
    if(topSource && sourceEntries[0]){
      topSource.textContent=words.topSource+': '+sourceEntries[0][0]+' · '+pct(sourceEntries[0][1].length,items.length)+'% '+words.share;
    }
  }

  async function boot(){
    try{
      const r=await fetch('/data/news.json',{cache:'no-cache'});
      if(!r.ok) throw new Error('HTTP '+r.status);
      render(normalize(await r.json()));
    }catch(err){
      const status=document.getElementById('arStatus');
      if(status) status.textContent=lang==='hr'?'Radar trenutačno nema podatke.':'Radar data is currently unavailable.';
      console.error('[aktual-radar]',err);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
