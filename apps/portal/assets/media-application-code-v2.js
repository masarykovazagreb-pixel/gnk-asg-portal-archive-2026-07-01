(() => {
  'use strict';
  if (window.__GNK_MEDIA_CODE_V2__) return;
  window.__GNK_MEDIA_CODE_V2__ = true;

  document.documentElement.dataset.mediaCodeLayout = 'v2';
  document.body.id = document.body.id || 'mediaTop';

  const header = document.querySelector('.masthead');
  if (header && !header.querySelector('.media-nav')) {
    const nav = document.createElement('nav');
    nav.className = 'media-nav';
    nav.setAttribute('aria-label', 'Media Application navigation');
    nav.innerHTML = [
      ['/', 'Početna'],
      ['/the-code/', 'THE CODE'],
      ['#travelPolicy', 'Pravila puta'],
      ['#applicationForm', 'Prijava'],
      ['mailto:media@gnk-asg.hr', 'Kontakt']
    ].map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
    header.appendChild(nav);
  }

  const localLinks = Array.from(document.querySelectorAll('.media-nav a[href^="#"]'));
  localLinks.forEach(link => {
    link.addEventListener('click', event => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({behavior: 'smooth', block: 'start'});
      history.replaceState(null, '', link.getAttribute('href'));
    });
  });

  const sections = [
    ['#travelPolicy', document.querySelector('#travelPolicy')],
    ['#applicationForm', document.querySelector('#applicationForm')]
  ].filter(([, node]) => node);

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const selector = sections.find(([, node]) => node === visible.target)?.[0];
      document.querySelectorAll('.media-nav a').forEach(link => {
        link.classList.toggle('is-active', link.getAttribute('href') === selector);
      });
    }, {rootMargin: '-20% 0px -65% 0px', threshold: [0.1, 0.35, 0.65]});
    sections.forEach(([, node]) => observer.observe(node));
  }
})();
