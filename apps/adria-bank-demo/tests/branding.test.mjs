import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEMO_BRAND } from '../src/core.mjs';
import { supportedLanguages, translate } from '../src/i18n.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('every app entry point displays the exact desktop demo watermark', () => {
  for (const page of ['../index.html', '../client.html', '../exchange.html']) {
    const html = read(page);
    assert.ok(html.includes(`aria-label="${DEMO_BRAND}"`), `${page} needs the named watermark`);
    assert.ok(html.includes(`>${DEMO_BRAND}</div>`), `${page} needs the visible watermark`);
    assert.ok(html.includes('class="app-footer"'), `${page} needs a discreet visible footer`);
    assert.ok(html.includes(`>${DEMO_BRAND} ·`), `${page} footer needs the exact demo brand`);
    assert.ok(html.includes('id="crumbTitle"'), `${page} needs the shared app breadcrumb anchor`);
    assert.ok(html.includes('id="mainContent"'), `${page} needs the shared app content mount`);
  }
});

test('every modal and drawer keeps a discreet exact-brand footer above the overlay background', () => {
  const app = read('../src/app.mjs');
  const styles = read('../src/styles.css');
  assert.equal(app.split('class="modal-demo-footer">${DEMO_BRAND}</small>').length - 1, 4, 'generic modals, read-only review, confirmations and drawers must all carry the exact label');
  assert.ok(styles.includes('.modal-demo-footer { position: sticky;'));
  assert.ok(styles.includes('.screen-watermark { position: fixed;'));
  assert.ok(styles.includes('bottom: 42px; z-index: 30;'));
});

test('print layouts and downloadable statement/snapshot metadata carry the exact demo brand', () => {
  const app = read('../src/app.mjs');
  const styles = read('../src/styles.css');
  assert.ok(app.includes(`<div class="print-brand">${'${DEMO_BRAND}'}</div>`));
  assert.ok(app.includes(`<strong>${'${DEMO_BRAND}'}</strong>`));
  assert.ok(app.includes('documentBrand: DEMO_BRAND'));
  assert.ok(app.includes("['document_brand', DEMO_BRAND]"));
  assert.ok(app.includes('DEMO_BRAND])'));
  assert.ok(styles.includes('.screen-watermark { position: fixed;'));
  assert.ok(styles.includes('.print-document::after'));
  assert.ok(styles.includes('DEMONSTRATION COPY'));
});


test('welcome front door displays the exact brand and offers every supported language and both local demo roles', () => {
  const html = read('../welcome.html');
  const script = read('../src/welcome.mjs');
  assert.ok(html.includes(`aria-label="${DEMO_BRAND}"`));
  assert.ok(html.includes(`>${DEMO_BRAND}</div>`));
  assert.ok(html.includes('class="welcome-footer"'));
  assert.ok(html.includes(`>${DEMO_BRAND} ·`));
  assert.deepEqual(supportedLanguages.map(language => language.code), ['hr', 'en', 'de', 'fr', 'es', 'ar', 'sw', 'ja', 'zh']);
  assert.ok(script.includes('languageSelect.innerHTML = supportedLanguages.map(item =>'));
  assert.ok(html.includes('data-entry="staff"'));
  assert.ok(html.includes('data-entry="customer"'));
  assert.ok(html.includes('DEMO DESKTOP ADRIA BANK'));
});

test('every desktop entry point shows the small-print demo-only disclaimer in every supported language', () => {
  for (const page of ['../index.html', '../client.html', '../exchange.html']) {
    assert.ok(read(page).includes('data-i18n="desktopDemoDisclaimer"'), `${page} needs the localized disclaimer`);
  }
  const welcome = read('../welcome.html');
  const welcomeScript = read('../src/welcome.mjs');
  assert.ok(welcome.includes('data-welcome-key="desktopDemoDisclaimer"'));
  assert.ok(welcomeScript.includes('COPY[language].desktopDemoDisclaimer = disclaimer'));
  for (const language of supportedLanguages) {
    const notice = translate(language.code, 'desktopDemoDisclaimer');
    assert.notEqual(notice, 'desktopDemoDisclaimer', `${language.code} needs a translated disclaimer`);
    assert.match(notice, /bank|banka|banque|banco|خدمة|銀行|银行|benki/i, `${language.code} disclaimer must say it is not a real bank/service`);
  }
});
