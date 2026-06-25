(() => {
  'use strict';
  if (window.__GNK_ASG_ADMIN_INDEX_MEDIA_V1__) return;
  window.__GNK_ASG_ADMIN_INDEX_MEDIA_V1__ = true;

  const value = id => document.getElementById(id)?.value?.trim() || '';
  const checked = id => Boolean(document.getElementById(id)?.checked);
  const show = data => {
    const target = document.getElementById('indexMediaOut');
    if (target) target.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  };

  function install() {
    const app = document.getElementById('app');
    const nav = app?.querySelector(':scope > nav');
    const panels = app?.querySelector(':scope > div');
    if (!app || !nav || !panels || document.getElementById('index-media')) return;

    const logout = [...nav.querySelectorAll('button')].find(button => /odjava/i.test(button.textContent || ''));
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Index media + sat';
    button.addEventListener('click', () => window.tab?.('index-media', button));
    logout ? nav.insertBefore(button, logout) : nav.appendChild(button);

    const section = document.createElement('section');
    section.id = 'index-media';
    section.innerHTML = `
      <h2>Index media i countdown</h2>
      <p class="hint">Video, PPTX ili PDF najprije učitajte u kartici Fotografije / mediji. Ovdje upišite vraćenu R2 javnu putanju. Javni index učitava samu datoteku tek nakon klika posjetitelja.</p>
      <div class="grid">
        <div>
          <label>Vrsta sadržaja</label><select id="indexMediaType"><option value="video">Video</option><option value="pptx">PPTX / PDF prezentacija</option></select>
          <label>Naslov HR</label><input id="indexMediaTitleHr" value="GNK ASG video poruka">
          <label>Naslov EN</label><input id="indexMediaTitleEn" value="GNK ASG video message">
          <label>Sažetak HR</label><textarea id="indexMediaSummaryHr">Sadržaj se učitava tek nakon pokretanja.</textarea>
          <label>Sažetak EN</label><textarea id="indexMediaSummaryEn">The content is loaded only after it is started.</textarea>
        </div>
        <div>
          <label>R2 putanja videa ili prezentacije</label><input id="indexMediaSourceUrl" placeholder="/r2/index-media/..."><label>Preview URL za PPTX/PDF</label><input id="indexMediaPreviewUrl" placeholder="/r2/index-media-preview/..."><label>Poster slika</label><input id="indexMediaPosterUrl" value="/assets/index-media-poster.svg"><label><input id="indexMediaEnabled" type="checkbox" style="width:auto"> Prikaži media modul</label>
        </div>
      </div>
      <div class="actions"><button class="primary" type="button" id="indexMediaSave">Spremi media postavke</button><button class="secondary" type="button" id="indexMediaLoad">Učitaj postavke</button><button class="secondary" type="button" id="indexMediaDisable">Isključi media modul</button></div>
      <hr style="border:0;border-top:1px solid rgba(212,175,55,.28);margin:22px 0">
      <div class="grid"><div><label><input id="indexCountdownEnabled" type="checkbox" style="width:auto"> Uključi countdown</label><label>Ciljni datum i vrijeme</label><input id="indexCountdownTarget" type="datetime-local"></div><div><label>Boja</label><input id="indexCountdownColor" type="color" value="#ef6670"><label>Tekst HR</label><input id="indexCountdownLabelHr" value="Važna objava za"><label>Tekst EN</label><input id="indexCountdownLabelEn" value="Important announcement in"></div></div>
      <div class="actions"><button class="primary" type="button" id="indexCountdownSave">Spremi countdown</button><button class="secondary" type="button" id="indexCountdownDisable">Isključi countdown</button></div>
      <pre id="indexMediaOut">Postavke još nisu učitane.</pre>`;
    panels.appendChild(section);

    document.getElementById('indexMediaLoad').addEventListener('click', loadConfig);
    document.getElementById('indexMediaSave').addEventListener('click', saveMedia);
    document.getElementById('indexMediaDisable').addEventListener('click', () => save({ media: { enabled: false } }));
    document.getElementById('indexCountdownSave').addEventListener('click', saveCountdown);
    document.getElementById('indexCountdownDisable').addEventListener('click', () => save({ countdown: { enabled: false, target: '' } }));
  }

  async function api(url, options = {}) {
    if (typeof window.req === 'function') {
      const result = await window.req(url, options);
      if (!result.ok) throw new Error(result.data?.error || `HTTP ${result.status}`);
      return result.data;
    }
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  async function loadConfig() {
    try {
      const config = await api(`/data/index-media-config.json?cb=${Date.now()}`);
      const media = config.media || {};
      const countdown = config.countdown || {};
      document.getElementById('indexMediaType').value = media.type === 'pptx' ? 'pptx' : 'video';
      document.getElementById('indexMediaTitleHr').value = media.titleHr || '';
      document.getElementById('indexMediaTitleEn').value = media.titleEn || '';
      document.getElementById('indexMediaSummaryHr').value = media.summaryHr || '';
      document.getElementById('indexMediaSummaryEn').value = media.summaryEn || '';
      document.getElementById('indexMediaSourceUrl').value = media.sourceUrl || '';
      document.getElementById('indexMediaPreviewUrl').value = media.previewUrl || '';
      document.getElementById('indexMediaPosterUrl').value = media.posterUrl || '/assets/index-media-poster.svg';
      document.getElementById('indexMediaEnabled').checked = Boolean(media.enabled);
      document.getElementById('indexCountdownEnabled').checked = Boolean(countdown.enabled);
      document.getElementById('indexCountdownColor').value = /^#[0-9a-f]{6}$/i.test(countdown.color || '') ? countdown.color : '#ef6670';
      document.getElementById('indexCountdownLabelHr').value = countdown.labelHr || 'Važna objava za';
      document.getElementById('indexCountdownLabelEn').value = countdown.labelEn || 'Important announcement in';
      if (countdown.target) {
        const date = new Date(countdown.target);
        if (!Number.isNaN(date.getTime())) document.getElementById('indexCountdownTarget').value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
      show(config);
    } catch (error) { show(error.message); }
  }

  async function save(patch) {
    try {
      const options = { method: 'POST', headers: typeof window.authHeaders === 'function' ? window.authHeaders() : { 'content-type': 'application/json' }, body: JSON.stringify(patch) };
      const result = await api('/api/index-media-config', options);
      show(result);
      await loadConfig();
    } catch (error) { show(error.message); }
  }

  function saveMedia() {
    save({ media: { enabled: checked('indexMediaEnabled'), type: value('indexMediaType') || 'video', titleHr: value('indexMediaTitleHr'), titleEn: value('indexMediaTitleEn'), summaryHr: value('indexMediaSummaryHr'), summaryEn: value('indexMediaSummaryEn'), sourceUrl: value('indexMediaSourceUrl'), previewUrl: value('indexMediaPreviewUrl'), posterUrl: value('indexMediaPosterUrl') || '/assets/index-media-poster.svg', downloadUrl: value('indexMediaSourceUrl'), preload: 'none', autoplay: false } });
  }

  function saveCountdown() {
    const raw = value('indexCountdownTarget');
    const target = raw ? new Date(raw).toISOString() : '';
    if (checked('indexCountdownEnabled') && !target) return show('Upišite ciljni datum i vrijeme.');
    save({ countdown: { enabled: checked('indexCountdownEnabled'), target, color: value('indexCountdownColor') || '#ef6670', labelHr: value('indexCountdownLabelHr') || 'Važna objava za', labelEn: value('indexCountdownLabelEn') || 'Important announcement in', doneLabelHr: 'Objava je dostupna', doneLabelEn: 'The announcement is available' } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  window.addEventListener('load', install, { once: true });
})();
