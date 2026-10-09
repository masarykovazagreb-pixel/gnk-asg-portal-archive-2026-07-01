const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0;
function ok(cond, name, extra='') { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name, extra); } }

function load(rel, fetchMap = {}) {
  const file = path.join(ROOT, rel);
  const vc = new VirtualConsole(); const errs = [];
  vc.on('jsdomError', (e) => errs.push(String(e && e.message || e)));
  return JSDOM.fromFile(file, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      // jsdom ne izlaže TextEncoder/TextDecoder u prozoru; preglednik ih ima
      window.TextEncoder = TextEncoder; window.TextDecoder = TextDecoder;
      window.fetch = (url) => {
        const key = Object.keys(fetchMap).find(k => url.endsWith(k));
        if (!key) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
        return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(path.join(ROOT, fetchMap[key]), 'utf8')) });
      };
    }
  }).then(dom => new Promise(res => {
    const w = dom.window; dom.__errs = errs;
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

  // ---------- Laboratorij
  let lab = await load('laboratorij/index.html');
  ok(lab.window.document.querySelectorAll('section.lab-tool').length === 20, 'LAB: 20 tools rendered');
  ok(lab.__errs.length === 0, 'LAB: no script errors', lab.__errs.join(' | '));
  const labForm = lab.window.document.querySelector('#pdv-dodaj form');
  labForm.querySelector('[name="neto"]').value = '100';
  labForm.dispatchEvent(new lab.window.Event('submit', { cancelable: true, bubbles: true }));
  ok(text(lab, 'pdv-dodaj--out') === 'Bruto: 125,00 EUR', 'LAB: PDV tool computes 125,00 EUR', text(lab, 'pdv-dodaj--out'));
  const b64 = lab.window.document.querySelector('#base64-utf8 form');
  b64.querySelector('[name="nacin"]').value = 'decode'; b64.querySelector('[name="tekst"]').value = 'Zm9v';
  b64.dispatchEvent(new lab.window.Event('submit', { cancelable: true, bubbles: true }));
  ok(text(lab, 'base64-utf8--out') === 'foo', 'LAB: base64 decode works', text(lab, 'base64-utf8--out'));
  const hx = lab.window.document.querySelector('#hex-rgb form');
  hx.querySelector('[name="hex"]').value = '#zzz';
  hx.dispatchEvent(new lab.window.Event('submit', { cancelable: true, bubbles: true }));
  ok(/^Greška: /.test(text(lab, 'hex-rgb--out')), 'LAB: invalid input shows reason', text(lab, 'hex-rgb--out'));
  ok(lab.window.document.querySelectorAll('#alati h2').length === 6, 'LAB: 6 groups as headings', lab.window.document.querySelectorAll('#alati h2').length);
  lab.window.close();

  // ---------- Mediji
  let md = await load('mediji/index.html', {
    '../data/media_monitor_status.json': 'data/media_monitor_status.json',
    '../data/media_queries.json': 'data/media_queries.json',
    '../data/approved_mentions.json': 'data/approved_mentions.json' });
  await new Promise(r => setTimeout(r, 300));
  ok(md.__errs.length === 0, 'MED: no script errors', md.__errs.join(' | '));
  ok(/Stanje: (Zastarjelo|Ažurno)/.test(text(md, 'overall')), 'MED: state rendered', text(md, 'overall'));
  ok(/Subjekata \/ upita/.test(text(md, 'stats')) && /3 \/ 8/.test(text(md, 'stats')), 'MED: 3 subjects, 8 queries');
  ok(md.window.document.querySelectorAll('#subjects li').length === 3, 'MED: subjects listed');
  ok(/Odobrenih objava na javnom popisu: 433/.test(text(md, 'approved')), 'MED: approvals count matches approved_mentions.json');
  md.window.close();

  // ---------- Automatizacija
  let au = await load('automation-status/index.html', {
    '../data/news-automation-status.json': 'data/news-automation-status.json',
    '../data/freshness-status.json': 'data/freshness-status.json' });
  await new Promise(r => setTimeout(r, 300));
  ok(au.__errs.length === 0, 'AUTO: no script errors', au.__errs.join(' | '));
  ok(/Ukupno: /.test(text(au, 'overall')), 'AUTO: overall rendered', text(au, 'overall'));
  ok(au.window.document.querySelectorAll('#rows tr').length === Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT,'data/freshness-status.json'),'utf8')).resources).length, 'AUTO: one row per resource');
  ok(/Motor/.test(text(au, 'news')) && /Europe\/Zagreb/.test(text(au, 'news')), 'AUTO: news facts rendered');
  ok(!/Svježe \(|ok/.test(text(au, 'overall')) || !/stale|Zastarjelo/.test(text(au,'rows')), 'AUTO: no false OK');
  au.window.close();

  // ---------- Nermin Sefić: meta i strukturirani podaci
  const nhtml = fs.readFileSync(path.join(ROOT, 'nermin-sefic/index.html'), 'utf8');
  const nd = (nhtml.match(/name="description" content="([^"]*)"/) || [])[1] || '';
  ok(nd.length > 0 && nd.length <= 160, 'NS: description length within 160', nd.length);
  ok(!/#\S/.test(nd), 'NS: no hashtag in description');
  ok(!/name="keywords"/.test(nhtml), 'NS: no keyword meta (stuffing removed)');
  ok(!/"NN"/.test(nhtml), 'NS: placeholder alias removed');
  const blocks = [...nhtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
  let parsed = 0; for (const b of blocks) { JSON.parse(b); parsed++; }
  ok(parsed === blocks.length && parsed > 0, 'NS: all JSON-LD blocks parse', parsed + '/' + blocks.length);
  ok(/"dateModified":"2026-10-09"/.test(nhtml), 'NS: ProfilePage dateModified set');

  // ---------- Sve stranice: nema neuhvaćenih grešaka skripti
  for (const [page, data] of [
    ['developer-tools/index.html', {}],
    ['data-clinic/index.html', {}],
    ['metodologije/index.html', { '../data/methodology_catalog.json': 'data/methodology_catalog.json' }],
    ['status/index.html', { '../data/public_service_status.json': 'data/public_service_status.json' }],
    ['tvornica-ideja/index.html', { '../data/idea_factory.json': 'data/idea_factory.json' }],
  ]) {
    const d = await load(page, data);
    await new Promise(r => setTimeout(r, 200));
    ok(d.__errs.length === 0, 'ALL: no script errors on ' + page, d.__errs.join(' | '));
    d.window.close();
  }

  console.log(`\nDOM checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
