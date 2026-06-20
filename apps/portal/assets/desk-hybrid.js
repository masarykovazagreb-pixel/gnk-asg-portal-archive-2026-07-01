(() => {
  'use strict';
  if (window.GNK_DESK_HYBRID_READY) return;
  window.GNK_DESK_HYBRID_READY = true;

  const S = { mode: 'portal', cfg: null, data: {}, log: [], ready: false, puterPromise: null };
  const $ = id => document.getElementById(id);
  const isEn = () => document.documentElement.lang === 'en' || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const L = () => isEn() ? {
    portal:'Verified portal data', ai:'Connected AI', preparing:'AI preparing…', active:'AI active · Puter / Gemini', unavailable:'AI unavailable',
    question:'QUESTION', answer:'PORTAL DATA', aiAnswer:'EXTERNAL AI · PUTER / GEMINI', wait:'Preparing an external AI answer…',
    notFound:'No direct verified answer was found in the displayed portal data. Select Connected AI for a broader informational answer or use web search.',
    guard:'This request is not sent to external AI because it may contain non-public or sensitive information.',
    search:'Search web', download:'Export', clear:'Clear',
    privacy:'Connected AI uses Puter.js / Google Gemini. Do not enter personal, confidential, tax, contractual or other non-public information. External answers are informational and must be verified.',
    externalError:'The external AI service is temporarily unavailable or user access was not completed. Verified portal-data answers remain available.',
    providerNotice:'External answer provided through Puter.js / Google Gemini; service use may require Puter sign-in.',
    welcome:'Ask about public portal data in verified mode, or select Connected AI for broader informational questions.'
  } : {
    portal:'Provjereni podatci portala', ai:'Povezani AI', preparing:'AI se priprema…', active:'AI aktivan · Puter / Gemini', unavailable:'AI nije dostupan',
    question:'PITANJE', answer:'PODATCI PORTALA', aiAnswer:'VANJSKI AI · PUTER / GEMINI', wait:'Pripremam vanjski AI odgovor…',
    notFound:'U prikazanim javnim podatcima portala nije pronađen izravan provjerljiv odgovor. Odaberite Povezani AI za širi informativni odgovor ili koristite web pretragu.',
    guard:'Zahtjev nije poslan vanjskom AI-u jer može sadržavati nejavne ili osjetljive podatke.',
    search:'Pretraži web', download:'Izvezi', clear:'Očisti',
    privacy:'Povezani AI koristi Puter.js / Google Gemini. Ne upisujte osobne, povjerljive, porezne, ugovorne ni druge nejavne podatke. Vanjski odgovori su informativni i moraju se provjeriti.',
    externalError:'Vanjska AI usluga trenutačno nije dostupna ili korisnički pristup nije dovršen. Odgovori iz provjerenih podataka portala i dalje su dostupni.',
    providerNotice:'Vanjski odgovor pružen je putem Puter.js / Google Gemini; korištenje može zahtijevati Puter prijavu.',
    welcome:'Pitajte o javnim podatcima portala u provjerenom načinu ili odaberite Povezani AI za šira informativna pitanja.'
  };
  const format = (value, currency = 'USD') => value == null ? '—' : new Intl.NumberFormat(isEn() ? 'en-GB' : 'hr-HR', { style:'currency', currency, maximumFractionDigits:2 }).format(Number(value));
  const percent = value => value == null ? '—' : `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
  const route = (hr, en) => isEn() ? en : hr;
  const source = (label, href) => [{ label, href }];

  async function get(name) {
    try {
      const response = await fetch('/data/' + name + '?v=' + Date.now(), { cache:'no-store' });
      return response.ok ? response.json() : null;
    } catch (_) { return null; }
  }
  function badge() {
    const el = $('deskAiBadge');
    const button = document.querySelector('.desk-switch button[data-mode="ai"]');
    if (!el) return;
    const available = Boolean(S.ready && S.cfg && S.cfg.enabled && S.cfg.provider === 'puter');
    el.textContent = available ? L().active : (S.cfg ? L().unavailable : L().preparing);
    el.className = available ? 'ai-live' : 'ai-ready';
    if (button) button.disabled = !available;
    if (!available && S.mode === 'ai') S.mode = 'portal';
  }
  async function prepare() {
    const files = ['desk_public_config.json','market.json','stablecoins.json','exchange_compare.json','market_indices.json','daily_market_brief.json','news.json'];
    const values = await Promise.all(files.map(get));
    S.cfg = values[0] || { enabled:false };
    S.data = { coins:values[1], stable:values[2], exchanges:values[3], indices:values[4], brief:values[5], news:values[6] };
    S.ready = true;
    badge();
  }
  function add(role, text, label, sources = [], extra = '') {
    const box = $('deskTranscript');
    if (!box) return;
    const links = sources.length ? `<div class="desk-source">${sources.map(item => `<a href="${esc(item.href)}" target="_blank" rel="noopener">${esc(item.label)}</a>`).join(' · ')}</div>` : '';
    box.insertAdjacentHTML('beforeend', `<div class="desk-message ${role} ${extra}">${label ? `<span class="desk-message-label">${esc(label)}</span>` : ''}${esc(text)}${links}</div>`);
    box.scrollTop = box.scrollHeight;
    S.log.push({ role, label, text });
  }
  function local(question) {
    const low = question.toLowerCase(), d = S.data, english = isEn();
    if (/stable|usdt|usdc|eurc|dai/.test(low)) {
      const rows = d.stable?.stablecoins || [];
      const top = rows.slice().sort((a, b) => (b.abs_deviation_percent || 0) - (a.abs_deviation_percent || 0))[0];
      return { text: english ? `The Stablecoin Monitor shows ${rows.length} observed tokens.${top ? ` The largest displayed reference-currency deviation is ${top.symbol} (${Number(top.deviation_percent).toFixed(4)}%).` : ''} This is market information, not a reserve or redemption assessment.` : `Stablecoin Monitor prikazuje ${rows.length} promatranih tokena.${top ? ` Najveće prikazano odstupanje od referentne valute ima ${top.symbol} (${Number(top.deviation_percent).toFixed(4)}%).` : ''} To je tržišna informacija, a ne procjena rezervi ili otkupivosti.`, sources: source('Market Intelligence', route('/trzista/','/en/markets/')) };
    }
    if (/burz|exchange|binance|coinbase|kraken|spread/.test(low)) {
      const rows = d.exchanges?.exchanges || [], top = rows[0];
      return { text: english ? `The exchange panel contains ${rows.length} monitored BTC ticker observations.${top ? ` The top displayed venue by reported volume is ${top.exchange}.` : ''} This is not an exchange recommendation.` : `Panel burzi sadrži ${rows.length} praćenih BTC ticker opažanja.${top ? ` Vodeće prikazano mjesto prema prijavljenom volumenu je ${top.exchange}.` : ''} To nije preporuka burze.`, sources: source('Market Intelligence', route('/trzista/','/en/markets/')) };
    }
    if (/indeks|index|nasdaq|dax|stoxx|ftse|nikkei/.test(low)) {
      const rows = d.indices?.indices || [], best = rows.filter(item => item.change_percent != null).sort((a, b) => b.change_percent - a.change_percent)[0];
      return { text: english ? `The global-index display contains ${rows.length} markets.${best ? ` The strongest displayed session movement is ${best.label} (${percent(best.change_percent)}).` : ''} Values may be delayed.` : `Prikaz globalnih indeksa sadrži ${rows.length} tržišta.${best ? ` Najjače prikazano kretanje sesije ima ${best.label} (${percent(best.change_percent)}).` : ''} Vrijednosti mogu biti odgođene.`, sources: source('Market Intelligence', route('/trzista/','/en/markets/')) };
    }
    if (/bitcoin|btc|ethereum|eth|solana|xrp|coin|digital/.test(low)) {
      const rows = (d.coins?.coins || []).slice(0, 4).map(item => `${item.symbol} ${format(item.prices?.usd)} (${percent(item.changes_24h?.usd)})`).join(', ');
      return { text: english ? `Displayed digital-asset observations: ${rows}. The public market table is designed for a five-minute information cycle.` : `Prikazana opažanja digitalne imovine: ${rows}. Javna tržišna tablica predviđena je za petominutni informativni ciklus.`, sources: source('Digital Assets', route('/trzista/','/en/markets/')) };
    }
    if (/prihod|revenue|504|kapital|aktiva|asset|equity|obvez/.test(low)) return { text: english ? 'The displayed FY 2025 profile reports EUR 504.00 million in revenue, EUR 46.40 million in assets and EUR 46.21 million in capital and reserves, with no displayed long-term liabilities.' : 'Prikazani profil za FY 2025 navodi 504,00 mil. EUR prihoda, 46,40 mil. EUR aktive i 46,21 mil. EUR kapitala i rezervi, bez prikazanih dugoročnih obveza.', sources: source(english ? 'Financial profile' : 'Financijski profil', route('/financije/','/en/finance/')) };
    if (/vijest|news|media|objav/.test(low)) {
      const count = Array.isArray(d.news) ? d.news.length : 0;
      return { text: english ? `The current public news dataset contains ${count} displayed items. News and market refresh processes are maintained separately.` : `Trenutačni javni skup vijesti sadrži ${count} prikazanih stavki. Osvježavanje vijesti i tržišnih podataka odvija se odvojeno.`, sources: source(english ? 'Public sources' : 'Javni izvori', route('/registri/','/en/registries/')) };
    }
    if (/tehnolog|technology|umjet|\bai\b|software|platform/.test(low)) return { text: english ? 'The technology profile covers artificial intelligence, software platforms, analytics, digital assets and cybersecurity.' : 'Tehnološki profil obuhvaća umjetnu inteligenciju, softverske platforme, analitiku, digitalnu imovinu i kibernetičku sigurnost.', sources: source(english ? 'Technology' : 'Tehnologija', route('/tehnologija/','/en/technology/')) };
    return null;
  }
  function protectedInput(question) {
    return /(oib|iban|swift|putovnic|passport|lozink|password|api[ -]?key|secret|porezn|ugovor|contract|osobn|privatn|nejavn)/i.test(question);
  }
  function publicContext() {
    const coins = (S.data.coins?.coins || []).slice(0,4).map(item => `${item.symbol}: ${format(item.prices?.usd)} (${percent(item.changes_24h?.usd)})`).join(', ');
    const stable = (S.data.stable?.stablecoins || []).slice(0,4).map(item => `${item.symbol}: ${Number(item.deviation_percent || 0).toFixed(4)}%`).join(', ');
    return isEn() ? `Public portal observations available if relevant: digital assets ${coins}; stablecoin deviations ${stable}.` : `Javna opažanja portala, samo ako su relevantna: digitalna imovina ${coins}; odstupanja stablecoina ${stable}.`;
  }
  function loadPuter() {
    if (window.puter?.ai?.chat) return Promise.resolve(window.puter);
    if (S.puterPromise) return S.puterPromise;
    S.puterPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = S.cfg?.library_url || 'https://js.puter.com/v2/';
      script.async = true;
      script.dataset.gnkPuter = 'true';
      script.onload = () => window.puter?.ai?.chat ? resolve(window.puter) : reject(new Error('Puter AI unavailable'));
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return S.puterPromise;
  }
  function responseText(result) {
    if (typeof result === 'string') return result;
    if (typeof result?.message?.content === 'string') return result.message.content;
    if (Array.isArray(result?.message?.content)) return result.message.content.map(item => item.text || '').join('\n').trim();
    if (typeof result?.text === 'string') return result.text;
    return String(result || '').trim();
  }
  async function connected(question) {
    if (protectedInput(question)) return { text:L().guard, sources:[] };
    if (!S.ready || !S.cfg?.enabled || S.cfg.provider !== 'puter') return { text:L().externalError, sources:[] };
    try {
      const puter = await loadPuter();
      const system = isEn() ? 'You are GNK ASG Intelligence Desk external AI mode. Answer in English, clearly and professionally. Answers are informational only. Do not request confidential information.' : 'Vi ste vanjski AI način GNK ASG Intelligence Deska. Odgovarajte na hrvatskom jeziku, jasno i profesionalno. Odgovori su informativni. Ne tražite povjerljive podatke.';
      const prompt = `${system}\n\n${publicContext()}\n\n${isEn() ? 'User question' : 'Pitanje korisnika'}: ${question}`;
      const result = await puter.ai.chat(prompt, { model:S.cfg.model || 'gemini-2.5-flash-lite', temperature:0.35, max_tokens:900 });
      const output = responseText(result);
      if (!output) throw new Error('No AI response');
      return { text:`${output}\n\n${L().providerNotice}`, sources:[] };
    } catch (_) { return { text:L().externalError, sources:[] }; }
  }
  async function ask(question) {
    const q = String(question || '').trim();
    if (!q) return;
    add('user', q, L().question);
    $('deskInput').value = '';
    if (S.mode === 'ai' && protectedInput(q)) {
      add('bot', L().guard, L().aiAnswer, [], 'ai');
      return;
    }
    const known = local(q);
    if (S.mode === 'portal' || known) {
      const answer = known || { text:L().notFound, sources:[] };
      add('bot', answer.text, L().answer, answer.sources);
      return;
    }
    add('bot', L().wait, '', [], 'wait');
    const answer = await connected(q);
    document.querySelector('.desk-message.wait')?.remove();
    add('bot', answer.text, L().aiAnswer, answer.sources, 'ai');
  }
  function setMode(mode) {
    if (mode === 'ai' && !S.ready) return;
    S.mode = mode;
    document.querySelectorAll('.desk-switch button').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
  }
  function enhance() {
    const oldForm = $('deskForm'), box = $('deskTranscript'), status = $('deskStatus'), panel = $('deskPanel');
    if (!oldForm || !box) return false;
    if (document.querySelector('.desk-switch')) return true;
    const form = oldForm.cloneNode(true);
    oldForm.replaceWith(form);
    box.innerHTML = '';
    S.log = [];
    const toggle = document.createElement('div');
    toggle.className = 'desk-switch';
    toggle.innerHTML = `<button class="active" type="button" data-mode="portal">${esc(L().portal)}</button><button type="button" data-mode="ai" disabled>${esc(L().ai)}</button>`;
    box.before(toggle);
    toggle.querySelectorAll('button').forEach(button => { button.onclick = () => setMode(button.dataset.mode); });
    status?.insertAdjacentHTML('beforeend', `<span id="deskAiBadge" class="ai-ready">${esc(L().preparing)}</span>`);
    const tools = document.createElement('div');
    tools.className = 'desk-tools';
    tools.innerHTML = `<button type="button" id="deskSearch">${esc(L().search)}</button><button type="button" id="deskDownload">${esc(L().download)}</button><button type="button" id="deskClear">${esc(L().clear)}</button>`;
    form.after(tools);
    $('deskSearch').onclick = () => window.open('https://www.google.com/search?q=' + encodeURIComponent($('deskInput').value || S.log.filter(item => item.role === 'user').slice(-1)[0]?.text || 'GNK ASG'), '_blank', 'noopener');
    $('deskDownload').onclick = () => {
      const blob = new Blob([S.log.map(item => (item.label || item.role) + ': ' + item.text).join('\n\n')], { type:'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'GNK_ASG_Intelligence_Desk.txt';
      link.click();
      URL.revokeObjectURL(link.href);
    };
    $('deskClear').onclick = () => { box.innerHTML = ''; S.log = []; add('bot', L().welcome, L().answer); };
    panel?.insertAdjacentHTML('beforeend', `<div class="desk-privacy">${esc(L().privacy)}</div>`);
    form.addEventListener('submit', event => { event.preventDefault(); ask($('deskInput').value); });
    document.querySelectorAll('#deskQuick button').forEach(button => { button.onclick = () => ask(button.textContent); });
    add('bot', L().welcome, L().answer);
    badge();
    return true;
  }
  function updateLabels() {
    const toggle = document.querySelector('.desk-switch');
    if (!toggle) return;
    toggle.querySelector('[data-mode="portal"]').textContent = L().portal;
    toggle.querySelector('[data-mode="ai"]').textContent = L().ai;
    const privacy = document.querySelector('.desk-privacy');
    if (privacy) privacy.textContent = L().privacy;
    if ($('deskSearch')) $('deskSearch').textContent = L().search;
    if ($('deskDownload')) $('deskDownload').textContent = L().download;
    if ($('deskClear')) $('deskClear').textContent = L().clear;
    badge();
  }
  function init() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (enhance()) {
        clearInterval(timer);
        prepare();
      } else if (attempts > 100) clearInterval(timer);
    }, 60);
    window.addEventListener('gnk-language-change', updateLabels);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
