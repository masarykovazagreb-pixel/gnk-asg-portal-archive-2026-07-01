(() => {
  if (window.__GNK_ASG_ADMIN_FUNCTIONAL_REPAIR_V1__) return;
  window.__GNK_ASG_ADMIN_FUNCTIONAL_REPAIR_V1__ = true;

  const path = location.pathname.toLowerCase();
  const q = id => document.getElementById(id);

  function loadScript(src) {
    return new Promise((resolve,reject) => {
      if ([...document.scripts].some(script => String(script.src).includes(src.split('?')[0]))) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function installDocumentStudio() {
    if (!/\/(operator-dashboard|operator-mobile)\//.test(path)) return;
    try {
      await loadScript('/assets/document-studio-core.js?v=20260621-functional-v1');
      await loadScript('/assets/document-studio-panel.js?v=20260621-functional-v1');
    } catch {}

    if (!q('gnk-functional-admin-links')) {
      const links = document.createElement('nav');
      links.id = 'gnk-functional-admin-links';
      links.className = 'gnk-functional-admin-links';
      links.innerHTML = '<a href="#document-studio">Document Studio</a><a href="/pdf-publisher/">PDF Publisher</a><a href="/mail-studio-pro/">Mail Studio Pro</a><a href="/mail-studio-pro/#inbox">Inbox</a><a href="/mail-studio-pro/#sent">Sent</a>';
      (document.querySelector('main') || document.body).prepend(links);
    }
  }

  function consumeDocumentBridge() {
    if (path !== '/mail-studio-pro/' && path !== '/mail-studio-pro/index.html') return;
    try {
      const raw = localStorage.getItem('GNK_ASG_DOCUMENT_TO_MAIL');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (q('subject')) q('subject').value = data.subject || '';
      if (q('bodyText')) q('bodyText').value = data.body || '';
      if (data.signatureProfile && q('profile')) q('profile').value = data.signatureProfile;
      localStorage.removeItem('GNK_ASG_DOCUMENT_TO_MAIL');
      if (q('status')) q('status').textContent = 'Dokument je učitan u novu e-mail poruku.';
    } catch {}
  }

  function explainAuthorizationFailures() {
    const nodes = [q('status'),q('campaignStatus')].filter(Boolean);
    nodes.forEach(node => {
      const improve = () => {
        const text = String(node.textContent || '');
        if (/HTTP\s*401/i.test(text)) node.textContent = 'Aktivni Mail Agent odbio je operator sesiju. Ponovno unesite operator token i pritisnite Sigurna prijava.';
      };
      new MutationObserver(improve).observe(node,{childList:true,subtree:true,characterData:true});
      improve();
    });
  }

  function activateHashTabs() {
    if (!path.startsWith('/mail-studio-pro/')) return;
    const name = location.hash.replace('#','').toLowerCase();
    if (!name) return;
    const button = document.querySelector(`[data-box="${CSS.escape(name)}"]`);
    if (button) setTimeout(() => button.click(),100);
  }

  function init() {
    installDocumentStudio();
    consumeDocumentBridge();
    explainAuthorizationFailures();
    activateHashTabs();
    window.addEventListener('hashchange',activateHashTabs);
    [400,1200].forEach(delay => setTimeout(() => {
      consumeDocumentBridge();
      explainAuthorizationFailures();
      activateHashTabs();
    },delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
