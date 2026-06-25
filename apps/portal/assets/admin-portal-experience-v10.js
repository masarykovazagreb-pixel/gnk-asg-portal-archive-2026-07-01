(() => {
  'use strict';
  if (window.__GNK_ASG_ADMIN_PORTAL_EXPERIENCE_V10__) return;
  window.__GNK_ASG_ADMIN_PORTAL_EXPERIENCE_V10__ = true;

  const value = id => document.getElementById(id)?.value?.trim() || '';
  const checked = id => Boolean(document.getElementById(id)?.checked);
  const show = payload => {
    const out = document.getElementById('indexMediaOut');
    if (out) out.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  };

  async function api(url, options = {}) {
    if (typeof window.req === 'function') {
      const result = await window.req(url, options);
      if (!result.ok) throw new Error(result.data?.error || `HTTP ${result.status}`);
      return result.data;
    }
    const headers = typeof window.authHeaders === 'function'
      ? window.authHeaders()
      : { 'content-type': 'application/json' };
    const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  async function loadClock() {
    try {
      const config = await api(`/data/index-media-config.json?cb=${Date.now()}`);
      const clock = config.clock || {};
      document.getElementById('indexClockEnabled').checked = Boolean(clock.enabled);
      document.getElementById('indexClockFormat').value = clock.format === '12h' ? '12h' : '24h';
      document.getElementById('indexClockShowDate').checked = clock.showDate !== false;
      document.getElementById('indexClockLabelHr').value = clock.labelHr || 'Vrijeme u Zagrebu';
      document.getElementById('indexClockLabelEn').value = clock.labelEn || 'Time in Zagreb';
      show(config);
    } catch (error) {
      show(error.message);
    }
  }

  async function saveClock(enabled = checked('indexClockEnabled')) {
    try {
      const result = await api('/api/index-media-config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clock: {
            enabled,
            timeZone: 'Europe/Zagreb',
            format: value('indexClockFormat') === '12h' ? '12h' : '24h',
            showDate: checked('indexClockShowDate'),
            labelHr: value('indexClockLabelHr') || 'Vrijeme u Zagrebu',
            labelEn: value('indexClockLabelEn') || 'Time in Zagreb'
          }
        })
      });
      show(result);
      await loadClock();
    } catch (error) {
      show(error.message);
    }
  }

  function install() {
    const section = document.getElementById('index-media');
    const out = document.getElementById('indexMediaOut');
    if (!section || !out || document.getElementById('index-live-clock-admin')) return false;

    const panel = document.createElement('div');
    panel.id = 'index-live-clock-admin';
    panel.innerHTML = `
      <hr style="border:0;border-top:1px solid rgba(212,175,55,.28);margin:22px 0">
      <h3>Živi sat na početnoj stranici</h3>
      <p class="hint">Sat koristi vremensku zonu Europe/Zagreb, ažurira se svake sekunde i prikazuje se samo kada ga ovdje uključite.</p>
      <div class="grid">
        <div>
          <label><input id="indexClockEnabled" type="checkbox" style="width:auto"> Prikaži živi sat</label>
          <label>Format vremena</label>
          <select id="indexClockFormat"><option value="24h">24 sata</option><option value="12h">12 sati</option></select>
          <label><input id="indexClockShowDate" type="checkbox" style="width:auto" checked> Prikaži datum</label>
        </div>
        <div>
          <label>Naslov HR</label><input id="indexClockLabelHr" value="Vrijeme u Zagrebu">
          <label>Naslov EN</label><input id="indexClockLabelEn" value="Time in Zagreb">
          <label>Vremenska zona</label><input value="Europe/Zagreb" disabled>
        </div>
      </div>
      <div class="actions">
        <button class="primary" type="button" id="indexClockSave">Spremi sat</button>
        <button class="secondary" type="button" id="indexClockDisable">Isključi sat</button>
      </div>`;
    section.insertBefore(panel, out);
    document.getElementById('indexClockSave').addEventListener('click', () => saveClock());
    document.getElementById('indexClockDisable').addEventListener('click', () => saveClock(false));
    loadClock();
    return true;
  }

  if (!install()) {
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    [250, 700, 1400, 2600].forEach(delay => setTimeout(install, delay));
  }
})();
