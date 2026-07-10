(() => {
  'use strict';
  if (window.__GNK_ASG_DHQ_HOME_V2__) return;
  window.__GNK_ASG_DHQ_HOME_V2__ = true;

  document.body.classList.add('dhq-home');

  const progress = document.createElement('div');
  progress.className = 'dhq-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  const updateProgress = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const value = Math.min(100, Math.max(0, (scrollY / max) * 100));
    document.documentElement.style.setProperty('--dhq-progress', `${value}%`);
  };
  updateProgress();
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress, { passive: true });

  const heroPanel = document.querySelector('.dhq-hero > .dhq-panel:first-child');
  if (heroPanel && matchMedia('(pointer:fine)').matches) {
    heroPanel.addEventListener('pointermove', event => {
      const rect = heroPanel.getBoundingClientRect();
      heroPanel.style.setProperty('--dhq-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      heroPanel.style.setProperty('--dhq-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });
  }

  const revealNodes = [
    ...document.querySelectorAll('.dhq-hero > *, .dhq-section:not(#network) .dhq-section-head, .dhq-section:not(#network) .dhq-card, .dhq-section:not(#network) .dhq-project, .dhq-section:not(#network) .dhq-report, .dhq-section:not(#network) .dhq-kpi, .dhq-section:not(#network) .dhq-frame')
  ];
  revealNodes.forEach((node, index) => {
    node.setAttribute('data-dhq-reveal', '');
    node.style.transitionDelay = `${Math.min(index % 6, 5) * 45}ms`;
  });

  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealNodes.forEach(node => observer.observe(node));
  } else {
    revealNodes.forEach(node => node.classList.add('is-visible'));
  }
})();
