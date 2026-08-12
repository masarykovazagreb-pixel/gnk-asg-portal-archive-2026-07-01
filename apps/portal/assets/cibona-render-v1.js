(function(){
'use strict';
// GNK ASG — Cibona section renderer za AKTUAL MEDIA.
function isEnglish(){
  return (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ||
    /\/en\//.test(location.pathname) || /\/en$/.test(location.pathname);
}
var en = isEnglish();

function fmtDate(dateStr){
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(en ? 'en-GB' : 'hr-HR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}
function esc(s){ return String(s||'').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

function render(data){
  var root = document.getElementById('akCibona');
  var body = document.getElementById('akCibonaBody');
  if (!root || !body) return;
  var items = (data && data.items) || [];

  if (!items.length) {
    body.innerHTML = '<p class="ak-cibona-empty">' + (en
      ? 'No new Cibona items at the moment. Check back soon.'
      : 'Trenutno nema novih vijesti o Ciboni. Provjerite uskoro ponovno.') + '</p>';
    return;
  }

  var html = items.map(function(it){
    var title = en ? it.title_en : it.title_hr;
    var summary = en ? it.summary_en : it.summary_hr;
    return '<article class="ak-cibona-card">' +
      '<div class="ak-cibona-meta"><span>' + fmtDate(it.date) + '</span><span>·</span><span>' + esc(it.source_name) + '</span></div>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(summary) + '</p>' +
      '<a class="ak-cibona-link" href="' + esc(it.source_url) + '" target="_blank" rel="noopener noreferrer nofollow">' +
      (en ? 'Read full coverage at ' : 'Pročitajte cijelu vijest na ') + esc(it.source_name) + ' →</a>' +
      '</article>';
  }).join('');
  body.innerHTML = html;
}

fetch('/data/cibona-news.json?v=' + Date.now(), { cache: 'no-store' })
  .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(render)
  .catch(function(){
    var body = document.getElementById('akCibonaBody');
    if (!body) return;
    body.innerHTML = '<p class="ak-cibona-empty">' + (en
      ? 'Cibona news is temporarily unavailable. Please check back later.'
      : 'Vijesti o Ciboni trenutno nisu dostupne. Pokušajte kasnije.') + '</p>';
  });
})();
