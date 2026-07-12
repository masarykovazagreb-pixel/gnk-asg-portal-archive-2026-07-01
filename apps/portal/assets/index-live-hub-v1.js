function initPublicHub() {
  var anchor = document.getElementById('assistant');
  if (!anchor || document.getElementById('public-hub')) return;

  var english = /\/en(?:\/|$)/.test(window.location.pathname);
  var esc = function(value){return String(value == null ? '' : value).replace(/[&<>"']/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];});};
  var section = document.createElement('section');
  section.id = 'public-hub';
  section.className = 'public-hub';

  var cards = english ? [
    ['Newsroom','Latest news and official releases','Current public information, media announcements and corporate releases.','/en/newsroom/','Open Newsroom'],
    ['Publications','Reports and public documents','Reports, summaries, corporate publications and released documents.','/en/reports/','Open publications'],
    ['Markets','Markets and operating regions','Public overview of markets, locations and operating areas.','/en/trzista/','Open markets'],
    ['Projects','Projects and development','Current initiatives, development phases and publicly released statuses.','/en/projects/','Open projects'],
    ['Network','Global Group Network','Cities, companies, locations and the publicly released Group network.','/en/group-network/','Open network'],
    ['Finance','Finance and governance','Public financial overview, governance framework and released indicators.','/en/finance/','Open finance'],
    ['Knowledge','Knowledge Center','Research, documentation, analyses and public knowledge resources.','/en/knowledge-center/','Open Knowledge Center'],
    ['THE CODE','New York · 7 October 2026','Central presentation and official overview of THE CODE event.','/en/the-code/','Open THE CODE'],
    ['Media','Media applications and press','Media registration, accreditation and press information.','/media-application/','Open media center']
  ] : [
    ['Vijesti','Najnovije vijesti i službene objave','Aktualne javne informacije, medijske objave i korporativna priopćenja.','/newsroom/','Otvori vijesti'],
    ['Objave','Izvješća i javni dokumenti','Izvješća, sažeci, korporativne objave i javno dostupni dokumenti.','/reports/','Otvori objave'],
    ['Tržišta','Tržišta i operativne regije','Javni pregled tržišta, lokacija i područja djelovanja.','/trzista/','Otvori tržišta'],
    ['Projekti','Projekti i razvoj','Aktualne inicijative, razvojne faze i javno objavljeni statusi.','/projects/','Otvori projekte'],
    ['Mreža','Global Group Network','Gradovi, društva, lokacije i javno objavljena mreža Grupe.','/group-network/','Otvori mrežu'],
    ['Financije','Financije i upravljanje','Javni financijski pregled, okvir upravljanja i objavljeni pokazatelji.','/finance/','Otvori financije'],
    ['Znanje','Knowledge Center','Istraživanja, dokumentacija, analize i javni izvori znanja.','/knowledge-center/','Otvori Knowledge Center'],
    ['THE CODE','New York · 7. listopada 2026.','Središnja prezentacija i službeni pregled događaja THE CODE.','/the-code/','Otvori THE CODE'],
    ['Mediji','Medijske prijave i press','Registracija medija, akreditacije i informacije za novinare.','/media-application/','Otvori medijski centar']
  ];

  var cardsHtml = cards.map(function(card){
    return '<article class="public-hub-card"><span>'+card[0]+'</span><h3>'+card[1]+'</h3><p>'+card[2]+'</p><a href="'+card[3]+'">'+card[4]+'</a></article>';
  }).join('');

  section.innerHTML = (english
    ? '<div class="container"><div class="section-head"><div><p class="eyebrow">Live public portal</p><h2>News, publications, markets and key public sections</h2></div><p>Direct access to current public content, operating markets, projects, reports, finance and the Group network.</p></div><div id="public-live-news"><p>Loading latest published news…</p></div><div class="public-hub-grid">'+cardsHtml+'</div></div>'
    : '<div class="container"><div class="section-head"><div><p class="eyebrow">Živi javni portal</p><h2>Vijesti, objave, tržišta i ključne javne cjeline</h2></div><p>Izravan pristup aktualnim vijestima, objavama, tržištima, projektima, financijama i mreži Grupe.</p></div><div id="public-live-news"><p>Učitavanje najnovijih objava…</p></div><div class="public-hub-grid">'+cardsHtml+'</div></div>');

  anchor.parentNode.insertBefore(section, anchor);

  fetch('/api/public-news?limit=6&lang='+(english?'en':'hr'),{headers:{accept:'application/json'}})
    .then(function(response){if(!response.ok)throw new Error('feed');return response.json();})
    .then(function(data){
      var host=document.getElementById('public-live-news');
      var posts=Array.isArray(data.posts)?data.posts:[];
      if(!posts.length){host.innerHTML='<p>'+(english?'No published articles are available yet.':'Još nema objavljenih članaka.')+'</p>';return;}
      host.innerHTML='<div class="section-head"><div><p class="eyebrow">'+(english?'Latest updates':'Najnovije objave')+'</p><h2>'+(english?'Published now':'Upravo objavljeno')+'</h2></div><p><a href="'+(english?'/en/newsroom/':'/newsroom/')+'">'+(english?'View all news':'Sve vijesti')+'</a></p></div><div class="public-hub-grid">'+posts.map(function(post){
        var href=(english?'/en':'')+'/newsroom/'+encodeURIComponent(post.slug)+'/';
        return '<article class="public-hub-card"><span>'+esc(post.category||'News')+'</span><h3>'+esc(post.title)+'</h3><p>'+esc(post.summary)+'</p><a href="'+href+'">'+(english?'Read article':'Otvori članak')+'</a></article>';
      }).join('')+'</div>';
    })
    .catch(function(){var host=document.getElementById('public-live-news');if(host)host.innerHTML='<p>'+(english?'Live news is temporarily unavailable.':'Žive vijesti trenutačno nisu dostupne.')+'</p>';});
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPublicHub, { once: true });
} else {
  initPublicHub();
}