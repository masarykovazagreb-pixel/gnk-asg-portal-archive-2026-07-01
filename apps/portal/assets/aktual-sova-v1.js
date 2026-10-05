(() => {
  'use strict';
  const root = document.getElementById('aktualSova');
  if (!root || root.dataset.enhanced === '1') return;
  root.dataset.enhanced = '1';

  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const localDataUrl = '/data/aktual-sova.json';
  const $ = sel => root.querySelector(sel);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  const text = {
    hr: {
      loadError: 'Statički prikaz ostaje aktivan. Lokalni data contract trenutačno nije učitan.',
      source: 'Izvor i kontekst',
      foresight: 'Ideja i rizik',
      weekly: 'AKTUAL tjednik',
      explain: 'Pristupačno objašnjenje',
      own: 'vlastitih zapisa',
      briefs: 'planiranih briefova',
      checks: 'quality checkova',
      desks: 'media deskova',
      scenario: 'SCENARIJ — nije prognoza ni činjenica',
      gate: 'Ljudski urednički i objavni gate: Nermin Sefić'
    },
    en: {
      loadError: 'The static view remains active. The local data contract is currently unavailable.',
      source: 'Source and context',
      foresight: 'Idea and risk',
      weekly: 'AKTUAL Weekly',
      explain: 'Accessible explanation',
      own: 'own records',
      briefs: 'planned briefs',
      checks: 'quality checks',
      desks: 'media desks',
      scenario: 'SCENARIO — not a forecast or fact',
      gate: 'Human editorial and publication gate: Nermin Sefić'
    }
  }[lang];

  function activate(name) {
    root.querySelectorAll('[data-sova-panel]').forEach(panel => {
      const active = panel.dataset.sovaPanel === name;
      panel.hidden = !active;
    });
    root.querySelectorAll('[data-sova-tab]').forEach(btn => {
      const active = btn.dataset.sovaTab === name;
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
    });
  }

  root.querySelectorAll('[data-sova-tab]').forEach((btn, index, buttons) => {
    btn.addEventListener('click', () => activate(btn.dataset.sovaTab));
    btn.addEventListener('keydown', ev => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key)) return;
      ev.preventDefault();
      let next = index;
      if (ev.key === 'ArrowRight') next = (index + 1) % buttons.length;
      if (ev.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
      if (ev.key === 'Home') next = 0;
      if (ev.key === 'End') next = buttons.length - 1;
      buttons[next].focus();
      activate(buttons[next].dataset.sovaTab);
    });
  });

  fetch(localDataUrl, {credentials:'same-origin', cache:'no-store'})
    .then(r => {
      if (!r.ok) throw new Error('local contract unavailable');
      return r.json();
    })
    .then(data => {
      if (!data || data.schema !== 'gnk-asg/aktual-sova/v1') throw new Error('unexpected schema');
      const weekly = data.weekly || {};
      const weeklyEl = $('[data-sova-weekly]');
      if (weeklyEl) {
        weeklyEl.innerHTML = `
          <div class="sova-metrics" aria-label="${esc(text.weekly)}">
            <div><strong>${esc(weekly.own_records)}</strong><span>${esc(text.own)}</span></div>
            <div><strong>${esc(weekly.planned_briefs)}</strong><span>${esc(text.briefs)}</span></div>
            <div><strong>${esc(weekly.quality_checks)}</strong><span>${esc(text.checks)}</span></div>
            <div><strong>${esc(weekly.media_desks)}</strong><span>${esc(text.desks)}</span></div>
          </div>
          <p>${esc(lang === 'en' ? weekly.note_en : weekly.note_hr)}</p>`;
      }
      const fs = Array.isArray(data.foresight_examples) ? data.foresight_examples[0] : null;
      const foresightEl = $('[data-sova-foresight]');
      if (fs && foresightEl) {
        const title = lang === 'en' ? fs.title_en : fs.title_hr;
        const assumptions = lang === 'en' ? fs.assumptions_en : fs.assumptions_hr;
        const evidence = lang === 'en' ? fs.evidence_basis_en : fs.evidence_basis_hr;
        const risks = lang === 'en' ? fs.risks_en : fs.risks_hr;
        const falsification = lang === 'en' ? fs.falsification_en : fs.falsification_hr;
        const label = lang === 'en'
          ? ['Assumptions','Evidence basis','Risks','Falsification conditions']
          : ['Pretpostavke','Dokazna osnova','Rizici','Uvjeti opovrgavanja'];
        foresightEl.innerHTML = `
          <p class="sova-scenario-label">${esc(text.scenario)}</p>
          <h3>${esc(title)}</h3>
          <dl class="sova-dl">
            <dt>${esc(label[0])}</dt><dd>${esc((assumptions||[]).join(' '))}</dd>
            <dt>${esc(label[1])}</dt><dd>${esc((evidence||[]).join(' '))}</dd>
            <dt>${esc(label[2])}</dt><dd>${esc((risks||[]).join(' '))}</dd>
            <dt>${esc(label[3])}</dt><dd>${esc((falsification||[]).join(' '))}</dd>
          </dl>`;
      }
      const gate = $('[data-sova-gate]');
      if (gate) gate.textContent = text.gate;
    })
    .catch(() => {
      const status = $('[data-sova-status]');
      if (status) status.textContent = text.loadError;
    });

  activate('source');
})();