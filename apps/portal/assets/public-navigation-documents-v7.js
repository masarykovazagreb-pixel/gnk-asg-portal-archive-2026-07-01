(() => {
  'use strict';
  if (window.__GNK_ASG_PUBLIC_NAV_DOCS_V7__) return;
  window.__GNK_ASG_PUBLIC_NAV_DOCS_V7__ = true;

  const path = location.pathname.toLowerCase();
  if (/\/(operator-dashboard|operator-mobile|mail-studio|mail-studio-pro|admin-center|auto-editor|news-admin|pdf-publisher|social-share|wa-center|review)(\/|$)/.test(path)) return;
  if (path === '/contact/' || path === '/contact' || path === '/en/contact/' || path === '/en/contact') return;

  const isEn = path.startsWith('/en/') || path.startsWith('/news/') || path.startsWith('/markets/') || path.startsWith('/publications/');
  const downloads = isEn ? '/en/downloads/' : '/downloads/';
  const mediaHr = '/downloads/GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_HR_2026.pdf';
  const mediaEn = '/downloads/GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_EN_2026.pdf';
  const asgReport = '/downloads/GNK_ASG_Audited_Financial_Statements_2025.pdf';
  const dinamoReport = '/downloads/GNK_DINAMO_Ltd_Consolidated_Financial_Report_2025.pdf';
  const certificate = '/downloads/GNK_DINAMO_Ltd_Certificate_of_Good_Standing_2026.pdf';

  function replaceButton(node, href) {
    if (!node || node.tagName === 'A') return node;
    const a = document.createElement('a');
    [...node.attributes].forEach(attr => {
      if (!['data-open','type'].includes(attr.name)) a.setAttribute(attr.name,attr.value);
    });
    a.href = href;
    a.innerHTML = node.innerHTML;
    node.replaceWith(a);
    return a;
  }

  function repairMenu() {
    const menu = document.getElementById('gnk-asg-premium-menu');
    if (menu) {
      menu.querySelectorAll('a').forEach(a => {
        const text = (a.textContent || '').trim().toLowerCase();
        const href = (a.getAttribute('href') || '').toLowerCase();
        if (text.includes('media kit') || href === '/media-kit/' || href === '/media-kit') {
          a.href = downloads;
          a.textContent = isEn ? 'PDF / Media' : 'PDF / Media';
        }
      });
      menu.style.justifyContent = 'center';
      menu.style.marginInline = 'auto';
    }

    document.querySelectorAll('.top-nav').forEach(nav => {
      nav.style.justifyContent = 'center';
      nav.style.marginInline = 'auto';
      nav.querySelectorAll('[data-open="documents-modal"],[data-open="media-kit-modal"]').forEach(node => replaceButton(node,downloads));
    });

    document.querySelectorAll('[data-open="documents-modal"],[data-open="media-kit-modal"]').forEach(node => replaceButton(node,downloads));

    document.querySelectorAll('a[href="/media-kit/"],a[href="/media-kit"]').forEach(a => {
      a.href = downloads;
      if ((a.textContent || '').trim().toLowerCase() === 'media kit') a.textContent = isEn ? 'PDF / Media' : 'PDF / Media';
    });
  }

  function repairHomeHub() {
    const hub = document.querySelector('.gnk-asg-hub-grid');
    if (!hub || hub.querySelector('[data-gnk-doc-card="1"]')) return;
    const a = document.createElement('a');
    a.className = 'gnk-asg-hub-card';
    a.href = downloads;
    a.dataset.gnkDocCard = '1';
    a.innerHTML = isEn
      ? '<span>10 · Documents</span><strong>PDF and Media Centre</strong><p>Audited statements, consolidated report, certificate and Media Kits.</p>'
      : '<span>10 · Dokumenti</span><strong>PDF i Media centar</strong><p>Revidirani izvještaj, konsolidirano izvješće, certifikat i Media Kitovi.</p>';
    hub.appendChild(a);
  }

  function repairIndexDocuments() {
    const section = document.getElementById(isEn ? 'documents' : 'dokumenti');
    const grid = section?.querySelector('.pdf-grid');
    if (!grid || grid.dataset.gnkDocsV7 === '1') return;
    grid.dataset.gnkDocsV7 = '1';
    const cards = isEn ? [
      [asgReport,'▣','GNK ASG d.o.o. FY 2025','Independent auditor report and financial statements.'],
      [dinamoReport,'▣','GNK DINAMO Ltd. FY 2025','Management-certified, internally reviewed consolidated report; unaudited.'],
      [certificate,'✓','Certificate of Good Standing','Official Colorado Secretary of State certificate.'],
      [mediaEn,'▤','Corporate Media Kit 2026','Seven-page English corporate and media package.'],
      [mediaHr,'▤','Media Kit 2026 — Hrvatski','Sedmostranični hrvatski korporativni i medijski paket.'],
      [downloads,'⇩','PDF and Download Centre','Open the complete verified document centre.']
    ] : [
      [asgReport,'▣','GNK ASG d.o.o. FY 2025','Izvješće neovisnog revizora i financijski izvještaji.'],
      [dinamoReport,'▣','GNK DINAMO Ltd. FY 2025','Upravljački potvrđeno, interno pregledano konsolidirano izvješće; nerevidirano.'],
      [certificate,'✓','Certificate of Good Standing','Službeni certifikat Colorado Secretary of State.'],
      [mediaHr,'▤','Media Kit 2026 — Hrvatski','Sedmostranični hrvatski korporativni i medijski paket.'],
      [mediaEn,'▤','Corporate Media Kit 2026','Seven-page English corporate and media package.'],
      [downloads,'⇩','PDF i Download centar','Otvori cjeloviti centar provjerenih dokumenata.']
    ];
    grid.innerHTML = cards.map(([href,icon,title,desc],i) => `<a class="pdf-card" href="${href}"${i<5?' target="_blank" rel="noopener"':''}><span>${icon}</span><b>${title}</b><small>${desc}</small></a>`).join('');
  }

  function run() {
    repairMenu();
    repairHomeHub();
    repairIndexDocuments();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
  addEventListener('load',run,{once:true});
  setTimeout(run,350);
  setTimeout(run,1200);
  new MutationObserver(() => requestAnimationFrame(run)).observe(document.documentElement,{childList:true,subtree:true});
})();
