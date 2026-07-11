(() => {
  'use strict';
  const count = document.getElementById('approvedCount');
  const last = document.getElementById('approvedLast');
  const list = document.getElementById('approvedPreview');
  const monitorState = document.getElementById('monitorState');
  const monitorMessage = document.getElementById('monitorMessage');
  const queueUpdated = document.getElementById('queueUpdated');
  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  }
  function formatDate(value) {
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? new Date(parsed).toLocaleString('hr-HR') : '—';
  }
  async function loadPublic() {
    try {
      const response = await fetch('../data/media_approved.json?v=' + Date.now(), {cache:'no-store'});
      const data = response.ok ? await response.json() : [];
      const items = Array.isArray(data) ? data : [];
      if (count) count.textContent = String(items.length);
      if (!items.length) {
        if (last) last.textContent = 'Trenutačno nema pronađenih javnih medijskih objava za prikaz.';
        if (list) list.innerHTML = '<p class="admin-empty">Automatska provjera radi; trenutačno nema javne objave koja odgovara praćenim subjektima.</p>';
        return;
      }
      if (last) last.textContent = 'Posljednja javna objava: ' + formatDate(items[0].published_at);
      if (list) list.innerHTML = items.slice(0, 4).map(item => '<article class="approved-item"><strong>' + esc(item.title) + '</strong><span>' + esc(item.source) + ' · ' + esc(formatDate(item.published_at)) + '</span></article>').join('');
    } catch (error) {
      if (last) last.textContent = 'Popis javnih medijskih objava nije se mogao učitati.';
    }
  }
  async function loadStatus() {
    try {
      const response = await fetch('../data/media_monitor_status.json?v=' + Date.now(), {cache:'no-store'});
      const status = response.ok ? await response.json() : {};
      const ok = status.status === 'ok';
      const total = Number(status.published_public || 0);
      if (monitorState) monitorState.textContent = ok ? 'AKTIVAN' : (status.status === 'partial' ? 'DJELOMIČAN' : '—');
      if (monitorMessage) monitorMessage.textContent = ok ? 'Automatska provjera i javna objava rade. Trenutačno javno prikazanih nalaza: ' + total + '.' : 'Status automatskog monitoringa nije potpuno uredan. Ovlašteni korisnik treba pregledati posljednje izvršenje.';
      if (queueUpdated) queueUpdated.textContent = 'Posljednja automatska provjera: ' + formatDate(status.updated_at) + '. Neželjena javna stavka može se trajno ukloniti ovlaštenom kontrolom.';
    } catch (error) {
      if (monitorState) monitorState.textContent = '—';
      if (monitorMessage) monitorMessage.textContent = 'Status automatske objave trenutačno nije dostupan.';
      if (queueUpdated) queueUpdated.textContent = 'Provjerite posljednje izvršenje automatskog procesa.';
    }
  }
  loadPublic();
  loadStatus();
  window.setInterval(loadStatus, 300000);
})();
