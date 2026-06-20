(() => {
  if (window.__GNK_WA_CENTER__) return;
  window.__GNK_WA_CENTER__ = true;

  const q = id => document.getElementById(id);
  const LOG_KEY = 'GNK_ASG_WA_PREVIEW_LOG';
  let groups = [];
  let faq = [];
  let actions = {};
  let activeGroup = 'general';

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'hr';

  async function loadJson(url) {
    const response = await fetch(`${url}?cb=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
  }

  async function init() {
    const [groupData, actionData, ...faqData] = await Promise.all([
      loadJson('/data/wa-groups.json'),
      loadJson('/data/wa-actions.json'),
      loadJson('/data/wa-faq-general.json'),
      loadJson('/data/wa-faq-publications.json'),
      loadJson('/data/wa-faq-markets.json'),
      loadJson('/data/wa-faq-bpp.json'),
      loadJson('/data/wa-faq-media.json'),
      loadJson('/data/wa-faq-sensitive.json')
    ]);
    groups = groupData.groups || [];
    actions = actionData.actions || {};
    faq = faqData.flatMap(item => item.items || []);
    bind();
    renderGroups();
    renderFaq();
    renderLog();
    addSystem('Preview simulator je spreman. Vanjski WhatsApp Business API još nije povezan.');
  }

  function bind() {
    q('sendMessage').onclick = send;
    q('clearChat').onclick = () => { q('chatLog').innerHTML = ''; q('matchInfo').textContent = 'Nema odabranog upita.'; q('suggestedActions').innerHTML = ''; };
    q('handover').onclick = () => handover('manual');
    q('createCase').onclick = () => createCase('manual');
    q('refreshLog').onclick = renderLog;
    q('messageInput').addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') send();
    });
  }

  function renderGroups() {
    q('groupList').innerHTML = groups.map(group => `<button type="button" class="wa-group-button${group.key===activeGroup?' active':''}" data-group="${esc(group.key)}">${esc(group.labelHr)}</button>`).join('');
    q('groupList').querySelectorAll('[data-group]').forEach(button => button.onclick = () => {
      activeGroup = button.dataset.group;
      renderGroups();
      renderFaq();
      const group = groups.find(item => item.key === activeGroup);
      q('activeGroupLabel').textContent = group?.labelHr || activeGroup;
    });
  }

  function renderFaq() {
    const items = faq.filter(item => item.group === activeGroup);
    q('faqList').innerHTML = items.length ? items.map(item => `<div class="wa-faq-item"><strong>${esc(item.phrasesHr?.[0] || item.id)}</strong><small>${esc(item.answerHr)}</small></div>`).join('') : '<small>Nema zapisa za ovu grupu.</small>';
  }

  function score(item, message) {
    const source = normalize(message);
    const phrases = [...(item.phrasesHr || []), ...(item.phrasesEn || [])];
    let points = item.group === activeGroup ? 2 : 0;
    for (const phrase of phrases) {
      const p = normalize(phrase);
      if (!p) continue;
      if (source.includes(p)) points += 12;
      for (const token of p.split(' ')) if (token.length >= 4 && source.includes(token)) points += 2;
    }
    return points;
  }

  function bestMatch(message) {
    return faq.map(item => ({ item, points: score(item, message) })).sort((a,b) => b.points - a.points)[0];
  }

  function send() {
    const input = q('messageInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    const match = bestMatch(text);
    if (!match || match.points < 3) {
      addMessage('bot', 'Nisam pronašao dovoljno pouzdan automatski odgovor. Upit mogu evidentirati i predati odgovornoj osobi.');
      q('matchInfo').innerHTML = '<strong>Neprepoznat upit</strong><br><small>Predložen je ljudski pregled.</small>';
      renderActions(['human_handover','create_case']);
      storeLog({ type:'unmatched', text, createdAt:new Date().toISOString() });
      return;
    }
    const item = match.item;
    const group = groups.find(entry => entry.key === item.group);
    activeGroup = item.group;
    renderGroups();
    renderFaq();
    q('activeGroupLabel').textContent = group?.labelHr || item.group;
    const answer = language() === 'en' ? item.answerEn : item.answerHr;
    addMessage('bot', answer);
    q('matchInfo').innerHTML = `<strong>${esc(group?.labelHr || item.group)}</strong><br><small>Podudaranje: ${match.points} bodova · ${esc(item.id)}</small>`;
    renderActions(item.actions || []);
    storeLog({ type:'reply', group:item.group, faqId:item.id, text, answer, createdAt:new Date().toISOString() });
  }

  function renderActions(keys) {
    q('suggestedActions').innerHTML = keys.map(key => {
      const action = actions[key];
      if (!action) return '';
      if (action.type === 'handover') return `<button type="button" class="wa-action-link" data-action="handover">${esc(action.labelHr)}</button>`;
      if (action.type === 'case') return `<button type="button" class="wa-action-link" data-action="case">${esc(action.labelHr)}</button>`;
      const url = language() === 'en' ? action.urlEn : action.urlHr;
      return `<a class="wa-action-link" href="${esc(url)}"${/^https:/.test(url)?' target="_blank" rel="noopener noreferrer"':''}>${esc(language()==='en'?action.labelEn:action.labelHr)}</a>`;
    }).join('');
    q('suggestedActions').querySelectorAll('[data-action="handover"]').forEach(button => button.onclick = () => handover('suggested'));
    q('suggestedActions').querySelectorAll('[data-action="case"]').forEach(button => button.onclick = () => createCase('suggested'));
  }

  function handover(source) {
    const reference = `WA-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    addSystem(`Razgovor je označen za ljudsko preuzimanje. Evidencijski broj: ${reference}`);
    storeLog({ type:'handover', source, reference, createdAt:new Date().toISOString() });
  }

  function createCase(source) {
    const reference = `CASE-${Date.now().toString(36).toUpperCase()}`;
    addSystem(`Otvoren je preview predmet ${reference}. Produkcijski predmet nije kreiran.`);
    storeLog({ type:'case', source, reference, createdAt:new Date().toISOString() });
  }

  function addMessage(type, text) {
    const node = document.createElement('div');
    node.className = `wa-message ${type}`;
    node.textContent = text;
    q('chatLog').appendChild(node);
    q('chatLog').scrollTop = q('chatLog').scrollHeight;
  }

  function addSystem(text) { addMessage('system', text); }

  function readLog() {
    try { const value = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
  }

  function storeLog(item) {
    localStorage.setItem(LOG_KEY, JSON.stringify([item, ...readLog()].slice(0,200)));
    renderLog();
  }

  function renderLog() {
    const items = readLog();
    q('conversationLog').innerHTML = items.length ? items.map(item => `<article><strong>${esc(item.type)}</strong><br><small>${esc(item.createdAt || '')} · ${esc(item.reference || item.group || item.faqId || '')}</small></article>`).join('') : 'Nema zapisa.';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init().catch(error => addSystem(`Greška učitavanja: ${error.message}`)), { once:true });
  else init().catch(error => addSystem(`Greška učitavanja: ${error.message}`));
})();
