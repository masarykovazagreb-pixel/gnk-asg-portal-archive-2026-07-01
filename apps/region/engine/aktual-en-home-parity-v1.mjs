/**
 * AKTUAL MEDIA English home parity.
 * Reflects the Croatian /gnk-aktual/ WORLD preview, editorial takeover,
 * single promo dialog and 5-column gateway on /en/gnk-aktual/.
 * No translation of live news, no new factual reporting; promotional
 * network-size figures are explicitly labelled as unverified specifications.
 * The function is idempotent, uses current shared CSS and accessible markup.
 */
const START = '<!-- AKTUAL-EN-WORLD-PARITY:START -->';
const END = '<!-- AKTUAL-EN-WORLD-PARITY:END -->';
const WORLD = 'https://j1hex9qg03f0-d.space-z.ai/';
const CROATIA = WORLD + '?country=hrvatska';

export function applyEnglishWorldParity(html) {
  if (!html.includes('<html lang="en"')) throw new Error('English home parity must target EN only');
  const block = `${START}
<aside class="am-world-preview" aria-labelledby="amWorldPreviewTitle">
  <div class="am-world-preview__copy">
    <p class="am-world-preview__eyebrow">AKTUAL MEDIA · SPECIAL WORLD PREVIEW</p>
    <p class="am-world-preview__flash">CROATIA ON THE WORLD MAP</p>
    <strong class="am-world-preview__title" id="amWorldPreviewTitle">THE WORLD IS<br><span>CLOSER THAN EVER.</span></strong>
    <p class="am-world-preview__lead">Explore the experimental Croatia edition and discover sources and topics in one place.</p>
    <p class="am-world-preview__note">The external preview may contain demonstration stories. Availability and freshness of sources are not guaranteed.</p>
    <a class="am-world-preview__cta" href="${CROATIA}" target="_blank" rel="external noopener noreferrer">EXPLORE CROATIA <span aria-hidden="true">↗</span><span class="am-world-preview__sr"> (external website; opens a new tab)</span></a>
  </div>
  <div class="am-world-preview__art" aria-hidden="true"><span>HR</span><strong>WORLD<br>PREVIEW</strong><i>AKTUAL MEDIA</i></div>
</aside>
<section class="am-zg-takeover" aria-label="AKTUAL MEDIA global edition and promotion">
  <div class="am-zg-strap"><span>AKTUAL MEDIA · GLOBAL EDITION</span><span>201 countries · 10 cities · 435 sources · 24/7</span><a href="${WORLD}" target="_blank" rel="noopener noreferrer">Open World preview ↗</a></div>
  <header class="am-zg-head"><div><div class="am-zg-identity">AKTUAL <em>MEDIA.</em></div><p>From local headlines to a worldwide view.</p></div><nav class="am-zg-nav" aria-label="AKTUAL MEDIA global edition"><a href="${WORLD}" target="_blank" rel="noopener noreferrer">World</a><a href="${WORLD}?city=zagreb" target="_blank" rel="noopener noreferrer">Zagreb</a><a href="#amBreakingTrack">Latest</a><a href="#amLead">Top stories</a></nav></header>
  <div class="am-zg-grid">
    <a class="am-zg-main" href="${WORLD}" target="_blank" rel="noopener noreferrer" aria-label="Open the AKTUAL MEDIA world preview"><span class="am-zg-tag">THE WORLD IN ONE PLACE</span><h3>201 COUNTRIES. ONE WINDOW ON THE WORLD.</h3><p>10 cities, 435 listed sources and a proposed around-the-clock news flow. Discover the global AKTUAL MEDIA preview in one click.</p><strong>EXPLORE THE WORLD ↗</strong></a>
    <div class="am-zg-side"><a href="${WORLD}" target="_blank" rel="noopener noreferrer"><small>GLOBAL DESK</small><b>What is happening beyond your front page?</b><span>Explore international headlines and sources ↗</span></a><a href="${WORLD}" target="_blank" rel="noopener noreferrer"><small>AKTUAL MEDIA · 24/7</small><b>The world does not wait for tomorrow's edition.</b><span>Open the automated news-flow preview ↗</span></a></div>
  </div>
  <a class="am-zg-sponsor" href="${WORLD}" target="_blank" rel="sponsored noopener noreferrer" aria-label="Promotion: AKTUAL MEDIA world preview"><span class="am-zg-adlabel">Promotion</span><div><b>THE WORLD IS ONE CLICK AWAY — AKTUAL MEDIA WORLD</b><p>Explore the international news preview and its planned country, city and source coverage.</p></div><span class="am-zg-adcta">OPEN WORLD ↗</span></a>
  <p class="am-zg-fineprint">This external pilot may include demonstration news. Source availability, accuracy and freshness are not guaranteed; promotional descriptions are not individual news reports.</p>
</section>
<div class="am-zg-modal" id="amZgModal" hidden>
  <div class="am-zg-shade" data-am-zg-close></div>
  <div class="am-zg-dialog" role="dialog" aria-modal="true" aria-labelledby="amZgTitle" aria-describedby="amZgDescription">
    <button class="am-zg-close" type="button" data-am-zg-close aria-label="Close promotion">×</button>
    <span class="am-zg-tag">PROMOTION · AKTUAL MEDIA WORLD</span>
    <h3 id="amZgTitle">CROATIA ON THE WORLD MAP!</h3>
    <p id="amZgDescription">Discover the experimental Croatia preview. The external service may contain demonstration news; source availability and freshness are not guaranteed.</p>
    <div class="am-zg-actions"><a href="${CROATIA}" target="_blank" rel="sponsored noopener noreferrer">OPEN CROATIA PREVIEW ↗</a></div>
    <p class="am-zg-closecopy">Promotional message · shown at most once per session · close using × or Escape.</p>
  </div>
</div>
<section class="am-world-gateway" aria-labelledby="amWorldTitle">
  <div class="am-world-header"><span class="am-world-label">AKTUAL MEDIA · WORLD PREVIEW</span><h3 id="amWorldTitle">One click. A global view of information.</h3><p class="am-world-desc">Explore the international AKTUAL MEDIA preview — countries, cities, linked sources and an automated news-flow demonstration.</p></div>
  <a class="am-world-link" href="${WORLD}" target="_blank" rel="noopener noreferrer" aria-label="Open AKTUAL MEDIA global preview">
    <div class="am-world-cols" role="group" aria-label="Global media overview: five columns">
      <div class="am-world-col"><span class="am-world-stat">201</span><strong>countries</strong><p>Proposed international edition coverage</p></div>
      <div class="am-world-col"><span class="am-world-stat">10</span><strong>cities</strong><p>City desks and local perspectives</p></div>
      <div class="am-world-col"><span class="am-world-stat">435</span><strong>sources</strong><p>Listed external news sources</p></div>
      <div class="am-world-col"><span class="am-world-stat">Global view</span><strong>overview</strong><p>Headlines, topics and context in one preview</p></div>
      <div class="am-world-col"><span class="am-world-stat">24/7</span><strong>auto-feed</strong><p>Proposed continuous information flow</p></div>
    </div>
  </a>
  <nav class="am-world-hashtags" aria-label="Brands and related profiles">
    <a href="/nermin-sefic/">#NerminSefic</a><a href="/nermin-sefic/">#NerminSefić</a><a href="/nermin-sefic/">#SeficNermin</a><a href="/">#GNKASG</a><a href="/usa/">#GNKDinamoLtd</a><a href="/usa/">#GNKDINAMOLTD</a><a href="/en/gnk-aktual/">#AktualMedia</a><a href="/en/gnk-aktual/">#AKTUALMEDIA</a><a href="${WORLD}" target="_blank" rel="noopener noreferrer">#AktualMediaWorld</a>
  </nav>
  <p class="am-world-foot">The stated scope (201 / 10 / 435 / 24/7) comes from the international edition specification and has not been independently verified.</p>
  <p class="am-world-foot"><a href="/gnk-aktual/media/" style="color:#e9c66c;font-weight:700;text-decoration:none">Explore the country and city directory on gnk-asg.hr →</a> · <a href="/tehnologija-buducnosti/" style="color:#e9c66c;text-decoration:none">Future technology →</a></p>
</section>
<script src="/assets/aktual-zagreb-takeover-v1.js?v=20261108-world2" defer></script>
${END}`;
  if (html.includes(START) !== html.includes(END)) {
    throw new Error('Broken AKTUAL EN parity markers; refusing to alter page');
  }
  if (html.includes(START)) {
    const start = html.indexOf(START);
    const end = html.indexOf(END, start);
    html = html.slice(0, start) + block + html.slice(end + END.length);
  } else {
    const anchor = '<section class="am-masthead"';
    if (!html.includes(anchor)) throw new Error('English masthead anchor missing');
    html = html.replace(anchor, block + '\n' + anchor);
  }
  const styles = [
    '/assets/aktual-world-preview-v1.css',
    '/assets/aktual-zagreb-takeover-v1.css?v=20261108-world2'
  ];
  for (const href of styles) {
    if (!html.includes('href="' + href + '"')) {
      html = html.replace('</head>', `<link rel="stylesheet" href="${href}">\n</head>`);
    }
  }
  return html;
}
