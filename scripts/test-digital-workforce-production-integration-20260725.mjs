import fs from 'node:fs';

const page=fs.readFileSync('apps/portal/digital-workforce/index.html','utf8');
const runtime=fs.readFileSync('apps/portal/assets/digital-workforce-suite-v1.js','utf8');

const requiredPage=[
  'JAVNA SIMULACIJA',
  'ILUSTRATIVNI PRIKAZ, NE STVARNI POSLOVNI PODACI',
  'dwMetricWorkers',
  'dwMetricProjects',
  'aria-describedby="dwTabHelp"',
  'aria-labelledby="dw-tab-plan"',
  '20260725-production-integration-v1'
];
for(const token of requiredPage){
  if(!page.includes(token))throw new Error(`Missing public production page contract: ${token}`);
}
// D1 status changed 2026-07-26: owner explicitly approved public launch,
// removing noindex + the preview gate. This page must now NOT be
// noindexed and must NOT contain the old "not approved" language --
// the inverse of what this contract checked before that date.
for(const stale of ['<meta name="robots" content="noindex, nofollow, noarchive">','ZAŠTIĆENI PREGLED','JAVNI PRISTUP NIJE ODOBREN']){
  if(page.includes(stale))throw new Error(`Stale pre-public-launch content still present: ${stale}`);
}

const requiredRuntime=[
  "const base='/api/public/digital-workforce/'",
  "new AbortController()",
  "aria-selected",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "encodeURIComponent(state.filters.q)",
  "role=\"alert\"",
  "cache:'no-store'"
];
for(const token of requiredRuntime){
  if(!runtime.includes(token))throw new Error(`Missing protected production runtime contract: ${token}`);
}

for(const forbidden of ['PRODUCTION_WRITE_ALLOWED = "true"','PUBLIC_PUBLISHING_ALLOWED = "true"','MAIL_AUTO_REPLY_LIVE = "true"']){
  if(page.includes(forbidden)||runtime.includes(forbidden))throw new Error(`Forbidden production capability enabled: ${forbidden}`);
}

console.log('Digital Workforce protected production integration contract: PASS');
