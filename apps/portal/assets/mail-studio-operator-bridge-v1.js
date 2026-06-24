(() => {
  'use strict';
  if (window.__GNK_ASG_MAIL_OPERATOR_BRIDGE_V1__) return;
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/mail-studio' && path !== '/mail-studio-pro') return;
  window.__GNK_ASG_MAIL_OPERATOR_BRIDGE_V1__ = true;

  const q = id => document.getElementById(id);
  const value = id => q(id)?.value || '';
  const setStatus = text => { if (q('status')) q('status').textContent = text; };
  const mailbox = () => {
    const profile = value('profile').toLowerCase();
    const from = value('from').toLowerCase();
    const source = profile + ' ' + from;
    if (source.includes('legal')) return 'legal';
    if (source.includes('media')) return 'media';
    if (source.includes('privacy')) return 'privacy';
    if (source.includes('press')) return 'press';
    if (source.includes('it') || source.includes('assistant')) return 'it';
    if (source.includes('director') || source.includes('nermin') || source.includes('sefic')) return 'sefic';
    if (source.includes('contact')) return 'contact';
    return 'info';
  };

  const plainBody = () => value('bodyText').trim();
  const token = () => window.GNK_ASG_OPERATOR_AUTH?.read?.() || '';
  const authHeaders = () => window.GNK_ASG_OPERATOR_AUTH?.headers?.() || {};

  async function sendMail() {
    const to = value('to').trim();
    const subject = value('subject').trim();
    const body = plainBody();

    if (!token()) {
      setStatus('Operatorski token nije unesen.');
      window.GNK_ASG_OPERATOR_AUTH?.open?.('Unesite token pa ponovno kliknite Pošalji.');
      return;
    }
    if (!to) { setStatus('Nedostaje To primatelj.'); return; }
    if (!subject) { setStatus('Nedostaje predmet.'); return; }
    if (!body) { setStatus('Nedostaje tekst poruke.'); return; }

    setStatus('Slanje preko zaštićenog operator endpointa…');
    const payload = {
      mailbox: mailbox(),
      to,
      subject,
      body,
      addSignature: 'yes',
      cc: value('cc').trim(),
      bcc: value('bcc').trim()
    };

    try {
      const response = await fetch('/api/operator-send-mail', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload)
      });
      const raw = await response.text();
      let data = null;
      try { data = JSON.parse(raw); } catch (_) { data = { message: raw }; }

      if (response.status === 401) {
        setStatus('Token nije prihvaćen. Ponovno unesite operatorski token.');
        window.GNK_ASG_OPERATOR_AUTH?.write?.('');
        window.GNK_ASG_OPERATOR_AUTH?.open?.('Token nije prihvaćen ili više nije važeći.');
        return;
      }

      if (!response.ok || !data?.ok) {
        const detail = data?.result?.error || data?.error || data?.message || `HTTP ${response.status}`;
        if (/not allowed/i.test(detail)) {
          setStatus('Autentifikacija radi, ali vanjski izlazni mail servis nije konfiguriran: ' + detail);
        } else {
          setStatus('Greška slanja: ' + detail);
        }
        if (q('list')) q('list').textContent = JSON.stringify(data, null, 2);
        return;
      }

      setStatus('Poruka je poslana.');
      if (q('list')) q('list').textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      setStatus('Greška slanja: ' + error.message);
    }
  }

  function bind() {
    const send = q('send');
    if (!send || send.dataset.operatorBridge === '1') return;
    send.dataset.operatorBridge = '1';
    send.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      sendMail();
    }, true);
    if (!token()) window.GNK_ASG_OPERATOR_AUTH?.open?.('Unesite operatorski token za slanje poruka.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true });
  else bind();
})();