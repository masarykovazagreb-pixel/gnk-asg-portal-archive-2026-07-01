(() => {
  'use strict';
  if (window.GNK_CONTENT_SHARE_READY) return;
  window.GNK_CONTENT_SHARE_READY = true;
  const SHARE = 'gnk-content-share';
  const SECTION_SHARE = {
    financials: '/podijeli/financije-kartica/',
    grupa: '/podijeli/grupa-kartica/',
    technology: '/podijeli/tehnologija/',
    'digital-assets': '/podijeli/trzista-kartica/',
    news: '/podijeli/vijesti/',
    dokumenti: '/podijeli/dokumenti/'
  };
  const isEnglish = () => document.documentElement.lang === 'en' || /\/en(?:\/|$)/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const absolute = value => new URL(value || location.href, location.origin).href;
  const sectionShareUrl = id => absolute(SECTION_SHARE[id] || (location.pathname + '#' + id));
  function installStyle() {
    if (document.getElementById('gnk-content-share-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk-content-share-style';
    style.textContent = ['.gnk-content-share{position:relative;display:flex;justify-content:flex-end;align-items:center;margin-top:6px}','.gnk-share-toggle{display:inline-flex;align-items:center;gap:4px;min-height:22px;padding:0 7px;border:0;border-radius:999px;background:transparent;color:#8695a8;font:700 .52rem/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:color .15s ease,background .15s ease}','.gnk-share-toggle:before{content:"↗";color:#ad822c;font-size:.62rem}','.gnk-share-toggle:hover,.gnk-content-share.open .gnk-share-toggle{color:#143b6d;background:#f4f7fb}','.gnk-share-options{position:absolute;right:0;bottom:26px;z-index:80;display:none;gap:2px;padding:4px;border:1px solid #e4eaf2;border-radius:999px;background:#fff;box-shadow:0 7px 18px rgba(7,22,45,.08);white-space:nowrap}','.gnk-content-share.open .gnk-share-options{display:flex}','.gnk-share-options a{display:inline-flex;align-items:center;min-height:23px;padding:0 7px;border-radius:999px;color:#65788e;text-decoration:none;font:700 .5rem/1 Arial,sans-serif;letter-spacing:.03em;text-transform:uppercase}','.gnk-share-options a:hover{background:#f4f7fb;color:#143b6d}','.news-card .gnk-content-share,.topic-news .gnk-content-share,.news-item .gnk-content-share{position:absolute;right:10px;bottom:8px;margin:0;padding:0;border:0}','.news-card,.topic-news,.news-item{position:relative;padding-bottom:31px!important}','.news-card .gnk-share-toggle,.topic-news .gnk-share-toggle,.news-item .gnk-share-toggle{width:19px;height:19px;min-height:19px;padding:0;justify-content:center;font-size:0;opacity:.62}','.news-card .gnk-share-toggle:before,.topic-news .gnk-share-toggle:before,.news-item .gnk-share-toggle:before{font-size:.62rem}','.news-card:hover .gnk-share-toggle,.topic-news:hover .gnk-share-toggle,.news-item:hover .gnk-share-toggle,.news-card .gnk-content-share.open .gnk-share-toggle{opacity:1}','.news-card .gnk-share-options,.topic-news .gnk-share-options,.news-item .gnk-share-options{right:-2px;bottom:23px}','.section-head .gnk-content-share{justify-content:flex-start;margin-top:7px}','.group-card .gnk-content-share,.doc .gnk-content-share,.topic-card .gnk-content-share,.publication-card .gnk-content-share{margin-top:5px}','.group-card .gnk-share-toggle,.doc .gnk-share-toggle,.topic-card .gnk-share-toggle,.publication-card .gnk-share-toggle{font-size:0;width:20px;padding:0;justify-content:center}','@media(max-width:680px){.gnk-share-options{bottom:25px}.news-card .gnk-content-share,.topic-news .gnk-content-share,.news-item .gnk-content-share{right:8px;bottom:7px}}'].join('');
    document.head.appendChild(style);
  }
  function shareMarkup(title, url) {
    const label = isEnglish() ? 'Share' : 'Podijeli';
    const itemTitle = title || document.title || 'GNK ASG d.o.o.';
    const itemUrl = absolute(url || location.href);
    const message = encodeURIComponent(itemTitle + ' — ' + itemUrl);
    return '<div class="' + SHARE + '"><button class="gnk-share-toggle" type="button" aria-expanded="false" aria-label="' + label + '" title="' + label + '">' + label + '</button><div class="gnk-share-options" aria-label="' + label + '"><a target="_blank" rel="noopener" href="https://wa.me/?text=' + message + '">WhatsApp</a><a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(itemUrl) + '">LinkedIn</a><a href="mailto:?subject=' + encodeURIComponent(itemTitle) + '&body=' + message + '">E-mail</a></div></div>';
  }
  function bind(control) {
    const button = control && control.querySelector('.gnk-share-toggle');
    if (!button || button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', event => { event.stopPropagation(); document.querySelectorAll('.gnk-content-share.open').forEach(other => { if (other !== control) { other.classList.remove('open'); other.querySelector('.gnk-share-toggle')?.setAttribute('aria-expanded','false'); } }); const open = control.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); });
  }
  function add(host, title, url) {
    if (!host || host.querySelector(':scope > .' + SHARE)) return;
    host.insertAdjacentHTML('beforeend', shareMarkup(title, url));
    bind(host.querySelector(':scope > .' + SHARE));
  }
  function contentLink(card) { return Array.from(card.querySelectorAll('a[href]')).find(link => !link.closest('.gnk-share-options')) || null; }
  function run() {
    installStyle();
    document.querySelectorAll('section[id]').forEach(section => { if (!section.id || section.id === 'top') return; const host = section.querySelector(':scope > .container > .section-head, :scope > .container > .live-head'); const heading = section.querySelector('h1,h2,h3'); if (host) add(host, heading ? heading.textContent.trim() : document.title, sectionShareUrl(section.id)); });
    document.querySelectorAll('article.news-card, article.topic-news, article.news-item').forEach(card => { const heading = card.querySelector('h1,h2,h3,h4'); const controlled = card.dataset.shareUrl; const link = contentLink(card); add(card, heading ? heading.textContent.trim() : document.title, controlled || (link ? link.href : sectionShareUrl('news'))); });
    document.querySelectorAll('.group-card').forEach(card => { const heading = card.querySelector('h1,h2,h3,h4'); add(card, heading ? heading.textContent.trim() : 'GNK DINAMO Ltd. Group', sectionShareUrl('grupa')); });
    document.querySelectorAll('.doc').forEach(card => { const heading = card.querySelector('h1,h2,h3,h4'); add(card, heading ? heading.textContent.trim() : 'Javni dokumenti i izvori', sectionShareUrl('dokumenti')); });
  }
  document.addEventListener('click', () => document.querySelectorAll('.gnk-content-share.open').forEach(control => { control.classList.remove('open'); control.querySelector('.gnk-share-toggle')?.setAttribute('aria-expanded','false'); }));
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
  let queued = false;
  new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; run(); }); }).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('gnk-language-change', run);
})();