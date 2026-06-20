(() => {
  'use strict';
  const grid = document.getElementById('newsGrid');
  const tabsHost = document.getElementById('newsTabs');
  if (!grid) return;
  let tabs = Array.from(document.querySelectorAll('#newsTabs button'));
  let articles = [];
  let approvedMedia = [];
  let activeFilter = 'all';
  const NEWS_VISIBLE_LIMIT = 500;
  const esc = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const english = () => window.GNK_LANG && window.GNK_LANG.get() === 'en';
  function installTopicCalloutStyle() {
    if (document.getElementById('topicMonitorCalloutStyle')) return;
    const style = document.createElement('style');
    style.id = 'topicMonitorCalloutStyle';
    style.textContent = '.topic-monitor-link{display:block;margin:4px 0 25px;padding:0}.topic-monitor-link a{position:relative;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 22px 18px 20px;border:1px solid rgba(212,175,55,.36);border-radius:18px;background:linear-gradient(122deg,#07162d 0%,#102e53 73%,#173e70 100%);box-shadow:0 13px 30px rgba(7,22,45,.12);text-decoration:none;overflow:hidden}.topic-monitor-link a:after{content:"";position:absolute;right:-50px;top:-62px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(212,175,55,.18),transparent 67%)}.topic-monitor-copy{position:relative;z-index:1;display:flex;align-items:center;gap:15px}.topic-monitor-icon{width:45px;height:45px;flex:0 0 45px;display:grid;place-items:center;border-radius:13px;background:rgba(212,175,55,.13);border:1px solid rgba(212,175,55,.32);color:#e4c159;font-size:1.25rem}.topic-monitor-text small{display:block;color:#d4af37;font-size:.59rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase;margin-bottom:5px}.topic-monitor-text strong{display:block;color:#fff;font-size:1.02rem;line-height:1.25}.topic-monitor-text span{display:block;color:#aebdd1;font-size:.77rem;margin-top:4px}.topic-monitor-action{position:relative;z-index:1;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;border:1px solid rgba(212,175,55,.5);border-radius:999px;padding:10px 14px;color:#f0cc62;font-size:.68rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase;transition:.18s}.topic-monitor-link a:hover{border-color:rgba(212,175,55,.68);transform:translateY(-1px)}.topic-monitor-link a:hover .topic-monitor-action{background:#d4af37;color:#07162d}@media(max-width:680px){.topic-monitor-link a{display:block;padding:16px}.topic-monitor-copy{align-items:flex-start}.topic-monitor-action{margin-top:15px;margin-left:60px}.topic-monitor-text strong{font-size:.92rem}.topic-monitor-text span{font-size:.7rem}}';
    document.head.appendChild(style);
  }
  function calloutMarkup() {
    const en = english();
    return '<a href="/teme/" aria-label="' + (en ? 'Open thematic monitoring' : 'Otvori tematski monitoring') + '"><span class="topic-monitor-copy"><span class="topic-monitor-icon" aria-hidden="true">◎</span><span class="topic-monitor-text"><small>' + (en ? 'THEMATIC MONITORING' : 'TEMATSKI MONITORING') + '</small><strong>' + (en ? 'Economy, sport, mobility and technology' : 'Ekonomija, sport, mobilnost i tehnologija') + '</strong><span>' + (en ? 'Live public-topic hub and verified sources' : 'Aktualne teme i provjerljivi javni izvori') + '</span></span></span><span class="topic-monitor-action">' + (en ? 'OPEN HUB' : 'OTVORI CENTAR') + ' →</span></a>';
  }
  function ensureTopicControls() {
    if (!tabsHost || tabsHost.dataset.topicsReady) return;
    const mention = tabsHost.querySelector('[data-filter="mentions"]');
    const entries = [
      { filter:'economy', hr:'Ekonomija', en:'Economy' },
      { filter:'sport', hr:'Sport', en:'Sport' },
      { filter:'mobilnost', hr:'Mobilnost', en:'Mobility' }
    ];
    entries.forEach((entry) => {
      if (tabsHost.querySelector('[data-filter="' + entry.filter + '"]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.filter = entry.filter;
      button.dataset.hr = entry.hr;
      button.dataset.en = entry.en;
      button.textContent = english() ? entry.en : entry.hr;
      tabsHost.insertBefore(button, mention || null);
    });
    const section = grid.closest('#news .container') || grid.parentElement;
    if (section && !section.querySelector('.topic-monitor-link')) {
      installTopicCalloutStyle();
      const note = document.createElement('div');
      note.className = 'topic-monitor-link';
      note.innerHTML = calloutMarkup();
      tabsHost.after(note);
    }
    tabsHost.dataset.topicsReady = '1';
    tabs = Array.from(tabsHost.querySelectorAll('button'));
    bindTabs();
  }
  function updateLabels() {
    tabs.forEach((button) => { if (button.dataset.hr) button.textContent = english() ? button.dataset.en : button.dataset.hr; });
    const link = document.querySelector('.topic-monitor-link');
    if (link) link.innerHTML = calloutMarkup();
  }
  function stamp(item) {
    const raw = item.published_at || item.date || '';
    const time = Date.parse(raw);
    return Number.isFinite(time) ? time : 0;
  }
  function fresh(item) {
    const days = item.group === 'mentions' ? 3650 : 30;
    return stamp(item) > Date.now() - (days * 24 * 60 * 60 * 1000);
  }
  function renderCard(item) {
    const en = english();
    const isMention = item.group === 'mentions';
    const type = isMention ? ' is-mention' : item.category === 'technology' ? ' is-tech' : item.category === 'digital-assets' ? ' is-assets' : item.category === 'automotive' ? ' is-tech' : '';
    const label = isMention ? (en ? 'GNK ASG IN THE MEDIA' : 'GNK ASG U MEDIJIMA') : (item.source || item.category || 'BUSINESS NEWS');
    const date = stamp(item) ? new Date(stamp(item)).toLocaleDateString(en ? 'en-GB' : 'hr-HR') : '';
    const summary = item.summary || (en ? 'Open the source for the full publication.' : 'Otvorite izvor za cjelovitu objavu.');
    const open = en ? 'OPEN SOURCE →' : 'OTVORI IZVOR →';
    const share = item.share_url ? ' data-share-url="' + esc(item.share_url) + '"' : '';
    return '<article class="news-card' + type + '"' + share + '><span class="meta">' + esc(label) + (date ? ' · ' + esc(date) : '') + '</span><h3>' + esc(item.title) + '</h3><p>' + esc(summary) + '</p><a target="_blank" rel="noopener nofollow" href="' + esc(item.url) + '">' + open + '</a></article>';
  }
  function collection(filter) {
    if (filter === 'mentions') return approvedMedia;
    if (filter === 'all') return articles.concat(approvedMedia);
    return articles.filter((item) => String(item.group || '').toLowerCase().includes(filter) || String(item.category || '').toLowerCase().includes(filter));
  }
  function render(filter) {
    activeFilter = filter;
    const en = english();
    if (filter === 'fina') {
      grid.innerHTML = '<article class="news-card"><span class="meta">FINA / RGFI</span><h3>' + (en ? 'Official Public Information' : 'Službene javne informacije') + '</h3><p>' + (en ? 'FINA and RGFI sources are shown in the official public-information panel.' : 'FINA i RGFI izvori prikazuju se u službenom panelu javnih informacija.') + '</p><a target="_blank" rel="noopener nofollow" href="https://rgfi.fina.hr/JavnaObjava-web/">' + (en ? 'OPEN PUBLIC DISCLOSURE →' : 'OTVORI JAVNU OBJAVU →') + '</a></article>';
      return;
    }
    const selected = collection(filter).filter(fresh).sort((a,b) => stamp(b) - stamp(a));
    if (!selected.length) {
      const monitorText = filter === 'mentions' ? (en ? 'There is currently no public publication displayed in this section.' : 'U ovoj rubrici trenutačno nema prikazane javne objave.') : (en ? 'The public window holds up to 500 newest news items and refreshes every hour; the active archive retains the next 400 older items.' : 'Javni prozor sadrži do 500 najnovijih vijesti i osvježava se svakih sat vremena; aktivna arhiva zadržava sljedećih 400 starijih stavki.');
      grid.innerHTML = '<article class="news-card"><span class="meta">' + (en ? 'PUBLIC MONITOR' : 'JAVNI PREGLED') + '</span><h3>' + (en ? 'No item in the selected section' : 'Nema stavke u odabranoj rubrici') + '</h3><p>' + monitorText + '</p></article>';
      return;
    }
    grid.innerHTML = selected.slice(0, NEWS_VISIBLE_LIMIT).map(renderCard).join('');
  }
  function bindTabs() {
    tabs.forEach((button) => {
      if (button.dataset.newsBound) return;
      button.dataset.newsBound = '1';
      button.addEventListener('click', () => {
        tabs.forEach((entry) => entry.classList.remove('active'));
        button.classList.add('active');
        render(button.dataset.filter || 'all');
      });
    });
  }
  async function load() {
    try {
      const responses = await Promise.all([
        fetch('data/news.json?v=' + Date.now(), {cache:'no-store'}),
        fetch('data/media_approved.json?v=' + Date.now(), {cache:'no-store'})
      ]);
      articles = responses[0].ok ? await responses[0].json() : [];
      approvedMedia = responses[1].ok ? await responses[1].json() : [];
      approvedMedia = approvedMedia.map(item => Object.assign({}, item, {group:'mentions', category:'mentions'}));
    } catch (error) { articles = []; approvedMedia = []; }
    render(activeFilter);
  }
  ensureTopicControls();
  bindTabs();
  window.addEventListener('gnk-language-change', () => { updateLabels(); render(activeFilter); });
  load();
})();
