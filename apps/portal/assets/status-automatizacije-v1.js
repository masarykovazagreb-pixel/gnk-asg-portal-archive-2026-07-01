(() => {
  'use strict';
  const target = document.getElementById('status');
  if (!target) return;

  const english = document.documentElement.lang === 'en';
  const copy = english ? {
    locale: 'en-GB',
    news: 'Business news', publications: 'Automatic publications', sources: 'Selected sources',
    target: 'Target per refresh', newsStatus: 'News status', latestNews: 'Latest news refresh',
    editorStatus: 'Auto Editor status', latestPublication: 'Latest automatic publication', version: 'Version',
    links: count => `at least ${count} links`, pending: 'WAITING', fallback: 'FALLBACK'
  } : {
    locale: 'hr-HR',
    news: 'Poslovne vijesti', publications: 'Automatske objave', sources: 'Odabrani izvori',
    target: 'Cilj po osvježavanju', newsStatus: 'Status vijesti', latestNews: 'Zadnje vijesti',
    editorStatus: 'Status Auto Editora', latestPublication: 'Zadnja automatska objava', version: 'Verzija',
    links: count => `najmanje ${count} poveznica`, pending: 'ČEKA IZVRŠENJE', fallback: 'FALLBACK'
  };

  const row = (label, value) => `<div><span>${label}</span><strong>${value || '—'}</strong></div>`;
  const format = value => {
    const date = new Date(value || '');
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(copy.locale, {
      dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Europe/Zagreb'
    }).format(date);
  };

  fetch('/data/news-automation-status.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      const news = data.lastNewsRefresh || {};
      const editor = data.lastAutoEditor || {};
      target.innerHTML = [
        row(copy.news, '09:00 / 16:00 · Europe/Zagreb'),
        row(copy.publications, english ? 'Every 2 hours · Europe/Zagreb' : 'Svaka 2 sata · Europe/Zagreb'),
        row(copy.sources, String(data.configuredNewsSources ?? 24)),
        row(copy.target, copy.links(data.minimumNewsLinks ?? 20)),
        row(copy.newsStatus, news.status || data.newsStatus || 'SNAPSHOT'),
        row(copy.latestNews, format(news.updatedAt)),
        row(copy.editorStatus, editor.ok === false ? 'ERROR' : (editor.ok === true ? 'OK' : copy.pending)),
        row(copy.latestPublication, format(editor.finishedAt || editor.publishedAt)),
        row(copy.version, data.version || 'GNK ASG automation')
      ].join('');
    })
    .catch(() => {
      target.innerHTML = [
        row(copy.news, '09:00 / 16:00 · Europe/Zagreb'),
        row(copy.publications, english ? 'Every 2 hours · Europe/Zagreb' : 'Svaka 2 sata · Europe/Zagreb'),
        row('Status', copy.fallback)
      ].join('');
    });
})();
