#!/usr/bin/env node
// AKTUAL MEDIA — urednički desk i desk za analizu vanjskih medija.
//
// Stranice /gnk-aktual/ i /en/gnk-aktual/ statične su ljuske: podatke
// puni JS iz /data/*.json. Ovaj skript u njih ubacuje markup koji ti
// skriptovi traže (bez njega se ništa ne prikazuje), uz poštenu
// granicu: nema automatskih komentara na tuđim stranicama.
//
// Idempotentno: ako je desk već ubačen, ne dira stranicu. Pokreće se
// iz kampanjskog workflowa i iz test-all praga (--check).
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const CHECK_ONLY = process.argv.includes('--check');

const PAGES = [
  {
    file: 'apps/portal/gnk-aktual/index.html',
    lang: 'hr',
    anchor: '<p class="am-footer-note">',
  },
  {
    file: 'apps/portal/en/gnk-aktual/index.html',
    lang: 'en',
    anchor: '<p class="am-footer-note">',
  },
];

const STYLE = `<style id="evd-style">
.evd-desk{margin:26px 0 0;padding:20px 22px;background:#fffdf8;border:1px solid #d8d3c7;border-left:6px solid #c8963c;border-radius:10px}
.evd-desk h2{margin:4px 0 10px;font-size:22px;line-height:1.25;color:#14181e}
.evd-desk h3{margin:18px 0 8px;font-size:15px;letter-spacing:.02em;color:#14181e}
.evd-desk p{margin:6px 0;line-height:1.55;color:#2a2f36}
.evd-kicker{font:800 11px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8a6415}
.evd-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.evd-panel{background:#fff;border:1px solid #e3ddd0;border-radius:9px;padding:14px 16px}
.evd-panel h3{margin-top:0}
.evd-muted{color:#5d636b;font-size:13.5px}
.evd-tags{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0;padding:0;list-style:none}
.evd-tags span{display:inline-block;padding:4px 9px;border-radius:999px;background:#f4ead2;color:#6d4f0e;font:800 10.5px/1.6 system-ui,sans-serif;letter-spacing:.06em}
.evd-entities ul{display:grid;gap:6px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin:6px 0 0;padding:0;list-style:none}
.evd-entities li{padding:8px 10px;background:#fff;border:1px solid #e3ddd0;border-radius:7px;font-size:14px;line-height:1.45}
.evd-entities a{color:#14181e;text-decoration:none;border-bottom:1px solid #c8963c}
.evd-entities a:hover{color:#8a6415}
.evd-boundary{margin-top:12px;padding:10px 12px;background:#f6efe0;border-left:4px solid #8c2f2f;border-radius:6px;font-size:14px}
</style>`;

