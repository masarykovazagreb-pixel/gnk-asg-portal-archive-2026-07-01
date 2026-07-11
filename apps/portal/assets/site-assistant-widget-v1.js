(() => {
  'use strict';
  if (window.__GNK_ASG_SITE_ASSISTANT_V1__) return;
  window.__GNK_ASG_SITE_ASSISTANT_V1__ = true;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const t = {
    hr: {
      label: 'Pitaj o stranici', placeholder: 'Npr. koji su statusi projekata?', send: 'Pošalji',
      searching: 'Pretražujem sadržaj stranice…', thinking: 'AI priprema odgovor…',
      noMatch: 'Nije pronađen relevantan sadržaj na stranici za taj upit.',
      openPage: 'Otvori stranicu →', aiLabel: 'AI-orkestrirano', aiUnavailable: '(predložak, AI nedostupan)',
      closeLabel: 'Zatvori', disclaimer: 'Odgovori se temelje isključivo na javnom sadržaju ove stranice.'
    },
    en: {
      label: 'Ask about this site', placeholder: 'E.g. what are the project statuses?', send: 'Send',
      searching: 'Searching site content…', thinking: 'AI is preparing an answer…',
      noMatch: 'No relevant content found on the site for that query.',
      openPage: 'Open page →', aiLabel: 'AI-orchestrated', aiUnavailable: '(template, AI unavailable)',
      closeLabel: 'Close', disclaimer: 'Answers are based only on public content of this site.'
    }
  }[lang];

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  let indexCache = null;
  async function loadIndex() {
    if (indexCache) return indexCache;
    try {
      const res = await fetch('/data/site-search-index-v1.json', { cache: 'no-store' });
      const data = await res.json();
      indexCache = data.pages || [];
    } catch (e) { indexCache = []; }
    return indexCache;
  }

  function searchIndex(pages, query) {
    const q = query.toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const scored = pages.map(p => {
      const haystack = `${p.title} ${p.keywords || ''} ${p.summary}`.toLowerCase();
      let score = 0;
      terms.forEach(term => { if (haystack.includes(term)) score += 1; });
      return { page: p, score };
    }).filter(x => x.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map(x => x.page);
  }

  async function fetchAiAnswer(query, matches) {
    try {
      const context = matches.map(m => `${m.title} (${m.url}): ${m.summary}`).join('\n');
      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          task: 'site_assistant_answer',
          style: 'corporate',
          lang,
          subject: query,
          context: 'GNK ASG javni site assistant - odgovaraj isključivo na temelju danog konteksta, ne izmišljaj.',
          text: `Pitanje posjetitelja: ${query}\n\nRelevantan sadržaj stranice:\n${context}\n\nOdgovori kratko (do 60 riječi), isključivo na temelju danog sadržaja. Ako sadržaj ne pokriva pitanje, reci to.`
        })
      });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      if (data && data.text) return { text: data.text, ai: !!data.ai };
      throw new Error('empty');
    } catch (e) { return null; }
  }

  function injectStyles() {
    if (document.getElementById('gnk-assistant-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk-assistant-style';
    style.textContent = `
      .gnk-assist-btn{position:fixed;bottom:22px;right:22px;z-index:40;height:48px;padding:0 18px;border-radius:999px;border:1px solid rgba(214,173,79,.4);background:rgba(10,9,7,.92);color:#d6ad4f;font:600 13px/1 inherit;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.4);backdrop-filter:blur(6px);}
      .gnk-assist-btn:hover{border-color:#d6ad4f;}
      .gnk-assist-panel{position:fixed;bottom:82px;right:22px;z-index:41;width:min(360px,calc(100vw - 44px));max-height:70vh;overflow:auto;background:#0b0a08;border:1px solid rgba(214,173,79,.35);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.55);padding:16px;display:none;}
      .gnk-assist-panel.is-open{display:block;}
      .gnk-assist-panel h4{margin:0 0 8px;color:#ffe89b;font-size:14px;}
      .gnk-assist-panel input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid rgba(214,173,79,.3);background:#000;color:#f2ede0;font-size:13px;margin-bottom:8px;}
      .gnk-assist-panel button.send{width:100%;padding:9px;border-radius:10px;border:1px solid rgba(214,173,79,.4);background:rgba(214,173,79,.12);color:#d6ad4f;font-weight:700;cursor:pointer;font-size:12px;}
      .gnk-assist-results{margin-top:12px;font-size:13px;color:#cabd9b;}
      .gnk-assist-results .status{color:#8e8164;font-style:italic;}
      .gnk-assist-answer{border-top:1px solid rgba(214,173,79,.15);margin-top:10px;padding-top:10px;font-style:italic;}
      .gnk-assist-answer strong{font-style:normal;color:#8e8164;display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
      .gnk-assist-match{border-top:1px solid rgba(255,255,255,.06);padding-top:8px;margin-top:8px;}
      .gnk-assist-match a{color:#d6ad4f;text-decoration:none;font-weight:700;font-size:12px;}
      .gnk-assist-close{position:absolute;top:10px;right:12px;background:none;border:none;color:#8e8164;font-size:16px;cursor:pointer;}
      .gnk-assist-disclaimer{margin-top:10px;font-size:10px;color:#5c584f;}
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'gnk-assist-panel';
    panel.innerHTML = `
      <button type="button" class="gnk-assist-close" data-assist-close aria-label="${esc(t.closeLabel)}">×</button>
      <h4>${esc(t.label)}</h4>
      <input type="text" data-assist-input placeholder="${esc(t.placeholder)}">
      <button type="button" class="send" data-assist-send>${esc(t.send)}</button>
      <div class="gnk-assist-results" data-assist-results></div>
      <div class="gnk-assist-disclaimer">${esc(t.disclaimer)}</div>
    `;
    return panel;
  }

  async function runQuery(panel) {
    const input = panel.querySelector('[data-assist-input]');
    const results = panel.querySelector('[data-assist-results]');
    const query = (input.value || '').trim();
    if (!query) return;
    results.innerHTML = `<div class="status">${esc(t.searching)}</div>`;
    const pages = await loadIndex();
    const matches = searchIndex(pages, query);
    if (!matches.length) {
      results.innerHTML = `<div class="status">${esc(t.noMatch)}</div>`;
      return;
    }
    const matchesHtml = matches.map(m => `
      <div class="gnk-assist-match">
        <a href="${esc(m.url)}">${esc(m.title)} ${esc(t.openPage)}</a>
        <div>${esc(m.summary)}</div>
      </div>`).join('');
    results.innerHTML = matchesHtml + `<div class="status" data-assist-ai-status>${esc(t.thinking)}</div>`;

    const answer = await fetchAiAnswer(query, matches);
    const aiStatusEl = results.querySelector('[data-assist-ai-status]');
    if (!aiStatusEl) return;
    if (answer) {
      aiStatusEl.outerHTML = `<div class="gnk-assist-answer"><strong>${esc(t.aiLabel)}${answer.ai ? '' : ' ' + esc(t.aiUnavailable)}</strong>${esc(answer.text)}</div>`;
    } else {
      aiStatusEl.remove();
    }
  }

  function mount() {
    injectStyles();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gnk-assist-btn';
    btn.innerHTML = `<span>💬</span><span>${esc(t.label)}</span>`;
    const panel = buildPanel();
    document.body.appendChild(btn);
    document.body.appendChild(panel);

    btn.addEventListener('click', () => {
      panel.classList.toggle('is-open');
      if (panel.classList.contains('is-open')) panel.querySelector('[data-assist-input]')?.focus();
    });
    panel.querySelector('[data-assist-close]').addEventListener('click', () => panel.classList.remove('is-open'));
    panel.querySelector('[data-assist-send]').addEventListener('click', () => runQuery(panel));
    panel.querySelector('[data-assist-input]').addEventListener('keydown', e => { if (e.key === 'Enter') runQuery(panel); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
