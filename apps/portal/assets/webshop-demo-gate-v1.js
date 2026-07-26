(() => {
  'use strict';
  // Client-side-only preview gate for the hardware-catalog demo page.
  // NOT real security (view-source reveals it) -- exists only to keep
  // this demo/test page from being casually browsed before it's shown
  // to the intended external party. Uses a separate token from the
  // Digital Workforce preview gate.
  const KEY = 'gnk_shop_demo_preview_token';
  const EXPECTED = 'aWHQoJh18WbAc0LTnGd4EtXl';
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
  const unlocked = fromQuery === EXPECTED || stored === EXPECTED;

  if (unlocked) {
    document.documentElement.classList.remove('shop-demo-gate-locked');
    return;
  }

  document.documentElement.classList.add('shop-demo-gate-locked');

  function showOverlay() {
    if (document.getElementById('shopDemoGateOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'shopDemoGateOverlay';
    overlay.innerHTML = `
      <div class="sdg-box">
        <p class="sdg-kicker">GNK ASG — interni pregled</p>
        <h1>Ova stranica zahtijeva pristupni kod</h1>
        <p>Demo katalog trenutno nije javno dostupan.</p>
        <form id="sdgForm">
          <input type="password" id="sdgInput" placeholder="Pristupni kod" autocomplete="off">
          <button type="submit">Otključaj</button>
        </form>
      </div>`;
    document.body.appendChild(overlay);
    const form = document.getElementById('sdgForm');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const val = document.getElementById('sdgInput').value.trim();
      if (val === EXPECTED) {
        try { sessionStorage.setItem(KEY, EXPECTED); } catch (error) {}
        window.location.reload();
      } else {
        document.getElementById('sdgInput').classList.add('sdg-error');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showOverlay, { once: true });
  else showOverlay();
})();
