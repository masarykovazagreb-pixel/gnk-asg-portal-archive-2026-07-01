(() => {
  'use strict';
  const KEY = 'gnk_asg_language';
  const translations = {
    en: {
      'IZBORNIK':'MENU','GNK ASG':'GNK ASG','Grupa':'Group','Technology & AI':'Technology & AI','Digital Assets':'Digital Assets','Business News':'Business News','AI Assistant':'AI Assistant','Dokumenti':'Documents',
      'Korporativni portal · Zagreb · Hrvatska':'Corporate Portal · Zagreb · Croatia','Building value.':'Building value.','Driving technology.':'Driving technology.',
      'GNK ASG d.o.o. predstavlja poslovni identitet na sjecištu sporta, tehnologije, digitalne imovine, financija i upravljanja, u okviru međunarodne strukture GNK DINAMO Ltd. grupe.':'GNK ASG d.o.o. represents a business identity at the intersection of sport, technology, digital assets, finance and governance, within the international structure of the GNK DINAMO Ltd. group.',
      'Financijski pokazatelji':'Financial Indicators','Tehnologija i AI':'Technology and AI','Digital Assets Monitor':'Digital Assets Monitor','Korporativni profil':'Corporate Profile','Sjedište':'Registered office','Direktor':'Director',
      'Revidirani pokazatelji · FY 2025':'Audited indicators · FY 2025','Financijski profil GNK ASG d.o.o.':'GNK ASG d.o.o. Financial Profile','Prikaz samostalnih financijskih podataka društva prema godišnjim financijskim izvještajima za 2025. i izvješću neovisnog revizora.':'Standalone company financial data according to the 2025 annual financial statements and the independent auditor report.',
      'Ukupni prihodi':'Total revenue','Prihodi od prodaje 2025.':'Sales revenue 2025','Ukupna aktiva':'Total assets','Na dan 31.12.2025.':'As at 31 December 2025','Kapital i rezerve':'Capital and reserves','Kratkoročne obveze':'Current liabilities','Bez dugoročnih obveza':'No long-term liabilities',
      'Naziv':'Name','Osnovano':'Founded','Pretežita djelatnost':'Principal activity','Sportske djelatnosti, NKD 93.19.0':'Sports activities, NKD 93.19.0','Član društva':'Shareholder','Revizija i financijska osnova':'Audit and Financial Basis',
      'Dobit prije oporezivanja':'Profit before tax','Dobit godine':'Profit for the year','Nematerijalna imovina / softver':'Intangible assets / software','Dugoročne obveze':'Long-term liabilities',
      'Međunarodni grupni okvir':'International group framework','Konsolidirani pokazatelji FY 2025':'Consolidated indicators FY 2025','Prihodi grupe':'Group revenue','Neto dobit':'Net profit','Obveze':'Liabilities','Udio kapitala':'Equity ratio',
      'Digitalna strategija':'Digital strategy','Technology & Artificial Intelligence':'Technology & Artificial Intelligence','Tehnološki fokus portala povezuje informatiku, podatke, naprednu analitiku, fintech i sportske digitalne sustave.':'The portal technology focus connects information technology, data, advanced analytics, fintech and digital sports systems.',
      'Artificial Intelligence':'Artificial Intelligence','Software Platforms':'Software Platforms','FinTech & Digital Assets':'FinTech & Digital Assets','Sports Technology':'Sports Technology','Cybersecurity':'Cybersecurity','Global Innovation':'Global Innovation',
      'Informativni tržišni prikaz':'Informational Market Display','GNK ASG Digital Exchange Monitor':'GNK ASG Digital Exchange Monitor','Aktualne indikativne vrijednosti odabrane digitalne imovine i konverter prema vodećim svjetskim valutama.':'Current indicative values of selected digital assets and a converter into leading world currencies.','Prikaz valute':'Display currency','Učitavanje…':'Loading…','Učitavanje tržišta…':'Loading markets…',
      'Informativni pregled tržišnih vrijednosti. Portal ne pruža uslugu kupnje, prodaje, čuvanja digitalne imovine niti individualno investicijsko savjetovanje.':'Informational overview of market values. The portal does not provide digital-asset trading, custody or individual investment advice.',
      'Ažuriranje svaki sat':'Hourly update','Business & Technology News':'Business & Technology News','Poslovne i tehnološke vijesti iz Hrvatske, Slovenije, Srbije, Bosne i Hercegovine i međunarodnih izvora, uz posebno praćenje GNK ASG, GNK DINAMO Ltd. i Nermina Sefića.':'Business and technology news from Croatia, Slovenia, Serbia, Bosnia and Herzegovina and international sources, with dedicated monitoring of GNK ASG and GNK DINAMO Ltd.',
      'Sve':'All','Hrvatska':'Croatia','Slovenija':'Slovenia','Srbija':'Serbia','Svijet':'World','GNK ASG u medijima':'GNK ASG in the Media','Poslovne vijesti u pripremi':'Business news loading','Izvori će se osvježavati automatski nakon prvog pokretanja workflowa.':'Sources refresh automatically after the feed workflow runs.',
      'Informativni digitalni pomoćnik':'Informational digital assistant','GNK ASG AI Assistant':'GNK ASG Intelligence Desk','Postavite pitanje o GNK ASG, GNK DINAMO Ltd. grupnom okviru, tehnologiji, umjetnoj inteligenciji ili digitalnoj imovini.':'Ask about GNK ASG, the GNK DINAMO Ltd. group framework, technology, artificial intelligence or digital assets.','Koji su prihodi GNK ASG za 2025.?':'What was GNK ASG revenue in 2025?','Što je GNK DINAMO Ltd. grupa?':'What is the GNK DINAMO Ltd. group?','Što je Bitcoin?':'What is Bitcoin?','Kako se koristi AI u poslovanju?':'How is AI used in business?','POŠALJI':'SEND','Upišite pitanje…':'Enter your question…',
      'Transparentnost':'Transparency','Javni dokumenti i izvori':'Public Documents and Sources','Dokumentacijska osnova korporativnih i financijskih pokazatelja prikazanih na portalu.':'Documentary basis for the corporate and financial indicators presented on the portal.','Izvješće neovisnog revizora i financijski izvještaji':'Independent Auditor Report and Financial Statements','Službena web-stranica':'Official Website','OTVORI IZVOR →':'OPEN SOURCE →','Kontakt i podatci':'Contact and Corporate Data','Navigacija':'Navigation','Financijski profil':'Financial Profile','Korporativni portal. Podatci o tržištima imaju isključivo informativnu svrhu.':'Corporate portal. Market data are provided for information only.'
    }
  };
  const original = new WeakMap();
  function lang(){ return localStorage.getItem(KEY) || 'hr'; }
  function translateText(node, target){
    if (!original.has(node)) original.set(node, node.nodeValue);
    const base = original.get(node);
    const trimmed = base.trim();
    const translated = target === 'en' ? translations.en[trimmed] : trimmed;
    if (translated && translated !== trimmed) node.nodeValue = base.replace(trimmed, translated);
    else node.nodeValue = base;
  }
  function apply(target){
    document.documentElement.lang = target;
    document.title = target === 'en' ? 'GNK ASG d.o.o. | Sport, Technology, Finance and Governance' : 'GNK ASG d.o.o. | Sport, tehnologija, financije i upravljanje';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node; while ((node = walker.nextNode())) {
      if (node.parentElement && !['SCRIPT','STYLE'].includes(node.parentElement.tagName)) translateText(node, target);
    }
    document.querySelectorAll('[data-lang]').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === target));
    const input = document.getElementById('chatInput'); if (input) input.placeholder = target === 'en' ? 'Enter your question…' : 'Upišite pitanje…';
    window.dispatchEvent(new CustomEvent('gnk-language-change', {detail:{lang:target}}));
  }
  function init(){
    const nav = document.querySelector('.nav'); if (!nav || document.querySelector('.language-switch')) return;
    const toggle = document.createElement('div'); toggle.className='language-switch'; toggle.setAttribute('aria-label','Language / Jezik');
    toggle.innerHTML='<button type="button" data-lang="hr">HR</button><button type="button" data-lang="en">EN</button>';
    nav.appendChild(toggle);
    toggle.querySelectorAll('button').forEach(btn => btn.onclick = () => { localStorage.setItem(KEY, btn.dataset.lang); apply(btn.dataset.lang); });
    apply(lang());
  }
  window.GNK_LANG = {get: lang, apply: apply, t: (text) => lang() === 'en' ? (translations.en[text] || text) : text};
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
