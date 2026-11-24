/**
 * AKTUAL SIGNAL — first-party media intelligence, sourced ONLY from the
 * existing regional archive. No external widgets, analytics or model calls.
 * Exports render helpers shared across all 17 regional editions.
 */
const TXT={
 hr:{signal:'Urednički radar',desk:'AKTUAL SIGNAL',subtitle:'Pregled arhive medijskih izvora, ne potvrda istinitosti pojedinačnih vijesti.',latest:'Najnoviji zapisi',within24:'Objava u 24 h',within72:'Objave u 72 h',sourceActive:'Izvori s objavama',sourceChecks:'Provjere izvora',search:'Pretraži naslove i medije',sources:'Svi izvori',all:'Sva razdoblja',day:'24 sata',days:'72 sata',results:'Prikazano',empty:'Nema rezultata za taj odabir.',link:'Otvori osvrt',original:'Izvornik',archive:'Podatkovna arhiva',trend:'Sedam dana objava',coverage:'Udio medija u arhivi',disclaimer:'Izvorne vijesti pripadaju svojim izdavačima. Ovaj prikaz uspoređuje dostupne naslove i vrijeme objave; ne potvrđuje sadržaj vijesti, vlasničku neovisnost izvora ni da RSS radi u ovom trenutku.',generated:'Posljednja obrada',healthy:'Uspješno kod zadnje provjere',broken:'Neuspješno kod zadnje provjere',unknown:'Bez podataka o provjeri',full:'Istraži sve kanale',signalLink:'Otvori radar',timeLabel:'Datum izvora'},
 sr:{signal:'Urednički radar',desk:'AKTUAL SIGNAL',subtitle:'Pregled arhive medijskih izvora, ne potvrda tačnosti pojedinačnih vesti.',latest:'Najnoviji zapisi',within24:'Objava u 24 h',within72:'Objave u 72 h',sourceActive:'Izvori sa objavama',sourceChecks:'Provere izvora',search:'Pretraži naslove i medije',sources:'Svi izvori',all:'Svi periodi',day:'24 sata',days:'72 sata',results:'Prikazano',empty:'Nema rezultata.',link:'Otvori osvrt',original:'Izvor',archive:'Arhiva podataka',trend:'Sedam dana objava',coverage:'Udeo medija',disclaimer:'Izvorne vesti pripadaju izdavačima. Prikaz ne potvrđuje istinitost pojedinačnih tvrdnji niti da izvor trenutno radi.',generated:'Poslednja obrada',healthy:'Uspešno pri proveri',broken:'Neuspešno pri proveri',unknown:'Bez podataka',full:'Sve izdanje',signalLink:'Otvori radar',timeLabel:'Datum izvora'},
 bs:{signal:'Urednički radar',desk:'AKTUAL SIGNAL',subtitle:'Pregled arhive medijskih izvora, ne potvrda pojedinačnih vijesti.',latest:'Najnoviji zapisi',within24:'Objava u 24 h',within72:'Objave u 72 h',sourceActive:'Izvori s objavama',sourceChecks:'Provjere izvora',search:'Pretraži naslove i medije',sources:'Svi izvori',all:'Sva razdoblja',day:'24 sata',days:'72 sata',results:'Prikazano',empty:'Nema rezultata.',link:'Otvori osvrt',original:'Izvornik',archive:'Arhiva podataka',trend:'Sedam dana objava',coverage:'Udio medija',disclaimer:'Izvornici pripadaju izdavačima. Ovdje nema pojedinačne provjere tvrdnji ni jamstva ažurnosti izvora.',generated:'Posljednja obrada',healthy:'Uspješno pri provjeri',broken:'Neuspješno pri provjeri',unknown:'Bez podataka',full:'Pregled',signalLink:'Otvori radar',timeLabel:'Datum izvora'},
 en:{signal:'Editorial radar',desk:'AKTUAL SIGNAL',subtitle:'An archive-based view of media coverage, not independent verification of news claims.',latest:'Latest entries',within24:'Entries in 24h',within72:'Entries in 72h',sourceActive:'Sources with stories',sourceChecks:'Feed checks',search:'Search headlines and outlets',sources:'All outlets',all:'Any date',day:'Last 24h',days:'Last 72h',results:'Showing',empty:'No matching stories.',link:'Read analysis',original:'Original source',archive:'Source archive',trend:'Seven-day story history',coverage:'Source representation',disclaimer:'Stories belong to their publishers. These metrics describe headline coverage and recorded publication times; they do not establish factual accuracy, editorial independence or a live connection.',generated:'Last archive update',healthy:'Succeeded in last check',broken:'Failed in last check',unknown:'No check recorded',full:'Explore edition',signalLink:'Explore radar',timeLabel:'Source date'}
};
const local=lang=>TXT[lang]||TXT.en;
const ms=raw=>{const n=Date.parse(String(raw||''));return Number.isFinite(n)?n:null};
const latestOf=(items)=>items.map(x=>ms(x.date)).filter(x=>x!==null).reduce((a,b)=>Math.max(a,b),0);
const ago=(time,now)=>time===null||now<time?Infinity:(now-time)/3600000;
const name=(entry)=>String(entry?.sourceName||entry?.source||'').slice(0,120);
export function signalMetrics(data,{now=Date.now()}={}){
 const clock=now instanceof Date?now.getTime():Number(now);
 if(!Number.isFinite(clock))throw Error('invalid-signal-time');
 const items=(Array.isArray(data?.items)?data.items:[]).filter(x=>x&&x.title&&x.slug&&x.date);
 const recent24=items.filter(x=>ago(ms(x.date),clock)<=24);
 const recent72=items.filter(x=>ago(ms(x.date),clock)<=72);
 const uniqueSources=new Set(items.map(x=>String(x.source||'')).filter(Boolean));
 const sourceChecks=Array.isArray(data?.sources)?data.sources:[];
 const successful=sourceChecks.filter(x=>x.ok===true&&ago(ms(x.checkedAt),clock)<=24);
 const failed=sourceChecks.filter(x=>x.ok===false&&ago(ms(x.checkedAt),clock)<=24);
 const bySource=new Map();
 for(const item of items){const id=String(item.source||'unknown');const current=bySource.get(id)||{id,title:name(item),count:0};current.count++;bySource.set(id,current);}
 const trend=[];
 for(let i=6;i>=0;i--){
  const d=new Date(clock-i*86400000).toISOString().slice(0,10);
  trend.push({date:d,count:items.filter(x=>String(x.date||'').slice(0,10)===d).length});
 }
 return {total:items.length,within24:recent24.length,within72:recent72.length,
   distinctSources:uniqueSources.size,checks:sourceChecks.length,
   successfulChecks:successful.length,failedChecks:failed.length,
   lastArticleISO:latestOf(items)?new Date(latestOf(items)).toISOString():'',
   updatedAt:ms(data?.updatedAt)!==null?new Date(ms(data.updatedAt)).toISOString():'',
   sourceShares:[...bySource.values()].sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id)),
   trend,items:items.slice(0,100)};
}
export function signalNavLabel(lang){return local(lang).desk;}
const safeRemote=raw=>{try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.toString():'';}catch{return '';}};
const safeId=s=>String(s||'').replace(/[^a-z0-9_-]/gi,'').slice(0,64);
function barList(metrics,esc){
 const max=Math.max(1,...metrics.sourceShares.map(x=>x.count));
 return metrics.sourceShares.slice(0,7).map(s=>
  '<div class="signal-share-row"><span>'+esc(s.title)+'</span><div class="signal-bar-track" aria-hidden="true"><i style="width:'+Math.round(s.count/max*100)+'%"></i></div><strong>'+s.count+'</strong></div>'
 ).join('');
}
function trendChart(metrics,esc){
 const max=Math.max(1,...metrics.trend.map(x=>x.count));
 return '<div class="signal-trend" role="img" aria-label="'+esc('7-day source-article histogram')+'">'+metrics.trend.map(p=>
  '<div class="signal-trend-col"><span>'+p.count+'</span><i style="--bar-size:'+Math.max(2,Math.round(p.count/max*100))+'%" aria-hidden="true"></i><small>'+esc(p.date.slice(5))+'</small></div>'
 ).join('')+'</div>';
}
function statsHtml(m,t,esc){
 return '<div class="signal-stats" aria-label="'+esc(t.archive)+'">'+
 [[''+m.total,t.latest],[''+m.within24,t.within24],[''+m.within72,t.within72],[''+m.distinctSources,t.sourceActive]]
 .map(([v,label])=>'<div class="signal-stat"><strong>'+esc(v)+'</strong><span>'+esc(label)+'</span></div>').join('')+
 '</div>';
}
export function renderSignalPulse(channel,data,esc){
 const t=local(channel.lang),m=signalMetrics(data);
 return '<section class="signal-pulse" aria-label="'+esc(t.signal)+'">'+
  '<div class="signal-pulse-heading"><span class="signal-eyebrow">AKTUAL / INTELLIGENCE</span>'+
  '<h2>'+esc(t.signal)+'</h2><p>'+esc(t.subtitle)+'</p></div>'+
  statsHtml(m,t,esc)+
  '<a class="signal-pulse-cta" href="signal/">'+esc(t.signalLink)+' <span aria-hidden="true">→</span></a>'+
  '</section>';
}
export function renderSignalDesk(channel,data,esc,themeOf){
 const t=local(channel.lang),m=signalMetrics(data);

 const sourceNames=new Map();
 for(const item of m.items)sourceNames.set(String(item.source||''),name(item));
 const filterSources=[...sourceNames].sort((a,b)=>a[1].localeCompare(b[1]));
 const snapshots=m.items.map(item=>{
  const when=ms(item.date),age=ago(when,Date.now()),group=age<=24?'day':age<=72?'days':'older';
  const title=String(item.title||'').slice(0,260),outlet=name(item),slug=String(item.slug||'');
  const sourceUrl=safeRemote(item.url);
  return '<article class="signal-story" data-signal-story data-source="'+esc(safeId(item.source))+
   '" data-window="'+group+'" data-search="'+esc((title+' '+outlet).toLowerCase())+'">'+
   '<span class="signal-story-time">'+esc(String(item.date).slice(0,16).replace('T',' · '))+'</span>'+
   '<div class="signal-story-text"><h3><a href="../clanak/'+encodeURIComponent(slug)+'/">'+esc(title)+'</a></h3>'+
   '<p>'+esc(outlet)+'</p></div>'+
   '<div class="signal-story-actions"><a href="../clanak/'+encodeURIComponent(slug)+'/">'+esc(t.link)+'</a>'+
   (sourceUrl?'<a href="'+esc(sourceUrl)+'" rel="external noopener nofollow" target="_blank">'+esc(t.original)+'</a>':'')+'</div></article>';
 }).join('');
 const checkRows=(Array.isArray(data?.sources)?data.sources:[]).map(src=>{
  const state=src.ok===true?'ok':src.ok===false?'fail':'unknown';
  const label=state==='ok'?t.healthy:state==='fail'?t.broken:t.unknown;
  return '<div class="signal-source-check"><span class="signal-health-dot signal-health-'+state+'" aria-hidden="true"></span><div><strong>'+esc(String(src.name||src.id||'').slice(0,100))+'</strong><small>'+esc(String(src.checkedAt||'').slice(0,16).replace('T',' · '))+'</small></div><span class="signal-health-label">'+esc(label)+'</span></div>';
 }).join('');
 return '<div class="signal-desk" data-signal-desk>'+
  '<section class="signal-desk-hero"><img class="signal-desk-backdrop" src="/assets/izdanja/'+safeId(channel.id)+'-1200.webp" alt="" aria-hidden="true" width="1200" height="675" decoding="async">'+
  '<div class="signal-desk-top"><span class="signal-eyebrow">AKTUAL / FIRST-PARTY RESEARCH</span><span>'+esc(channel.city)+' · '+esc(channel.country)+'</span></div>'+
  '<h1>'+esc(t.desk)+'</h1><p>'+esc(t.subtitle)+'</p>'+
  '<div class="signal-source-update">'+esc(t.generated)+': <time datetime="'+esc(m.updatedAt)+'">'+esc(m.updatedAt?m.updatedAt.replace('T',' · ').slice(0,19)+' UTC':'—')+'</time></div>'+
  statsHtml(m,t,esc)+'</section>'+
  '<section class="signal-analytical-grid"><div class="signal-analytics-card"><h2>'+esc(t.trend)+'</h2>'+trendChart(m,esc)+'</div>'+
  '<div class="signal-analytics-card"><h2>'+esc(t.coverage)+'</h2>'+barList(m,esc)+'</div></section>'+
  '<section class="signal-feed-health"><div class="signal-section-heading"><span class="signal-eyebrow">RSS / MONITOR</span><h2>'+esc(t.sourceChecks)+'</h2><span>'+m.successfulChecks+' / '+m.checks+'</span></div>'+
  '<p class="signal-explainer">'+esc(t.disclaimer)+'</p><div class="signal-check-list">'+checkRows+'</div></section>'+
  '<section class="signal-discovery"><div class="signal-section-heading"><span class="signal-eyebrow">AKTUAL / ARCHIVE</span><h2>'+esc(t.archive)+'</h2></div>'+
  '<div class="signal-filters"><label><span>'+esc(t.search)+'</span><input type="search" data-signal-search placeholder="'+esc(t.search)+'" autocomplete="off"></label>'+
  '<label><span>'+esc(t.sources)+'</span><select data-signal-source><option value="">'+esc(t.sources)+'</option>'+
  filterSources.map(([id,label])=>'<option value="'+esc(safeId(id))+'">'+esc(label)+'</option>').join('')+'</select></label>'+
  '<label><span>'+esc(t.timeLabel)+'</span><select data-signal-window><option value="">'+esc(t.all)+'</option>'+
  '<option value="day">'+esc(t.day)+'</option><option value="days">'+esc(t.days)+'</option></select></label></div>'+
  '<p class="signal-result-count" role="status" aria-live="polite"><span>'+esc(t.results)+'</span>: <strong data-signal-visible>'+m.items.length+'</strong> / '+m.items.length+'</p>'+
  '<div class="signal-results" data-signal-results>'+snapshots+'</div><p class="signal-empty" data-signal-empty hidden>'+esc(t.empty)+'</p></section>'+
  '<p class="signal-disclaimer">'+esc(t.disclaimer)+'</p></div>';
}
