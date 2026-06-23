(() => {
  'use strict';
  if (window.__GNK_ASG_PUBLIC_NAV_DOCS_V7__) return;
  window.__GNK_ASG_PUBLIC_NAV_DOCS_V7__ = true;

  const path = location.pathname.toLowerCase();
  if (/\/(operator-dashboard|operator-mobile|mail-studio|mail-studio-pro|admin-center|auto-editor|news-admin|pdf-publisher|social-share|wa-center|review)(\/|$)/.test(path)) return;
  if (['/contact','/contact/','/en/contact','/en/contact/'].includes(path)) return;

  const isEn = path.startsWith('/en/') || path.startsWith('/news/') || path.startsWith('/markets/') || path.startsWith('/publications/');
  const downloads = isEn ? '/en/downloads/' : '/downloads/';
  const hrKit = '/downloads/GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_HR_2026.pdf';
  const enKit = '/downloads/GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_EN_2026.pdf';
  const asgReport = '/documents/GNK_ASG_Izvjesce_neovisnog_revizora_i_financijski_izvjestaji_2025.pdf';

  function replaceButton(node,href) {
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
          a.textContent = 'PDF / Media';
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
    document.querySelectorAll('a[href="/media-kit/"],a[href="/media-kit"]').forEach(a => { a.href = downloads; });
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
      [asgReport,'▣','GNK ASG d.o.o. FY 2025','Independent auditor report and audited financial statements.'],
      [downloads,'▣','GNK DINAMO Ltd. FY 2025','Management-certified consolidated report and Colorado filing record.'],
      [downloads,'✓','Certificate of Good Standing','Official Colorado Secretary of State certificate.'],
      [enKit,'▤','Corporate Media Kit 2026','New seven-page English corporate and media package.'],
      [hrKit,'▤','Media Kit 2026 — Hrvatski','Sedmostranični hrvatski korporativni i medijski paket.'],
      [downloads,'⇩','PDF and Download Centre','Open the complete verified document centre.']
    ] : [
      [asgReport,'▣','GNK ASG d.o.o. FY 2025','Izvješće neovisnog revizora i revidirani financijski izvještaji.'],
      [downloads,'▣','GNK DINAMO Ltd. FY 2025','Upravljački potvrđeno konsolidirano izvješće i Colorado filing zapis.'],
      [downloads,'✓','Certificate of Good Standing','Službeni certifikat Colorado Secretary of State.'],
      [hrKit,'▤','Media Kit 2026 — Hrvatski','Novi sedmostranični hrvatski korporativni i medijski paket.'],
      [enKit,'▤','Corporate Media Kit 2026','New seven-page English corporate and media package.'],
      [downloads,'⇩','PDF i Download centar','Otvori cjeloviti centar provjerenih dokumenata.']
    ];
    grid.innerHTML = cards.map(([href,icon,title,desc],i) => `<a class="pdf-card" href="${href}"${i===0||i===3||i===4?' target="_blank" rel="noopener"':''}><span>${icon}</span><b>${title}</b><small>${desc}</small></a>`).join('');
  }

  function run() {
    repairMenu();
    repairHomeHub();
    repairIndexDocuments();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  addEventListener('load',run,{once:true});
  setTimeout(run,300);
  setTimeout(run,1000);
  new MutationObserver(() => requestAnimationFrame(run)).observe(document.documentElement,{childList:true,subtree:true});
})();
