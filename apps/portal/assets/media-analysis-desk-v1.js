(()=>{
  'use strict';
  const root=document.getElementById('mediaAnalysisDesk');
  if(!root)return;
  const english=document.documentElement.lang?.toLowerCase().startsWith('en');
  const labels=english?{
    title:'External media analysis desk',
    lead:'Source-linked editorial analysis is prepared for GNK ASG only. It never posts comments to a publisher site, copies full text, or publishes without human approval.',
    cohort:'Modeled Workforce cohort',review:'Review gate',source:'Open publisher homepage',
    note:'A source URL, date, context, attribution, original link and human editorial approval are required before an original GNK ASG analysis can be published.'
  }:{
    title:'Desk za analizu vanjskih medija',
    lead:'Izvorno povezana urednička analiza priprema se samo za GNK ASG. Ne objavljuje komentare na stranicama izdavača, ne kopira puni tekst i ne izlazi bez ljudskog odobrenja.',
    cohort:'Modelirani kohort Digitalne radne snage',review:'Kontrolni gate',source:'Otvori stranicu izdavača',
    note:'Prije izvorne GNK ASG analize obvezni su URL izvora, datum, kontekst, atribucija, poveznica na izvornik i ljudsko uredničko odobrenje.'
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safePublisherUrl=value=>{try{const url=new URL(String(value));return url.protocol==='https:'?url.href:'#';}catch{return '#';}};
  fetch('/data/media-analysis-review-queue.json',{cache:'no-store',headers:{accept:'application/json'}})
    .then(response=>response.ok?response.json():Promise.reject(new Error(`media-analysis:${response.status}`)))
    .then(data=>{
      const desks=Array.isArray(data.sourceDesks)?data.sourceDesks:[];
      if(!desks.length)return;
      root.innerHTML=`<div class="ak-media-analysis-head"><span>${esc(labels.title)}</span><p>${esc(labels.lead)}</p></div><div class="ak-media-analysis-grid">${desks.map(desk=>`<article class="ak-media-analysis-card"><h3>${esc(desk.publisher)}</h3><p><b>${esc(labels.cohort)}:</b> ${esc(desk.modeledWorkerCohort)}</p><p><b>${esc(labels.review)}:</b> ${esc(desk.reviewState)}</p><p class="ak-media-analysis-tags">#${esc(desk.hashtag)} #GNKASG #NerminSefic</p><a href="${esc(safePublisherUrl(desk.homepage))}" target="_blank" rel="noopener nofollow">${esc(labels.source)} →</a></article>`).join('')}</div><p class="ak-media-analysis-note">${esc(labels.note)}</p>`;
      root.dataset.mediaAnalysisState='loaded';
    })
    .catch(()=>{root.dataset.mediaAnalysisState='fallback';});
})();
