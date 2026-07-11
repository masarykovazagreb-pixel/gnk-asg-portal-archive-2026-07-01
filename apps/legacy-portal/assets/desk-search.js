(() => {
  'use strict';
  let publicNews = [];
  const lang = () => window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en' ? 'en' : 'hr';
  const esc = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const wording = {
    hr: {
      title:'Istraži javnu temu', note:'Pretraga javno objavljenih vijesti portala', placeholder:'Upišite temu, npr. umjetna inteligencija', search:'PRETRAŽI', topics:['umjetna inteligencija','softverske platforme','bitcoin','cybersecurity','sports technology'],
      found:'Relevantne javne vijesti na portalu', none:'U trenutačno učitanim javnim vijestima nema izravnog rezultata. Otvorite proširenu internetsku pretragu.', googleNews:'Google News pretraga', googleWeb:'Google pretraga', safe:'Rezultati o GNK ASG d.o.o., GNK DINAMO Ltd. i Nerminu Sefiću na javnoj stranici prikazuju se samo nakon ručnog odobrenja.', source:'Javni izvor'
    },
    en: {
      title:'Research a public topic', note:'Search publicly displayed portal news', placeholder:'Enter a topic, e.g. artificial intelligence', search:'SEARCH', topics:['artificial intelligence','software platforms','bitcoin','cybersecurity','sports technology'],
      found:'Relevant public portal news', none:'No direct result exists in currently loaded public news. Open the extended internet search.', googleNews:'Google News search', googleWeb:'Google search', safe:'Results about GNK ASG d.o.o., GNK DINAMO Ltd. and Nermin Sefić are displayed publicly only after manual approval.', source:'Public source'
    }
  };
  const t = () => wording[lang()];
  async function loadNews() {
    try {
      const response = await fetch('data/news.json?v=' + Date.now(), {cache:'no-store'});
      publicNews = response.ok ? await response.json() : [];
    } catch (error) { publicNews = []; }
  }
  function score(item, query) {
    const parts = query.toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = [item.title, item.summary, item.source, item.category].join(' ').toLowerCase();
    return parts.reduce((value, part) => value + (haystack.includes(part) ? 1 : 0), 0);
  }
  function links(query) {
    const encoded = encodeURIComponent(query);
    return '<div class="research-controls"><a class="news-search" target="_blank" rel="noopener nofollow" href="https://news.google.com/search?q=' + encoded + '">' + esc(t().googleNews) + '</a><a class="web-search" target="_blank" rel="noopener nofollow" href="https://www.google.com/search?q=' + encoded + '">' + esc(t().googleWeb) + '</a></div>';
  }
  function search(query) {
    const target = document.getElementById('researchResults');
    if (!target || !query.trim()) return;
    const matches = publicNews.map(item => ({item, points:score(item, query)})).filter(entry => entry.points > 0).sort((a,b) => b.points - a.points || Date.parse(b.item.published_at || 0) - Date.parse(a.item.published_at || 0)).slice(0, 4);
    if (!matches.length) {
      target.innerHTML = '<p class="research-info">' + esc(t().none) + '</p>' + links(query) + '<p class="research-info">' + esc(t().safe) + '</p>';
      return;
    }
    target.innerHTML = '<div class="research-info"><strong>' + esc(t().found) + '</strong></div>' + matches.map(entry => {
      const item = entry.item;
      return '<article class="research-item"><small>' + esc(item.source || t().source) + '</small><a target="_blank" rel="noopener nofollow" href="' + esc(item.url) + '">' + esc(item.title) + '</a></article>';
    }).join('') + links(query) + '<p class="research-info">' + esc(t().safe) + '</p>';
  }
  function render() {
    const consoleBox = document.querySelector('.desk-console'); if (!consoleBox) return;
    let panel = document.getElementById('deskResearch');
    if (!panel) {
      panel = document.createElement('section'); panel.className = 'desk-research'; panel.id = 'deskResearch';
      consoleBox.appendChild(panel);
    }
    const c = t();
    panel.innerHTML = '<div class="desk-research-title"><div><strong>' + esc(c.title) + '</strong><span>' + esc(c.note) + '</span></div></div><form class="research-form" id="researchForm"><input id="researchQuery" autocomplete="off" placeholder="' + esc(c.placeholder) + '"><button type="submit">' + esc(c.search) + '</button></form><div class="research-topics">' + c.topics.map(topic => '<button type="button">' + esc(topic) + '</button>').join('') + '</div><div class="research-results" id="researchResults"></div>';
    panel.querySelector('form').onsubmit = event => { event.preventDefault(); search(panel.querySelector('input').value); };
    panel.querySelectorAll('.research-topics button').forEach(button => button.onclick = () => { panel.querySelector('input').value = button.textContent; search(button.textContent); });
  }
  async function init() {
    await loadNews();
    const waitForDesk = window.setInterval(() => {
      if (document.querySelector('.desk-console')) { window.clearInterval(waitForDesk); render(); }
    }, 80);
    window.setTimeout(() => window.clearInterval(waitForDesk), 4000);
    window.addEventListener('gnk-language-change', render);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
