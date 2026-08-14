(function(){
'use strict';
// GNK ASG — Cibona section renderer za AKTUAL MEDIA.
// Cibona je editorial feed, ne live-feed: uvijek prikazuje datum vijesti,
// a klijent dodatno upozorava ako se dataset nije osvježio > 24 h.
function isEnglish(){
  return (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 || /\/en\//.test(location.pathname) || /\/en$/.test(location.pathname);
}
var en=isEnglish(), MAX_AGE_MIN=1440, UNAVAILABLE_MIN=10080;
function ageMinutes(iso){var t=Date.parse(iso||'');if(!isFinite(t))return Infinity;return Math.max(0,Math.floor((Date.now()-t)/60000));}
function fmtDate(dateStr){try{return new Date(dateStr+'T12:00:00').toLocaleDateString(en?'en-GB':'hr-HR',{day:'2-digit',month:'long',year:'numeric'});}catch(e){return dateStr;}}
function fmtUpdated(iso){try{return new Date(iso).toLocaleString(en?'en-GB':'hr-HR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}
function esc(s){return String(s||'').replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}
function render(data){
  var root=document.getElementById('akCibona'),body=document.getElementById('akCibonaBody');if(!root||!body)return;
  var items=(data&&data.items)||[],age=ageMinutes(data&&data.updated_at),notice='';
  root.classList.remove('state-stale','state-unavailable');
  if(!isFinite(age)||age>UNAVAILABLE_MIN){root.classList.add('state-unavailable');notice='<p class="ak-cibona-empty">'+(en?'Cibona feed refresh status is unavailable; articles below are shown only with their original publication dates.':'Status osvježavanja Cibona feeda nije dostupan; članci ispod prikazuju se samo uz izvorni datum objave.')+'</p>';}
  else if(age>MAX_AGE_MIN){root.classList.add('state-stale');notice='<p class="ak-cibona-empty"><strong>'+(en?'Refresh delayed.':'Osvježavanje kasni.')+'</strong> '+(en?'Latest dataset check: ':'Zadnja provjera dataseta: ')+fmtUpdated(data.updated_at)+' · '+Math.floor(age/60)+' h.</p>';}
  if(!items.length){body.innerHTML=notice+'<p class="ak-cibona-empty">'+(en?'No new Cibona items at the moment. Check back soon.':'Trenutno nema novih vijesti o Ciboni. Provjerite uskoro ponovno.')+'</p>';return;}
  var html=items.map(function(it){var title=en?it.title_en:it.title_hr,summary=en?it.summary_en:it.summary_hr;return '<article class="ak-cibona-card"><div class="ak-cibona-meta"><span>'+fmtDate(it.date)+'</span><span>·</span><span>'+esc(it.source_name)+'</span></div><h3>'+esc(title)+'</h3><p>'+esc(summary)+'</p><a class="ak-cibona-link" href="'+esc(it.source_url)+'" target="_blank" rel="noopener noreferrer nofollow">'+(en?'Read full coverage at ':'Pročitajte cijelu vijest na ')+esc(it.source_name)+' →</a></article>';}).join('');
  body.innerHTML=notice+html;
}
fetch('/data/cibona-news.json?v='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(render).catch(function(){var root=document.getElementById('akCibona'),body=document.getElementById('akCibonaBody');if(root)root.classList.add('state-unavailable');if(!body)return;body.innerHTML='<p class="ak-cibona-empty">'+(en?'Cibona news is temporarily unavailable. Please check back later.':'Vijesti o Ciboni trenutno nisu dostupne. Pokušajte kasnije.')+'</p>';});
})();
