'use strict';
(() => {
  const form = document.getElementById('watch-form');
  if (!form) return;
  const fields = document.getElementById('watch-fields');
  const service = document.getElementById('service-status');
  const shops = document.getElementById('supported-shops');
  const response = document.getElementById('form-response');
  const submit = document.getElementById('submit-watch');
  const captchaBox = document.getElementById('price-turnstile');
  let ready = false;
  let siteKey = null;
  let widgetId = null;
  const params = new URLSearchParams(location.search);
  const notes = {
    confirmed: 'Praćenje je aktivirano. Prvo provjereno očitanje postaje početna cijena.',
    unsubscribed: 'Odjavili ste praćenje cijene. Nove obavijesti nećete primati.',
    expired: 'Potvrdna poveznica je istekla ili je već iskorištena.',
    invalid: 'Poveznica za potvrdu ili odjavu nije valjana.'
  };
  if (notes[params.get('status')]) response.textContent = notes[params.get('status')];
  const show = (message) => { service.textContent = message; };
  const loadCaptcha = () => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Sigurnosna provjera nije dostupna.'));
    document.head.appendChild(script);
  });
  async function initialize() {
    try {
      const r = await fetch('/api/price-alerts/status', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) throw new Error('Usluga praćenja cijena nije dostupna.');
      const data = await r.json();
      if (!data.enabled || !data.turnstileSiteKey) {
        show(data.notice || 'Prijave se još ne primaju.');
        return;
      }
      siteKey = data.turnstileSiteKey;
      const retailers = (data.supportedRetailers || []).join(', ');
      shops.textContent = retailers ? 'Podržane trgovine: ' + retailers : 'Nema podržanih trgovina.';
      await loadCaptcha();
      if (!window.turnstile || !window.turnstile.render) throw new Error('Sigurnosna provjera nije dostupna.');
      widgetId = window.turnstile.render(captchaBox, { sitekey: siteKey, theme: 'dark' });
      ready = true; fields.disabled = false;
      show('Usluga je dostupna. Za aktivaciju obvezno potvrdite primljeni e-mail.');
    } catch (err) {
      show('Prijave su privremeno nedostupne. Nije izvršena nikakva prijava.');
    }
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!ready || !form.reportValidity()) return;
    const captchaToken = window.turnstile && window.turnstile.getResponse(widgetId);
    if (!captchaToken) { response.textContent = 'Dovršite sigurnosnu provjeru.'; return; }
    submit.disabled = true;
    response.textContent = 'Šaljemo zahtjev za potvrdu…';
    const val = (id) => document.getElementById(id).value.trim();
    try {
      const r = await fetch('/api/price-alerts/subscribe', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ url: val('product-url'), email: val('email'),
          variant: val('product-variant'), targetPrice: val('target-price'),
          consent: document.getElementById('consent').checked,
          website: val('website'), turnstileToken: captchaToken })
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || 'Prijava nije uspjela.');
      response.textContent = data.message;
      form.reset();
    } catch (error) {
      response.textContent = error.message || 'Prijava nije uspjela. Pokušajte ponovno.';
    } finally {
      submit.disabled = false;
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    }
  });
  initialize();
})();