const HR = `${STYLE}
<section class="am-editorial evd" id="urednicki-desk" aria-labelledby="evdTitle">
  <div>
    <span class="am-label gold">UREDNIČKI DESK</span>
    <h2 id="evdTitle">Dnevni brief i analiza vanjskih medija</h2>
    <p class="evd-muted">Dnevni urednički brief iz 30-dnevnog plana i pregled šest izvornih izdavača. Brief nije objava: puna objava slijedi samo nakon provjere izvora i uredničkog odobrenja.</p>
  </div>
</section>

<section class="am-editorial evd-desk" id="entityVisibilityCampaignDesk" data-campaign-governance="ljudsko odobrenje obvezno" aria-labelledby="evdDeskTitle">
  <span class="evd-kicker">Entity visibility · 30 dana</span>
  <h2 id="evdDeskTitle">Što je danas na uredničkom stolu</h2>
  <p data-campaign-day>Učitavanje današnjeg briefa…</p>
  <p><strong data-campaign-title></strong></p>
  <p data-campaign-brief></p>
  <p><strong data-campaign-status></strong></p>
  <p class="evd-muted" data-campaign-report></p>
  <p class="evd-muted" data-campaign-governance>Deset različitih signala kvalitete dnevno · ljudsko odobrenje je obvezno · modelirana podrška Digitalne radne snage nije autonomna objava.</p>
  <ul class="evd-tags" data-campaign-tags aria-label="Oznake briefa"></ul>
</section>

<section class="am-editorial evd-desk" id="mediaAnalysisDesk" data-media-analysis-boundary="no-external-comments" aria-labelledby="evdMediaTitle">
  <span class="evd-kicker">Vanjski mediji · izvor po izvor</span>
  <h2 id="evdMediaTitle">Desk za analizu vanjskih medija</h2>
  <p class="evd-muted">Analiza se priprema samo za GNK ASG. Svaki zapis traži URL izvora, datum, kontekst, atribuciju i ljudsko odobrenje.</p>
  <p class="evd-boundary"><strong>Nema automatskih komentara na tuđim stranicama.</strong> Ne kopiramo puni tekst, ne objavljujemo bez odobrenja i ne izvodimo hashtagove iz imena izdavača.</p>
</section>

<section class="am-editorial evd-desk evd-entities" aria-labelledby="evdEntTitle">
  <span class="evd-kicker">Entiteti u fokusu</span>
  <h2 id="evdEntTitle">Pojmovi koje stranica povezuje s izvorom</h2>
  <ul>
    <li><a href="/about/">GNK ASG</a> — matična stranica društva i javni registarski podaci.</li>
    <li><a href="/nermin-sefic/">Nermin Sefić</a> — urednik i direktor; autorska stranica s popisom objava.</li>
    <li><a href="/usa/">GNK DINAMO Ltd.</a> — ishodište grupe u Boulderu, Colorado, SAD.</li>
    <li><a href="/objave/gnk-asg-26-mjesto-top-505-504-milijuna-izvoz/">Fina Info.BIZ</a> — javni izvor podataka o prihodu i izvozu.</li>
    <li><a href="/objave/primjeri-financijskih-izvjestaja-hrvatska/">revizorsko izvješće</a> — kako se čita i što stvarno potvrđuje.</li>
    <li><a href="/komentari/cibona-dovela-khalifa-battlea/">Cibona — uredničko sportsko izvještavanje</a> — sportsko praćenje, bez privida partnerstva.</li>
    <li>NK Sesvete — najavljeni urednički brief 24. dana plana (27. 10. 2026.), ulazi u <a href="/objave/">korpus objava</a> tek nakon provjere.</li>
    <li>Izvorni izdavači u desk sustavu: <a href="https://www.jutarnji.hr/" rel="noopener nofollow" target="_blank">Jutarnji list</a>, <a href="https://www.vecernji.hr/" rel="noopener nofollow" target="_blank">Večernji list</a>, <a href="https://www.poslovni.hr/" rel="noopener nofollow" target="_blank">Poslovni dnevnik</a>, <a href="https://www.index.hr/" rel="noopener nofollow" target="_blank">Index</a>, <a href="https://lidermedia.hr/" rel="noopener nofollow" target="_blank">Lider</a>, <a href="https://www.portalnovosti.com/" rel="noopener nofollow" target="_blank">Novosti</a>.</li>
  </ul>
</section>
`;

