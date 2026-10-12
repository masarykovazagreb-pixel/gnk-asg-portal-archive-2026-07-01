import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { CURRENCIES, createDemoState, DEMO_BRAND, STORE_KEY, loadDemoState, totalCustomerDepositsCents } from '../src/core.mjs';
import { supportedLanguages } from '../src/i18n.mjs';

function setGlobal(name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, enumerable: previous?.enumerable ?? true, writable: true, value });
  return () => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name];
}

function makeWindow(html, url) {
  const window = new Window({ url });
  window.document.write(html);
  window.document.close();
  window.print = () => {};
  window.localStorage.setItem(STORE_KEY, JSON.stringify(createDemoState()));
  return window;
}

async function withPage(entry, url, label, run) {
  const html = await readFile(new URL(entry, import.meta.url), 'utf8');
  const window = makeWindow(html, url);
  const restore = [
    setGlobal('window', window), setGlobal('document', window.document), setGlobal('location', window.location),
    setGlobal('localStorage', window.localStorage), setGlobal('history', window.history), setGlobal('navigator', window.navigator),
    setGlobal('FormData', window.FormData)
  ];
  try {
    const app = new URL('../src/app.mjs', import.meta.url);
    app.searchParams.set('ui-smoke', label);
    await import(app.href);
    await new Promise(resolve => setImmediate(resolve));
    const main = window.document.querySelector('#mainContent');
    assert.ok(main?.children.length, `${url} did not render a screen`);
    assert.equal(window.document.querySelector('#screenWatermark')?.textContent, DEMO_BRAND);
    await run(window);
  } finally {
    window.happyDOM.abort();
    for (const undo of restore.reverse()) undo();
  }
}

function click(window, selector) {
  const element = window.document.querySelector(selector);
  assert.ok(element, `UI control not found: ${selector}`);
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return element;
}

function route(window, view) { click(window, `[data-view="${view}"]`); }
function closeModal(window) { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }

function assertPrinted(window, selector) {
  click(window, selector);
  const printRoot = window.document.querySelector('#printRoot');
  assert.ok(printRoot.textContent.includes(DEMO_BRAND), `${selector} print is missing the exact demo label`);
  window.dispatchEvent(new window.Event('afterprint'));
}

