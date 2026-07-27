(() => {
  'use strict';
  if (window.__GNK_ASG_INLINE_DESK_CHAT__) return;
  window.__GNK_ASG_INLINE_DESK_CHAT__ = true;

  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('messages');
  if (!form || !input || !messages) return;

  const isEnglish = () => document.documentElement.lang === 'en' || location.pathname.startsWith('/en/');

  const addBubble = (text, isBot) => {
    const bubble = document.createElement('div');
    bubble.className = 'bubble' + (isBot ? ' bot' : ' user');
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    addBubble(question, false);
    input.value = '';
    input.disabled = true;
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    const pending = addBubble(isEnglish() ? 'Thinking…' : 'Razmišljam…', true);

    try {
      const response = await fetch('/api/intelligence-desk-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ message: question }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 429) {
        pending.textContent = isEnglish()
          ? 'Too many questions right now — please try again in a bit.'
          : 'Previše pitanja u kratkom vremenu — pokušajte ponovno malo kasnije.';
      } else if (data && data.ok && data.reply) {
        pending.textContent = data.reply;
      } else {
        pending.textContent = isEnglish()
          ? "Sorry, I couldn't process that just now. Please try again or use the contact form."
          : 'Nažalost trenutno ne mogu obraditi upit. Pokušajte ponovno ili koristite kontakt obrazac.';
      }
    } catch {
      pending.textContent = isEnglish()
        ? "Sorry, I couldn't process that just now. Please try again or use the contact form."
        : 'Nažalost trenutno ne mogu obraditi upit. Pokušajte ponovno ili koristite kontakt obrazac.';
    } finally {
      input.disabled = false;
      if (submitButton) submitButton.disabled = false;
      input.focus();
    }
  });
})();
