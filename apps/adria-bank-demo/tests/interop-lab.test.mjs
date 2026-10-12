import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { INTEROP_FEATURES, INTEROP_IDEAS, INTEROP_SYSTEMS, interopLocalizedText, ensureInteropLabState, activeInteropSystem, selectInteropSystem, runInteropFeature, toggleInteropConnector, refreshInteropConnector } from '../src/interop-lab.mjs';
import { supportedLanguages } from '../src/i18n.mjs';

test('workbench preserves the original 20 concepts and adds at least 30 ideas with 50 runnable local tools', () => {
  assert.equal(INTEROP_IDEAS.length, 50);
  assert.ok(INTEROP_IDEAS.length - 20 >= 30);
  assert.equal(new Set(INTEROP_IDEAS.map(item => item.id)).size, 50);
  assert.equal(INTEROP_FEATURES.length, 50);
  assert.equal(new Set(INTEROP_FEATURES.map(item => item.id)).size, 50);
  assert.ok(INTEROP_FEATURES.every(item => INTEROP_IDEAS.some(idea => idea.id === item.idea)));
  assert.deepEqual(INTEROP_IDEAS.slice(0, 20).map(item => item.id), [
    'consent-cockpit', 'all-bank-view', 'identity-fingerprint', 'beneficiary-guard', 'route-optimizer', 'fx-total-cost',
    'cashflow-radar', 'duplicate-scan', 'eudi-credential', 'connector-resilience', 'multi-venue-router', 'slippage-budget',
    'price-alerts', 'reconciliation', 'custody-diversification', 'stablecoin-stress', 'bridge-risk', 'travel-rule', 'fee-tax-export', 'incident-room'
  ]);
  assert.deepEqual(INTEROP_FEATURES.slice(0, 20).map(item => item.id), [
    'consent-audit', 'aggregate-balances', 'protection-map', 'beneficiary-check', 'bank-route', 'fx-cost', 'cashflow-forecast',
    'duplicate-detect', 'identity-minimization', 'connector-health', 'venue-best-price', 'slippage', 'limit-alert', 'venue-reconcile',
    'counterparty-exposure', 'stablecoin-stress', 'bridge-risk', 'travel-rule', 'audit-export', 'kill-switch'
  ]);
});

test('idea and functionality names and descriptions are available in all nine supported languages', () => {
  for (const language of supportedLanguages) {
    for (const idea of INTEROP_IDEAS) {
      assert.ok(interopLocalizedText(idea, language.code, 'idea', 'title'));
      assert.ok(interopLocalizedText(idea, language.code, 'idea', 'description'));
      if (!['en', 'hr'].includes(language.code)) {
        assert.notEqual(interopLocalizedText(idea, language.code, 'idea', 'title'), idea.en, `${language.code} idea title ${idea.id} needs translation`);
        assert.notEqual(interopLocalizedText(idea, language.code, 'idea', 'description'), idea.detailEn, `${language.code} idea description ${idea.id} needs translation`);
      }
    }
    for (const feature of INTEROP_FEATURES) {
      assert.ok(interopLocalizedText(feature, language.code, 'feature', 'title'));
      assert.ok(interopLocalizedText(feature, language.code, 'feature', 'description'));
      if (!['en', 'hr'].includes(language.code)) {
        assert.notEqual(interopLocalizedText(feature, language.code, 'feature', 'title'), feature.en, `${language.code} feature title ${feature.id} needs translation`);
        assert.notEqual(interopLocalizedText(feature, language.code, 'feature', 'description'), feature.descriptionEn, `${language.code} feature description ${feature.id} needs translation`);
      }
    }
  }
});

test('all fifty local tools run without changing banking, payment, trade or wallet records', () => {
  const protectedState = {
    accounts: [{ id: 'AC-SYNTHETIC', balanceCents: 123456 }],
    payments: [{ id: 'PAY-SYNTHETIC', amountCents: 5678 }],
    transactions: [{ id: 'TX-SYNTHETIC' }],
    exchangeTrades: [{ id: 'TRADE-SYNTHETIC' }],
    wallets: [{ id: 'WALLET-SYNTHETIC', units: 0.25 }],
    walletTransfers: [{ id: 'CRYPTO-SYNTHETIC' }]
  };
  const before = structuredClone(protectedState);
  for (const feature of INTEROP_FEATURES) {
    const run = runInteropFeature(protectedState, feature.id);
    assert.equal(run.featureId, feature.id);
    assert.equal(run.demoOnly, true);
    assert.equal(run.noExternalRequest, true);
    assert.ok(run.summaryEn.length > 0);
  }
  assert.deepEqual({
    accounts: protectedState.accounts,
    payments: protectedState.payments,
    transactions: protectedState.transactions,
    exchangeTrades: protectedState.exchangeTrades,
    wallets: protectedState.wallets,
    walletTransfers: protectedState.walletTransfers
  }, before);
  assert.equal(protectedState.interoperabilityLab.runs.length, 50);
  assert.equal(protectedState.interoperabilityLab.alerts.length, 1);
});