const EN = `${STYLE}
<section class="am-editorial evd" id="editorial-desk" aria-labelledby="evdTitleEn">
  <div>
    <span class="am-label gold">EDITORIAL DESK</span>
    <h2 id="evdTitleEn">Daily brief and external-media analysis</h2>
    <p class="evd-muted">The daily brief from the 30-day plan and a review of six source publishers. A brief is not a publication: full publication follows only after source verification and editorial approval.</p>
  </div>
</section>

<section class="am-editorial evd-desk" id="entityVisibilityCampaignDesk" data-campaign-governance="human approval required" aria-labelledby="evdDeskTitleEn">
  <span class="evd-kicker">Entity visibility · 30 days</span>
  <h2 id="evdDeskTitleEn">What is on the editorial desk today</h2>
  <p data-campaign-day>Loading today's brief…</p>
  <p><strong data-campaign-title></strong></p>
  <p data-campaign-brief></p>
  <p><strong data-campaign-status></strong></p>
  <p class="evd-muted" data-campaign-report></p>
  <p class="evd-muted" data-campaign-governance>Ten distinct quality signals a day · human approval is required · modeled Digital Workforce support is not autonomous publishing.</p>
  <ul class="evd-tags" data-campaign-tags aria-label="Brief hashtags"></ul>
</section>

<section class="am-editorial evd-desk" id="mediaAnalysisDesk" data-media-analysis-boundary="no-external-comments" aria-labelledby="evdMediaTitleEn">
  <span class="evd-kicker">External media · source by source</span>
  <h2 id="evdMediaTitleEn">External media analysis desk</h2>
  <p class="evd-muted">Analysis is prepared for GNK ASG only. Every record requires a source URL, date, context, attribution and human approval.</p>
  <p class="evd-boundary"><strong>There are no automated comments on publisher sites.</strong> We do not copy full text, publish without approval, or derive hashtags from a publisher's name.</p>
</section>

<section class="am-editorial evd-desk evd-entities" aria-labelledby="evdEntTitleEn">
  <span class="evd-kicker">Entities in focus</span>
  <h2 id="evdEntTitleEn">Terms this page ties back to a source</h2>
  <ul>
    <li><a href="/en/about/">GNK ASG</a> — company profile and public registry data.</li>
    <li><a href="/nermin-sefic/">Nermin Sefić</a> — editor and director; author page with published work.</li>
    <li><a href="/usa/">GNK DINAMO Ltd.</a> — the group's origin in Boulder, Colorado, USA.</li>
    <li><a href="/objave/gnk-asg-26-mjesto-top-505-504-milijuna-izvoz/">Fina Info.BIZ</a> — public source for revenue and export figures.</li>
    <li><a href="/objave/primjeri-financijskih-izvjestaja-hrvatska/">audit report</a> — how to read one and what it actually confirms.</li>
    <li><a href="/en/commentary/cibona-signs-khalif-battle/">Cibona — editorial sports reporting</a> — sports coverage without implying partnership.</li>
    <li>NK Sesvete — a scheduled editorial brief on day 24 of the plan (27 October 2026), entering the <a href="/en/publications/">publication corpus</a> only after verification.</li>
    <li>Source publishers in the desk system: <a href="https://www.jutarnji.hr/" rel="noopener nofollow" target="_blank">Jutarnji list</a>, <a href="https://www.vecernji.hr/" rel="noopener nofollow" target="_blank">Večernji list</a>, <a href="https://www.poslovni.hr/" rel="noopener nofollow" target="_blank">Poslovni dnevnik</a>, <a href="https://www.index.hr/" rel="noopener nofollow" target="_blank">Index</a>, <a href="https://lidermedia.hr/" rel="noopener nofollow" target="_blank">Lider</a>, <a href="https://www.portalnovosti.com/" rel="noopener nofollow" target="_blank">Novosti</a>.</li>
  </ul>
</section>
`;

const SCRIPTS = `<script src="/assets/entity-visibility-campaign-desk-v1.js?v=20261020-desk" defer></script>
<script src="/assets/media-analysis-desk-v1.js?v=20261020-desk" defer></script>
`;

const CAMPAIGN_LINE = '- Entity visibility campaign cornerstone: https://gnk-asg.hr/objave/javni-podaci-autorski-rad-odgovorno-upravljanje/\n';

let changed = 0;
for (const page of PAGES) {
  const html = fs.readFileSync(page.file, 'utf8');
  if (html.includes('id="entityVisibilityCampaignDesk"')) {
    console.log(`${page.file}: desk already present`);
    continue;
  }
  const block = page.lang === 'hr' ? HR : EN;
  const anchor = page.anchor;
  if (!html.includes(anchor)) {
    console.error(`${page.file}: anchor not found (${anchor})`);
    process.exitCode = 1;
    continue;
  }
  let next = html.replace(anchor, `${block}\n${anchor}`);
  next = next.replace('</body>', `${SCRIPTS}</body>`);
  changed += 1;
  if (WRITE) {
    fs.writeFileSync(page.file, next, 'utf8');
    console.log(`${page.file}: desk inserted`);
  } else {
    console.log(`${page.file}: would insert desk`);
  }
}

const llmsPath = 'apps/portal/llms.txt';
const llms = fs.readFileSync(llmsPath, 'utf8');
if (!llms.includes('javni-podaci-autorski-rad-odgovorno-upravljanje')) {
  changed += 1;
  if (WRITE) {
    fs.writeFileSync(llmsPath, `${llms.trimEnd()}\n${CAMPAIGN_LINE}`, 'utf8');
    console.log(`${llmsPath}: campaign line added`);
  } else {
    console.log(`${llmsPath}: would add campaign line`);
  }
}

if (CHECK_ONLY && changed) {
  console.error(`Desk is missing on ${changed} place(s). Run with --write.`);
  process.exitCode = 1;
}
