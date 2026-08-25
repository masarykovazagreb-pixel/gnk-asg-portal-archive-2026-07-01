(() => {
  'use strict';
  if (window.__GNK_ASG_MEDIA_APPLICATIONS_REVIEW_V1__) return;
  window.__GNK_ASG_MEDIA_APPLICATIONS_REVIEW_V1__ = true;
  const API = '/api/media-registration-admin';
  const rootId = 'gnk-media-review-center';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function mount() {
    let root = document.getElementById(rootId); if (root) return root;
    root = document.createElement('section'); root.id = rootId; root.className = 'gnk-media-review';
    root.innerHTML = `<div class="gnk-media-review__head"><div><p class="gnk-media-review__eyebrow">Protected operations</p><h2>Media Applications Review Center</h2><p>Pregled prijava je zaštićen administratorskom sesijom. Ne šalje automatski masovni e-mail niti izvodi vanjske radnje.</p></div><button type="button" data-media-review-refresh>Osvježi</button></div><div class="gnk-media-review__status" role="status" aria-live="polite">Učitavanje…</div><div class="gnk-media-review__summary" data-media-review-summary></div><div class="gnk-media-review__list" data-media-review-list></div>`;
    (document.querySelector('main') || document.body).prepend(root); return root;
  }
  async function request(path) { const response = await fetch(`${API}${path}`, {credentials:'same-origin', headers:{accept:'application/json'}, cache:'no-store'}); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json(); if (!data?.ok) throw new Error(data?.error || 'invalid_response'); return data; }
  function renderSummary(root, data) { const node=root.querySelector('[data-media-review-summary]'); const entries=Object.entries(data?.summary||{}); node.innerHTML=entries.length?entries.map(([status,count])=>`<span><strong>${escapeHtml(status)}</strong> ${Number(count)||0}</span>`).join(''):'<span>Nema prijava za prikaz.</span>'; }
  function renderList(root, data) { const node=root.querySelector('[data-media-review-list]'); const items=Array.isArray(data?.items)?data.items:[]; node.innerHTML=items.map(item=>{const priority=['high','medium','clear'].includes(item.reviewPriority)?item.reviewPriority:'clear'; return `<article class="gnk-media-review__item" data-priority="${priority}"><div><strong>${escapeHtml(item.outlet||'Bez naziva')}</strong><small>${escapeHtml(item.country||'')} · ${escapeHtml(item.status||'DRAFT')}</small></div><div><span>${Number(item.completionScore)||0}%</span><span>${Number(item.documentCount)||0} dok.</span><span>${escapeHtml(priority)}</span></div></article>`;}).join('')||'<p class="gnk-media-review__empty">Nema prijava.</p>'; }
  async function refresh() { const root=mount(); const status=root.querySelector('.gnk-media-review__status'); status.textContent='Učitavanje…'; try { const data=await request('/applications?page=1&pageSize=50'); renderSummary(root,data); renderList(root,data); status.textContent=`Ažurirano ${new Date().toLocaleTimeString('hr-HR')}.`; } catch(error) { status.textContent=`Podaci nisu dostupni (${escapeHtml(error.message)}).`; root.querySelector('[data-media-review-list]').innerHTML='<p class="gnk-media-review__empty">Review API je fail-closed ili sesija nije autorizirana.</p>'; } }
  function start(){const root=mount();root.querySelector('[data-media-review-refresh]')?.addEventListener('click',refresh);refresh();}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
