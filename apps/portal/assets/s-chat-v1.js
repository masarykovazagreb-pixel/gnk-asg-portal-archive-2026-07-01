(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const form = get('chatForm'), input = get('chatInput'), send = get('send');
  const feed = get('messages'), scroll = get('scrollArea'), status = get('status');
  const key = 'gnk-s-chat-v1-history';
  const maxChars = 600; // /api/intelligence-desk-chat truncates input to 600 characters.
  let history = [], pending = null, generation = 0;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (Array.isArray(saved)) {
      history = saved.filter(item => item && ['user','assistant'].includes(item.role) &&
        typeof item.content === 'string').slice(-16);
    }
  } catch {}
  const save = () => { try { sessionStorage.setItem(key, JSON.stringify(history.slice(-16))); } catch {} };
  const bottom = () => requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });
  function welcome() {
    const wrapper = document.createElement('div');
    wrapper.className = 'welcome';
    const star = document.createElement('div'); star.className = 'spark'; star.textContent = '✦';
    const h = document.createElement('h2'); h.textContent = 'Kako vam mogu pomoći?';
    const p = document.createElement('p');
    p.textContent = 'Razgovarate s umjetnom inteligencijom. Ne unosite osobne, povjerljive ili osjetljive podatke.';
    wrapper.append(star,h,p);
    feed.appendChild(wrapper);
  }
  function bubble(role, value) {
    feed.querySelector('.welcome')?.remove();
    const article = document.createElement('article');
    article.className = 'bubble ' + (role === 'user' ? 'user' : 'bot');
    const label = document.createElement('div');
    label.className = 'who'; label.textContent = role === 'user' ? 'Vi' : 'GNK ASG S+Chat · AI';
    const body = document.createElement('div');
    body.textContent = value;
    article.append(label, body);
    feed.appendChild(article);
    bottom();
    return {article,body};
  }
  function reset() {
    generation += 1; // Invalidate any in-flight response before clearing the visible thread.
    if (pending) { pending.abort(); pending = null; }
    input.disabled = false;
    send.disabled = false;
    status.textContent = 'Spremno';
    history = [];
    save();
    feed.replaceChildren();
    welcome();
    input.value = '';
    input.focus();
    bottom();
  }
  const desktopNew = get('newChat'), mobileNew = get('newChatMobile');
  desktopNew?.addEventListener('click', reset);
  mobileNew?.addEventListener('click', reset);
  for (const item of history) bubble(item.role, item.content);
  if (!history.length) welcome();
  input.setAttribute('maxlength', String(maxChars));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question || pending) return;
    if (question.length > maxChars) {
      status.textContent = 'Najviše 600 znakova po poruci.'; return;
    }
    const token = ++generation;
    const controller = new AbortController();
    pending = controller;
    input.value = '';
    input.disabled = true; send.disabled = true;
    status.textContent = 'Odgovaram…';
    bubble('user',question);
    history.push({role:'user', content:question});
    save();
    const response = bubble('assistant','Razmišljam…');
    const timeout = setTimeout(() => controller.abort(),25000);
    try {
      const result = await fetch('/api/intelligence-desk-chat', {
        method:'POST',
        headers:{'content-type':'application/json', accept:'application/json'},
        credentials:'same-origin',
        cache:'no-store',
        body:JSON.stringify({message:question}),
        signal:controller.signal
      });
      const data = await result.json().catch(() => ({}));
      if (token !== generation) return;
      if (!result.ok || !data.ok || typeof data.reply !== 'string' || !data.reply.trim()) {
        throw new Error(result.status === 429 ? 'Previše upita. Pokušajte kasnije.' :
          'AI servis trenutačno nije dostupan. Pokušajte ponovno.');
      }
      response.body.textContent = data.reply;
      history.push({role:'assistant', content:data.reply});
      save();
    } catch (error) {
      if (token !== generation) return;
      response.article.classList.add('error');
      response.body.textContent = error?.name === 'AbortError'
        ? 'Vrijeme čekanja je isteklo. Pokušajte ponovno.'
        : (error.message || 'Zahtjev nije uspio.');
    } finally {
      clearTimeout(timeout);
      if (token === generation) {
        pending = null;
        input.disabled = false; send.disabled = false;
        status.textContent = 'Spremno';
        bottom(); input.focus();
      }
    }
  });
})();
