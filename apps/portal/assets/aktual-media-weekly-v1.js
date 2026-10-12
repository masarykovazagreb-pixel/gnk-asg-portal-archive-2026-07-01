(() => {
  'use strict';
  const en=(document.documentElement.lang||'').startsWith('en');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fmt=d=>{try{return new Intl.DateTimeFormat(en?'en-GB':'hr-HR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(d))}catch(_){return d||''}};
  const card=(x,label)=>'<article class="tw-card"><a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer nofollow"><img src="'+esc(x.image)+'" alt="'+esc(x.imageAlt||x.title)+'" loading="lazy"></a><div class="tw-card-body"><span class="label">'+esc(label)+' · '+esc(x.source||'')+'</span><h3><a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer nofollow">'+esc(x.title)+'</a></h3><p>'+esc(text(x.summary).slice(0,165))+(text(x.summary).length>165?'…':'')+'</p><small>'+esc(fmt(x.published_at))+'</small></div></article>';
  async function renderColumns(){
    const root=document.getElementById('twColumnGrid'); if(!root)return;
    try{
      const r=await fetch('/data/kolumne.json?v='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const data=await r.json();
      const arr=(Array.isArray(data)?data:(data.items||[])).filter(x=>x&&x.url&&(x.naslov||x.naslov_en));
      arr.sort((a,b)=>String(b.objavljeno||'').localeCompare(String(a.objavljeno||'')));
      root.innerHTML=arr.slice(0,3).map(x=>{
        const title=en?(x.naslov_en||x.naslov):x.naslov;
        const summary=en?(x.meta_opis_en||x.tekst_en||x.meta_opis||x.tekst||''):(x.meta_opis||x.tekst||'');
        const img=x.slika||'/assets/people/nermin-sefic/nermin-sefic-17-restaurant-roundtable.webp';
        return '<article class="tw-card tw-column-card"><a href="'+esc(en?(x.url_en||x.url):x.url)+'"><img src="'+esc(img)+'" alt="'+esc(title)+' — Nermin Sefić" loading="lazy"></a><div class="tw-card-body"><span class="label">AKTUAL MEDIA · NERMIN SEFIĆ</span><h3><a href="'+esc(en?(x.url_en||x.url):x.url)+'">'+esc(title)+'</a></h3><p>'+esc(text(summary).slice(0,165))+(text(summary).length>165?'…':'')+'</p><small>'+esc(fmt(x.objavljeno))+'</small></div></article>';
      }).join('');
    }catch(_){root.innerHTML='';}
  }

  async function boot(){
    const r=await fetch('/data/aktual-weekly.json?v='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const d=await r.json();
    const issue=document.getElementById('twIssueDate');if(issue)issue.textContent=(en?'Issue ':'Izdanje ')+fmt(d.issue_date);
    const status=document.getElementById('twIssueStatus');if(status)status.textContent=(d.counts?.selected_items||0)+' '+(en?'stories':'priča')+' · '+(d.counts?.sources||0)+' '+(en?'sources':'izvora');
    const cover=document.getElementById('twCover');
    if(cover&&d.cover)cover.innerHTML='<img src="'+esc(d.cover.image)+'" alt="'+esc(d.cover.imageAlt||d.cover.title)+'"><div class="tw-cover-copy"><span class="tw-kicker">'+(en?'THIS WEEK':'OVAJ TJEDAN')+'</span><h2><a href="'+esc(d.cover.url)+'" target="_blank" rel="noopener noreferrer nofollow">'+esc(d.cover.title)+'</a></h2><p>'+esc(text(d.cover.summary).slice(0,280))+'</p><small>'+esc(d.cover.source||'')+' · '+esc(fmt(d.cover.published_at))+'</small></div>';
    const s1=document.getElementById('twStoryCount'),s2=document.getElementById('twSourceCount');if(s1)s1.textContent=d.counts?.selected_items||0;if(s2)s2.textContent=d.counts?.sources||0;
    const nav=document.getElementById('twDeck'),root=document.getElementById('twSections');
    const sections=d.sections||[];
    if(nav)nav.innerHTML=sections.map(s=>'<a href="#tw-'+esc(s.id)+'">'+esc(en?s.label_en:s.label_hr)+'</a>').join('');
    if(root)root.innerHTML=sections.map(s=>{const label=en?s.label_en:s.label_hr;return '<section class="tw-section" id="tw-'+esc(s.id)+'"><div class="tw-head"><h2>'+esc(label)+'</h2><span>'+s.items.length+' '+(en?'stories':'priča')+'</span></div><div class="tw-grid">'+s.items.map(x=>card(x,label)).join('')+'</div></section>'}).join('');
    await renderColumns();
  }
  boot().catch(err=>{const root=document.getElementById('twSections');if(root)root.innerHTML='<p>'+(en?'Weekly issue is temporarily unavailable.':'Tjedno izdanje trenutačno nije dostupno.')+'</p>';console.error('[aktual-weekly]',err)});
})();