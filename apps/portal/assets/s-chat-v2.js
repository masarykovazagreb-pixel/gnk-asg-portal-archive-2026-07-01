/* GNK ASG S+Chat — klijent.
   Pravi razgovor: tok odgovora dolazi kao Server-Sent Events, povijest
   živi u ovom pregledniku, a svaki odgovor nosi poveznice na izvor. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const app = $('scApp');
  if (!app) return;

  const el = {
    thread: $('scThread'),
    welcome: $('scWelcome'),
    scroll: $('scScroll'),
    form: $('scForm'),
    input: $('scInput'),
    send: $('scSend'),
    stop: $('scStop'),
    status: $('scStatus'),
    dot: $('scDot'),
    mode: $('scMode'),
    counter: $('scCounter'),
    newBtn: $('scNew'),
    exportBtn: $('scExport'),
    historyList: $('scHistoryList'),
    historyEmpty: $('scHistoryEmpty'),
    rail: $('scRail'),
    railToggle: $('scRailToggle'),
    kbCount: $('scKbCount'),
    context: $('scContext'),
    contextPath: $('scContextPath'),
    contextClear: $('scContextClear'),
  };

  const STORE = 'gnk-s-chat-v2';
  const MAX_CHARS = 800;
  const ENDPOINT = '/api/s-chat';
  const HEALTH = '/api/s-chat/health';
  const LANG = (document.documentElement.lang || 'hr').toLowerCase().startsWith('en') ? 'en' : 'hr';

  /* Stranica s koje je razgovor otvoren ("/s-chat/?ctx=/gnk-aktual/").
     Prihvaćamo samo putanju bez upita; agent je ionako provjerava prema
     bazi, pa nepoznata putanja ne mijenja ništa. */
  const CONTEXT_PATTERN = /^\/[a-z0-9][a-z0-9\-_/]*$/i;
  function readContext() {
    try {
      const raw = new URLSearchParams(window.location.search).get('ctx') || '';
      const path = raw.trim();
      if (!path || path.length > 120 || !CONTEXT_PATTERN.test(path)) return '';
      return path;
    } catch { return ''; }
  }
  let contextPath = readContext();

  const T = LANG === 'en' ? {
    ready: 'Ready', thinking: 'Thinking…', stopped: 'Stopped', offline: 'Service unavailable',
    you: 'You', bot: 'S+Chat · AI', copy: 'Copy', copied: 'Copied', retry: 'Retry', answerReady: 'Answer ready.',
    sources: 'Sources', next: 'Next', newChat: 'New chat', untitled: 'New conversation',
    caution: 'Some numbers in this answer are not confirmed in the knowledge base — check the source before use.',
    error: 'The answer did not arrive. Check your connection and try again.',
    rate: 'Too many messages. Please try again in an hour.',
    stoppedByUser: 'You stopped the answer.', empty: 'Type a question first.',
    regenerate: 'Regenerate', modeKnowledge: 'AI assistant · portal knowledge base',
    fromPage: 'From this page', general: 'Generally', pageLabel: 'Questions about the page you came from',
  } : {
    ready: 'Spremno', thinking: 'Odgovaram…', stopped: 'Zaustavljeno', offline: 'Servis nedostupan',
    you: 'Vi', bot: 'S+Chat · AI', copy: 'Kopiraj', copied: 'Kopirano', retry: 'Ponovi', answerReady: 'Odgovor je spreman.',
    sources: 'Izvori', next: 'Dalje', newChat: 'Novi razgovor', untitled: 'Novi razgovor',
    caution: 'Neke brojke u ovom odgovoru nisu potvrđene u bazi znanja — provjerite izvor prije uporabe.',
    error: 'Odgovor nije stigao. Provjerite vezu i pokušajte ponovno.',
    rate: 'Previše poruka. Pokušajte ponovno za sat vremena.',
    stoppedByUser: 'Zaustavili ste odgovor.', empty: 'Prvo napišite pitanje.',
    regenerate: 'Ponovno generiraj', modeKnowledge: 'AI asistent · baza znanja portala',
    fromPage: 'S ove stranice', general: 'Općenito', pageLabel: 'Pitanja o stranici s koje ste došli',
  };

  function renderContext() {
    if (!el.context) return;
    el.context.hidden = !contextPath;
    if (el.contextPath) el.contextPath.textContent = contextPath;
  }

  function clearContext() {
    contextPath = '';
    renderContext();
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('ctx');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {}
    el.input?.focus();
  }

  if (el.contextClear) el.contextClear.addEventListener('click', clearContext);
  renderContext();

  /* ---------------- pohrana ---------------- */

  const blank = () => ({ chats: [], activeId: null });
  let state = blank();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && Array.isArray(saved.chats)) {
      state = {
        chats: saved.chats
          .filter((chat) => chat && typeof chat.id === 'string' && Array.isArray(chat.messages))
          .slice(0, 30),
        activeId: typeof saved.activeId === 'string' ? saved.activeId : null,
      };
    }
  } catch {}

  const save = () => {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
  };
  const activeChat = () => state.chats.find((chat) => chat.id === state.activeId) || null;
  const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  function ensureChat() {
    let chat = activeChat();
    if (!chat) {
      chat = { id: newId(), title: T.untitled, createdAt: Date.now(), messages: [] };
      state.chats.unshift(chat);
      state.activeId = chat.id;
      save();
      renderHistory();
    }
    return chat;
  }

  function titleFrom(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > 52 ? `${clean.slice(0, 52)}…` : (clean || T.untitled);
  }

  /* ---------------- crtanje ---------------- */

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Minimalni, sigurni markdown: prvo escape, pa obrasci. Nijedan unos
     korisnika ne prolazi kao HTML. */
  function renderMarkdown(raw, sources = []) {
    const lines = escapeHtml(raw).split(/\n{2,}/);
    return lines.map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      const items = trimmed.split('\n').filter((line) => /^\s*[-•*]\s+/.test(line));
      if (items.length && items.length === trimmed.split('\n').length) {
        return `<ul>${items.map((line) => `<li>${inline(line.replace(/^\s*[-•*]\s+/, ''), sources)}</li>`).join('')}</ul>`;
      }
      return `<p>${inline(trimmed, sources).replace(/\n/g, '<br>')}</p>`;
    }).join('');
  }

  /* Citat [1] postaje mali broj koji vodi na izvor iz meta događaja.
     Ako izvor ne postoji, broj ostaje običan tekst — nikad lažna veza. */
  function citation(n, sources) {
    const source = sources[Number(n) - 1];
    if (!source || !source.url) return `[${n}]`;
    const href = escapeHtml(source.url);
    const label = escapeHtml(source.title || source.url);
    return `<sup class="sc-cite"><a href="${href}" rel="noopener" title="${label}" aria-label="[${n}] ${label}">${n}</a></sup>`;
  }

  function inline(text, sources = []) {
    return text
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" rel="noopener">$2</a>')
      .replace(/(^|[\s(])(\/[a-z0-9][a-z0-9\-_/]*\/)/gi, '$1<a href="$2">$2</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1<em>$2</em>')
      .replace(/\[(\d{1,2})\]/g, (match, n) => citation(n, sources));
  }

  function clearThread() {
    el.thread.querySelectorAll('.sc-msg').forEach((node) => node.remove());
  }

  function showWelcome(show) {
    if (el.welcome) el.welcome.hidden = !show;
  }

  // Čitač ekrana ne smije čitati odgovor slovo po slovo dok pristiže.
  // Zato je tok tih, a gotov odgovor se najavljuje jednom, kratko.
  function announce(text) {
    const node = $('scAnnounce');
    if (!node) return;
    node.textContent = '';
    window.setTimeout(() => { node.textContent = text; }, 30);
  }

  function scrollToEnd(smooth = true) {
    requestAnimationFrame(() => {
      el.scroll.scrollTo({ top: el.scroll.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
  }

  function messageNode(role, { text = '', sources = [], followUps = [], mode = '' } = {}) {
    const wrap = document.createElement('article');
    wrap.className = `sc-msg sc-msg-${role === 'user' ? 'user' : 'bot'}`;
    wrap.dataset.role = role;

    const head = document.createElement('div');
    head.className = 'sc-msg-head';
    const avatar = document.createElement('span');
    avatar.className = 'sc-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = role === 'user' ? T.you.charAt(0) : '✦';
    const who = document.createElement('span');
    who.textContent = role === 'user' ? T.you : T.bot;
    head.append(avatar, who);

    const bubble = document.createElement('div');
    bubble.className = 'sc-bubble';
    bubble.innerHTML = text ? renderMarkdown(text) : '<span class="sc-typing" aria-label="…"><i></i><i></i><i></i></span>';

    wrap.append(head, bubble);

    const sourcesRow = document.createElement('div');
    sourcesRow.className = 'sc-sources';
    const followRow = document.createElement('div');
    followRow.className = 'sc-follow';
    const actions = document.createElement('div');
    actions.className = 'sc-actions';

    wrap.append(sourcesRow, followRow, actions);
    el.thread.appendChild(wrap);
    setSources(wrap, sources);
    setFollowUps(wrap, followUps);

    if (mode) wrap.dataset.mode = mode;
    return wrap;
  }

  function setSources(node, sources) {
    const row = node.querySelector('.sc-sources');
    row.innerHTML = '';
    if (!sources || !sources.length) return;
    const label = document.createElement('span');
    label.className = 'sc-sources-label';
    label.textContent = T.sources;
    row.appendChild(label);
    for (const source of sources.slice(0, 4)) {
      const link = document.createElement('a');
      link.className = 'sc-source';
      link.href = source.url;
      link.rel = 'noopener';
      link.textContent = source.title || source.url.replace(/^https?:\/\//, '');
      row.appendChild(link);
    }
  }

  /* Ako agent u odgovoru navede brojku koje nema u bazi, to se kaže
     izravno — bolje upozorenje nego tiha netočnost. */
  function setCaution(node, show) {
    let note = node.querySelector('.sc-caution');
    if (!show) { if (note) note.remove(); return; }
    if (!note) {
      note = document.createElement('p');
      note.className = 'sc-caution';
      note.setAttribute('role', 'note');
      node.querySelector('.sc-sources').before(note);
    }
    note.textContent = T.caution;
  }

  function setFollowUps(node, questions) {
    const row = node.querySelector('.sc-follow');
    row.innerHTML = '';
    if (!questions || !questions.length) return;
    const label = document.createElement('span');
    label.className = 'sc-sources-label';
    label.textContent = T.next;
    row.appendChild(label);
    for (const question of questions.slice(0, 3)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = question;
      button.addEventListener('click', () => {
        el.input.value = question;
        resize();
        count();
        el.form.requestSubmit();
      });
      row.appendChild(button);
    }
  }

  function setActions(node, rawText) {
    const row = node.querySelector('.sc-actions');
    row.innerHTML = '';
    if (!rawText) return;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = T.copy;
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(rawText);
        copy.textContent = T.copied;
        setTimeout(() => { copy.textContent = T.copy; }, 1600);
      } catch {}
    });
    row.appendChild(copy);
  }

  function setBubble(node, text) {
    const bubble = node.querySelector('.sc-bubble');
    bubble.innerHTML = text ? renderMarkdown(text) : '';
    setActions(node, text);
  }

  function renderHistory() {
    el.historyList.innerHTML = '';
    const chats = state.chats.filter((chat) => chat.messages.length);
    el.historyEmpty.hidden = chats.length > 0;
    for (const chat of chats.slice(0, 12)) {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = chat.title || T.untitled;
      button.title = chat.title || T.untitled;
      if (chat.id === state.activeId) button.setAttribute('aria-current', 'true');
      button.addEventListener('click', () => {
        state.activeId = chat.id;
        save();
        renderHistory();
        replay(chat);
        closeRail();
      });
      li.appendChild(button);
      el.historyList.appendChild(li);
    }
  }

  function replay(chat) {
    clearThread();
    showWelcome(!chat.messages.length);
    for (const message of chat.messages) {
      const node = messageNode(message.role, {
        text: message.content,
        sources: message.sources || [],
        followUps: message.followUps || [],
        mode: message.mode || '',
      });
      if (message.role === 'assistant') setBubble(node, message.content);
    }
    scrollToEnd(false);
  }

  /* ---------------- status ---------------- */

  function setStatus(text, tone = '') {
    el.status.textContent = text;
    el.dot.classList.remove('is-live', 'is-busy', 'is-error');
    if (tone) el.dot.classList.add(`is-${tone}`);
  }

  /* ---------------- unos ---------------- */

  function resize() {
    el.input.style.height = 'auto';
    el.input.style.height = `${Math.min(el.input.scrollHeight, 180)}px`;
  }

  function count() {
    const used = el.input.value.length;
    el.counter.textContent = `${used} / ${MAX_CHARS}`;
    el.counter.classList.toggle('is-near', used > MAX_CHARS * 0.85);
  }

  el.input.addEventListener('input', () => { resize(); count(); });
  el.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      el.form.requestSubmit();
    }
  });

  /* ---------------- razgovor ---------------- */

  let controller = null;
  let stoppedByUser = false;

  async function ask(question) {
    const chat = ensureChat();
    chat.title = chat.title === T.untitled ? titleFrom(question) : chat.title;
    chat.messages.push({ role: 'user', content: question });
    save();
    renderHistory();

    showWelcome(false);
    messageNode('user', { text: question });

    const answer = messageNode('assistant', {});
    answer.setAttribute('aria-busy', 'true');
    setStatus(T.thinking, 'busy');

    controller = new AbortController();
    stoppedByUser = false;
    el.stop.hidden = false;
    el.send.disabled = true;

    let raw = '';
    let meta = { sources: [], followUps: [], mode: '' };
    let mode = '';
    let finished = false;

    const paint = () => {
      const bubble = answer.querySelector('.sc-bubble');
      bubble.innerHTML = renderMarkdown(raw, meta.sources || []);
      scrollToEnd(false);
    };

    try {
      const history = chat.messages
        .slice(0, -1)
        .slice(-8)
        .map((message) => ({ role: message.role, content: message.content }));

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ message: question, history, lang: LANG, contextPath: contextPath || undefined }),
        signal: controller.signal,
      });

      if (response.status === 429) throw new Error('rate');
      if (!response.ok) throw new Error('service');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          let event = 'message';
          const dataLines = [];
          for (const line of chunk.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
          }
          if (!dataLines.length) continue;
          let payload = {};
          try { payload = JSON.parse(dataLines.join('\n')); } catch { continue; }

          if (event === 'meta') {
            meta = payload;
            setSources(answer, payload.sources || []);
            setFollowUps(answer, payload.followUps || []);
          } else if (event === 'delta') {
            raw += payload.text || '';
            paint();
          } else if (event === 'done') {
            mode = payload.mode || '';
            finished = true;
            if (payload.mode) answer.dataset.mode = payload.mode;
            setCaution(answer, payload.grounded === false);
          } else if (event === 'error') {
            throw new Error(payload.message || 'stream');
          }
        }
      }

      if (!raw.trim()) throw new Error('empty');
      paint();
      setActions(answer, raw);
      answer.removeAttribute('aria-busy');

      chat.messages.push({
        role: 'assistant',
        content: raw,
        sources: meta.sources || [],
        followUps: meta.followUps || [],
        mode,
      });
      save();
      setStatus(T.ready, 'live');
      announce(T.answerReady);
      el.mode.textContent = mode === 'knowledge' || mode === 'knowledge-fallback'
        ? (LANG === 'en' ? 'Answered from the portal knowledge base' : 'Odgovor iz baze znanja portala')
        : T.modeKnowledge;
    } catch (error) {
      if (error?.name === 'AbortError') {
        answer.classList.add('is-error');
        setBubble(answer, raw ? `${raw}\n\n${T.stoppedByUser}` : T.stoppedByUser);
        if (raw) {
          chat.messages.push({ role: 'assistant', content: raw, sources: meta.sources || [], followUps: [], mode: 'stopped' });
          save();
        }
        setStatus(T.stopped, '');
      } else {
        answer.classList.add('is-error');
        const message = error?.message === 'rate' ? T.rate : T.error;
        setBubble(answer, message);
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.textContent = T.retry;
        retry.addEventListener('click', () => {
          answer.remove();
          chat.messages = chat.messages.filter((item) => !(item.role === 'assistant' && !item.content));
          save();
          ask(question);
        });
        answer.querySelector('.sc-actions').appendChild(retry);
        setStatus(T.offline, 'error');
      }
    } finally {
      finish();
      if (!finished && raw) answer.removeAttribute('aria-busy');
    }
  }

  function finish() {
    controller = null;
    el.stop.hidden = true;
    el.send.disabled = false;
    el.input.focus();
  }

  el.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = el.input.value.trim();
    if (!question) { setStatus(T.empty, ''); return; }
    if (question.length > MAX_CHARS) return;
    if (controller) return;
    el.input.value = '';
    resize();
    count();
    ask(question);
  });

  el.stop.addEventListener('click', () => {
    stoppedByUser = true;
    if (controller) controller.abort();
  });

  /* ---------------- novi razgovor i izvoz ---------------- */

  function reset() {
    if (controller) controller.abort();
    state.activeId = null;
    save();
    clearThread();
    showWelcome(true);
    renderHistory();
    el.input.value = '';
    resize();
    count();
    setStatus(T.ready, 'live');
    el.mode.textContent = T.modeKnowledge;
    el.input.focus();
    closeRail();
  }

  el.newBtn.addEventListener('click', reset);

  el.exportBtn.addEventListener('click', () => {
    const chat = activeChat();
    if (!chat || !chat.messages.length) return;
    const lines = chat.messages.map((message) =>
      `${message.role === 'user' ? T.you : 'S+CHAT · AI'}\n${message.content}` +
      (message.sources?.length ? `\n${T.sources}: ${message.sources.map((s) => s.url).join(' ')}` : ''));
    const blob = new Blob(
      [`GNK ASG S+Chat — ${chat.title}\n${new Date(chat.createdAt).toISOString()}\n\n${lines.join('\n\n---\n\n')}`],
      { type: 'text/markdown;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gnk-asg-s-chat-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  /* ---------------- mobilna navigacija ---------------- */

  function openRail() {
    el.rail.classList.add('is-open');
    el.railToggle.setAttribute('aria-expanded', 'true');
  }
  function closeRail() {
    el.rail.classList.remove('is-open');
    el.railToggle.setAttribute('aria-expanded', 'false');
  }
  el.railToggle.addEventListener('click', () => {
    if (el.rail.classList.contains('is-open')) closeRail(); else openRail();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeRail();
  });
  document.addEventListener('click', (event) => {
    if (!el.rail.classList.contains('is-open')) return;
    if (el.rail.contains(event.target) || el.railToggle.contains(event.target)) return;
    closeRail();
  });

  /* ---------------- predložena pitanja ---------------- */

  /* Kad je razgovor otvoren s neke stranice, prva pitanja su s te
     stranice. Popis dolazi iz istog indeksa koji koristi agent, pa se
     ne može dogoditi da ponudimo pitanje koje agent ne zna odgovoriti.
     Ako podataka nema, ostaju opći prijedlozi iz HTML-a. */
  const SUGGEST_URL = '/data/s-chat-context-suggest-v1.json';
  const SUGGEST_TOKEN = '20261021-v1';

  function suggestButton(question, isPage) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.q = question;
    button.textContent = question;
    if (isPage) button.className = 'is-page';
    button.addEventListener('click', () => {
      el.input.value = question;
      resize();
      count();
      el.form.requestSubmit();
    });
    return button;
  }

  async function enhanceSuggestions() {
    const box = $('scSuggest');
    if (!box || !contextPath) return;
    let data = null;
    try {
      const response = await fetch(`${SUGGEST_URL}?v=${SUGGEST_TOKEN}`, {
        headers: { accept: 'application/json' },
        cache: 'force-cache',
      });
      if (!response.ok) return;
      data = await response.json();
    } catch { return; }
    if (!data) return;

    const bank = Array.isArray(data.questions) ? data.questions : [];
    const ids = data?.routes?.[contextPath];
    const pageQuestions = Array.isArray(ids) ? ids.map((index) => bank[index]).filter(Boolean) : [];
    const general = Array.isArray(data?.general?.[LANG]) ? data.general[LANG] : [];
    if (!pageQuestions.length && !general.length) return;

    const merged = [];
    for (const question of [...pageQuestions, ...general]) {
      if (!merged.includes(question)) merged.push(question);
      if (merged.length >= 5) break;
    }

    box.innerHTML = '';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', T.pageLabel);
    if (pageQuestions.length) {
      const pageLabel = document.createElement('p');
      pageLabel.className = 'sc-suggest-label';
      pageLabel.textContent = `${T.fromPage} · ${contextPath}`;
      box.appendChild(pageLabel);
    }
    for (const question of pageQuestions.slice(0, 3)) box.appendChild(suggestButton(question, true));
    const rest = merged.filter((question) => !pageQuestions.slice(0, 3).includes(question));
    if (rest.length) {
      if (pageQuestions.length) {
        const generalLabel = document.createElement('p');
        generalLabel.className = 'sc-suggest-label';
        generalLabel.textContent = T.general;
        box.appendChild(generalLabel);
      }
      for (const question of rest) box.appendChild(suggestButton(question, false));
    }
  }

  for (const button of document.querySelectorAll('#scSuggest button')) {
    button.addEventListener('click', () => {
      el.input.value = button.dataset.q || button.textContent || '';
      resize();
      count();
      el.form.requestSubmit();
    });
  }

  /* ---------------- pokretanje ---------------- */

  function boot(text) {
    el.kbCount.textContent = String(text || '542');
  }

  fetch(HEALTH, { headers: { accept: 'application/json' }, cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!data || !data.ok) return;
      boot(data.knowledge?.entries);
      const label = data.llm === 'openai' ? 'GPT-4o mini' : data.llm === 'workers-ai' ? 'Workers AI' : (LANG === 'en' ? 'Portal knowledge base' : 'Baza znanja portala');
      el.mode.textContent = `${LANG === 'en' ? 'AI assistant' : 'AI asistent'} · ${label} · ${data.knowledge?.entries || 0} ${LANG === 'en' ? 'verified answers' : 'provjerenih odgovora'}`;
      setStatus(T.ready, 'live');
    })
    .catch(() => {
      el.mode.textContent = T.modeKnowledge;
    });

  if (state.chats.length) {
    const chat = activeChat() || state.chats[0];
    state.activeId = chat.id;
    renderHistory();
    if (chat.messages.length) replay(chat);
  } else {
    renderHistory();
  }
  setStatus(T.ready, 'live');
  resize();
  count();
  if (contextPath) enhanceSuggestions();
  el.input.focus({ preventScroll: true });
})();