test('staff, customer and exchange routes boot; ownership, roles, print and export branding work', async () => {
  const restoreTimers = [
    setGlobal('setInterval', () => 0), setGlobal('clearInterval', () => {}),
    setGlobal('setTimeout', () => 0), setGlobal('clearTimeout', () => {})
  ];
  const previousCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const previousRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  const downloads = [];
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: blob => { downloads.push(blob); return 'blob:ui-smoke'; } });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} });
  try {
    await withPage('../index.html', 'http://adria.test/', 'staff', async window => {
      const main = window.document.querySelector('#mainContent');
      for (const view of ['overview', 'customers', 'accounts', 'payments', 'cards', 'savings', 'loans', 'branches', 'atms', 'portal', 'support', 'aml', 'complaints', 'swift', 'exchange', 'interop', 'institutions', 'checker', 'ledger', 'reports', 'settings']) {
        route(window, view);
        assert.ok(main.querySelector('.page-heading'), `${view} route did not render its page heading`);
        assert.equal(main.querySelector('.page-watermark')?.textContent, DEMO_BRAND, `${view} route lost the page watermark`);
        if (view === 'branches') {
          assert.ok(main.textContent.includes('1942 Broadway, Ste 314C · Boulder, Colorado 80302'));
          assert.ok(main.textContent.includes('Osnivanje u Delawareu / registrirani agent: neprovjereno.'));
          assert.equal(main.querySelectorAll('.market-card').length, 11, 'all ten planned market cards and one sourced company-address card render');
          assert.equal(main.querySelectorAll('.market-card .source-link').length, 10, 'all proposed-market authority references are linked');
        }
        if (view === 'settings') assert.ok(main.querySelectorAll('.regulatory-source-list .setting-row').length >= 20, 'settings exposes the expanded regulatory and data-source list');
        if (view === 'interop') {
          assert.equal(main.querySelectorAll('.interop-tool-card').length, 50, 'all fifty interop demo tools render');
          assert.equal(main.querySelectorAll('.interop-connector-card').length, 7, 'all local bank and exchange fixtures render');
          assert.ok(main.textContent.includes('SYNTHETIC SANDBOX ONLY') || main.textContent.includes('ISKLJUČIVO SINTETIČKI SANDBOX'));
          click(window, '[data-action="interop-feature-run"][data-id="aggregate-balances"]');
          assert.ok(main.querySelector('.interop-result')?.textContent.includes('sintetička salda') || main.querySelector('.interop-result')?.textContent.includes('synthetic balances'));
          click(window, '[data-action="interop-tab"][data-tab="ideas"]');
          assert.equal(main.querySelectorAll('.interop-idea-card').length, 50, 'all fifty concept ideas render');
          click(window, '[data-action="interop-tab"][data-tab="workbench"]');
          assert.equal(main.querySelectorAll('.interop-system-card').length, 3, 'all regional demo systems render as selectable cards');
          click(window, '[data-action="interop-system-select"][data-id="singapore"]');
          assert.match(main.querySelector('.workspace-context-copy strong')?.textContent || '', /Adria Bank Singapore/);
          assert.equal(JSON.parse(window.localStorage.getItem(STORE_KEY)).interoperabilityLab.activeSystemId, 'singapore');
          assert.equal(main.querySelectorAll('.interop-connector-card').length, 5, 'Singapore shows only its own bank and venue fixtures');
          click(window, '[data-action="interop-feature-run"][data-id="fx-cost"]');
          assert.ok(main.querySelector('.interop-result')?.textContent.includes('USD/SGD'), 'FX tool uses the selected system context');
          click(window, '[data-action="interop-system-select"][data-id="egypt"]');
          assert.match(main.querySelector('.workspace-context-copy strong')?.textContent || '', /Adria Bank Egypt/);
          assert.equal(main.querySelectorAll('.interop-connector-card').length, 5, 'Egypt shows only its own bank and venue fixtures');
          click(window, '[data-action="interop-feature-run"][data-id="venue-best-price"]');
          assert.ok(main.querySelector('.interop-result')?.textContent.includes('BTC/EGP'), 'crypto fixture uses the selected system context');
          click(window, '[data-action="interop-system-select"][data-id="croatia"]');
          click(window, '[data-action="interop-export"]');
          const interopExport = JSON.parse(await downloads.at(-1).text());
          assert.equal(interopExport.documentBrand, DEMO_BRAND);
          assert.equal(interopExport.demoOnly, true);
          assert.equal(interopExport.containsCustomerData, false);
          assert.equal(interopExport.activeSystemId, 'croatia');
        }
      }
      route(window, 'institutions');
      assert.equal(main.querySelectorAll('.interop-system-card').length, 3, 'institutions directory exposes the regional profile selector');
      click(window, '[data-action="interop-system-select"][data-id="singapore"]');
      assert.match(main.querySelector('.workspace-context-copy strong')?.textContent || '', /Adria Bank Singapore/);
      click(window, '[data-action="interop-system-select"][data-id="egypt"]');
      assert.match(main.querySelector('.workspace-context-copy strong')?.textContent || '', /Adria Bank Egypt/);
      click(window, '[data-action="interop-context-open"]');
      assert.ok(main.textContent.includes('Adria Bank Egypt'), 'global context switch opens the local interop workbench in the selected region');
      route(window, 'complaints');
      assert.ok(main.querySelector('[data-action="new-complaint"]'), 'complaint queue route did not render');
      route(window, 'payments');
      assert.ok(main.querySelector('[data-action="incoming-payment"]'), 'incoming-payment rehearsal action is missing');
      assert.ok(main.querySelector('[data-action="new-payment"]'), 'outgoing-payment rehearsal action is missing');
      assertPrinted(window, '[data-action="print-payment"]');
      route(window, 'swift');
      assertPrinted(window, '[data-action="print-swift"]');

      route(window, 'portal');
      const state = loadDemoState(window.localStorage);
      const business = state.customers.find(customer => customer.kind === 'business');
      assert.ok(business, 'synthetic business persona is missing');
      const profile = window.document.querySelector('#portalCustomerSelect');
      profile.value = business.id;
      profile.dispatchEvent(new window.Event('change', { bubbles: true }));
      assert.ok(main.textContent.includes(business.name), 'customer persona did not switch');
      const accountsPanel = main.querySelector('.panel');
      const accountMarker = account => {
        const value = account.iban || account.accountNumber;
        return value.startsWith('DEMO-') ? value : value.match(/.{1,4}/g).join(' ');
      };
      for (const account of state.accounts.filter(item => item.customerId === business.id)) {
        assert.ok(accountsPanel.textContent.includes(accountMarker(account)), `portal omitted ${business.id}'s account`);
      }
      const foreignAccount = state.accounts.find(account => account.customerId !== business.id);
      assert.ok(foreignAccount && !accountsPanel.textContent.includes(accountMarker(foreignAccount)), 'portal showed another persona’s account');

      click(window, '[data-action="portal-incoming"]');
      assert.ok(window.document.querySelector('#modalRoot form[data-form="incoming-payment"]'), 'incoming-payment form did not open');
      closeModal(window);
      click(window, '[data-action="portal-crypto-send"]');
      assert.ok(window.document.querySelector('#modalRoot form[data-form="crypto-transfer"]'), 'crypto send rehearsal form did not open');
      closeModal(window);
      click(window, '[data-action="portal-complaint"]');
      assert.ok(window.document.querySelector('#modalRoot form[data-form="complaint"]'), 'customer complaint form did not open');
      closeModal(window);

      assertPrinted(window, '[data-action="print-statement"]');
      assertPrinted(window, '[data-action="print-transaction"]');
      click(window, '[data-action="export-statement"]');
      const statementCsv = await downloads.at(-1).text();
      assert.ok(statementCsv.includes(DEMO_BRAND));
      assert.match(statementCsv, /fictional_demo_account_statement/);

      route(window, 'settings');
      const previousRole = loadDemoState(window.localStorage).settings.role;
      click(window, '[data-action="operator-menu"]');
      assert.notEqual(loadDemoState(window.localStorage).settings.role, previousRole, 'local staff role control did not switch role');
      click(window, '[data-action="export-json"]');
      const scenario = JSON.parse(await downloads.at(-1).text());
      assert.equal(scenario.documentBrand, DEMO_BRAND);
      assert.equal(scenario.demoOnly, true);
      click(window, '[data-action="download-csv"]');
      assert.ok((await downloads.at(-1).text()).includes(DEMO_BRAND), 'transaction CSV is missing the brand');
      route(window, 'reports');
      assertPrinted(window, '[data-action="print-current"]');
    });

    await withPage('../client.html', 'http://adria.test/client.html', 'client', async window => {
      const main = window.document.querySelector('#mainContent');
      assert.ok(main.querySelector('.portal-hero'), 'customer-facing page did not open its portal');
      const state = loadDemoState(window.localStorage);
      const accountMarker = account => {
        const value = account.iban || account.accountNumber;
        return value.startsWith('DEMO-') ? value : value.match(/.{1,4}/g).join(' ');
      };
      for (const kind of ['personal', 'business']) {
        const customer = state.customers.find(item => item.kind === kind);
        assert.ok(customer, `synthetic ${kind} customer is missing`);
        const profile = window.document.querySelector('#portalCustomerSelect');
        profile.value = customer.id;
        profile.dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.ok(main.querySelector('.portal-hero h2')?.textContent.includes(customer.name.split(' ')[0]), `${kind} customer profile did not load`);
        const accountsPanel = main.querySelector('.panel');
        for (const account of state.accounts.filter(item => item.customerId === customer.id)) {
          assert.ok(accountsPanel.textContent.includes(accountMarker(account)), `${kind} portal omitted its own account`);
        }
        const foreign = state.accounts.find(account => account.customerId !== customer.id);
        assert.ok(foreign && !accountsPanel.textContent.includes(accountMarker(foreign)), `${kind} portal leaked another persona's account`);
      }
    });

    await withPage('../exchange.html', 'http://adria.test/exchange.html?module=exchange', 'exchange', async window => {
      assert.ok(window.document.querySelector('#mainContent .exchange-hero'), 'standalone exchange route failed');
      assert.ok(window.document.querySelector('#crumbTitle')?.textContent, 'exchange breadcrumb anchor is missing');
    });
  } finally {
    for (const restore of restoreTimers.reverse()) restore();
    if (previousCreate) Object.defineProperty(URL, 'createObjectURL', previousCreate); else delete URL.createObjectURL;
    if (previousRevoke) Object.defineProperty(URL, 'revokeObjectURL', previousRevoke); else delete URL.revokeObjectURL;
  }
});


