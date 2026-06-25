(() => {
  'use strict';
  const target = document.getElementById('status');
  if (!target) return;
  const row = (label, value) => `<div><span>${label}</span><strong>${value || '—'}</strong></div>`;
  const format = value => {
    const date = new Date(value || '');
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('hr-HR', {
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
        row('Poslovne vijesti', '09:00 i 16:00 · Europe/Zagreb'),
        row('Automatske objave', 'Svaka 2 sata · Europe/Zagreb'),
        row('Odabrani izvori', String(data.configuredNewsSources ?? 24)),
        row('Cilj po osvježavanju', `najmanje ${data.minimumNewsLinks ?? 20} poveznica`),
        row('Status vijesti', news.status || data.newsStatus || 'SNAPSHOT'),
        row('Zadnje vijesti', format(news.updatedAt)),
        row('Status Auto Editora', editor.ok === false ? 'ERROR' : (editor.ok === true ? 'OK' : 'ČEKA IZVRŠENJE')),
        row('Zadnja automatska objava', format(editor.finishedAt || editor.publishedAt)),
        row('Verzija', data.version || 'GNK ASG automation')
      ].join('');
    })
    .catch(() => {
      target.innerHTML = [
        row('Poslovne vijesti', '09:00 i 16:00 · Europe/Zagreb'),
        row('Automatske objave', 'Svaka 2 sata · Europe/Zagreb'),
        row('Status', 'FALLBACK')
      ].join('');
    });
})();
