(() => {
  'use strict';
  // Client-side-only preview gate for the unreleased Digital Workforce
  // pages. This is NOT real security: anyone who views page source can
  // read this file and the gated content underneath it. It exists only
  // to keep the page from being casually browsed by someone who follows
  // a stray link before the owner has reviewed and approved the public
  // launch. Real protection (a request that never reaches this content
  // without a valid credential) would need to happen at the Cloudflare
  // Worker level, which is intentionally out of scope for this change.
  const KEY = 'gnk_dw_preview_token';
  const EXPECTED = 'IknTLmeTNOMfmMTgpOg0ryrV';
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('preview');

  if (fromQuery === EXPECTED) {
    try { sessionStorage.setItem(KEY, EXPECTED); } catch (error) {}
    params.delete('preview');
    const cleanUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
  }

  let stored = null;
  try { stored = sessionStorage.getItem(KEY); } catch (error) {}
  const unlocked = stored === EXPECTED || fromQuery === EXPECTED;

  const root = document.documentElement;
  if (unlocked) {
    root.classList.remove('dw-gate-locked');
    return;
  }

  root.classList.add('dw-gate-locked');
  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.createElement('div');
    overlay.setAttribute('id', 'dwGateOverlay');
    overlay.innerHTML = `
      <div class="dw-gate-box">
        <p class="dw-gate-title">Zaštićeni pregled</p>
        <p class="dw-gate-copy">Ova stranica još nije javno odobrena. Unesite pristupni kod za pregled.</p>
        <form id="dwGateForm">
          <input type="password" id="dwGateInput" autocomplete="off" placeholder="Pristupni kod" aria-label="Pristupni kod">
          <button type="submit">Otvori</button>
        </form>
        <p id="dwGateError" class="dw-gate-error" hidden>Neispravan kod.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    const form = document.getElementById('dwGateForm');
    const input = document.getElementById('dwGateInput');
    const errorEl = document.getElementById('dwGateError');
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (input.value === EXPECTED) {
        try { sessionStorage.setItem(KEY, EXPECTED); } catch (error) {}
        window.location.reload();
      } else {
        errorEl.hidden = false;
        input.value = '';
        input.focus();
      }
    });
  });
})();