test('welcome entry screen localizes all nine language options and carries the selected locale into both demo routes', async () => {
  const html = await readFile(new URL('../welcome.html', import.meta.url), 'utf8');
  const window = new Window({ url: 'http://adria.test/welcome.html?lang=ar' });
  window.document.write(html);
  window.document.close();
  const restore = [
    setGlobal('window', window), setGlobal('document', window.document), setGlobal('location', window.location),
    setGlobal('localStorage', window.localStorage), setGlobal('navigator', window.navigator)
  ];
  try {
    const welcome = new URL('../src/welcome.mjs', import.meta.url);
    welcome.searchParams.set('ui-smoke', 'welcome-languages');
    const welcomeModule = await import(welcome.href);
    const select = window.document.querySelector('#welcomeLanguage');
    assert.equal(select.options.length, supportedLanguages.length);
    assert.deepEqual([...select.options].map(option => option.value), supportedLanguages.map(item => item.code));
    const welcomeKeys = Object.keys(welcomeModule.welcomeTranslations.en).sort();
    for (const language of supportedLanguages) assert.deepEqual(Object.keys(welcomeModule.welcomeTranslations[language.code]).sort(), welcomeKeys, `${language.code} welcome copy is complete`);
    assert.equal(window.document.documentElement.lang, 'ar');
    assert.equal(window.document.documentElement.dir, 'rtl');
    select.value = 'ja';
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(window.document.documentElement.lang, 'ja');
    assert.equal(window.document.querySelector('#staffEntry').getAttribute('href'), './index.html?lang=ja');
    assert.equal(window.document.querySelector('#customerEntry').getAttribute('href'), './client.html?lang=ja');
    assert.equal(window.document.querySelector('#screenWatermark').textContent, DEMO_BRAND);
  } finally {
    window.happyDOM.abort();
    for (const undo of restore.reverse()) undo();
  }
});

