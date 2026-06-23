(() => {
  'use strict';
  if (window.__GNK_ASG_DOCUMENT_CENTER_V2__) return;
  window.__GNK_ASG_DOCUMENT_CENTER_V2__ = true;

  const isEn = document.documentElement.lang === 'en';
  const centre = isEn ? '/en/downloads/' : '/downloads/';
  const hrPdf = '/downloads/GNK_ASG_GNK_DINAMO_Ltd_Media_Kit_2_HR.pdf';
  const enPdf = '/downloads/GNK_ASG_GNK_DINAMO_LTD_MEDIA_KIT_EN.pdf';

  function replaceButton(button, href) {
    if (!button || button.tagName === 'A') return button;
    const anchor = document.createElement('a');
    for (const attr of button.attributes) {
      if (attr.name !== 'data-open' && attr.name !== 'type') anchor.setAttribute(attr.name, attr.value);
    }
    anchor.href = href;
    anchor.innerHTML = button.innerHTML;
    button.replaceWith(anchor);
    return anchor;
  }

  function connectNavigation() {
    document.querySelectorAll('[data-open="documents-modal"]').forEach(button => replaceButton(button, centre));
    document.querySelectorAll('[data-open="media-kit-modal"]').forEach(button => replaceButton(button, centre));
  }

  function buildCards() {
    const section = document.getElementById(isEn ? 'documents' : 'dokumenti');
    const grid = section?.querySelector('.pdf-grid');
    if (!grid) return;
    const cards = isEn ? [
      [enPdf,'▣','GNK ASG / GNK DINAMO Ltd. Media Kit','English corporate profile, approved facts, visual guidance and contacts.','Download PDF'],
      [hrPdf,'▣','Media Kit — hrvatski','Korporativni profil, javne činjenice, vizualne smjernice i kontakti.','Preuzmi PDF'],
      [centre,'⇩','PDF and Download Centre','All available documents and verified public sources.','Open centre'],
      ['/visual-index/','▦','Visual Index','Photography, gallery and approved visual assets.','Open gallery'],
      ['/en/legal/','⚖','Legal documents','Terms, privacy, GDPR and legal notices.','Open legal'],
      ['/en/contact/','✉','Request a signed document','Use the secure contact form for audited or legal originals.','Contact']
    ] : [
      [hrPdf,'▣','GNK ASG / GNK DINAMO Ltd. Media Kit','Hrvatski korporativni profil, javne činjenice, vizualne smjernice i kontakti.','Preuzmi PDF'],
      [enPdf,'▣','Corporate Media Kit — English','Company profiles, approved facts, visual guidance and contacts.','Download PDF'],
      [centre,'⇩','PDF i Download centar','Svi dostupni dokumenti i provjereni javni izvori.','Otvori centar'],
      ['/visual-index/','▦','Visual Index','Fotografije, galerija i odobreni vizualni materijali.','Otvori galeriju'],
      ['/legal/','⚖','Pravni dokumenti','Uvjeti, privatnost, GDPR i pravne obavijesti.','Otvori legal'],
      ['/contact/','✉','Zatraži potpisani dokument','Za revizorske ili pravne originale koristite sigurnu kontakt formu.','Kontakt']
    ];
    grid.innerHTML = cards.map(([href,icon,title,description,action],index) => {
      const download = index < 2 ? ' download' : '';
      return `<a class="pdf-card" href="${href}"${download}><span>${icon}</span><b>${title}</b><small>${description}</small><em style="display:block;margin-top:10px;color:var(--gold);font-style:normal;font-size:10px;font-weight:900;text-transform:uppercase">${action} ↓</em></a>`;
    }).join('');
  }

  function enhanceModal() {
    const modal = document.getElementById('documents-modal');
    if (!modal) return;
    const grid = modal.querySelector('.modal-grid');
    const actions = modal.querySelector('.actions');
    if (grid) grid.innerHTML = isEn
      ? `<article class="modal-item"><h4>Corporate Media Kit — English</h4><p>Five-page public company and media profile, available for direct download.</p></article><article class="modal-item"><h4>Media Kit — Croatian</h4><p>Hrvatski korporativni i medijski paket dostupan za izravno preuzimanje.</p></article><article class="modal-item"><h4>Signed financial documents</h4><p>Audited or consolidated originals are shown only after physical upload and verification.</p></article><article class="modal-item"><h4>Legal and visual sources</h4><p>Legal notices, Visual Index and official corporate sources remain available separately.</p></article>`
      : `<article class="modal-item"><h4>Media Kit — hrvatski</h4><p>Javni korporativni i medijski paket od pet stranica dostupan je za izravno preuzimanje.</p></article><article class="modal-item"><h4>Corporate Media Kit — English</h4><p>Engleski profil društava, javne činjenice, vizualne smjernice i kontakti.</p></article><article class="modal-item"><h4>Potpisani financijski dokumenti</h4><p>Revizorski i konsolidirani originali prikazuju se tek nakon fizičkog učitavanja i provjere.</p></article><article class="modal-item"><h4>Pravni i vizualni izvori</h4><p>Legal, Visual Index i službeni korporativni izvori dostupni su zasebno.</p></article>`;
    if (actions) actions.innerHTML = isEn
      ? `<a class="btn" href="${enPdf}" download>Download English PDF</a><a class="btn" href="${hrPdf}" download>Preuzmi HR PDF</a><a class="btn" href="${centre}">Open Download Centre</a>`
      : `<a class="btn" href="${hrPdf}" download>Preuzmi hrvatski PDF</a><a class="btn" href="${enPdf}" download>Download English PDF</a><a class="btn" href="${centre}">Otvori Download centar</a>`;
  }

  connectNavigation();
  buildCards();
  enhanceModal();
})();
