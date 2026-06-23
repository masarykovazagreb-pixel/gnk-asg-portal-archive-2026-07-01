(() => {
  'use strict';
  if (window.__GNK_ASG_DOCUMENT_CENTER_V2__) return;
  window.__GNK_ASG_DOCUMENT_CENTER_V2__ = true;

  const isEn = document.documentElement.lang === 'en';
  const centre = isEn ? '/en/downloads/' : '/downloads/';
  const hrKit = '/downloads/GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_HR_2026.pdf';
  const enKit = '/downloads/GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_EN_2026.pdf';
  const asgReport = '/documents/GNK_ASG_Izvjesce_neovisnog_revizora_i_financijski_izvjestaji_2025.pdf';

  function replaceButton(button,href) {
    if (!button || button.tagName === 'A') return button;
    const anchor = document.createElement('a');
    [...button.attributes].forEach(attr => {
      if (attr.name !== 'data-open' && attr.name !== 'type') anchor.setAttribute(attr.name,attr.value);
    });
    anchor.href = href;
    anchor.innerHTML = button.innerHTML;
    button.replaceWith(anchor);
    return anchor;
  }

  function connectNavigation() {
    document.querySelectorAll('[data-open="documents-modal"],[data-open="media-kit-modal"]').forEach(button => replaceButton(button,centre));
  }

  function buildCards() {
    const section = document.getElementById(isEn ? 'documents' : 'dokumenti');
    const grid = section?.querySelector('.pdf-grid');
    if (!grid) return;
    const cards = isEn ? [
      [asgReport,'▣','GNK ASG d.o.o. FY 2025','Independent auditor report and audited financial statements.'],
      [centre,'▣','GNK DINAMO Ltd. FY 2025','Management-certified and internally reviewed consolidated report; unaudited.'],
      [centre,'✓','Certificate of Good Standing','Official Colorado Secretary of State certificate, issued 16 June 2026.'],
      [enKit,'▤','Corporate Media Kit 2026','New seven-page English corporate and media package.'],
      [hrKit,'▤','Media Kit 2026 — Hrvatski','Novi sedmostranični hrvatski korporativni i medijski paket.'],
      [centre,'⇩','PDF and Download Centre','All source documents, Media Kits and verification notes.']
    ] : [
      [asgReport,'▣','GNK ASG d.o.o. FY 2025','Izvješće neovisnog revizora i revidirani financijski izvještaji.'],
      [centre,'▣','GNK DINAMO Ltd. FY 2025','Upravljački potvrđeno i interno pregledano konsolidirano izvješće; nerevidirano.'],
      [centre,'✓','Certificate of Good Standing','Službeni certifikat Colorado Secretary of State, izdan 16. lipnja 2026.'],
      [hrKit,'▤','Media Kit 2026 — Hrvatski','Novi sedmostranični hrvatski korporativni i medijski paket.'],
      [enKit,'▤','Corporate Media Kit 2026','New seven-page English corporate and media package.'],
      [centre,'⇩','PDF i Download centar','Svi izvorni dokumenti, Media Kitovi i napomene o provjeri.']
    ];
    grid.innerHTML = cards.map(([href,icon,title,description],index) => `<a class="pdf-card" href="${href}"${index===0||index===3||index===4?' target="_blank" rel="noopener"':''}><span>${icon}</span><b>${title}</b><small>${description}</small></a>`).join('');
  }

  function enhanceModal() {
    const modal = document.getElementById('documents-modal');
    if (!modal) return;
    const grid = modal.querySelector('.modal-grid');
    const actions = modal.querySelector('.actions');
    if (grid) grid.innerHTML = isEn
      ? `<article class="modal-item"><h4>GNK ASG d.o.o. FY 2025</h4><p>Independent auditor report and audited standalone financial statements.</p></article><article class="modal-item"><h4>GNK DINAMO Ltd. FY 2025</h4><p>Management-certified and internally reviewed consolidated report; not independently audited.</p></article><article class="modal-item"><h4>Colorado Good Standing</h4><p>Official Certificate of Fact of Good Standing for Entity ID 20238180649.</p></article><article class="modal-item"><h4>Media Kits 2026</h4><p>New English and Croatian seven-page corporate and media packages.</p></article>`
      : `<article class="modal-item"><h4>GNK ASG d.o.o. FY 2025</h4><p>Izvješće neovisnog revizora i revidirani samostalni financijski izvještaji.</p></article><article class="modal-item"><h4>GNK DINAMO Ltd. FY 2025</h4><p>Upravljački potvrđeno i interno pregledano konsolidirano izvješće; nije neovisno revidirano.</p></article><article class="modal-item"><h4>Colorado Good Standing</h4><p>Službeni Certificate of Fact of Good Standing za Entity ID 20238180649.</p></article><article class="modal-item"><h4>Media Kitovi 2026.</h4><p>Novi hrvatski i engleski sedmostranični korporativni i medijski paketi.</p></article>`;
    if (actions) actions.innerHTML = isEn
      ? `<a class="btn" href="${centre}">Open Download Centre</a><a class="btn" href="${asgReport}" target="_blank" rel="noopener">Audited GNK ASG report</a><a class="btn" href="${enKit}" target="_blank" rel="noopener">English Media Kit</a>`
      : `<a class="btn" href="${centre}">Otvori Download centar</a><a class="btn" href="${asgReport}" target="_blank" rel="noopener">Revidirani GNK ASG izvještaj</a><a class="btn" href="${hrKit}" target="_blank" rel="noopener">Hrvatski Media Kit</a>`;
  }

  connectNavigation();
  buildCards();
  enhanceModal();
})();