test('optional market data is manually requested and isolated from simulated quotes', async () => {
  const restoreTimers = [
    setGlobal('setInterval', () => 0), setGlobal('clearInterval', () => {}),
    setGlobal('setTimeout', () => 0), setGlobal('clearTimeout', () => {})
  ];
  try {
    await withPage('../index.html', 'http://adria.test/?lang=en', 'optional-market-feed', async window => {
    let requests = 0;
    window.adriaDemo = {
      getOptionalMarketReference: async () => {
        requests++;
        return { ok: true, configured: true, provider: 'Twelve Data', symbol: 'EUR/USD', rate: 1.23456, timestamp: '2026-10-11T10:00:00.000Z', indicativeOnly: true };
      }
    };
    const bundledUsdRate = CURRENCIES.USD.eurRate;
    route(window, 'exchange');
    assert.equal(requests, 0, 'no optional market-data request runs automatically');
    assert.ok(window.document.querySelector('#mainContent').textContent.includes('never used by simulated orders'));
    click(window, '[data-action="fetch-market-reference"]');
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests, 1);
    assert.ok(window.document.querySelector('#mainContent').textContent.includes('1 EUR = 1.23456 USD'));
    assert.equal(CURRENCIES.USD.eurRate, bundledUsdRate, 'optional market data does not replace the daily reference used by the simulator');
    });
  } finally {
    for (const undo of restoreTimers.reverse()) undo();
  }
});

