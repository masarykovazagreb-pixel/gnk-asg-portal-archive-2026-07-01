(() => {
  'use strict';

  let marketData = null;
  let storedStatus = null;
  let liveMarketState = null;
  let latestNews = [];
  let verified = false;

  const WHATSAPP = 'https://wa.me/385916104398';
  const CONTACT = '/kontakt/';
  const DESK = '#assistant';
  const NEWS = '#news';

  const lang = () => ((window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en') || /\/en\/?$/.test(location.pathname)) ? 'en' : 'hr';
  const minutesOld = value => value ? Math.max(0, (Date.now() - new Date(value).getTime()) / 60000) : Infinity;
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

  const labels = {
    hr: {
      aria: 'Otvori ASG Bot asistenta',
      title: 'ASG Bot',
      subtitle: 'PLUTAJUĆI POMOĆNIK',
      intro: 'Koga trebate? Odaberite temu ispod (1–5) ili upišite pitanje: projekti, mediji, tržišta, ideje ili tehnička podrška. Ako ništa od ponuđenog ne odgovara, uputit ću vas na izravan kontakt.',
      send: 'PITAJ',
      placeholder: 'Upišite pitanje, državu ili temu…',
      chips: ['1. Projekti', '2. AKTUAL MEDIA', '3. Puls Tržišta', '4. Ideje u djelovanju', '5. IT / tehnička podrška', 'Vijesti po zemljama', 'Financije', 'Kontakt'],
      full: 'Puni ASG Bot',
      contact: 'Kontakt',
      whatsapp: 'WhatsApp',
      research: 'Google News',
      web: 'Google',
      empty: 'Upišite pitanje, državu, regiju ili odaberite jednu od brzih tema.',
      source: 'Informativni odgovor na temelju javnih podataka portala i javne pretrage. Za službenu komunikaciju koristite kontakt kanal.',
      verified: 'ASG BOT · JAVNI PODATCI AŽURIRANI',
      checking: 'ASG BOT · PROVJERA AŽURIRANJA',
      action: 'Za slanje upita otvorite WhatsApp ili kontakt stranicu. Za teme izvan portala koristite Google ili Google News poveznicu.'
    },
    en: {
      aria: 'Open ASG Bot assistant',
      title: 'ASG Bot',
      subtitle: 'FLOATING HELPER',
      intro: 'Who do you need? Pick a topic below (1\u20135) or type a question: projects, media, markets, ideas or technical support. If none of these fit, I will route you to direct contact.',
      send: 'ASK',
      placeholder: 'Enter a question, country or topic…',
      chips: ['1. Projects', '2. AKTUAL MEDIA', '3. Puls Tržišta', '4. Ideje u djelovanju', '5. IT / technical support', 'News by country', 'Financials', 'Contact'],
      full: 'Full ASG Bot',
      contact: 'Contact',
      whatsapp: 'WhatsApp',
      research: 'Google News',
      web: 'Google',
      empty: 'Enter a question, country, region or select a quick topic.',
      source: 'Informational answer based on public portal data and public search. Use the contact channel for official communication.',
      verified: 'ASG BOT · PUBLIC DATA UPDATED',
      checking: 'ASG BOT · UPDATE VERIFICATION',
      action: 'To send an inquiry, open WhatsApp or the contact page. For topics outside the portal, use the Google or Google News link.'
    }
  };

  const t = () => labels[lang()];

  async function read(path) {
    try {
      const response = await fetch(path + '?v=' + Date.now(), { cache: 'no-store' });
      return response.ok ? await response.json() : null;
    } catch (_) {
      return null;
    }
  }

  function evaluate() {
    const news = storedStatus && storedStatus.news;
    const newsReady = Boolean(news && (news.status === 'ok' || news.status === 'degraded') && Number(news.public_items || 0) > 0 && minutesOld(news.checked_at || news.updated_at) <= 95);
    const publishedMarket = storedStatus && storedStatus.fast_market;
    const directMarketReady = Boolean(liveMarketState && liveMarketState.ok && minutesOld(liveMarketState.updated_at) <= 30);
    const fallbackMarketReady = Boolean(publishedMarket && minutesOld(publishedMarket.updated_at || publishedMarket.checked_at) <= 45 && publishedMarket.status !== 'failed');
    verified = newsReady && (directMarketReady || fallbackMarketReady || Boolean(latestNews.length));
    paintStatus();
  }

  async function refreshVerifiedState() {
    const values = await Promise.all([read('/data/update_status.json'), read('/data/fast_market_status.json'), read('/data/news.json')]);
    storedStatus = values[0] || {};
    storedStatus.fast_market = values[1] || null;
    latestNews = Array.isArray(values[2]) ? values[2] : [];
    evaluate();
  }

  function paintStatus() {
    const button = document.getElementById('aiFab');
    const badge = document.querySelector('#aiMini .ai-mini-status');
    const text = verified ? t().verified : t().checking;
    if (button) {
      button.classList.toggle('is-verified', verified);
      button.title = text;
      button.setAttribute('data-status', verified ? 'verified' : 'checking');
    }
    if (badge) {
      badge.classList.toggle('is-verified', verified);
      badge.textContent = text;
    }
  }

  function money(value, unit) {
    if (value == null) return '—';
    return new Intl.NumberFormat(lang() === 'en' ? 'en-US' : 'hr-HR', { maximumFractionDigits: 2 }).format(Number(value)) + ' ' + unit;
  }

  function setResearchLink(query) {
    const q = clean(query) || 'GNK ASG d.o.o. GNK DINAMO Ltd.';
    const search = document.getElementById('aiResearchLink');
    if (search) search.href = 'https://news.google.com/search?q=' + encodeURIComponent(q);
    const web = document.getElementById('aiWebLink');
    if (web) web.href = 'https://www.google.com/search?q=' + encodeURIComponent(q);
    const wa = document.getElementById('aiWhatsAppLink');
    if (wa) {
      const message = lang() === 'en'
        ? 'Hello, I am contacting GNK ASG d.o.o. regarding: ' + q
        : 'Pozdrav, kontaktiram GNK ASG d.o.o. u vezi teme: ' + q;
      wa.href = WHATSAPP + '?text=' + encodeURIComponent(message);
    }
  }

  function detectGroup(question) {
    const q = String(question || '').toLowerCase();
    if (/hrvats|croatia|zagreb/.test(q)) return 'hrvatska';
    if (/sloven|ljubljan/.test(q)) return 'slovenija';
    if (/srb|serbia|beograd|belgrad/.test(q)) return 'srbija';
    if (/bih|bosn|herceg|sarajev/.test(q)) return 'bih';
    if (/sport|košark|kosark|tenis|nogomet|football|basket|tennis/.test(q)) return 'sport';
    if (/tehnolog|technology|ai|umjet|software|cyber|cloud|robot/.test(q)) return 'technology';
    if (/digital|crypto|kripto|bitcoin|blockchain|ethereum/.test(q)) return 'digital-assets';
    if (/mobilnost|mobility|auto|vehicle|vozil|electric/.test(q)) return 'mobilnost';
    if (/global|international|međunar|medunar|world|usa|america|europe|eu/.test(q)) return 'international';
    return null;
  }

  function groupLabel(group) {
    const hr = {hrvatska:'Hrvatska', slovenija:'Slovenija', srbija:'Srbija', bih:'BiH', sport:'Sport', technology:'Tehnologija', 'digital-assets':'Digitalna imovina', mobilnost:'Mobilnost', international:'Međunarodno'};
    const en = {hrvatska:'Croatia', slovenija:'Slovenia', srbija:'Serbia', bih:'BiH', sport:'Sport', technology:'Technology', 'digital-assets':'Digital assets', mobilnost:'Mobility', international:'International'};
    return (lang() === 'en' ? en : hr)[group] || group;
  }

  function newsGroupsSummary() {
    const counts = {};
    latestNews.forEach(item => {
      const g = item.group || 'other';
      counts[g] = (counts[g] || 0) + 1;
    });
    const wanted = ['hrvatska', 'slovenija', 'srbija', 'bih', 'international', 'sport', 'technology', 'digital-assets', 'mobilnost'];
    const parts = wanted.filter(g => counts[g]).map(g => groupLabel(g) + ': ' + counts[g]);
    return parts.length ? parts.join(' · ') : (lang() === 'en' ? 'The public news set is loading.' : 'Javni skup vijesti se učitava.');
  }

  function newsAnswer(question) {
    const en = lang() === 'en';
    const group = detectGroup(question);
    if (!latestNews.length) {
      return en
        ? 'The news set is currently loading. Use Google News for the requested country or topic.'
        : 'Skup vijesti se trenutačno učitava. Koristite Google News za traženu državu ili temu.';
    }
    if (!group) {
      return en
        ? 'Available public news groups: ' + newsGroupsSummary() + '. Ask for a country or topic, for example Croatia, Slovenia, Serbia, BiH, international markets, sport, technology or digital assets.'
        : 'Dostupne javne grupe vijesti: ' + newsGroupsSummary() + '. Pitajte za državu ili temu, primjerice Hrvatska, Slovenija, Srbija, BiH, međunarodno tržište, sport, tehnologija ili digitalna imovina.';
    }
    const items = latestNews.filter(item => item.group === group).slice(0, 3);
    if (!items.length) {
      return en
        ? 'No current item is visible in the public window for ' + groupLabel(group) + '. Open Google News for a wider public search.'
        : 'U javnom prozoru trenutačno nema vidljive stavke za ' + groupLabel(group) + '. Otvorite Google News za širu javnu pretragu.';
    }
    const titles = items.map((item, index) => (index + 1) + '. ' + clean(item.title)).join('\n');
    return en
      ? 'Latest visible public items for ' + groupLabel(group) + ':\n' + titles
      : 'Zadnje vidljive javne stavke za ' + groupLabel(group) + ':\n' + titles;
  }

  function menuTopicAnswer(q) {
    const en = lang() === 'en';
    const trimmed = q.trim();

    const num = trimmed.match(/^([1-5])\b/);
    const isProjects = (num && num[1] === '1') || /projekt|project/.test(q);
    const isMedia = (num && num[1] === '2') || /aktual|media|medij/.test(q);
    const isMarkets = (num && num[1] === '3') || /puls tr[žz]i[šs]t|puls-trzista/.test(q);
    const isIdeas = (num && num[1] === '4') || /ideje u djelovanju|ideje-u-djelovanju/.test(q);
    const isIT = (num && num[1] === '5') || /\bit\b|tehni[čc]ka podr[šs]ka|technical support|podr[šs]ka|support/.test(q);

    if (isProjects) {
      return en
        ? '1. Projects \u2014 GNK ASG runs a nine-project strategic portfolio spanning healthcare, sports tech, fintech, a digital gold instrument, an international university, food, industrial production, energy trading and THE CODE integration. Full detail: /projects/'
        : '1. Projekti \u2014 GNK ASG vodi strate\u0161ki portfelj od devet projekata: zdravstvo, sportski sustavi, fintech, digitalni instrument i zlato, me\u0111unarodno sveu\u010dili\u0161te, hrana, industrijska proizvodnja, energetska trgovina i THE CODE integracija. Puni detalji: /projects/';
    }
    if (isMedia) {
      return en
        ? '2. AKTUAL MEDIA \u2014 the portal\u2019s live news aggregator: business, world, technology and market news from public sources, updated continuously. Open: /gnk-aktual/'
        : '2. AKTUAL MEDIA \u2014 u\u017eivo agregator vijesti portala: poslovne, svjetske, tehnolo\u0161ke i tr\u017ei\u0161ne vijesti iz javnih izvora, a\u017eurira se kontinuirano. Otvorite: /gnk-aktual/';
    }
    if (isMarkets) {
      return en
        ? '3. Puls Tr\u017ei\u0161ta \u2014 live world indices, stocks, commodities, currencies and crypto from public data sources, refreshed hourly. Open: /puls-trzista/'
        : '3. Puls Tr\u017ei\u0161ta \u2014 u\u017eivo svjetski indeksi, dionice, roba, valute i kripto iz javnih izvora, osvje\u017eava se svaki sat. Otvorite: /puls-trzista/';
    }
    if (isIdeas) {
      return en
        ? '4. Ideje u djelovanju \u2014 a look at ideas the Group is actively turning into practice. Open: /ideje-u-djelovanju/'
        : '4. Ideje u djelovanju \u2014 pregled ideja koje Grupa aktivno pretvara u praksu. Otvorite: /ideje-u-djelovanju/';
    }
    if (isIT) {
      return en
        ? '5. IT / technical support \u2014 for technical issues or IT questions, email it@gnk-asg.hr or use the contact page for phone numbers: /contact/'
        : '5. IT / tehni\u010dka podr\u0161ka \u2014 za tehni\u010dka pitanja ili IT upite pi\u0161ite na it@gnk-asg.hr ili koristite kontakt stranicu za brojeve telefona: /kontakt/';
    }
    return null;
  }

  function answer(question) {
    const q = String(question || '').toLowerCase();
    const en = lang() === 'en';
    if (!q.trim()) return t().empty;

    const menuHit = menuTopicAnswer(q);
    if (menuHit) return menuHit;

    if (/vijest|news|držav|drzav|zemlj|country|region|hrvats|croatia|sloven|srb|serbia|bih|bosn|international|global|sport|technology|tehnolog|digital|crypto|mobilnost|mobility/.test(q)) {
      return newsAnswer(question);
    }
    if (/kontakt|contact|whatsapp|telefon|phone|mail|email|poruk/.test(q)) {
      return en
        ? 'Use the contact page or WhatsApp for the fastest communication. The active WhatsApp number is +385 91 610 4398. Other regional and US contact numbers, plus the IT e-mail address, are listed on the contact page: /contact/'
        : 'Za najbržu komunikaciju otvorite kontakt stranicu ili WhatsApp. Aktivni WhatsApp broj je +385 91 610 4398. Ostali regionalni i američki brojevi, kao i IT e-mail adresa, nalaze se na kontakt stranici: /kontakt/';
    }
    if (/prihod|revenue|504|financ|bilanc|asset|kapital|obvez|equity|liabil/.test(q)) {
      return en
        ? 'The portal presents GNK ASG d.o.o. FY 2025 indicators, including EUR 504.00 million revenue, EUR 46.40 million assets, EUR 46.21 million capital and reserves, and no long-term liabilities.'
        : 'Portal prikazuje pokazatelje GNK ASG d.o.o. za FY 2025: 504,00 mil. EUR prihoda, 46,40 mil. EUR aktive, 46,21 mil. EUR kapitala i rezervi te bez dugoročnih obveza.';
    }
    if (/btc|bitcoin|kripto|crypto|zlato|gold|naft|oil|trži|market|digital/.test(q)) {
      if (marketData && marketData.assets) {
        const a = marketData.assets;
        return en
          ? 'Indicative market display: Bitcoin ' + money(a.btc && a.btc.current, 'USD/BTC') + ', gold ' + money(a.gold && a.gold.current, 'USD/oz') + ', Brent oil ' + money(a.oil && a.oil.current, 'USD/barrel') + '.'
          : 'Indikativni tržišni prikaz: Bitcoin ' + money(a.btc && a.btc.current, 'USD/BTC') + ', zlato ' + money(a.gold && a.gold.current, 'USD/unca') + ', Brent nafta ' + money(a.oil && a.oil.current, 'USD/barel') + '.';
      }
      return en ? 'Open the Market Monitor for digital assets and public market indicators.' : 'Otvorite Market Monitor za digitalnu imovinu i javne tržišne pokazatelje.';
    }
    if (/dokumen|document|registr|izvješ|izvjest|report|seo|meta/.test(q)) {
      return en
        ? 'Documents, registries, public data and SEO context are grouped on the portal so users and search engines can understand the public corporate profile.'
        : 'Dokumenti, registri, javni podatci i SEO kontekst grupirani su na portalu kako bi korisnici i tražilice razumjeli javni korporativni profil.';
    }
    if (/ai|al|desk|intelligence|umjet|tehnolog|software|portal/.test(q)) {
      return en
        ? 'ASG Bot is the portal helper for public information, technology, finance, market panels, country news and contact routing. A later backend version can provide fully open AI answers from outside sources under defined authorization rules.'
        : 'ASG Bot je pomoćnik portala za javne informacije, tehnologiju, financije, tržišne panele, vijesti po državama i kontakt. Kasnija backend verzija može davati potpuno otvorene AI odgovore iz vanjskih izvora prema definiranim ovlastima.';
    }
    return en
      ? 'None of the topic options seem to match. For direct help, e-mail it@gnk-asg.hr or open the contact page for phone numbers and WhatsApp: /contact/. I can also route general topics to public web and news search using the Google buttons below.'
      : 'Čini se da ništa od ponuđenih tema ne odgovara. Za izravnu pomoć pišite na it@gnk-asg.hr ili otvorite kontakt stranicu za brojeve telefona i WhatsApp: /kontakt/. Opće teme mogu usmjeriti i na javnu web i news pretragu preko Google gumba ispod.';
  }

  async function smartAnswer(query) {
    try {
      const response = await fetch('/api/intelligence-desk-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: query })
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data && data.ok && data.reply) return data.reply;
    } catch (_) {}
    return answer(query);
  }

  let messages = [];

  function renderThread() {
    const thread = document.getElementById('aiMiniThread');
    if (!thread) return;
    thread.innerHTML = messages.map(m => {
      const cls = m.role === 'user' ? 'ai-msg ai-msg-user' : 'ai-msg ai-msg-bot' + (m.pending ? ' pending' : '');
      const text = m.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<div class="${cls}">${text}</div>`;
    }).join('');
    thread.scrollTop = thread.scrollHeight;
  }

  async function setResult(query) {
    const q = clean(query);
    if (!q) return;
    setResearchLink(query);
    messages.push({ role: 'user', text: q });
    messages.push({ role: 'bot', text: '…', pending: true });
    renderThread();
    const text = await smartAnswer(query);
    messages[messages.length - 1] = { role: 'bot', text: text + '\n\n' + t().source };
    renderThread();
  }

  function render() {
    const c = t();
    const button = document.getElementById('aiFab');
    const panel = document.getElementById('aiMini');
    if (!button || !panel) return;
    button.setAttribute('aria-label', c.aria);
    button.innerHTML = '<span class="ai-fab-mark">ASG</span><span class="ai-fab-label">ASG Bot</span><span class="ai-fab-dot"></span>';
    panel.innerHTML = '<div class="ai-mini-head"><div><small>' + c.subtitle + '</small><strong>' + c.title + '</strong></div><button type="button" class="ai-mini-close" aria-label="Close">×</button></div><div class="ai-mini-status"></div><div class="ai-mini-body"><p class="ai-mini-intro">' + c.intro + '</p><div class="ai-mini-chips">' + c.chips.map(item => '<button type="button">' + item + '</button>').join('') + '</div><div class="ai-mini-thread" id="aiMiniThread"></div><form class="ai-mini-form"><input autocomplete="off" placeholder="' + c.placeholder + '"><button type="submit">' + c.send + '</button></form><div class="ai-mini-links"><a class="ai-full-link" href="' + DESK + '">' + c.full + '</a><a class="ai-research-link" id="aiWhatsAppLink" target="_blank" rel="noopener nofollow" href="' + WHATSAPP + '">' + c.whatsapp + '</a><a class="ai-research-link" href="' + CONTACT + '">' + c.contact + '</a><a class="ai-research-link" id="aiResearchLink" target="_blank" rel="noopener nofollow" href="https://news.google.com/">' + c.research + '</a><a class="ai-research-link" id="aiWebLink" target="_blank" rel="noopener nofollow" href="https://www.google.com/">' + c.web + '</a></div></div>';
    panel.querySelector('.ai-mini-close').onclick = close;
    panel.querySelector('.ai-full-link').onclick = close;
    panel.querySelectorAll('.ai-mini-chips button').forEach(chip => chip.onclick = () => setResult(chip.textContent));
    panel.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const input = panel.querySelector('input');
      const value = input.value;
      input.value = '';
      setResult(value);
    };
    setResearchLink('GNK ASG d.o.o. GNK DINAMO Ltd.');
    paintStatus();
  }

  function open() {
    document.getElementById('aiMini')?.classList.add('open');
    document.getElementById('aiBackdrop')?.classList.add('open');
    setTimeout(() => document.querySelector('#aiMini input')?.focus(), 80);
  }

  function close() {
    document.getElementById('aiMini')?.classList.remove('open');
    document.getElementById('aiBackdrop')?.classList.remove('open');
  }

  async function init() {
    if (document.getElementById('aiFab')) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'ai-mini-backdrop';
    backdrop.id = 'aiBackdrop';
    backdrop.onclick = close;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ai-fab';
    button.id = 'aiFab';
    button.onclick = open;
    const panel = document.createElement('aside');
    panel.className = 'ai-mini';
    panel.id = 'aiMini';
    document.body.append(backdrop, button, panel);
    render();
    if (!sessionStorage.getItem('gnk-asg-bot-greeted')) {
      try {
        sessionStorage.setItem('gnk-asg-bot-greeted', '1');
        const greet = document.createElement('div');
        greet.id = 'aiFabGreeting';
        const greetLang = (document.documentElement.lang || 'hr').toLowerCase().startsWith('en');
        greet.textContent = greetLang ? "Hi, I'm your AI assistant \uD83D\uDC4B" : 'Ja sam vaš pomoćni bot \uD83D\uDC4B';
        greet.style.cssText = 'position:fixed;z-index:2147483000;right:24px;bottom:96px;max-width:220px;padding:12px 16px;background:#0b2345;color:#fff;border:1px solid rgba(212,175,55,.5);border-radius:14px 14px 4px 14px;font:700 13px/1.4 Arial,sans-serif;box-shadow:0 14px 32px rgba(0,0,0,.3);opacity:0;transform:translateY(8px);transition:opacity .35s ease,transform .35s ease;pointer-events:none';
        document.body.appendChild(greet);
        requestAnimationFrame(() => { greet.style.opacity = '1'; greet.style.transform = 'translateY(0)'; });
        window.setTimeout(() => {
          greet.style.opacity = '0'; greet.style.transform = 'translateY(8px)';
          window.setTimeout(() => greet.remove(), 400);
        }, 4500);
      } catch (_) {}
    }
    window.addEventListener('gnk-live-market-refresh', event => { liveMarketState = event.detail || null; evaluate(); });
    try {
      const response = await fetch('/data/macro_market.json?v=' + Date.now(), { cache: 'no-store' });
      if (response.ok) marketData = await response.json();
    } catch (_) {}
    refreshVerifiedState();
    window.setInterval(refreshVerifiedState, 300000);
    window.addEventListener('gnk-language-change', render);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