test('Croatia, Singapore and Egypt are separate fictional local contexts with scoped fixtures', () => {
  const state = {};
  const lab = ensureInteropLabState(state);
  assert.deepEqual(INTEROP_SYSTEMS.map(system => system.id), ['croatia', 'singapore', 'egypt']);
  assert.equal(lab.bankConnectors.length, 10);
  assert.equal(lab.venues.length, 7);
  assert.ok([...lab.bankConnectors, ...lab.venues].every(connector => connector.demoOnly && connector.localFixtureOnly));
  assert.equal(activeInteropSystem(state).id, 'croatia');
  for (const [systemId, pair, currency] of [['singapore', 'BTC/SGD', 'SGD'], ['egypt', 'BTC/EGP', 'EGP']]) {
    selectInteropSystem(state, systemId);
    const active = activeInteropSystem(state);
    assert.equal(active.id, systemId);
    const aggregate = runInteropFeature(state, 'aggregate-balances');
    assert.equal(aggregate.systemId, systemId);
    assert.ok(aggregate.evidence.balancesCents[currency] > 0);
    assert.equal(Object.keys(aggregate.evidence.balancesCents).includes('EUR'), false);
    const venue = runInteropFeature(state, 'venue-best-price');
    assert.equal(venue.evidence.market, pair);
    assert.equal(venue.evidence.orderPlaced, false);
  }
  assert.throws(() => selectInteropSystem(state, 'real-bank'), /Unknown fictional demo system/);
  assert.ok(lab.runs.filter(run => run.featureId === 'system-switch').every(run => run.noExternalRequest && run.demoOnly));
});

test('all 50 tools run in each regional profile and remain local to its context', () => {
  const state = {};
  const expectedPairs = { croatia: 'BTC/EUR', singapore: 'BTC/SGD', egypt: 'BTC/EGP' };
  for (const system of INTEROP_SYSTEMS) {
    selectInteropSystem(state, system.id);
    for (const feature of INTEROP_FEATURES) {
      const run = runInteropFeature(state, feature.id);
      assert.equal(run.systemId, system.id, `${feature.id} should use ${system.id}`);
      assert.equal(run.noExternalRequest, true, `${feature.id} must remain offline`);
      assert.equal(run.demoOnly, true);
    }
    assert.equal(runInteropFeature(state, 'venue-best-price').evidence.market, expectedPairs[system.id]);
  }
  assert.equal(state.interoperabilityLab.bankConnectors.length, 10);
  assert.equal(state.interoperabilityLab.venues.length, 7);
});

test('bank aggregation uses enabled fixtures only and duplicate scan stays illustrative', () => {
  const state = { accounts: [] };
  const result = runInteropFeature(state, 'aggregate-balances');
  assert.equal(result.evidence.connectorCount, 2);
  assert.equal(result.evidence.balancesCents.EUR, 11060000);
  assert.equal(result.evidence.balancesCents.USD, 185000);
  const duplicates = runInteropFeature(state, 'duplicate-detect');
  assert.deepEqual(duplicates.evidence.duplicates, ['TX-DEMO-003']);
  assert.equal(duplicates.evidence.paymentPrevented, false);
});

test('connector changes and refresh are confined to local fixture state', () => {
  const state = {};
  const lab = ensureInteropLabState(state);
  const before = lab.bankConnectors[0].refreshCount;
  const connector = refreshInteropConnector(state, 'bank-hr-retail');
  assert.equal(connector.refreshCount, before + 1);
  assert.ok(Number.isFinite(Date.parse(connector.lastSyncAt)));
  assert.equal(lab.lastResult.evidence.noNetworkRequest, true);
  assert.equal(toggleInteropConnector(state, 'bank-hr-retail').status, 'paused_demo');
  assert.throws(() => refreshInteropConnector(state, 'bank-hr-retail'), /Enable this local bank fixture/);
  assert.equal(state.accounts, undefined);
  assert.equal(state.payments, undefined);
});

test('legacy lab history migrates to Croatia and an active emergency pause covers newly seeded regions', () => {
  const state = { interoperabilityLab: {
    activeSystemId: 'croatia',
    bankConnectors: [{ id: 'bank-hr-retail', status: 'connected_demo', balances: [], permissions: [], sampleTransactions: [], refreshCount: 0 }],
    venues: [{ id: 'venue-northstar', status: 'connected_demo', markets: {} }],
    runs: [{ id: 'OLD-RUN', featureId: 'aggregate-balances', summaryEn: 'legacy local run' }],
    alerts: [{ id: 'OLD-ALERT' }], killSwitch: true, previousStatuses: [['bank-hr-retail', 'connected_demo'], ['venue-northstar', 'connected_demo']]
  } };
  const lab = ensureInteropLabState(state);
  assert.ok([...lab.bankConnectors, ...lab.venues].every(item => item.status === 'paused_demo'));
  assert.equal(lab.runs[0].systemId, 'croatia');
  assert.equal(lab.lastResult, null);
  assert.equal(lab.alerts[0].systemId, 'croatia');
  assert.throws(() => toggleInteropConnector(state, 'bank-sg-retail'), /Emergency pause is on/);
  const restore = runInteropFeature(state, 'kill-switch');
  assert.equal(restore.evidence.killSwitchActive, false);
  assert.equal(lab.bankConnectors.find(item => item.id === 'bank-sg-retail').status, 'connected_demo');
});

test('emergency switch pauses demo connectors then restores their previous states', () => {
  const state = {};
  const lab = ensureInteropLabState(state);
  const original = [...lab.bankConnectors, ...lab.venues].map(item => [item.id, item.status]);
  const stopped = runInteropFeature(state, 'kill-switch');
  assert.equal(stopped.evidence.killSwitchActive, true);
  assert.ok([...lab.bankConnectors, ...lab.venues].every(item => item.status === 'paused_demo'));
  assert.throws(() => toggleInteropConnector(state, 'bank-hr-retail'), /Emergency pause is on/);
  const restored = runInteropFeature(state, 'kill-switch');
  assert.equal(restored.evidence.killSwitchActive, false);
  assert.deepEqual([...lab.bankConnectors, ...lab.venues].map(item => [item.id, item.status]), original);
});

test('interop module has no network client and declares explicit fixture boundaries', async () => {
  const source = await readFile(new URL('../src/interop-lab.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
  assert.match(source, /noExternalRequest: true/);
  assert.match(source, /localFixtureOnly: true/);
});
