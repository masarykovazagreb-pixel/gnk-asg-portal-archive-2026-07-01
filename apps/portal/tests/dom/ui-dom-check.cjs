const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0;
function ok(cond, name, extra='') { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name, extra); } }

function load(rel, fetchMap = {}) {
  const file = path.join(ROOT, rel);
  return JSDOM.fromFile(file, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(window) {
      window.fetch = (url) => {
        const key = Object.keys(fetchMap).find(k => url.endsWith(k));
        if (!key) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
        return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(path.join(ROOT, fetchMap[key]), 'utf8')) });
      };
    }
  }).then(dom => new Promise(res => {
    const w = dom.window;
    const done = () => setTimeout(() => res(dom), 150);
    if (w.document.readyState === 'complete') done(); else w.addEventListener('load', done);
  }));
}
const $ = (dom, id) => dom.window.document.getElementById(id);
const click = (dom, id) => $(dom, id).dispatchEvent(new dom.window.Event('click', { bubbles: true }));
const setVal = (dom, id, v) => { $(dom, id).value = v; };
const text = (dom, id) => $(dom, id).textContent;

(async () => {
  // ---------- Developer Tools
  let dt = await load('developer-tools/index.html');
  ok(!!dt.window.GNKDeveloperTools, 'DT: module global present');
  setVal(dt, 'in-url', 'http://korisnik:x@192.168.1.1/login'); click(dt, 'btn-url');
  ok(/Formalna ocjena: \d+\/100/.test(text(dt, 'out-url')), 'DT: URL score rendered');
  ok(/Kritično/.test(text(dt, 'out-url')) && !/x@192/.test(text(dt, 'out-url')), 'DT: URL credentials flagged, not echoed');
  setVal(dt, 'in-headers', "Content-Security-Policy: script-src 'self' 'unsafe-eval'\nX-Content-Type-Options: nosniff"); click(dt, 'btn-headers');
  ok(/Ocjena zaglavlja: \d+\/100/.test(text(dt, 'out-headers')) && /unsafe-eval/.test(text(dt, 'out-headers')), 'DT: header analysis rendered');
  $(dt, 'opt-inline').checked = true; click(dt, 'btn-csp');
  ok(/script-src 'self' 'unsafe-inline'/.test(text(dt, 'out-csp')) && !/unsafe-eval/.test(text(dt, 'out-csp')), 'DT: CSP builder honours option, never unsafe-eval');
  setVal(dt, 'in-log', 'user=ana.horvat@example.com status=ok'); click(dt, 'btn-log');
  ok(/ukupno nalaza: 1/i.test(text(dt, 'out-log')) && !/ana\.horvat/.test(text(dt, 'out-log')), 'DT: log scan counts, no value shown', text(dt, 'out-log'));
  setVal(dt, 'in-json-a', '{"id":1}'); setVal(dt, 'in-json-b', '{"id":"1"}'); click(dt, 'btn-json');
  ok(/number-to-string/.test(text(dt, 'out-json')), 'DT: JSON drift rendered');
  click(dt, 'clear-url'); ok(text(dt, 'out-url') === '' && $(dt,'in-url').value === '', 'DT: clear works');
  dt.window.close();

  // ---------- Data Clinic
  const csv = 'ime;email;iznos;datum;tezina\nAna;ana@primjer.hr;12,50 EUR;09.10.2026.;12 kg\nIvan;;100 €;2026-10-08;800 g\n';
  let dc = await load('data-clinic/index.html');
  ok(!!dc.window.GNKDataClinic, 'DC: module global present');
  setVal(dc, 'in-csv', csv); click(dc, 'btn-privacy');
  ok(/ukupno nalaza: 1/.test(text(dc, 'out-privacy')) && !/ana@primjer/.test(text(dc, 'out-privacy')), 'DC: privacy table, no value shown');
  click(dc, 'btn-missing');
  ok(/Redova: 2/.test(text(dc, 'out-missing')) && $(dc, 'out-missing').querySelectorAll('tr').length >= 3, 'DC: missing table rendered');
  click(dc, 'btn-units');
  ok(/miješano/.test(text(dc, 'out-units')) && /kg/.test(text(dc,'out-units')), 'DC: unit mixing detected (kg/g)');
  setVal(dc, 'in-date-col', 'datum'); click(dc, 'btn-dates');
  ok(/ISO: 1 · normalizirano: 1/.test(text(dc, 'out-dates')) && /2026-10-09/.test(text(dc, 'out-dates')), 'DC: dates normalised');
  setVal(dc, 'in-contract', 'Naziv Loš;float;maybe;x'); click(dc, 'btn-contract');
  ok(/Ugovor nije valjan/.test(text(dc, 'out-contract')) && /Redak 1/.test(text(dc,'out-contract')), 'DC: invalid contract explained');
  setVal(dc, 'in-contract', 'iznos;number;da;internal\nemail;string;ne;personal_data'); click(dc, 'btn-contract');
  ok(/Ugovor je valjan/.test(text(dc, 'out-contract')) && /personal_data|email/.test(text(dc, 'out-contract')), 'DC: valid contract with personal-data note');
  click(dc, 'clear-all'); ok($(dc, 'in-csv').value === '' && text(dc,'out-privacy') === '', 'DC: clear all works');
  dc.window.close();

  // ---------- Methodology library
  let mt = await load('metodologije/index.html', { '../data/methodology_catalog.json': 'data/methodology_catalog.json' });
  await new Promise(r => setTimeout(r, 300));
  const cards = () => $(mt, 'methods').querySelectorAll('article.dt-method').length;
  ok(cards() === 16, 'MT: 16 methods rendered', cards());
  ok(/Katalog verzija 1.0.0/.test(text(mt, 'status')), 'MT: catalog status shown');
  $(mt, 'area').value = 'Financije'; $(mt, 'area').dispatchEvent(new mt.window.Event('change'));
  ok(cards() === 5, 'MT: area filter -> 5 financial methods', cards());
  $(mt, 'area').value = ''; $(mt, 'area').dispatchEvent(new mt.window.Event('change'));
  $(mt, 'search').value = 'WCAG'; $(mt, 'search').dispatchEvent(new mt.window.Event('input'));
  ok(cards() === 1, 'MT: search WCAG -> 1 result', cards());
  const form = $(mt, 'wcag-contrast').querySelector('form');
  const inputs = form.querySelectorAll('input');
  inputs[0].value = '#000000'; inputs[1].value = '#ffffff';
  form.dispatchEvent(new mt.window.Event('submit', { cancelable: true, bubbles: true }));
  ok(/Rezultat: 21 /.test($(mt, 'wcag-contrast').textContent), 'MT: calculator computes WCAG 21:1', $(mt,'wcag-contrast').textContent.slice(-200));
  $(mt, 'search').value = 'nema-ovakvog'; $(mt, 'search').dispatchEvent(new mt.window.Event('input'));
  ok(/Nema metoda/.test($(mt, 'methods').textContent), 'MT: empty state');
  mt.window.close();

  // ---------- Status
  let st = await load('status/index.html', { '../data/public_service_status.json': 'data/public_service_status.json' });
  await new Promise(r => setTimeout(r, 300));
  ok(/Ukupno stanje: Smanjena kvaliteta/.test(text(st, 'overall')), 'ST: overall state rendered', text(st,'overall'));
  ok($(st, 'services').querySelectorAll('tr').length === 5, 'ST: five services rendered');
  ok(/Zastarjelo/.test(text(st, 'freshness')), 'ST: stale media monitor shown honestly');
  ok($(st, 'not-monitored').querySelectorAll('li').length >= 3, 'ST: not-monitored list shown');
  st.window.close();

  // ---------- Tvornica ideja
  let ti = await load('tvornica-ideja/index.html', { '../data/idea_factory.json': 'data/idea_factory.json' });
  await new Promise(r => setTimeout(r, 300));
  const tiItems = () => $(ti, 'ideas').querySelectorAll('li.dt-method').length;
  ok(tiItems() === 30, 'TI: 30 draft ideas rendered', tiItems());
  ok(/Nijedna nije odobrena/.test(text(ti, 'status')), 'TI: status states nothing is approved');
  $(ti, 'search').value = 'metodolog'; $(ti, 'search').dispatchEvent(new ti.window.Event('input'));
  ok(tiItems() > 0 && tiItems() < 30, 'TI: search narrows list', tiItems());
  $(ti, 'search').value = ''; $(ti, 'search').dispatchEvent(new ti.window.Event('input'));
  $(ti, 'area').value = 'SEO'; $(ti, 'area').dispatchEvent(new ti.window.Event('change'));
  ok(tiItems() === 7, 'TI: area filter SEO -> 7', tiItems());
  $(ti, 'area').value = ''; $(ti, 'area').dispatchEvent(new ti.window.Event('change'));
  const tiForm = $(ti, 'new-idea');
  $(ti, 'f-title').value = 'ok'; $(ti, 'f-area').value = 'SEO';
  $(ti, 'f-impact').value = '9'; $(ti, 'f-confidence').value = '3'; $(ti, 'f-effort').value = '2';
  tiForm.dispatchEvent(new ti.window.Event('submit', { cancelable: true, bubbles: true }));
  ok(/Naslov mora imati/.test(text(ti, 'form-errors')) && /impact/.test(text(ti, 'form-errors')), 'TI: invalid entry shows field errors');
  ok(tiItems() === 30, 'TI: invalid entry not added');
  $(ti, 'f-title').value = 'Nova ideja iz testa'; $(ti, 'f-impact').value = '4';
  tiForm.dispatchEvent(new ti.window.Event('submit', { cancelable: true, bubbles: true }));
  ok(tiItems() === 31, 'TI: valid entry added to list', tiItems());
  ok($(ti, 'ideas').textContent.includes('Nova ideja iz testa') && /Ocjena 6/.test($(ti, 'ideas').textContent), 'TI: user idea scored and shown');
  ok($(ti, 'ideas').querySelectorAll('a[href]').length >= 1, 'TI: linked routes rendered as anchors');
  ti.window.close();

  console.log(`\nDOM checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
