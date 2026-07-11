(() => {
  'use strict';
  const esc = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const language = () => (window.GNK_LANG && window.GNK_LANG.get() === 'en') ? 'en' : 'hr';
  const links = {
    insights:'/en/insights/',
    aiPortal:'/en/insights/2026/05/ai-corporate-portal-understanding/',
    aiGovernance:'/en/insights/2026/05/ai-governance-corporate-accountability/',
    contactHr:'/kontakt/',
    contactEn:'/en/contact/',
    webmail:'/webmail/',
    whatsapp:'https://wa.me/385916104398',
    mail:'mailto:contact@gnk-asg.hr'
  };
  const content = {
    hr: {
      eyebrow:'Digitalna infrastruktura i poslovna rješenja',
      title:'Technology Services & Intelligent Systems',
      intro:'GNK ASG portal predstavlja tehnološki profil usmjeren na programske platforme, podatkovnu analitiku, umjetnu inteligenciju, digitalnu imovinu i sigurnu poslovnu infrastrukturu.',
      solutions:[['Platforme','Enterprise Software','Skalabilne digitalne platforme, integracije i podatkovni sustavi za međunarodne poslovne procese.'],['Intelligence','AI & Analytics','Modeli, automatizacija i analitika za obradu informacija, tržišnih pokazatelja i dokumentacije.'],['FinTech','Digital Assets','Informativni market monitoring, konverzije i podatkovni prikaz digitalne imovine.'],['Governance','Secure Operations','Sigurnost, dokumentirana transparentnost i kontrolirani javni korporativni podatci.']],
      strip:[['AI READY','Inteligentno korisničko sučelje'],['HOURLY DATA','Satno osvježavanje vijesti'],['MARKET MONITOR','BTC, zlato, nafta i USD'],['BILINGUAL','Hrvatski / English']],
      deskEyebrow:'Korporativni informacijski centar',
      deskTitle:'GNK ASG Intelligence Desk',
      deskText:'Unaprijeđeni digitalni pomoćnik za javne korporativne podatke, dokumente, Insight članke, kontaktno usmjeravanje, tržišne panele i pripremu budućeg mail-asistenta.',
      modes:[['corporate','Korporativno','Društvo i grupa'],['financial','Financije','FY 2025'],['technology','Tehnologija','AI i platforme'],['market','Tržišta','Digital assets'],['support','Kontakt','Mail i WhatsApp']],
      capability:['Odgovori o javnim pokazateljima GNK ASG d.o.o.','Usmjeravanje prema javnim dokumentima i izvorima','Pomoć oko kontaktnih, Zoho i webmail postupaka','Povezivanje s GNK ASG Insights člancima','Tumačenje informativnih tržišnih panela'],
      status:['Javni podatci','Dokumentirani izvori','Kontakt routing','HR / EN'],
      welcome:'Pozdrav. Ja sam GNK ASG Intelligence Desk. Mogu pomoći oko GNK ASG-a, GNK DINAMO Ltd. okvira, financija, dokumenata, Insight članaka, kontakta, Zoho/webmail pripreme i tržišnih panela.',
      quick:['Prihodi 2025.','Kapital i aktiva','GNK ASG Insights','Kontakt i WhatsApp','Zoho sigurnosna napomena','AI mail-asistent','Dokumenti i izvori','Tržišni panel'],
      placeholder:'Postavite pitanje Intelligence Desku…', send:'POŠALJI',
      legal:'Odgovori su informativni i temelje se na javno prikazanim podatcima portala; nisu pravni, revizorski, porezni, financijski ni investicijski savjet.'
    },
    en: {
      eyebrow:'Digital Infrastructure and Business Solutions',
      title:'Technology Services & Intelligent Systems',
      intro:'The GNK ASG portal presents a technology profile focused on software platforms, data analytics, artificial intelligence, digital assets and secure business infrastructure.',
      solutions:[['Platforms','Enterprise Software','Scalable digital platforms, integrations and data systems for international business processes.'],['Intelligence','AI & Analytics','Models, automation and analytics for information, market indicators and document processing.'],['FinTech','Digital Assets','Informational market monitoring, conversion and digital-asset data display.'],['Governance','Secure Operations','Security, documented transparency and controlled public corporate data.']],
      strip:[['AI READY','Intelligent user interface'],['HOURLY DATA','Hourly news refresh'],['MARKET MONITOR','BTC, gold, oil and USD'],['BILINGUAL','Croatian / English']],
      deskEyebrow:'Corporate Information Centre',
      deskTitle:'GNK ASG Intelligence Desk',
      deskText:'An upgraded digital assistant for public corporate data, documents, Insight articles, contact routing, market panels and future mail-assistant preparation.',
      modes:[['corporate','Corporate','Company and group'],['financial','Financials','FY 2025'],['technology','Technology','AI and platforms'],['market','Markets','Digital assets'],['support','Contact','Mail and WhatsApp']],
      capability:['Answers on public GNK ASG d.o.o. indicators','Guidance to public documents and sources','Contact, Zoho and webmail guidance','Links to GNK ASG Insights articles','Explanation of informational market panels'],
      status:['Public data','Documented sources','Contact routing','HR / EN'],
      welcome:'Welcome. I am the GNK ASG Intelligence Desk. I can help with GNK ASG, the GNK DINAMO Ltd. framework, financials, documents, Insight articles, contact routing, Zoho/webmail preparation and market panels.',
      quick:['2025 revenue','Capital and assets','GNK ASG Insights','Contact and WhatsApp','Zoho security notice','AI mail assistant','Documents and sources','Market panel'],
      placeholder:'Ask the Intelligence Desk…', send:'SEND',
      legal:'Responses are informational and based on publicly displayed portal data; they are not legal, audit, tax, financial or investment advice.'
    }
  };
  let mode = 'corporate';
  let market = null;
  let status = null;
  let contact = null;
  function contactEmail() { return contact?.primary_form_email || 'contact@gnk-asg.hr'; }
  function generalEmail() { return contact?.general_email || 'info@gnk-asg.hr'; }
  function contactPhone() { return contact?.phone_display || '+385 91 610 4398'; }
  function contactUrl() { return language() === 'en' ? links.contactEn : links.contactHr; }
  function sourceLine(type) {
    const en = language() === 'en';
    if (type === 'contact') return en ? '\n\nOfficial contact: ' + contactUrl() : '\n\nSlužbeni kontakt: ' + contactUrl();
    if (type === 'insight') return en ? '\n\nSee GNK ASG Insights: ' + links.insights : '\n\nPogledajte GNK ASG Insights: ' + links.insights;
    return en ? '\n\nSource: public portal sections and displayed public data.' : '\n\nIzvor: javne sekcije portala i prikazani javni podatci.';
  }
  function reply(query) {
    const en = language() === 'en';
    const q = String(query || '').toLowerCase();
    if (/kontakt|contact|email|mail|e-mail|whatsapp|telefon|phone|broj|call|poziv/.test(q)) return en ? 'Official routing: use ' + contactEmail() + ' for formal inquiries, ' + generalEmail() + ' for general e-mail, and WhatsApp/contact ' + contactPhone() + ' for initial contact. For formal matters, written e-mail communication is preferred.' + sourceLine('contact') : 'Službeno usmjeravanje: za formalne upite koristite ' + contactEmail() + ', za opći e-mail ' + generalEmail() + ', a za WhatsApp/kontakt ' + contactPhone() + '. Za formalne stvari prednost ima pisana e-mail komunikacija.' + sourceLine('contact');
    if (/zoho|webmail|lozink|zapork|password|prijav|login|credentials/.test(q)) return en ? 'Zoho Mail rule: after activation, sign-in data must be entered only on the official secure Zoho sign-in page. The GNK ASG portal does not request or store e-mail credentials. The portal may only provide a safe link or guidance to the webmail area.' : 'Zoho Mail pravilo: nakon aktivacije, podaci za prijavu unose se isključivo na službenoj sigurnoj Zoho prijavnoj stranici. GNK ASG portal ne traži i ne pohranjuje zaporku e-pošte. Portal može samo prikazati sigurnu uputu ili poveznicu prema webmail dijelu.';
    if (/asistent|assistant|agent|mail-asistent|mail agent|odgovara|inbox|poruke|draft/.test(q)) return en ? 'The future AI mail assistant should operate in stages: read-only classification, draft-only replies, human review for sensitive matters, and only later limited approved sending. It should route inquiries to ' + contactEmail() + ' and never act as a personal sender without approval.' : 'Budući AI mail-asistent treba raditi u fazama: read-only klasifikacija, draft-only odgovori, ljudska provjera za osjetljive teme i tek kasnije ograničeno odobreno slanje. Upite treba usmjeravati na ' + contactEmail() + ' i ne smije nastupati kao osobni pošiljatelj bez odobrenja.';
    if (/insight|članak|clanak|article|objav|governance|portal understanding|corporate portal|ai governance/.test(q)) return en ? 'GNK ASG Insights currently includes the AI corporate portal article and the AI governance/accountability article. Start here: ' + links.insights + ' The AI portal article is at ' + links.aiPortal + ' and the governance article is at ' + links.aiGovernance + '.' : 'GNK ASG Insights trenutačno uključuje članak o AI razumijevanju korporativnog portala i članak o AI governance / accountability temi. Početak je ovdje: ' + links.insights + ' Članak o portalu: ' + links.aiPortal + ' Governance članak: ' + links.aiGovernance + '.';
    if (/prihod|revenue|504/.test(q)) return (en ? 'GNK ASG d.o.o. displays total revenue of EUR 504.00 million for FY 2025 in the public company financial profile.' : 'GNK ASG d.o.o. u javnom financijskom profilu za FY 2025 prikazuje ukupne prihode od 504,00 mil. EUR.') + sourceLine();
    if (/kapital|aktiva|assets|equity|obvez|liabilit/.test(q)) return (en ? 'As at 31 December 2025, total assets are displayed as EUR 46.40 million and capital and reserves as EUR 46.21 million, with current liabilities of EUR 184.50 thousand and no long-term liabilities.' : 'Na dan 31.12.2025. prikazana je aktiva od 46,40 mil. EUR te kapital i rezerve od 46,21 mil. EUR, uz kratkoročne obveze od 184,50 tis. EUR i bez dugoročnih obveza.') + sourceLine();
    if (/grup|dinamo|group|gnk dinamo/.test(q)) return (en ? 'The portal presents GNK DINAMO Ltd. of Boulder, Colorado as the international group framework and separately identifies the basis of the displayed consolidated FY 2025 indicators.' : 'Portal prikazuje GNK DINAMO Ltd. iz Bouldera, Colorado kao međunarodni grupni okvir te posebno navodi osnovu prikazanih konsolidiranih pokazatelja FY 2025.') + sourceLine();
    if (/nermin|sefic|sefić|director|owner|ubo|vlasnik|direktor/.test(q)) return en ? 'The portal references Nermin Sefic / Nermin Sefić in the appropriate corporate layer as group owner and director, while the primary public narrative remains GNK ASG d.o.o. and the GNK DINAMO Ltd. framework.' : 'Portal Nermina Sefića navodi u odgovarajućem korporativnom sloju kao vlasnika grupe i direktora, dok glavna javna priča ostaje GNK ASG d.o.o. i GNK DINAMO Ltd. okvir.';
    if (/medij|media|vijest|news/.test(q)) return en ? 'The media/news area monitors public online publications that mention GNK ASG or GNK DINAMO Ltd. News data are scheduled for regular refresh and should remain separate from official company statements.' : 'Medijski/news dio prati javne internetske objave koje spominju GNK ASG ili GNK DINAMO Ltd. Vijesti se redovno osvježavaju i trebaju ostati odvojene od službenih izjava društva.';
    if (/bitcoin|btc|zlato|gold|naft|oil|usd|market|trži/.test(q)) {
      if (market && market.assets) {
        const a = market.assets;
        const format = (n, unit) => new Intl.NumberFormat(en ? 'en-US' : 'hr-HR', {maximumFractionDigits:2}).format(n) + ' ' + unit;
        return (en ? 'Current displayed indicative values: Bitcoin ' + format(a.btc.current,'USD/BTC') + ', gold ' + format(a.gold.current,'USD/oz') + ' and Brent oil ' + format(a.oil.current,'USD/barrel') + '. The cross-asset panel also compares USD/EUR movements.' : 'Trenutačno prikazane indikativne vrijednosti: Bitcoin ' + format(a.btc.current,'USD/BTC') + ', zlato ' + format(a.gold.current,'USD/unca') + ' i Brent nafta ' + format(a.oil.current,'USD/barel') + '. Usporedni panel prikazuje i kretanje USD/EUR.') + (en ? '\n\nInformational market display only.' : '\n\nSamo informativni tržišni prikaz.');
      }
      return en ? 'The market monitor compares Bitcoin, gold, Brent oil and USD/EUR using indicative data refreshed by the portal workflow. It is not a trading or investment service.' : 'Market monitor uspoređuje Bitcoin, zlato, Brent naftu i USD/EUR koristeći indikativne podatke koje portal osvježava kroz workflow. To nije usluga trgovanja ni investicijski savjet.';
    }
    if (/ai|umjet|software|platform|tehnolog|technology|cyber|automat/.test(q)) return en ? 'The technology profile covers artificial intelligence, software platforms, fintech and digital assets, sports technology, cybersecurity and global innovation. The Intelligence Desk should remain source-aware and route sensitive matters to review.' : 'Tehnološki profil obuhvaća umjetnu inteligenciju, softverske platforme, fintech i digitalnu imovinu, sportsku tehnologiju, kibernetičku sigurnost i globalne inovacije. Intelligence Desk treba ostati vezan uz izvore i osjetljive teme usmjeravati na provjeru.';
    if (/dokument|document|reviz|audit|izvor|source|pdf/.test(q)) return en ? 'The Documents section identifies the independent auditor report and financial statements for GNK ASG d.o.o. for 2025, the GNK DINAMO Ltd. consolidated group report and the official corporate information source. For formal document requests, use ' + contactEmail() + '.' : 'Sekcija Dokumenti navodi izvješće neovisnog revizora i financijske izvještaje GNK ASG d.o.o. za 2025., konsolidirani grupni izvještaj GNK DINAMO Ltd. i službeni izvor korporativnih informacija. Za formalne zahtjeve koristite ' + contactEmail() + '.';
    if (/seo|google|pretrag|search|meta|schema|sitemap/.test(q)) return en ? 'The portal uses public routes, sitemap entries, canonical URLs, meta descriptions, Open Graph/Twitter preview metadata and structured article pages to support search visibility. Social distribution should be added only after preview testing.' : 'Portal koristi javne rute, sitemap, canonical URL-ove, meta opise, Open Graph/Twitter preview metapodatke i strukturirane article stranice radi bolje vidljivosti u pretragama. Distribuciju na društvene mreže treba uključiti tek nakon provjere previewa.';
    return en ? 'I can help with corporate information, FY 2025 financial data, GNK DINAMO Ltd. framework, documents, Insights, contact routing, Zoho/webmail preparation, the AI mail-assistant model and market panels. Ask a more specific question or choose a quick topic.' : 'Mogu pomoći oko korporativnih informacija, financijskih podataka FY 2025, GNK DINAMO Ltd. okvira, dokumenata, Insights članaka, kontakt usmjeravanja, Zoho/webmail pripreme, AI mail-asistenta i tržišnih panela. Postavite preciznije pitanje ili odaberite brzu temu.';
  }
  function solutionsSection() {
    if (document.getElementById('solutions')) return;
    const tech = document.getElementById('technology');
    if (!tech) return;
    const section = document.createElement('section'); section.id = 'solutions'; section.className = 'solutions';
    tech.insertAdjacentElement('afterend', section); renderSolutions();
  }
  function renderSolutions() {
    const section = document.getElementById('solutions'); if (!section) return;
    const c = content[language()];
    section.innerHTML = '<div class="container"><div class="section-head"><div><p class="eyebrow">' + esc(c.eyebrow) + '</p><h2>' + esc(c.title) + '</h2></div><p>' + esc(c.intro) + '</p></div><div class="solution-grid">' + c.solutions.map(item => '<article class="solution-card"><span class="label">' + esc(item[0]) + '</span><h3>' + esc(item[1]) + '</h3><p>' + esc(item[2]) + '</p></article>').join('') + '</div><div class="solution-strip">' + c.strip.map(item => '<div><strong>' + esc(item[0]) + '</strong><span>' + esc(item[1]) + '</span></div>').join('') + '</div></div>';
  }
  function desk() {
    const original = document.getElementById('assistant'); if (!original) return;
    original.innerHTML = '<div class="container intelligence-shell"><div class="desk-panel" id="deskPanel"></div><div class="desk-console"><div class="desk-status" id="deskStatus"></div><div class="desk-transcript" id="deskTranscript"></div><div class="desk-quick" id="deskQuick"></div><form class="desk-form" id="deskForm"><input id="deskInput" autocomplete="off"><button type="submit"></button></form><div class="desk-legal" id="deskLegal"></div></div></div>';
    original.querySelector('#deskForm').addEventListener('submit', event => { event.preventDefault(); ask(original.querySelector('#deskInput').value); });
    renderDesk(true);
  }
  function renderDesk(reset) {
    const panel = document.getElementById('deskPanel'); if (!panel) return;
    const c = content[language()];
    panel.innerHTML = '<p class="eyebrow">' + esc(c.deskEyebrow) + '</p><h2>' + esc(c.deskTitle) + '</h2><p>' + esc(c.deskText) + '</p><div class="desk-modes">' + c.modes.map(item => '<button type="button" class="desk-mode ' + (item[0] === mode ? 'active' : '') + '" data-mode="' + item[0] + '"><strong>' + esc(item[1]) + '</strong><small>' + esc(item[2]) + '</small></button>').join('') + '</div><div class="desk-capabilities">' + c.capability.map(item => '<div>✓ ' + esc(item) + '</div>').join('') + '</div>';
    const modeQuick = {corporate:1, financial:0, technology:2, market:7, support:3};
    panel.querySelectorAll('.desk-mode').forEach(button => button.onclick = () => { mode = button.dataset.mode; panel.querySelectorAll('.desk-mode').forEach(b => b.classList.toggle('active', b === button)); ask(c.quick[modeQuick[mode] || 0]); });
    document.getElementById('deskStatus').innerHTML = c.status.map((item, index) => '<span class="' + (index === 0 ? 'online' : '') + '">' + esc(item) + '</span>').join('');
    document.getElementById('deskQuick').innerHTML = c.quick.map(item => '<button type="button">' + esc(item) + '</button>').join('');
    document.querySelectorAll('#deskQuick button').forEach(button => button.onclick = () => ask(button.textContent));
    document.getElementById('deskInput').placeholder = c.placeholder;
    document.querySelector('#deskForm button').textContent = c.send;
    document.getElementById('deskLegal').textContent = c.legal;
    if (reset || !document.querySelector('.desk-message')) document.getElementById('deskTranscript').innerHTML = '<div class="desk-message bot">' + esc(c.welcome) + '</div>';
  }
  function ask(question) {
    if (!String(question || '').trim()) return;
    const transcript = document.getElementById('deskTranscript'); if (!transcript) return;
    transcript.insertAdjacentHTML('beforeend','<div class="desk-message user">' + esc(question) + '</div><div class="desk-message bot">' + esc(reply(question)) + '</div>');
    transcript.scrollTop = transcript.scrollHeight;
    document.getElementById('deskInput').value = '';
  }
  async function loadData() {
    try { const response = await fetch('/data/macro_market.json?v=' + Date.now(), {cache:'no-store'}); if (response.ok) market = await response.json(); } catch (error) {}
    try { const response = await fetch('/data/update_status.json?v=' + Date.now(), {cache:'no-store'}); if (response.ok) status = await response.json(); } catch (error) {}
    try { const response = await fetch('/data/contact_channels.json?v=' + Date.now(), {cache:'no-store'}); if (response.ok) contact = await response.json(); } catch (error) {}
  }
  function init() {
    solutionsSection(); desk(); loadData();
    window.addEventListener('gnk-language-change', () => { renderSolutions(); renderDesk(true); });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();