test('identifier checker masks valid IBAN/card checks and never persists the entered full value', async () => {
  const restoreTimers = [
    setGlobal('setInterval', () => 0), setGlobal('clearInterval', () => {}),
    setGlobal('setTimeout', () => 0), setGlobal('clearTimeout', () => {})
  ];
  try {
    await withPage('../index.html', 'http://adria.test/?lang=en', 'identifier-checker', async window => {
      route(window, 'checker');
      const form = window.document.querySelector('form[data-form="reference-check"]');
      assert.ok(form);
      const type = form.querySelector('[name="type"]');
      const value = form.querySelector('[name="value"]');
      type.value = 'pan';
      value.value = '9999999999999995';
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      let content = window.document.querySelector('#mainContent').textContent;
      assert.ok(content.includes('Card-number format and Luhn pass'));
      assert.ok(!content.includes('9999999999999995'));
      assert.ok(!window.localStorage.getItem(STORE_KEY).includes('9999999999999995'));

      const nextForm = window.document.querySelector('form[data-form="reference-check"]');
      nextForm.querySelector('[name="type"]').value = 'iban';
      nextForm.querySelector('[name="value"]').value = 'HR1210010051863000160';
      nextForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      content = window.document.querySelector('#mainContent').textContent;
      assert.ok(content.includes('IBAN format and checksum pass'));
      assert.ok(!content.includes('HR1210010051863000160'));
      assert.ok(!window.localStorage.getItem(STORE_KEY).includes('HR1210010051863000160'));
    });
  } finally {
    for (const undo of restoreTimers.reverse()) undo();
  }
});

