(() => {
  'use strict';

  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));

  const copy = {
    hr: {
      loading: 'UÄitavanjeâ€¦', noItems: 'TrenutaÄno nema dostupnih zapisa.',
      openPublications: 'Otvori Objave', statusUnavailable: 'Javni feed trenutaÄno nije dostupan. Dostupne su povezane javne sekcije portala.',
      groupAll: 'Sve', countdownDefault: 'VaÅ¾na objava za', countdownDone: 'Objava je dostupna',
      mediaPlay: 'Pokreni sadrÅ¾aj', videoPlay: 'Pokreni video', presentationPlay: 'Pokreni prezentaciju',
      mediaUnavailable: 'Medijski sadrÅ¾aj joÅ¡ nije objavljen.', days: 'dana', hours: 'sati', minutes: 'minuta', seconds: 'sekundi'
    },
    en: {
      loading: 'Loadingâ€¦', noItems: 'No entries are currently available.',
      openPublications: 'Open Publications', statusUnavailable: 'The public feed is temporarily unavailable. Related public portal sections remain available.',
      groupAll: 'All', countdownDefault: 'Important announcement in', countdownDone: 'The announcement is available',
      mediaPlay: 'Open content', videoPlay: 'Play video', presentationPlay: 'Open presentation',
      mediaUnavailable: 'Media content has not been published yet.', days: 'days', hours: 'hours', minutes: 'minutes', seconds: 'seconds'
    }
  }[lang];

  const getJson = async url => {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  const safeOwnUrl = value => {
    if (!value) return '';
    try {
      const url = new URL(String(value), location.origin);
      const allowed = url.origin === location.origin || url.hostname === 'news.gnk-asg.hr' || url.hostname === 'gnk-asg.hr';
      return allowed && /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  function repairIndexLayout() {
    const main = document.querySelector('main');
    if (!main) return;

    if (document.getElementById('gnk-asg-premium-header')) {
      document.querySelectorAll('.brand-head,.top-nav').forEach(element => {
        element.setAttribute('aria-hidden', 'true');
        element.style.display = 'none';
      });
    }

    main.querySelectorAll(':scope > .hero,:scope > .trust-strip,:scope > .section').forEach(element => {
      element.hidden = false;
      element.style.setProperty('display', element.classList.contains('hero') ? 'grid' : '', 'important');
      element.style.setProperty('visibility', 'visible', 'important');
      element.style.setProperty('opacity', '1', 'important');
      element.style.setProperty('transform', 'none', 'important');
    });

    main.querySelectorAll(':scope > div,:scope > section').forEach(element => {
      const rect = element.getBoundingClientRect();
      const text = (element.textContent || '').trim();
      const meaningful = element.querySelector('img,video,canvas,iframe,form,article,a,button');
      if (rect.height > 900 && text.length < 20 && !meaningful) element.style.display = 'none';
    });

    const heroCopy = document.querySelector('.hero-copy');
    if (heroCopy && !heroCopy.querySelector('h1')) {
      const h1 = document.createElement('h1');
      h1.innerHTML = lang === 'en' ? 'GNK ASG <span>Corporate Portal</span>' : 'GNK ASG <span>Korporativni portal</span>';
      heroCopy.querySelector('.eyebrow')?.after(h1);
    }
  }

  const modals = Object.fromEntries([...document.querySelectorAll('.modal')].map(modal => [modal.id, modal]));
  function openModal(id) {
    const modal = modals[id];
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modal.querySelector('[data-close]')?.focus();
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open]');
    if (opener) {
      event.preventDefault();
      openModal(opener.dataset.open);
      if (opener.dataset.open === 'auto-editor-modal') loadAutoEditor();
    }
    const close = event.target.closest('[data-close]');
    if (close) closeModal(close.closest('.modal'));
    if (event.target.classList.contains('modal')) closeModal(event.target);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.modal.open').forEach(closeModal);
  });

  async function loadAutoEditor() {
    const box = document.querySelector('#auto-editor-modal .modal-grid');
    if (!box) return;
    box.innerHTML = `<article class="modal-item"><h4>${copy.loading}</h4></article>`;
    try {
      const payload = await getJson('/data/auto-editor.json');
      const items = Array.isArray(payload) ? payload : (payload.items || payload.articles || []);
      box.innerHTML = items.length ? items.slice(0, 10).map(item => `
        <article class="modal-item">
          <h4>${esc(lang === 'en' ? (item.titleEn || item.title) : (item.titleHr || item.title))}</h4>
          <p>${esc(lang === 'en' ? (item.summaryEn || item.summary || item.excerpt) : (item.summaryHr || item.summary || item.excerpt))}</p>
        </article>`).join('') : `<article class="modal-item"><h4>${copy.noItems}</h4><p>${copy.statusUnavailable}</p></article>`;
    } catch (error) {
      box.innerHTML = `<article class="modal-item"><h4>${copy.statusUnavailable}</h4><p>${esc(error.message)}</p></article>`;
    }
  }

  async function loadNews() {
    try {
      const payload = await getJson('/data/news.json');
      const items = Array.isArray(payload) ? payload : (payload.items || []);
      if (!items.length) return;
      const top = items[0];
      const title = lang === 'en' ? (top.titleEn || top.title || top.titleHr) : (top.titleHr || top.title || top.titleEn);
      const summary = lang === 'en' ? (top.summaryEn || top.summary || top.description || top.excerpt) : (top.summaryHr || top.summary || top.description || top.excerpt);
      const link = top.url || top.sourceUrl || (lang === 'en' ? '/news/' : '/vijesti/');
      const titleEl = document.getElementById('featuredTitle');
      const summaryEl = document.getElementById('featuredSummary');
      const linkEl = document.getElementById('featuredLink');
      if (titleEl) titleEl.textContent = title || (lang === 'en' ? 'Featured information' : 'KljuÄna informacija');
      if (summaryEl) summaryEl.textContent = summary || '';
      if (linkEl) linkEl.href = link;
      const list = document.getElementById('latestNews');
      if (list) list.innerHTML = items.slice(0, 5).map(item => `
        <a class="news-item" href="${esc(item.url || item.sourceUrl || (lang === 'en' ? '/news/' : '/vijesti/'))}">
          <strong>${esc(lang === 'en' ? (item.titleEn || item.title || item.titleHr || 'News') : (item.titleHr || item.title || item.titleEn || 'Vijest'))}</strong>
          <small>${esc(item.source || item.category || 'GNK ASG')}</small>
        </a>`).join('');
    } catch (_) {}
  }

  async function loadMarket() {
    const target = document.getElementById('marketRows');
    if (!target) return;
    try {
      const payload = await getJson('/api/market');
      const assets = payload.assets || {};
      const rows = [
        ['ASG Gold Reference', assets.asg_gold_reference?.value_eur, ' EUR'],
        ['Bitcoin / EUR', assets.bitcoin?.price_eur, ' EUR'],
        ['USD / EUR', assets.usd_eur?.rate, ''],
        ['Brent', assets.brent?.price_usd ?? assets.brent?.price, ' USD']
      ];
      target.innerHTML = rows.map(([name, value, suffix]) => `
        <div class="market-row"><span>${name}</span><b class="market-value">${value == null ? 'â€”' : Number(value).toLocaleString(lang === 'en' ? 'en-US' : 'hr-HR', { maximumFractionDigits: 2 }) + suffix}</b></div>`).join('');
    } catch (_) {
      target.querySelectorAll('.market-value').forEach(el => { el.textContent = 'â€”'; });
    }
  }

  async function loadPublications() {
    const target = document.getElementById('publicationRows');
    if (!target) return;
    try {
      const payload = await getJson('/data/auto-editor.json');
      const items = Array.isArray(payload) ? payload : (payload.items || payload.articles || []);
      const format = value => {
        const date = new Date(value || '');
        return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'hr-HR', { dateStyle: 'medium', timeZone: 'Europe/Zagreb' }).format(date);
      };
      target.innerHTML = items.length ? items.slice(0, 5).map(item => `
        <a class="publication-row" href="${lang === 'en' ? '/publications/' : '/objave/'}">
          <span>${esc(lang === 'en' ? (item.titleEn || item.title) : (item.titleHr || item.title))}</span>
          <small>${esc(format(item.publishedAt || item.date))}</small>
        </a>`).join('') : `<a class="publication-row" href="${lang === 'en' ? '/publications/' : '/objave/'}"><span>${copy.openPublications}</span></a>`;
    } catch (_) {
      target.innerHTML = `<a class="publication-row" href="${lang === 'en' ? '/publications/' : '/objave/'}"><span>${copy.openPublications}</span></a>`;
    }
  }

  async function loadNetwork() {
    const list = document.getElementById('locationList');
    const tabs = document.getElementById('continentTabs');
    const plannedList = document.getElementById('plannedList');
    if (!list || !tabs) return;
    try {
      const data = await getJson('/data/group_network.json');
      const active = (data.nodes || []).filter(node => node.status === 'active');
      const planned = (data.nodes || []).filter(node => node.status === 'planned');
      const regions = [...new Set(active.map(node => node.region).filter(Boolean))];
      tabs.innerHTML = [`<button class="active" data-region="all">${copy.groupAll}</button>`, ...regions.map(region => `<button data-region="${esc(region)}">${esc(region)}</button>`)].join('');
      const render = region => {
        const nodes = active.filter(node => region === 'all' || node.region === region);
        const center = data.center ? [data.center] : [];
        list.innerHTML = [...center, ...nodes].map(node => `
          <div class="location"><b>${esc(node.id === 'boulder' ? node.name : (lang === 'en' ? (node.name_en || node.name_hr) : (node.name_hr || node.name_en)))}</b>
          <span>${esc(node.id === 'boulder' ? node.place : (lang === 'en' ? (node.place_en || node.place_hr) : (node.place_hr || node.place_en)))} Â· ${esc(node.region || '')}</span></div>`).join('');
      };
      render('all');
      tabs.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
        tabs.querySelectorAll('button').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        render(button.dataset.region);
      }));
      if (plannedList) plannedList.innerHTML = planned.map(node => `<li>${esc(lang === 'en' ? (node.name_en || node.name_hr) : (node.name_hr || node.name_en))} Â· ${esc(lang === 'en' ? (node.place_en || node.place_hr) : (node.place_hr || node.place_en))}</li>`).join('');
    } catch (_) {
      list.innerHTML = `<div class="location"><b>${copy.statusUnavailable}</b></div>`;
    }
  }

  function installCountdown(config) {
    const old = document.getElementById('gnk-index-countdown');
    old?.remove();
    const countdown = config?.countdown || {};
    if (!countdown.enabled || !countdown.target) return;
    const target = new Date(countdown.target);
    if (Number.isNaN(target.getTime())) return;

    const featuredSection = document.querySelector('.feature-grid')?.closest('.section');
    if (!featuredSection) return;
    const bar = document.createElement('section');
    bar.id = 'gnk-index-countdown';
    bar.className = 'gnk-index-countdown';
    bar.style.setProperty('--countdown-accent', countdown.color || '#ef6670');
    bar.innerHTML = `<div class="countdown-label">${esc(lang === 'en' ? (countdown.labelEn || copy.countdownDefault) : (countdown.labelHr || copy.countdownDefault))}</div><div class="countdown-values" aria-live="polite"></div>`;
    featuredSection.before(bar);
    const values = bar.querySelector('.countdown-values');

    const render = () => {
      const remaining = target.getTime() - Date.now();
      if (remaining <= 0) {
        values.innerHTML = `<strong>${esc(lang === 'en' ? (countdown.doneLabelEn || copy.countdownDone) : (countdown.doneLabelHr || copy.countdownDone))}</strong>`;
        bar.classList.add('is-complete');
        return false;
      }
      const seconds = Math.floor(remaining / 1000);
      const parts = [
        [Math.floor(seconds / 86400), copy.days],
        [Math.floor((seconds % 86400) / 3600), copy.hours],
        [Math.floor((seconds % 3600) / 60), copy.minutes],
        [seconds % 60, copy.seconds]
      ];
      values.innerHTML = parts.map(([value, label]) => `<span><b>${String(value).padStart(2, '0')}</b><small>${esc(label)}</small></span>`).join('');
      return true;
    };
    render();
    const timer = setInterval(() => { if (!render()) clearInterval(timer); }, 1000);
  }

  function installLazyMedia(config) {
    const media = config?.media || {};
    if (!media.enabled) return;
    const source = safeOwnUrl(media.sourceUrl || media.source || '');
    const preview = safeOwnUrl(media.previewUrl || '');
    if (!source && !preview) return;
    const featured = document.querySelector('.featured');
    if (!featured) return;

    const poster = safeOwnUrl(media.posterUrl || media.poster || '') || '/assets/index-media-poster.svg';
    const type = media.type === 'pptx' ? 'pptx' : 'video';
    const title = lang === 'en' ? (media.titleEn || media.title || 'GNK ASG media message') : (media.titleHr || media.title || 'GNK ASG medijska poruka');
    const summary = lang === 'en' ? (media.summaryEn || media.summary || '') : (media.summaryHr || media.summary || '');
    const buttonLabel = type === 'pptx' ? copy.presentationPlay : copy.videoPlay;

    featured.classList.add('gnk-media-ready');
    featured.style.backgroundImage = `linear-gradient(90deg,rgba(2,9,19,.22),rgba(2,9,19,.96) 74%),url("${poster.replace(/"/g, '%22')}")`;
    featured.innerHTML = `
      <button class="play gnk-media-play" type="button" aria-label="${esc(buttonLabel)}">â–¶</button>
      <div class="featured-content"><p class="eyebrow">${type === 'pptx' ? 'PPTX / PDF' : 'Video'}</p><h3>${esc(title)}</h3><p>${esc(summary)}</p><button class="btn gnk-media-open" type="button">${esc(buttonLabel)}</button></div>
      <div class="gnk-media-stage" hidden></div>`;

    const launch = () => {
      const stage = featured.querySelector('.gnk-media-stage');
      if (!stage || stage.dataset.loaded === '1') return;
      stage.dataset.loaded = '1';
      stage.hidden = false;
      featured.querySelector('.featured-content')?.setAttribute('hidden', '');
      featured.querySelector('.gnk-media-play')?.setAttribute('hidden', '');

      if (type === 'video' && source) {
        const video = document.createElement('video');
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.poster = poster;
        video.src = source;
        video.setAttribute('aria-label', title);
        stage.appendChild(video);
        video.play().catch(() => {});
        return;
      }

      const target = preview || source;
      if (target) {
        const iframe = document.createElement('iframe');
        iframe.title = title;
        iframe.loading = 'eager';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.src = target;
        stage.appendChild(iframe);
      } else {
        stage.innerHTML = `<p>${esc(copy.mediaUnavailable)}</p>`;
      }
    };
    featured.querySelectorAll('.gnk-media-play,.gnk-media-open').forEach(button => button.addEventListener('click', launch, { once: true }));
  }

  async function loadIndexExperience() {
    try {
      const config = await getJson('/data/index-media-config.json');
      installCountdown(config);
      installLazyMedia(config);
    } catch (_) {}
  }

  repairIndexLayout();
  loadNews();
  loadMarket();
  loadPublications();
  loadNetwork();
  loadIndexExperience();
  window.addEventListener('load', repairIndexLayout, { once: true });
  [250, 900, 2200].forEach(delay => setTimeout(repairIndexLayout, delay));

  /* GNK_LOCATION_SLIDESHOW_JS_START */
  function installLocationSlideshow() {
    const list = document.getElementById('locationList');
    const host = list?.closest('.locations');

    if (!list || !host) return;

    let box = document.getElementById('gnk-location-slideshow');

    if (!box) {
      box = document.createElement('div');
      box.id = 'gnk-location-slideshow';
      box.innerHTML =
        '<img class="is-active" src="/assets/brand/index-slide-1.webp" alt="GNK ASG Global Network">' +
        '<img src="/assets/brand/index-slide-2.webp" alt="GNK DINAMO Ltd. Group New York">';

      host.appendChild(box);

      const slides = [...box.querySelectorAll('img')];
      let active = 0;

      window.__gnkLocationSlideshowTimer = window.setInterval(() => {
        slides[active].classList.remove('is-active');
        active = (active + 1) % slides.length;
        slides[active].classList.add('is-active');
      }, 10000);
    }

    const positionSlideshow = () => {
      const hostRect = host.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const availableTop = Math.ceil(listRect.bottom - hostRect.top + 8);
      const maximumTop = Math.max(0, host.clientHeight - 120);
      const top = Math.min(Math.max(availableTop, 0), maximumTop);

      host.style.setProperty('--gnk-slide-top', `${top}px`);
    };

    positionSlideshow();

    window.setTimeout(positionSlideshow, 300);
    window.setTimeout(positionSlideshow, 1000);
    window.setTimeout(positionSlideshow, 2500);

    if (!window.__gnkLocationSlideshowResize) {
      window.__gnkLocationSlideshowResize = true;
      window.addEventListener('resize', positionSlideshow);
    }
  }

  installLocationSlideshow();
  window.addEventListener('load', installLocationSlideshow, { once:true });
  window.setTimeout(installLocationSlideshow, 500);
  window.setTimeout(installLocationSlideshow, 1800);
  /* GNK_LOCATION_SLIDESHOW_JS_END */
})();
