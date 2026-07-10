(() => {
  'use strict';
  if (window.__GNK_ASG_PROJECTION_V1__) return;
  window.__GNK_ASG_PROJECTION_V1__ = true;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const BASE_MODEL_PORTFOLIO = 100000; // fiksna referentna vrijednost modela, javno objavljena

  const t = {
    hr: {
      label: 'AI-ORKESTRIRANO · MODEL PORTFELJ',
      modelPortfolio: 'Model portfelj', change: 'Današnja projicirana promjena', rationale: 'Obrazloženje (AI)',
      unavailable: 'Projekcija trenutačno nije dostupna.', basis: 'Temeljeno na',
      footnote: 'Model portfelj nije povezan sa stvarnim kapitalom Grupe.'
    },
    en: {
      label: 'AI-ORCHESTRATED · MODEL PORTFOLIO',
      modelPortfolio: 'Model portfolio', change: "Today's projected change", rationale: 'Rationale (AI)',
      unavailable: 'Projection is currently unavailable.', basis: 'Based on',
      footnote: 'The model portfolio is not connected to the Group\'s actual capital.'
    }
  }[lang];

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  // Transparentna, objavljena formula: prosjek dnevnih promjena glavnih indeksa,
  // ponderiran jednako, primijenjen na fiksnu referentnu vrijednost modela.
  function computeProjection(indices) {
    const valid = indices.filter(i => typeof i.change_percent === 'number');
    if (!valid.length) return null;
    const avgPct = valid.reduce((s, i) => s + i.change_percent, 0) / valid.length;
    const changeValue = BASE_MODEL_PORTFOLIO * (avgPct / 100);
    return { avgPct, changeValue, indices: valid };
  }

  async function fetchRationale(avgPct, indices) {
    try {
      const summary = indices.map(i => `${i.label} ${i.change_percent >= 0 ? '+' : ''}${i.change_percent}%`).join(', ');
      const res = await fetch('https://gnk-asg.hr/api/ai-assist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          task: 'daily_projection_rationale',
          style: 'corporate',
          lang,
          subject: 'Digital Workforce - dnevna operativna projekcija',
          context: 'Javna stranica Digital Workforce, model portfelj, ne stvarni kapital.',
          text: `Prosječna dnevna promjena glavnih tržišnih indeksa: ${avgPct.toFixed(2)}%. Pojedinačno: ${summary}. Napiši jednu kratku rečenicu (do 25 riječi) koja objašnjava smjer ove operativne projekcije modela portfelja, poslovnim, oprezno-neutralnim tonom. Ne spominji stvarni novac niti savjet za ulaganje.`
        })
      });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      if (data && data.text) return { text: data.text, ai: !!data.ai };
      throw new Error('no text');
    } catch (e) {
      return null;
    }
  }

  async function mount(target) {
    try {
      const res = await fetch('/data/market_indices.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      const proj = computeProjection(data.indices || []);
      if (!proj) throw new Error('no projection');

      const changeColor = proj.changeValue >= 0 ? '#8fe7aa' : '#ff9c9c';
      const changeSign = proj.changeValue >= 0 ? '+' : '';
      const fmt = n => Math.abs(n).toLocaleString(lang === 'en' ? 'en-US' : 'hr-HR', { maximumFractionDigits: 0 });

      target.innerHTML = `
        <div class="dhq-card" style="padding:1.4rem 1.6rem;">
          <span style="display:inline-block;font-size:10px;letter-spacing:1px;padding:3px 10px;border:1px solid rgba(214,173,79,.35);border-radius:6px;color:#d6ad4f;background:rgba(214,173,79,.08);margin-bottom:14px;">${t.label}</span>
          <div class="dhq-grid-3">
            <div class="dhq-kpi"><span>${t.modelPortfolio}</span><b>${BASE_MODEL_PORTFOLIO.toLocaleString(lang === 'en' ? 'en-US' : 'hr-HR')}</b></div>
            <div class="dhq-kpi"><span>${t.change}</span><b style="color:${changeColor}">${changeSign}${fmt(proj.changeValue)} (${changeSign}${proj.avgPct.toFixed(2)}%)</b></div>
            <div class="dhq-kpi"><span>${t.basis}</span><b style="font-size:13px;">${proj.indices.length} ${lang === 'en' ? 'market indices' : 'tržišna indeksa'}</b></div>
          </div>
          <div id="gnk-projection-rationale" style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(214,173,79,.15);color:#cabd9b;font-size:13px;font-style:italic;">${t.rationale}: …</div>
        </div>`;

      const rationale = await fetchRationale(proj.avgPct, proj.indices);
      const rEl = document.getElementById('gnk-projection-rationale');
      if (rEl) {
        if (rationale) {
          rEl.innerHTML = `<strong style="font-style:normal;color:#8e8164;">${t.rationale}${rationale.ai ? '' : ' (' + (lang==='en'?'template':'predložak') + ')'}:</strong> ${esc(rationale.text)}`;
        } else {
          rEl.remove();
        }
      }
    } catch (e) {
      target.innerHTML = `<p style="color:#8e8164">${t.unavailable}</p>`;
    }
  }

  document.querySelectorAll('[data-gnk-projection-mount]').forEach(mount);
})();