test('online onboarding stays fixed-choice, local-only, reviewable and clearly marked throughout the customer and staff routes', async () => {
  const restoreTimers = [
    setGlobal('setInterval', () => 0), setGlobal('clearInterval', () => {}),
    setGlobal('setTimeout', () => 0), setGlobal('clearTimeout', () => {})
  ];
  try {
    await withPage('../index.html', 'http://adria.test/?lang=en', 'local-onboarding', async window => {
      const main = window.document.querySelector('#mainContent');
      route(window, 'portal');
      assert.ok(main.textContent.includes('Online onboarding'));
      const before = loadDemoState(window.localStorage);
      const beforeCounts = [before.customers.length, before.accounts.length, before.transactions.length];
      const profileSelect = window.document.querySelector('#portalCustomerSelect');
      const customerId = profileSelect.value;
      const customer = before.customers.find(item => item.id === customerId);
      assert.ok(customer?.demoOnly);
      for (const kind of ['personal', 'business']) {
        const persona = before.customers.find(item => item.kind === kind);
        assert.ok(persona, `synthetic ${kind} persona missing`);
        profileSelect.value = persona.id;
        click(window, '[data-action="portal-onboarding"]');
        const rehearsal = window.document.querySelector('#modalRoot form[data-form="onboarding"]');
        const requiredProduct = [...rehearsal.querySelectorAll('[name="products"][required]')].map(input => input.value);
        assert.deepEqual(requiredProduct, [kind === 'business' ? 'business_account' : 'personal_account'], `${kind} product selection must validate against the matching synthetic product`);
        closeModal(window);
      }
      profileSelect.value = customer.id;
      click(window, '[data-action="portal-onboarding"]');
      const form = window.document.querySelector('#modalRoot form[data-form="onboarding"]');
      assert.ok(form, 'fixed-choice demo application form did not open');
      assert.equal(window.document.querySelector('#modalRoot .modal-demo-footer')?.textContent, DEMO_BRAND, 'overlay screens need the discreet exact-brand footer too');
      assert.equal(form.querySelectorAll('input[type="file"], input[type="text"], input[type="email"], input[type="tel"], input[type="number"], textarea').length, 0, 'the rehearsal must not collect personal text, document, biometric or identifier data');
      assert.equal(form.querySelector('[name="customerId"]').value, customer.id);
      assert.equal(form.querySelector('[data-onboarding-step="1"]').hidden, false);
      assert.equal(form.querySelector('[data-onboarding-step="2"]').hidden, true);
      assert.equal(form.querySelector('[data-onboarding-step="3"]').hidden, true);
      click(window, '[data-action="onboarding-next"]');
      assert.equal(form.querySelector('[data-onboarding-step="1"]').hidden, false, 'the wizard must not skip a missing required product selection');
      const product = form.querySelector(`[name="products"][value="${customer.kind === 'business' ? 'business_account' : 'personal_account'}"]`);
      assert.ok(product, 'persona-appropriate synthetic product choice missing');
      product.checked = true;
      click(window, '[data-action="onboarding-next"]');
      assert.equal(form.querySelector('[data-onboarding-step="1"]').hidden, true);
      assert.equal(form.querySelector('[data-onboarding-step="2"]').hidden, false);
      click(window, '[data-action="onboarding-back"]');
      assert.equal(form.querySelector('[data-onboarding-step="1"]').hidden, false, 'the wizard must support returning to the previous step');
      assert.equal(product.checked, true, 'returning to a previous step must preserve local choices');
      click(window, '[data-action="onboarding-next"]');
      assert.equal(form.querySelector('[data-onboarding-step="2"]').hidden, false);
      form.querySelector('[name="identityScenario"]').value = 'manual_review_demo';
      form.querySelector('[name="screeningScenario"]').value = 'possible_match_demo';
      click(window, '[data-action="onboarding-next"]');
      assert.equal(form.querySelector('[data-onboarding-step="2"]').hidden, true);
      assert.equal(form.querySelector('[data-onboarding-step="3"]').hidden, false);
      form.querySelector('[name="syntheticConfirmed"]').checked = true;
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      assert.equal(loadDemoState(window.localStorage).onboardingApplications.length, 0, 'final confirmation must be complete before adding the rehearsal');
      assert.ok(window.document.querySelector('#modalRoot form[data-form="onboarding"]'), 'incomplete confirmation must keep the rehearsal open');
      form.querySelector('[name="noRealDataConfirmed"]').checked = true;
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

      let state = loadDemoState(window.localStorage);
      const application = state.onboardingApplications[0];
      assert.ok(application, 'submission did not enter local application queue');
      assert.equal(application.status, 'submitted_demo');
      assert.equal(application.reviewPath, 'enhanced_review_demo');
      assert.equal(application.customerId, customer.id);
      assert.deepEqual([state.customers.length, state.accounts.length, state.transactions.length], beforeCounts, 'demo onboarding must not create a real-looking account or financial activity');
      assert.equal('identityNumber' in application, false);
      assert.equal('document' in application, false);
      assert.equal('email' in application, false);
      assert.ok(!JSON.stringify(application).match(/passport|address|dateOfBirth|nationalId|documentData/i));

      route(window, 'onboarding');
      assert.ok(main.querySelector('.page-heading'));
      assert.ok(main.textContent.includes(application.id), 'staff review queue omitted the application');
      click(window, `[data-action="onboarding-detail"][data-id="${application.id}"]`);
      const review = window.document.querySelector('#modalRoot .modal-panel');
      assert.ok(review?.textContent.toLowerCase().includes('no identity'));
      assert.equal(review.querySelector('form'), null, 'review summary must be read-only');
      closeModal(window);

      for (let i = 0; i < 6; i++) click(window, '[data-action="operator-menu"]');
      assert.ok(window.document.querySelector(`[data-action="onboarding-status"][data-id="${application.id}"][data-status="reviewed_demo"]`), 'checker review action is not available to the synthetic checker role');
      click(window, `[data-action="onboarding-status"][data-id="${application.id}"][data-status="reviewed_demo"]`);
      state = loadDemoState(window.localStorage);
      assert.equal(state.onboardingApplications[0].status, 'reviewed_demo');
      route(window, 'portal');
      assert.ok(main.textContent.includes('Training review complete'));
      assert.ok(main.textContent.includes('did not verify identity or open an account'));
    });
  } finally {
    for (const undo of restoreTimers.reverse()) undo();
  }
});

