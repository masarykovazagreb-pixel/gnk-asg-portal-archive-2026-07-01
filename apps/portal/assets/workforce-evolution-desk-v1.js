(() => {
  'use strict';
  const isEn = () => (document.documentElement.lang || '').toLowerCase().startsWith('en') || /\/en\//.test(location.pathname);
  const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function render(container, data) {
    if (!container || !data || !Array.isArray(data.strategicIdeas)) return;
    const en = isEn();

    let html = `
      <section class="evolution-desk-wrapper">
        <div class="evolution-desk-header">
          <div class="evolution-title-box">
            <span class="evolution-pulse-badge">WORKFORCE STRATEGY MODEL</span>
            <h3>${en ? 'Modeled Strategic Intelligence & Planning Ideas' : 'Modelirane strateške ideje digitalne radne snage'}</h3>
            <p class="evolution-sub">${en ? '1,573 modeled Workforce profiles across the control plane; planning output, not 1,573 independent runtime processes' : '1.573 modelirana Workforce profila u control planeu; planski izlaz, ne 1.573 neovisna runtime procesa'}</p>
          </div>
          <div class="evolution-meta-pill">
            <span class="evo-stat">Cycle #${data.cycleIndex || 1420}</span>
            <span class="evo-rate">🚀 ${esc(data.evolutionaryRate || 'planning-model')}</span>
            <span class="evo-eff">Runtime evidence: <strong>${esc(data.runtimeEvidence || 'workflow-runs-and-production-health-only')}</strong></span>
          </div>
        </div>
        <div class="evolution-ideas-grid">
    `;

    data.strategicIdeas.forEach(idea => {
      const title = en ? idea.titleEn : idea.titleHr;
      const desc = en ? idea.descriptionEn : idea.descriptionHr;
      const urgencyClass = (idea.urgency || 'MEDIUM').toLowerCase();

      html += `
        <article class="evolution-idea-card urgency-${urgencyClass}">
          <div class="idea-top">
            <span class="idea-cat">🎯 ${esc(idea.category)}</span>
            <span class="idea-urgency-badge ${urgencyClass}">${esc(idea.urgency)}</span>
            <span class="idea-impact">Impact: ${idea.impactScore || 98}%</span>
          </div>
          <h4>${esc(title)}</h4>
          <p class="idea-desc">${esc(desc)}</p>
          <div class="idea-action">
            <span class="action-label">${en ? 'Proposed step:' : 'Predloženi korak:'}</span>
            <span>${esc(idea.actionableStep)}</span>
          </div>
          <div class="idea-footer">
            <span class="column-slot">✍️ ${esc(idea.suggestedColumnSlot)}</span>
          </div>
        </article>
      `;
    });

    html += `
        </div>
        <div class="evolution-hashtags">
          ${(data.hashtags || '').split(' ').map(tag => `<span class="tag">${tag}</span>`).join(' ')}
        </div>
      </section>
    `;

    container.innerHTML = html;
  }

  async function loadEvolutionData() {
    const container = document.getElementById('akWorkforceEvolutionDesk');
    if (!container) return;
    try {
      const res = await fetch('/data/workforce-evolution-log.json?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      render(container, data);
    } catch (_) {}
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', () => { loadEvolutionData(); setInterval(loadEvolutionData, 60000); })
    : (loadEvolutionData(), setInterval(loadEvolutionData, 60000));
})();
