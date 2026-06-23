(() => {
  'use strict';

  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const hero = document.querySelector('.hero');
  const heroTitle = hero?.querySelector('h1');
  if (heroTitle) {
    heroTitle.innerHTML = lang === 'en'
      ? 'Corporate <span>ecosystem</span>'
      : 'Korporativni <span>ekosustav</span>';
  }

  const heroCopy = hero?.querySelector('.hero-copy > p:not(.eyebrow)');
  if (heroCopy) {
    heroCopy.textContent = lang === 'en'
      ? 'A premium corporate, financial and intelligence environment connecting the group network, markets, publications, documents, artificial intelligence and communication tools.'
      : 'Premium korporativno, financijsko i inteligencijsko okruženje koje povezuje mrežu grupe, tržišta, objave, dokumente, umjetnu inteligenciju i komunikacijske alate.';
  }

  function makeNetworkCanvas() {
    const visual = document.querySelector('.hero-visual');
    if (!visual || visual.querySelector('.hero-network-canvas')) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-network-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    visual.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0, height = 0, dpr = 1;
    let nodes = [];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const rect = visual.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(18, Math.round(width / 42));
      nodes = Array.from({ length: count }, (_, index) => ({
        x: width * (.12 + Math.random() * .82),
        y: height * (.12 + Math.random() * .78),
        vx: (Math.random() - .5) * .13,
        vy: (Math.random() - .5) * .11,
        r: index % 5 === 0 ? 2.7 : 1.6 + Math.random() * 1.2,
        gold: index % 3 === 0
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!reduceMotion) {
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < width * .05 || a.x > width * .98) a.vx *= -1;
          if (a.y < height * .05 || a.y > height * .95) a.vy *= -1;
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 135) {
            const alpha = (1 - distance / 135) * .34;
            const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            gradient.addColorStop(0, `rgba(255,224,138,${alpha})`);
            gradient.addColorStop(1, `rgba(75,214,255,${alpha})`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = .7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        ctx.shadowBlur = 16;
        ctx.shadowColor = a.gold ? '#e7bc50' : '#4bd6ff';
        ctx.fillStyle = a.gold ? 'rgba(255,224,138,.95)' : 'rgba(75,214,255,.9)';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    draw();
  }

  function enableReveal() {
    const targets = document.querySelectorAll('.section, .trust-strip, .profile-card, .company-card, .live-card');
    targets.forEach(el => el.classList.add('iq-reveal'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('iq-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -4% 0px' });
    targets.forEach(el => observer.observe(el));
  }

  function enableTilt() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const cards = document.querySelectorAll('.quick-card, .company-card, .profile-card, .pdf-card, .live-card');
    cards.forEach(card => {
      card.classList.add('iq-tilt');
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.transform = `perspective(800px) rotateX(${-y * 4.5}deg) rotateY(${x * 5.5}deg) translateY(-3px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  function countUpKpis() {
    const values = document.querySelectorAll('.kpi strong, .group-counts strong');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        const original = el.textContent.trim();
        const match = original.match(/([0-9][0-9.,]*)/);
        if (!match) return;
        const normalized = match[1].replace(/\./g, '').replace(',', '.');
        const target = Number(normalized);
        if (!Number.isFinite(target) || target > 1000000) return;
        const decimals = (normalized.split('.')[1] || '').length;
        const start = performance.now();
        const duration = 900;
        el.classList.add('iq-counter');
        function frame(now) {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = target * eased;
          const localized = value.toLocaleString(lang === 'en' ? 'en-US' : 'hr-HR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          });
          el.textContent = original.replace(match[1], localized);
          if (progress < 1) requestAnimationFrame(frame);
          else el.textContent = original;
        }
        requestAnimationFrame(frame);
      });
    }, { threshold: .55 });
    values.forEach(el => observer.observe(el));
  }

  function heroParallax() {
    if (!hero || window.matchMedia('(pointer: coarse)').matches) return;
    const globe = hero.querySelector('.globe');
    hero.addEventListener('pointermove', event => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      if (globe) globe.style.transform = `translate(${x * 12}px, ${y * 8}px) rotate(${x * 2}deg)`;
    });
    hero.addEventListener('pointerleave', () => { if (globe) globe.style.transform = ''; });
  }

  makeNetworkCanvas();
  enableReveal();
  enableTilt();
  countUpKpis();
  heroParallax();
})();