test('virtual prepaid-card UI supports issuance, local loading, purchase rehearsal and spend controls', async () => {
  const restoreTimers = [
    setGlobal('setInterval', () => 0), setGlobal('clearInterval', () => {}),
    setGlobal('setTimeout', () => 0), setGlobal('clearTimeout', () => {})
  ];
  try {
    await withPage('../index.html', 'http://adria.test/?lang=en', 'virtual-prepaid-card', async window => {
      route(window, 'cards');
      click(window, '[data-action="issue-card"]');
      const issueForm = window.document.querySelector('#modalRoot form[data-form="card"]');
      assert.ok(issueForm);
      const account = issueForm.querySelector('[name="accountId"]');
      account.value = account.options[1].value;
      issueForm.querySelector('[name="product"]').value = 'prepaid';
      issueForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

      let state = JSON.parse(window.localStorage.getItem(STORE_KEY));
      const card = state.cards[0];
      assert.equal(card.fundingType, 'prepaid');
      assert.equal(card.formFactor, 'virtual');
      assert.equal(card.prepaidBalanceCents, 0);
      const linked = state.accounts.find(item => item.id === card.accountId);
      const accountBeforeLoad = linked.balanceCents;
      const depositsBeforeLoad = totalCustomerDepositsCents(state);

      click(window, `[data-action="card-load"][data-id="${card.id}"]`);
      const loadForm = window.document.querySelector('#modalRoot form[data-form="card-load"]');
      assert.ok(loadForm);
      loadForm.querySelector('[name="amount"]').value = '50.00';
      loadForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      state = JSON.parse(window.localStorage.getItem(STORE_KEY));
      assert.equal(state.cards[0].prepaidBalanceCents, 5000);
      assert.equal(state.accounts.find(item => item.id === linked.id).balanceCents, accountBeforeLoad - 5000);
      assert.equal(totalCustomerDepositsCents(state), depositsBeforeLoad);

      click(window, `[data-action="card-purchase"][data-id="${card.id}"]`);
      const purchaseForm = window.document.querySelector('#modalRoot form[data-form="card-purchase"]');
      assert.ok(purchaseForm);
      purchaseForm.querySelector('[name="amount"]').value = '12.50';
      purchaseForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      state = JSON.parse(window.localStorage.getItem(STORE_KEY));
      assert.equal(state.cards[0].prepaidBalanceCents, 3750);
      assert.equal(state.transactions[0].type, 'card_purchase');
      assert.equal(state.glAccounts.find(item => item.code === '2030').balanceCents, 3750);

      click(window, `[data-action="card-controls"][data-id="${card.id}"]`);
      const controlsForm = window.document.querySelector('#modalRoot form[data-form="card-controls"]');
      assert.ok(controlsForm);
      controlsForm.querySelector('[name="onlineEnabled"]').checked = false;
      controlsForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      state = JSON.parse(window.localStorage.getItem(STORE_KEY));
      assert.equal(state.cards[0].controls.onlineEnabled, false);
      assert.ok(!('pan' in state.cards[0]) && !('cvv' in state.cards[0]));
      assert.ok(!JSON.stringify(state).includes('9999999999999995'));
    });
  } finally {
    for (const undo of restoreTimers.reverse()) undo();
  }
});
