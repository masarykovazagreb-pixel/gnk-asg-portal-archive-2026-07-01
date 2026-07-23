import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('apps/portal/digital-workforce/index.html','utf8');
const css=fs.readFileSync('apps/portal/assets/digital-workforce-suite-v1.css','utf8');
const js=fs.readFileSync('apps/portal/assets/digital-workforce-suite-v1.js','utf8');
const gate=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-workforce-staging-gate-v1.js','utf8');

for(const tab of ['plan','bulletins','projects','risks','opinions','dependencies','tasks','credits','newsroom','workers','log']){
  assert.match(html,new RegExp(`data-dw-tab="${tab}"`));
  assert.match(html,new RegExp(`id="dw-tab-${tab}"`));
}

assert.match(html,/dwMetricDay/);
assert.match(html,/dwMetricWorkers/);
assert.match(html,/dwMetricProjects/);
assert.match(html,/GNK DINAMO Ltd grupa/);
assert.match(html,/GNK ASG/);
assert.match(html,/SIMULACIJA/);
assert.match(html,/role="tablist"/);
assert.match(html,/role="tabpanel"/);
assert.match(html,/aria-controls="dwContent"/);
assert.match(html,/aria-labelledby="dw-tab-plan"/);
assert.match(html,/tabindex="-1"/);
assert.match(html,/\.dw-tabs button:focus-visible\{outline:3px solid #f2d27d!important/);

assert.match(html,/<a class="dw-skip-link" href="#dwMain">Preskoči na operativni sadržaj<\/a>/);
assert.match(html,/<main id="dwMain" class="dw-shell" tabindex="-1">/);
assert.match(html,/\.dw-skip-link\{position:fixed;z-index:10000/);
assert.match(html,/\.dw-skip-link:focus-visible\{transform:translateY\(0\);outline:3px solid #f2d27d/);
assert.match(html,/@media \(prefers-reduced-motion:reduce\)\{\.dw-skip-link\{transition:none\}\}/);

assert.match(html,/<p id="dwTabHelp" class="dw-sr-only">/);
assert.match(html,/aria-describedby="dwTabHelp"/);
assert.match(html,/Za promjenu kartice koristite tipke sa strelicama lijevo i desno\./);
assert.match(html,/\.dw-sr-only\{position:absolute!important;width:1px!important/);
assert.match(html,/<section id="dwContent" class="dw-panel" role="tabpanel" tabindex="0" aria-busy="false" aria-labelledby="dw-tab-plan"><\/section>/);
assert.doesNotMatch(html,/<section id="dwContent"[^>]*aria-live=/);
assert.match(html,/\.dw-panel:focus-visible\{outline:3px solid #f2d27d!important;outline-offset:4px!important\}/);

assert.match(html,/html,body,\.dw-private-preview\{background:#000!important;background-image:none!important/);
assert.match(html,/#gnk-unified-header\{background:rgba\(0,0,0,\.86\)!important/);
assert.match(html,/\.dw-shell\{background:#000!important;min-width:0!important\}/);
assert.match(html,/\.dw-tabs button\.active\{background:rgba\(215,181,91,\.13\)!important;color:#f2d27d!important\}/);
assert.doesNotMatch(html,/radial-gradient\([^)]*(?:06b6d4|22d3ee|0891b2|0ea5e9)/i);

assert.match(html,/\.dw-tabs\{display:flex!important;max-width:100%!important;overflow-x:auto!important/);
assert.match(html,/\.dw-tabs button\{flex:0 0 auto!important;min-height:44px!important;white-space:nowrap!important/);
assert.match(html,/\.dw-table\{max-width:100%!important;overflow-x:auto!important/);
assert.match(html,/\.dw-table table\{min-width:760px!important\}/);
assert.match(html,/@media \(max-width:900px\).*\.dw-metrics\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important\}.*\.dw-toolbar\{grid-template-columns:1fr!important\}/s);
assert.match(html,/@media \(max-width:560px\).*\.dw-metrics\{grid-template-columns:1fr!important\}.*\.dw-tabs\{margin-inline:-12px!important/s);

assert.match(css,/--dw-bg:#030303/);
assert.match(css,/--dw-gold:#d7b55b/);
assert.match(css,/backdrop-filter:blur/);
assert.match(css,/\.dw-badge\.is-success/);
assert.match(css,/\.dw-badge\.is-warning/);
assert.match(css,/\.dw-badge\.is-danger/);
assert.match(css,/prefers-reduced-motion/);

assert.match(js,/with.*statusClass|const statusClass/);
assert.match(js,/dwWorkerSearch/);
assert.match(js,/aria-selected/);
assert.match(js,/ArrowLeft/);
assert.match(js,/Pokušaj ponovno/);
assert.match(js,/Motor .*dan/);
assert.match(js,/let activeTab=null/);
assert.match(js,/if\(active\)activeTab=tab/);
assert.match(js,/host\.setAttribute\('aria-labelledby',activeTab\.id\)/);

assert.match(js,/if\(name==='workers'&&!state\.projects\)state\.projects=await get\('projects',controller\.signal\)/);
assert.doesNotMatch(js,/if\(!state\.projects\)state\.projects=await get\('projects'/);
assert.match(js,/if\(!host\|\|!views\[name\]\)return/);
assert.match(js,/class="dw-error" role="alert"/);
assert.match(js,/requestAnimationFrame\(\(\)=>retry\?\.focus\(\)\)/);

assert.match(js,/let activeRequestId=0/);
assert.match(js,/let activeController=null/);
assert.match(js,/const requestId=\+\+activeRequestId/);
assert.match(js,/activeController\?\.abort\(\)/);
assert.match(js,/const controller=new AbortController\(\)/);
assert.match(js,/signal:controller\.signal|controller\.signal/);
assert.match(js,/if\(requestId!==activeRequestId\)return/);
assert.match(js,/if\(error\?\.name==='AbortError'\|\|requestId!==activeRequestId\)return/);
assert.match(js,/if\(requestId===activeRequestId\)\{/);
assert.match(js,/if\(activeController===controller\)activeController=null/);

assert.match(js,/workerFilters:\{q:'',project:''\}/);
assert.match(js,/const filters=state\.workerFilters\|\|\{q:'',project:''\}/);
assert.match(js,/value="\$\{esc\(filters\.q\)\}"/);
assert.match(js,/filters\.project===String\(project\.id\)\?' selected':''/);
assert.match(js,/state\.workerFilters=\{q:search\?\.value\|\|'',project:project\?\.value\|\|''\}/);
assert.match(js,/state\.workerFilterFocus=event\?\.currentTarget\?\.id\|\|''/);
assert.match(js,/function restoreWorkerFilterFocus\(\)/);
assert.match(js,/control\?\.focus\(\)/);
assert.match(js,/control\.setSelectionRange\(end,end\)/);

assert.match(js,/const hasFilters=Boolean\(filters\.q\|\|filters\.project\)/);
assert.match(js,/Nema workera koji odgovaraju odabranim kriterijima\./);
assert.match(js,/role="status"/);
assert.match(js,/id="dwWorkerReset"/);
assert.match(js,/id="dwWorkerResetEmpty"/);
assert.match(js,/function resetWorkerFilters\(\)/);
assert.match(js,/state\.workerFilters=\{q:'',project:''\}/);
assert.match(js,/state\.workerFilterFocus='dwWorkerSearch'/);
assert.match(js,/reset\?\.addEventListener\('click',resetWorkerFilters\)/);
assert.match(js,/resetEmpty\?\.addEventListener\('click',resetWorkerFilters\)/);

assert.match(js,/const total=Number\.isFinite\(Number\(data\.total\)\)\?Number\(data\.total\):items\.length/);
assert.match(js,/const countLabel=items\.length===total\?`\$\{fmt\(total\)\} ukupno`:`\$\{fmt\(items\.length\)\} prikazano od \$\{fmt\(total\)\}`/);
assert.match(js,/class="dw-count" role="status" aria-live="polite"/);
assert.match(js,/<span>Workeri<\/span><strong>\$\{countLabel\}<\/strong>/);

assert.match(gate,/GNK_DINAMO_WORKFORCE_STAGING_GATE_V21/);
assert.match(gate,/function safeNext\(value\)/);
assert.match(gate,/next\.includes\('\\\\'\)/);
assert.match(gate,/request\.headers\.has\('authorization'\)\?401:200/);
assert.match(gate,/contentType\.startsWith\('application\/x-www-form-urlencoded'\)/);
assert.doesNotMatch(gate,/contentType\.startsWith\('multipart\/form-data'\)/);
assert.match(gate,/LOGIN_BODY_MAX_LENGTH=4096/);
assert.match(gate,/TOKEN_MAX_LENGTH=512/);
assert.match(gate,/body=await request\.text\(\)/);
assert.match(gate,/body\.length>LOGIN_BODY_MAX_LENGTH/);
assert.match(gate,/const form=new URLSearchParams\(body\)/);
assert.match(gate,/const tokens=form\.getAll\('token'\)/);
assert.match(gate,/const nextValues=form\.getAll\('next'\)/);
assert.match(gate,/if\(tokens\.length!==1\|\|nextValues\.length>1\)return page\('Zahtjev za prijavu nije valjan\.',400\)/);
assert.match(gate,/const token=String\(tokens\[0\]\|\|''\)\.trim\(\)/);
assert.match(gate,/token\.length>TOKEN_MAX_LENGTH/);
assert.match(gate,/const location=safeNext\(nextValues\[0\]\)/);
assert.match(gate,/return page\('Zahtjev za prijavu nije valjan\.',400\)/);
assert.match(gate,/return page\('Zahtjev za prijavu je prevelik\.',413\)/);
assert.match(gate,/return page\('Token nije ispravan\.',401\)/);
assert.match(gate,/COOKIE_HEADER_MAX_LENGTH=4096/);
assert.match(gate,/COOKIE_VALUE_MAX_LENGTH=512/);
assert.match(gate,/if\(!source\|\|source\.length>COOKIE_HEADER_MAX_LENGTH\)return ''/);
assert.match(gate,/const matches=source\.split\(';'\)\.map\(v=>v\.trim\(\)\)\.filter\(v=>v\.startsWith\(`\$\{COOKIE\}=`\)\)/);
assert.match(gate,/if\(matches\.length!==1\)return ''/);
assert.match(gate,/const raw=matches\[0\]\.slice\(COOKIE\.length\+1\)/);
assert.match(gate,/if\(!raw\|\|raw\.length>COOKIE_VALUE_MAX_LENGTH\)return ''/);
assert.match(gate,/try\{\s*return decodeURIComponent\(raw\)/s);
assert.match(gate,/catch\{\s*return ''\s*;?\s*\}/s);

console.log(JSON.stringify({
  ok:true,
  contract:'digital-workforce-puls-trzista-public-redesign',
  tabs:11,
  palette:'pure-black-glass-gold-white',
  accessibility:'skip-link-focusable-tabpanel-linked-tabs-keyboard-instructions-no-full-panel-live-region-focus-visible-keyboard-navigation-retry-focus',
  responsive:'contained-tabs-worker-table-touch-targets',
  resilience:'isolated-tab-api-failures-worker-project-dependency-only',
  concurrency:'abort-previous-request-ignore-stale-response',
  workerFilters:'persistent-query-project-focus-empty-state-one-click-reset-and-explicit-counts',
  stagingGate:'V21-safe-redirect-controlled-login-errors-explicit-bearer-401-malformed-cookie-safe-bounded-cookie-parsing-duplicate-cookie-rejection-bounded-urlencoded-login-unambiguous-login-fields',
  files:[
    'apps/portal/digital-workforce/index.html',
    'apps/portal/assets/digital-workforce-suite-v1.css',
    'apps/portal/assets/digital-workforce-suite-v1.js',
    'workers/gnk-asg-direct-operator/src/index-workforce-staging-gate-v1.js'
  ]
},null,2));